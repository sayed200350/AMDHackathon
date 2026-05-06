"""Shared configuration for all Counsel-in-a-Box agents."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class LLMConfig:
    """Connection settings for a vLLM OpenAI-compatible endpoint."""

    base_url: str
    model_name: str
    max_tokens: int = 8192
    temperature: float = 0.1


def legal_llm_config() -> LLMConfig:
    """Config for the Qwen3-32B legal reasoning model."""
    port = os.environ.get("LEGAL_PORT", "8000")
    return LLMConfig(
        base_url=f"http://localhost:{port}/v1",
        model_name="qwen3-32b-legal",
        max_tokens=8192,
        temperature=0.1,
    )


def orch_llm_config() -> LLMConfig:
    """Config for the Qwen3.6-A3B orchestration model."""
    port = os.environ.get("ORCH_PORT", "8001")
    return LLMConfig(
        base_url=f"http://localhost:{port}/v1",
        model_name="qwen3-a3b-orch",
        max_tokens=4096,
        temperature=0.0,
    )


# ---------------------------------------------------------------------------
# Clause type taxonomy used across agents
# ---------------------------------------------------------------------------
CLAUSE_TYPES: tuple[str, ...] = (
    "indemnification",
    "limitation_of_liability",
    "material_adverse_change",
    "change_of_control",
    "termination",
    "confidentiality",
    "non_compete",
    "non_solicitation",
    "governing_law",
    "dispute_resolution",
    "representations_warranties",
    "force_majeure",
    "assignment",
    "insurance",
    "intellectual_property",
    "payment_terms",
    "conditions_precedent",
    "conditions_subsequent",
    "survival",
    "severability",
)

# Risk severity levels
SEVERITY_CRITICAL = "critical"
SEVERITY_HIGH = "high"
SEVERITY_MEDIUM = "medium"
SEVERITY_LOW = "low"
SEVERITY_INFO = "info"

SEVERITY_ORDER: dict[str, int] = {
    SEVERITY_CRITICAL: 0,
    SEVERITY_HIGH: 1,
    SEVERITY_MEDIUM: 2,
    SEVERITY_LOW: 3,
    SEVERITY_INFO: 4,
}


def extract_json(raw: str) -> list[dict[str, Any]]:
    """Extract a JSON array from model output that may contain thinking tags or fences."""
    # Strip <think>...</think> blocks (Qwen3 reasoning mode)
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    # Strip markdown fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1])

    # Find the JSON array in the remaining text
    match = re.search(r"\[.*\]", raw, flags=re.DOTALL)
    if match:
        return json.loads(match.group())

    return []
