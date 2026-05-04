"""Evaluation harness — measures cross-document conflict detection accuracy."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

from agents.crossref_auditor import CrossRefAuditorAgent


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Annotation:
    """A hand-labeled cross-document conflict."""

    deal_id: str
    document_a: str
    section_a: str
    document_b: str
    section_b: str
    conflict_type: str
    description: str


@dataclass(frozen=True)
class EvalResult:
    """Result of evaluating one deal package."""

    deal_id: str
    total_annotations: int
    true_positives: int
    false_negatives: int
    extra_findings: int
    recall: float
    precision: float


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
ANNOTATIONS_PATH = Path(__file__).parent / "annotations.jsonl"
TEST_DEALS_DIR = Path(__file__).parent / "test_deals"


def load_annotations() -> dict[str, list[Annotation]]:
    """Load annotations grouped by deal_id."""
    annotations: dict[str, list[Annotation]] = {}
    with open(ANNOTATIONS_PATH) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            ann = Annotation(**data)
            annotations.setdefault(ann.deal_id, []).append(ann)
    return annotations


def load_deal_documents(deal_id: str) -> str:
    """Load and concatenate all documents for a deal."""
    deal_dir = TEST_DEALS_DIR / deal_id
    if not deal_dir.exists():
        raise FileNotFoundError(f"Deal directory not found: {deal_dir}")

    parts: list[str] = []
    for doc_path in sorted(deal_dir.iterdir()):
        if doc_path.suffix in (".txt", ".md"):
            content = doc_path.read_text(encoding="utf-8")
            parts.append(
                f"=== DOCUMENT: {doc_path.name} ===\n{content}\n"
                f"=== END: {doc_path.name} ===\n"
            )
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------
def finding_matches_annotation(
    finding: dict,
    annotation: Annotation,
) -> bool:
    """Check if an auditor finding matches a hand-labeled annotation."""
    finding_docs = {
        finding.get("document_a", "").lower(),
        finding.get("document_b", "").lower(),
    }
    annotation_docs = {
        annotation.document_a.lower(),
        annotation.document_b.lower(),
    }

    if finding_docs != annotation_docs:
        return False

    finding_sections = {
        finding.get("section_a", "").lower(),
        finding.get("section_b", "").lower(),
    }
    annotation_sections = {
        annotation.section_a.lower(),
        annotation.section_b.lower(),
    }

    return bool(finding_sections & annotation_sections)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
def evaluate_deal(
    deal_id: str,
    annotations: list[Annotation],
    findings: list[dict],
) -> EvalResult:
    """Evaluate auditor findings against annotations for one deal."""
    matched_annotations: set[int] = set()
    matched_findings: set[int] = set()

    for ann_idx, ann in enumerate(annotations):
        for find_idx, finding in enumerate(findings):
            if finding_matches_annotation(finding, ann):
                matched_annotations.add(ann_idx)
                matched_findings.add(find_idx)
                break

    tp = len(matched_annotations)
    fn = len(annotations) - tp
    extra = len(findings) - len(matched_findings)
    total_found = len(matched_findings)

    recall = tp / len(annotations) if annotations else 0.0
    precision = total_found / len(findings) if findings else 0.0

    return EvalResult(
        deal_id=deal_id,
        total_annotations=len(annotations),
        true_positives=tp,
        false_negatives=fn,
        extra_findings=extra,
        recall=recall,
        precision=precision,
    )


def run_full_eval() -> list[EvalResult]:
    """Run evaluation across all annotated deals."""
    annotations_by_deal = load_annotations()
    auditor = CrossRefAuditorAgent()
    results: list[EvalResult] = []

    for deal_id, annotations in annotations_by_deal.items():
        print(f"\nEvaluating deal: {deal_id}")
        print(f"  Annotations: {len(annotations)}")

        try:
            documents = load_deal_documents(deal_id)
        except FileNotFoundError as e:
            print(f"  SKIP: {e}")
            continue

        findings = auditor.audit(documents)
        print(f"  Findings: {len(findings)}")

        result = evaluate_deal(deal_id, annotations, findings)
        results.append(result)

        print(f"  Recall: {result.recall:.1%}")
        print(f"  Precision: {result.precision:.1%}")
        print(f"  TP={result.true_positives} FN={result.false_negatives} Extra={result.extra_findings}")

    return results


def print_summary(results: list[EvalResult]) -> None:
    """Print aggregate evaluation metrics."""
    if not results:
        print("\nNo results to summarize.")
        return

    total_tp = sum(r.true_positives for r in results)
    total_ann = sum(r.total_annotations for r in results)
    total_findings = sum(r.true_positives + r.extra_findings for r in results)

    overall_recall = total_tp / total_ann if total_ann else 0.0
    overall_precision = total_tp / total_findings if total_findings else 0.0

    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Deals evaluated:     {len(results)}")
    print(f"Total annotations:   {total_ann}")
    print(f"True positives:      {total_tp}")
    print(f"Overall recall:      {overall_recall:.1%}")
    print(f"Overall precision:   {overall_precision:.1%}")
    print("=" * 60)

    miss_rate = 1.0 - overall_recall
    print(f"\nMiss rate: {miss_rate:.1%}")
    print(f"(RAG baseline misses ~23% — target: beat this)")


if __name__ == "__main__":
    results = run_full_eval()
    print_summary(results)
    sys.exit(0 if all(r.recall >= 0.77 for r in results) else 1)
