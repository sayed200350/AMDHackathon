"""Cross-Reference Auditor — finds contradictions, undefined terms, and broken references."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from crewai import Agent, Task
from openai import OpenAI

from agents.config import SEVERITY_ORDER, LLMConfig, extract_json, legal_llm_config


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class CrossRefFinding:
    """A cross-document issue found by the auditor."""

    finding_type: str  # contradiction | undefined_term | broken_reference | inconsistency
    document_a: str
    section_a: str
    page_a: int
    text_a: str
    document_b: str
    section_b: str
    page_b: int
    text_b: str
    explanation: str
    severity: str  # critical | high | medium | low


# ---------------------------------------------------------------------------
# Prompt — this is the novel piece that only works with full-context
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a senior legal auditor specializing in cross-document consistency analysis.
You have the ENTIRE deal package loaded in context — every document, every page.

This is the task that RAG-based systems CANNOT do: you must compare clauses, definitions,
and references ACROSS documents to find conflicts the reviewing attorney would otherwise miss.

Your task:
1. Read ALL documents completely.
2. Find every instance of these cross-document issues:

   a) CONTRADICTIONS: Two clauses in different documents that say conflicting things
      (e.g., different closing dates, conflicting termination rights, incompatible
      definitions of the same term).

   b) UNDEFINED TERMS: A term used in one document that is defined differently or
      not defined at all in the document that should define it.

   c) BROKEN REFERENCES: A clause that references a section, exhibit, or schedule
      that does not exist, or references the wrong section.

   d) INCONSISTENCIES: Numeric discrepancies (different dollar amounts for the same
      item), party name variations that could cause confusion, or scope mismatches
      between documents.

3. For EACH finding, output a JSON object with these fields:
   - finding_type: "contradiction" | "undefined_term" | "broken_reference" | "inconsistency"
   - document_a: first document name
   - section_a: section/article in first document
   - page_a: page number in first document
   - text_a: verbatim quote from first document (max 300 chars)
   - document_b: second document name (or same document for internal issues)
   - section_b: section/article in second document
   - page_b: page number in second document
   - text_b: verbatim quote from second document (max 300 chars)
   - explanation: clear explanation of WHY these conflict (1-2 sentences)
   - severity: "critical" (deal-breaking conflict), "high" (material inconsistency),
     "medium" (ambiguity that could cause disputes), "low" (minor stylistic mismatch)

Output a JSON array sorted by severity. No commentary outside the JSON.

THIS IS THE MOST IMPORTANT AGENT IN THE SYSTEM. A missed cross-reference conflict
is the error that gets associates fired and costs firms millions. Be thorough.
/no_think
"""

TASK_DESCRIPTION = """\
Audit the following deal package for cross-document contradictions, undefined terms,
broken references, and inconsistencies. This requires comparing every document against
every other document.

DOCUMENTS:
{documents}
"""


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------
class CrossRefAuditorAgent:
    """Creates and runs the cross-reference auditing agent."""

    def __init__(self, llm_config: LLMConfig | None = None) -> None:
        self._config = llm_config or legal_llm_config()
        self._client = OpenAI(
            base_url=self._config.base_url,
            api_key="not-needed",
        )

    def build_agent(self) -> Agent:
        """Return a CrewAI Agent for cross-reference auditing."""
        return Agent(
            role="Cross-Reference Auditor",
            goal=(
                "Find every contradiction, undefined term, broken reference, "
                "and inconsistency across documents in the deal package"
            ),
            backstory=(
                "You are the firm's most feared quality-control partner. "
                "You once caught a $40M indemnity cap discrepancy between a "
                "purchase agreement and its disclosure schedule that three "
                "associates had missed. You read every word of every document."
            ),
            verbose=True,
            allow_delegation=False,
        )

    def build_task(self, documents: str) -> Task:
        """Return a CrewAI Task for cross-reference auditing."""
        return Task(
            description=TASK_DESCRIPTION.format(documents=documents),
            expected_output="JSON array of cross-document findings sorted by severity",
            agent=self.build_agent(),
        )

    def audit(self, documents: str) -> list[dict[str, Any]]:
        """Run cross-reference audit directly via the OpenAI-compatible API."""
        response = self._client.chat.completions.create(
            model=self._config.model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": TASK_DESCRIPTION.format(documents=documents),
                },
            ],
            max_tokens=self._config.max_tokens,
            temperature=self._config.temperature,
        )

        raw = response.choices[0].message.content or "[]"
        findings: list[dict[str, Any]] = extract_json(raw)

        return sorted(
            findings,
            key=lambda f: SEVERITY_ORDER.get(f.get("severity", "low"), 99),
        )
