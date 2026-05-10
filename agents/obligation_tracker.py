"""Obligation Tracker Agent — extracts deadlines, deliverables, and conditional obligations."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from crewai import Agent, Task
from openai import OpenAI

from agents.config import LLMConfig, extract_json, legal_llm_config


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Obligation:
    """A single obligation extracted from the deal package."""

    obligation: str
    obligor: str  # party responsible
    obligee: str  # party who benefits
    due_date: str  # absolute or relative deadline
    condition: str  # any triggering condition, or "unconditional"
    section_ref: str
    page: int
    document_name: str
    priority: str  # critical | high | medium | low


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a paralegal specialist in obligation tracking for complex transactions.
You are reviewing a full deal package loaded into context.

Your task:
1. Read the ENTIRE document set carefully.
2. Extract EVERY obligation, deadline, deliverable, and conditional requirement.
3. For EACH obligation, output a JSON object with these fields:
   - obligation: clear description of what must be done (1-2 sentences)
   - obligor: the party responsible for performing this obligation
   - obligee: the party who benefits or receives the deliverable
   - due_date: the deadline — use exact dates where stated, or relative timing
     (e.g., "30 days post-closing", "upon execution", "prior to closing")
   - condition: any triggering condition (e.g., "if MAC occurs"), or "unconditional"
   - section_ref: section/article number
   - page: page number
   - document_name: source document
   - priority: "critical" (closing condition or material deadline),
     "high" (significant post-closing obligation), "medium" (standard covenant),
     "low" (administrative/notice requirement)

Output a JSON array sorted chronologically by due_date where possible,
with closing-date obligations first, then post-closing by relative timing.
No commentary outside the JSON.

Be exhaustive — every "shall", "must", "will deliver", "agrees to", and
"is required to" should be captured.
/no_think
"""

TASK_DESCRIPTION = """\
Extract all obligations, deadlines, and deliverables from the following deal package.
Build a complete timeline of who owes what, to whom, and by when.

DOCUMENTS:
{documents}
"""


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------
class ObligationTrackerAgent:
    """Creates and runs the obligation tracking agent."""

    def __init__(self, llm_config: LLMConfig | None = None) -> None:
        self._config = llm_config or legal_llm_config()
        self._client = OpenAI(
            base_url=self._config.base_url,
            api_key="not-needed",
        )

    def build_agent(self) -> Agent:
        """Return a CrewAI Agent for obligation tracking."""
        return Agent(
            role="Obligation Tracker",
            goal="Extract every deadline, deliverable, and conditional obligation into a timeline",
            backstory=(
                "You are a meticulous paralegal who has tracked obligations on "
                "hundreds of transactions. You never miss a 'shall' or 'must'. "
                "Your timelines have saved firms from missed deadlines repeatedly."
            ),
            verbose=True,
            allow_delegation=False,
        )

    def build_task(self, documents: str) -> Task:
        """Return a CrewAI Task for obligation tracking over the given documents."""
        return Task(
            description=TASK_DESCRIPTION.format(documents=documents),
            expected_output="JSON array of obligations sorted chronologically",
            agent=self.build_agent(),
        )

    def track(self, documents: str) -> list[dict[str, Any]]:
        """Run obligation tracking directly via the OpenAI-compatible API."""
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
        return extract_json(raw)
