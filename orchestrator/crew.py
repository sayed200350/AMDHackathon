"""CrewAI coordination — runs the 5-agent legal review pipeline."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from agents.clause_extractor import ClauseExtractorAgent
from agents.crossref_auditor import CrossRefAuditorAgent
from agents.memo_drafter import MemoDrafterAgent
from agents.obligation_tracker import ObligationTrackerAgent
from agents.risk_scorer import RiskScorerAgent
from orchestrator.models import Matter, get_session

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ReviewResult:
    """Complete output of a legal review pipeline run."""

    matter_id: str
    clauses: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    obligations: list[dict[str, Any]]
    crossrefs: list[dict[str, Any]]
    memo: str


def run_review(matter_id: str, documents: str) -> ReviewResult:
    """Execute the full 5-agent legal review pipeline.

    Args:
        matter_id: The database ID of the matter being reviewed.
        documents: The full text of all documents concatenated with headers.

    Returns:
        ReviewResult with all agent outputs and the final memo.
    """
    session = get_session()

    try:
        matter = session.get(Matter, matter_id)
        if matter is None:
            raise ValueError(f"Matter {matter_id} not found")

        matter.status = "running"
        session.commit()

        logger.info("Starting review for matter %s", matter_id)

        # Phase 1: Run the four analysis agents (parallel in future)
        logger.info("Running Clause Extractor...")
        clause_agent = ClauseExtractorAgent()
        clauses = clause_agent.extract(documents)
        matter.clauses = clauses
        session.commit()
        logger.info("Extracted %d clauses", len(clauses))

        logger.info("Running Risk Scorer...")
        risk_agent = RiskScorerAgent()
        risks = risk_agent.score(documents)
        matter.risks = risks
        session.commit()
        logger.info("Found %d risk findings", len(risks))

        logger.info("Running Obligation Tracker...")
        obligation_agent = ObligationTrackerAgent()
        obligations = obligation_agent.track(documents)
        matter.obligations = obligations
        session.commit()
        logger.info("Tracked %d obligations", len(obligations))

        logger.info("Running Cross-Reference Auditor...")
        crossref_agent = CrossRefAuditorAgent()
        crossrefs = crossref_agent.audit(documents)
        matter.crossrefs = crossrefs
        session.commit()
        logger.info("Found %d cross-reference issues", len(crossrefs))

        # Phase 2: Synthesize into memo
        logger.info("Running Memo Drafter...")
        memo_agent = MemoDrafterAgent()
        memo = memo_agent.draft(clauses, risks, obligations, crossrefs)
        matter.memo_markdown = memo
        matter.status = "completed"
        session.commit()
        logger.info("Memo drafted successfully for matter %s", matter_id)

        return ReviewResult(
            matter_id=matter_id,
            clauses=clauses,
            risks=risks,
            obligations=obligations,
            crossrefs=crossrefs,
            memo=memo,
        )

    except Exception:
        logger.exception("Review failed for matter %s", matter_id)
        matter = session.get(Matter, matter_id)
        if matter is not None:
            matter.status = "failed"
            session.commit()
        raise

    finally:
        session.close()
