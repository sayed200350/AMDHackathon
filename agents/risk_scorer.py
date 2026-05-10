"""Risk Scorer Agent — flags clauses that deviate from market-standard language."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from crewai import Agent, Task
from openai import OpenAI

from agents.config import (
    SEVERITY_ORDER,
    LLMConfig,
    extract_json,
    legal_llm_config,
)


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class RiskFinding:
    """A single risk finding linked to a source clause."""

    clause_type: str
    section_ref: str
    page: int
    document_name: str
    severity: str  # critical | high | medium | low | info
    deviation: str  # what deviates from market standard
    market_standard: str  # what the market-standard language looks like
    recommendation: str  # suggested fix or negotiation point


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a senior M&A partner reviewing a full deal package for risk.
You have deep knowledge of market-standard contract language across industries.

Your task:
1. Review every clause in the deal package.
2. Flag clauses that deviate from market-standard language.
3. For EACH flagged clause, output a JSON object with these fields:
   - clause_type: the type of clause (e.g., "indemnification", "termination")
   - section_ref: section/article number
   - page: page number
   - document_name: source document
   - severity: one of "critical", "high", "medium", "low", "info"
   - deviation: what specifically deviates from market standard (1-2 sentences)
   - market_standard: what the typical market language looks like (1-2 sentences)
   - recommendation: specific action item for the reviewing attorney

Severity guide:
- critical: clause creates unbounded liability, missing essential protection, or contains a trap
- high: clause significantly favors counterparty beyond market norms
- medium: clause is unusual but not necessarily harmful; warrants discussion
- low: minor stylistic deviation; note for completeness
- info: informational observation, no action needed

Output a JSON array sorted by severity (critical first). No commentary outside JSON.
/no_think
"""

TASK_DESCRIPTION = """\
Score the risk of all clauses in the following deal package.
Flag deviations from market-standard language, rank by severity.

DOCUMENTS:
{documents}
"""


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------
class RiskScorerAgent:
    """Creates and runs the risk scoring agent."""

    def __init__(self, llm_config: LLMConfig | None = None) -> None:
        self._config = llm_config or legal_llm_config()
        self._client = OpenAI(
            base_url=self._config.base_url,
            api_key="not-needed",
        )

    def build_agent(self) -> Agent:
        """Return a CrewAI Agent for risk scoring."""
        return Agent(
            role="Risk Scorer",
            goal="Flag every clause that deviates from market-standard language and rank by severity",
            backstory=(
                "You are a senior M&A partner who has reviewed over 500 deals. "
                "You know exactly what market-standard language looks like for "
                "every clause type and can spot deviations instantly."
            ),
            verbose=True,
            allow_delegation=False,
        )

    def build_task(self, documents: str) -> Task:
        """Return a CrewAI Task for risk scoring over the given documents."""
        return Task(
            description=TASK_DESCRIPTION.format(documents=documents),
            expected_output="JSON array of risk findings sorted by severity",
            agent=self.build_agent(),
        )

    def score(self, documents: str) -> list[dict[str, Any]]:
        """Run risk scoring directly via the OpenAI-compatible API."""
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
            key=lambda f: SEVERITY_ORDER.get(f.get("severity", "info"), 99),
        )
