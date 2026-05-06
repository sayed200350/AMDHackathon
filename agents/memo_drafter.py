"""Memo Drafter Agent — synthesizes all agent outputs into a structured legal memo."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from crewai import Agent, Task
from openai import OpenAI

from agents.config import LLMConfig, legal_llm_config


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class MemoSection:
    """A section of the final legal memo."""

    heading: str
    content: str
    citations: list[str]


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a senior associate drafting a legal review memo for a partner.
You will receive structured outputs from four specialist agents:

1. CLAUSE EXTRACTOR — all identified clauses with citations
2. RISK SCORER — risk findings ranked by severity
3. OBLIGATION TRACKER — all deadlines and deliverables
4. CROSS-REFERENCE AUDITOR — cross-document contradictions and issues

Your task: synthesize these into a polished, partner-ready legal memo in Markdown.

FORMAT:

# Contract Review Memo

**Matter:** [Infer from document names/content]
**Date:** [Today's date]
**Prepared by:** Counsel-in-a-Box Automated Review
**Confidential — Attorney Work Product**

---

## Executive Summary
[2-3 paragraph overview: what the deal is, top risks, critical deadlines,
and the most important cross-document issues. A partner should be able to
read only this section and know the key issues.]

## Critical Findings
[List all CRITICAL and HIGH severity items from Risk Scorer and Cross-Ref
Auditor. Each finding should include:
- What the issue is
- Where it appears (document, section, page)
- Why it matters
- Recommended action]

## Risk Analysis
[Organized by clause type. For each flagged clause:
- Current language summary
- Market-standard comparison
- Severity rating
- Recommendation]

## Obligations & Deadlines
[Chronological table of all obligations:
| Due Date | Obligation | Responsible Party | Document/Section | Priority |
Include pre-closing, closing, and post-closing sections.]

## Cross-Document Issues
[All findings from the Cross-Ref Auditor:
- Contradictions
- Undefined terms
- Broken references
- Inconsistencies
Each with both source locations and explanation.]

## Clause Inventory
[Summary table of all extracted clauses by type, with document/section references.
This serves as a quick-reference index for the reviewing attorney.]

## Recommended Next Steps
[Numbered list of specific actions the attorney should take, prioritized
by urgency and severity.]

---

RULES:
- Every factual claim MUST have a citation (document name, section, page)
- Use professional legal memo language
- Be specific — no vague statements like "there may be issues"
- Sort everything by priority/severity
- The memo should be ready to send to a partner with minimal editing
"""

TASK_DESCRIPTION = """\
Synthesize the following agent outputs into a structured legal review memo.

## Clause Extractor Output
{clauses}

## Risk Scorer Output
{risks}

## Obligation Tracker Output
{obligations}

## Cross-Reference Auditor Output
{crossrefs}
"""


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------
class MemoDrafterAgent:
    """Creates and runs the memo drafting agent."""

    def __init__(self, llm_config: LLMConfig | None = None) -> None:
        self._config = llm_config or legal_llm_config()
        self._client = OpenAI(
            base_url=self._config.base_url,
            api_key="not-needed",
        )

    def build_agent(self) -> Agent:
        """Return a CrewAI Agent for memo drafting."""
        return Agent(
            role="Memo Drafter",
            goal="Synthesize all agent outputs into a partner-ready legal review memo",
            backstory=(
                "You are a senior associate known for producing the clearest, "
                "most actionable review memos in the firm. Partners specifically "
                "request you on deals because your memos save them hours of review."
            ),
            verbose=True,
            allow_delegation=False,
        )

    def build_task(
        self,
        clauses: str,
        risks: str,
        obligations: str,
        crossrefs: str,
    ) -> Task:
        """Return a CrewAI Task for memo drafting."""
        return Task(
            description=TASK_DESCRIPTION.format(
                clauses=clauses,
                risks=risks,
                obligations=obligations,
                crossrefs=crossrefs,
            ),
            expected_output="Complete legal review memo in Markdown format",
            agent=self.build_agent(),
        )

    def draft(
        self,
        clauses: list[dict[str, Any]],
        risks: list[dict[str, Any]],
        obligations: list[dict[str, Any]],
        crossrefs: list[dict[str, Any]],
    ) -> str:
        """Run memo drafting directly via the OpenAI-compatible API."""
        response = self._client.chat.completions.create(
            model=self._config.model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": TASK_DESCRIPTION.format(
                        clauses=json.dumps(clauses, indent=2),
                        risks=json.dumps(risks, indent=2),
                        obligations=json.dumps(obligations, indent=2),
                        crossrefs=json.dumps(crossrefs, indent=2),
                    ),
                },
            ],
            max_tokens=self._config.max_tokens,
            temperature=0.2,
        )

        raw = response.choices[0].message.content or ""
        return re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
