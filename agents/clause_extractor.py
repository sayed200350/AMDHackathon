"""Clause Extractor Agent — identifies and classifies all clauses in the deal package."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from crewai import Agent, Task
from openai import OpenAI

from agents.config import CLAUSE_TYPES, LLMConfig, legal_llm_config


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class ExtractedClause:
    """A single clause identified in the document corpus."""

    clause_type: str
    text: str
    section_ref: str
    page: int
    document_name: str
    confidence: float


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a senior legal analyst specializing in contract clause extraction.
You are reviewing a full deal package loaded into context.

Your task:
1. Read the ENTIRE document set carefully.
2. Identify every clause that matches one of these types:
   {clause_types}
3. For EACH clause found, output a JSON object with these fields:
   - clause_type: one of the types listed above
   - text: the exact clause text (verbatim quote, max 500 chars)
   - section_ref: section/article number (e.g., "Section 8.2", "Article IV")
   - page: page number where the clause appears
   - document_name: which document in the package contains this clause
   - confidence: 0.0-1.0 confidence that this is correctly classified

Output a JSON array of clause objects. No commentary outside the JSON.
Be exhaustive — missing a clause is worse than a false positive.
"""

TASK_DESCRIPTION = """\
Extract all legal clauses from the following deal package.
Classify each by type, cite the exact text, and provide section/page references.

DOCUMENTS:
{documents}
"""


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------
class ClauseExtractorAgent:
    """Creates and runs the clause extraction agent."""

    def __init__(self, llm_config: LLMConfig | None = None) -> None:
        self._config = llm_config or legal_llm_config()
        self._client = OpenAI(
            base_url=self._config.base_url,
            api_key="not-needed",
        )

    def build_agent(self) -> Agent:
        """Return a CrewAI Agent for clause extraction."""
        return Agent(
            role="Clause Extractor",
            goal="Identify and classify every legal clause in the deal package",
            backstory=(
                "You are a senior associate at a top-tier law firm with 10 years "
                "of experience reviewing M&A transactions, credit agreements, and "
                "employment contracts. You never miss a clause."
            ),
            verbose=True,
            allow_delegation=False,
        )

    def build_task(self, documents: str) -> Task:
        """Return a CrewAI Task for clause extraction over the given documents."""
        return Task(
            description=TASK_DESCRIPTION.format(documents=documents),
            expected_output="JSON array of extracted clauses with citations",
            agent=self.build_agent(),
        )

    def extract(self, documents: str) -> list[dict[str, Any]]:
        """Run clause extraction directly via the OpenAI-compatible API."""
        response = self._client.chat.completions.create(
            model=self._config.model_name,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT.format(
                        clause_types=", ".join(CLAUSE_TYPES),
                    ),
                },
                {
                    "role": "user",
                    "content": TASK_DESCRIPTION.format(documents=documents),
                },
            ],
            max_tokens=self._config.max_tokens,
            temperature=self._config.temperature,
        )

        raw = response.choices[0].message.content or "[]"

        # Strip markdown fences if model wraps output
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1])

        return json.loads(raw)
