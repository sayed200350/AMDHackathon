"""Mock vLLM server for local testing without GPUs.

Serves OpenAI-compatible endpoints that return sample agent outputs,
so the full pipeline (FastAPI + CrewAI + Streamlit) can be tested locally.

Usage:
    python infra/mock_vllm.py              # Starts on ports 8000 + 8001
    python infra/mock_vllm.py --port 8000  # Single port
"""

from __future__ import annotations

import argparse
import json
import time
import uuid

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Mock vLLM Server")


# ---------------------------------------------------------------------------
# Sample responses for each agent type
# ---------------------------------------------------------------------------
SAMPLE_CLAUSES = json.dumps([
    {
        "clause_type": "indemnification",
        "text": "Buyer shall indemnify and hold harmless the Seller from any losses arising out of any breach of representation...",
        "section_ref": "Section 8.2",
        "page": 34,
        "document_name": "purchase_agreement.txt",
        "confidence": 0.95,
    },
    {
        "clause_type": "termination",
        "text": "This Agreement may be terminated by either party upon thirty (30) days written notice...",
        "section_ref": "Section 10.1",
        "page": 45,
        "document_name": "purchase_agreement.txt",
        "confidence": 0.92,
    },
    {
        "clause_type": "governing_law",
        "text": "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware...",
        "section_ref": "Section 12.5",
        "page": 52,
        "document_name": "purchase_agreement.txt",
        "confidence": 0.98,
    },
])

SAMPLE_RISKS = json.dumps([
    {
        "clause_type": "indemnification",
        "section_ref": "Section 8.2",
        "page": 34,
        "document_name": "purchase_agreement.txt",
        "severity": "critical",
        "deviation": "Indemnification is uncapped with no basket or deductible",
        "market_standard": "Typically capped at 1x purchase price with a 1% basket",
        "recommendation": "Add indemnity cap equal to purchase price and a 1% mini-basket",
    },
    {
        "clause_type": "termination",
        "section_ref": "Section 10.1",
        "page": 45,
        "document_name": "purchase_agreement.txt",
        "severity": "medium",
        "deviation": "30-day notice period is shorter than typical",
        "market_standard": "60-90 day notice period for termination",
        "recommendation": "Negotiate to 60-day notice minimum",
    },
])

SAMPLE_OBLIGATIONS = json.dumps([
    {
        "obligation": "Deliver audited financial statements for the three most recent fiscal years",
        "obligor": "Seller",
        "obligee": "Buyer",
        "due_date": "10 business days after execution",
        "condition": "unconditional",
        "section_ref": "Section 5.1(a)",
        "page": 22,
        "document_name": "purchase_agreement.txt",
        "priority": "high",
    },
    {
        "obligation": "Obtain all required regulatory approvals",
        "obligor": "Both parties",
        "obligee": "Both parties",
        "due_date": "Prior to closing",
        "condition": "unconditional",
        "section_ref": "Section 6.3",
        "page": 28,
        "document_name": "purchase_agreement.txt",
        "priority": "critical",
    },
])

SAMPLE_CROSSREFS = json.dumps([
    {
        "finding_type": "contradiction",
        "document_a": "purchase_agreement.txt",
        "section_a": "Section 2.1(a)",
        "page_a": 8,
        "text_a": "The Closing Date shall mean June 30, 2025",
        "document_b": "side_letter.txt",
        "section_b": "Paragraph 3",
        "page_b": 2,
        "text_b": "Closing shall occur no later than May 15, 2025",
        "explanation": "Conflicting closing dates: June 30 in the purchase agreement vs May 15 in the side letter",
        "severity": "critical",
    },
    {
        "finding_type": "undefined_term",
        "document_a": "purchase_agreement.txt",
        "section_a": "Section 12.3",
        "page_a": 50,
        "text_a": "all Material Contracts shall be assigned to Buyer",
        "document_b": "purchase_agreement.txt",
        "section_b": "Section 1.1",
        "page_b": 3,
        "text_b": "[definitions section - term not found]",
        "explanation": "Term 'Material Contract' is used in Section 12.3 but is not defined in the definitions section",
        "severity": "high",
    },
])

SAMPLE_MEMO = """# Contract Review Memo

**Matter:** Sample Acquisition
**Prepared by:** Counsel-in-a-Box Automated Review
**Confidential — Attorney Work Product**

---

## Executive Summary

This deal package contains a stock purchase agreement with several non-standard provisions that require attention. The most critical finding is an uncapped indemnification clause (Section 8.2) that exposes the Buyer to unlimited liability. Additionally, the Cross-Reference Auditor identified a conflicting closing date between the purchase agreement and a side letter.

## Critical Findings

1. **CRITICAL — Uncapped Indemnification** (purchase_agreement.txt, Section 8.2, p.34)
   - Current: No cap, no basket, no deductible
   - Market: 1x purchase price cap, 1% basket
   - Action: Negotiate cap and basket immediately

2. **CRITICAL — Conflicting Closing Dates** (purchase_agreement.txt Section 2.1(a) vs side_letter.txt Paragraph 3)
   - Purchase agreement states June 30
   - Side letter states May 15
   - Action: Resolve discrepancy before execution

## Recommended Next Steps

1. Resolve closing date conflict between purchase agreement and side letter
2. Negotiate indemnification cap and basket
3. Define 'Material Contract' in Section 1.1
4. Extend termination notice period to 60 days
"""


# ---------------------------------------------------------------------------
# Route prompt to appropriate sample response
# ---------------------------------------------------------------------------
def detect_agent_type(messages: list[dict]) -> str:
    """Detect which agent is calling based on the system prompt."""
    system_msg = ""
    for msg in messages:
        if msg.get("role") == "system":
            system_msg = msg.get("content", "").lower()
            break

    if "clause extraction" in system_msg or "clause extractor" in system_msg:
        return "clauses"
    elif "risk" in system_msg and "scorer" in system_msg:
        return "risks"
    elif "obligation" in system_msg:
        return "obligations"
    elif "cross-document" in system_msg or "cross-reference" in system_msg:
        return "crossrefs"
    elif "memo" in system_msg or "synthesize" in system_msg:
        return "memo"
    return "clauses"


AGENT_RESPONSES = {
    "clauses": SAMPLE_CLAUSES,
    "risks": SAMPLE_RISKS,
    "obligations": SAMPLE_OBLIGATIONS,
    "crossrefs": SAMPLE_CROSSREFS,
    "memo": SAMPLE_MEMO,
}


# ---------------------------------------------------------------------------
# OpenAI-compatible endpoints
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    max_tokens: int = 4096
    temperature: float = 0.1


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest) -> JSONResponse:
    """Mock OpenAI-compatible chat completions endpoint."""
    time.sleep(0.5)

    agent_type = detect_agent_type([m.model_dump() for m in request.messages])
    content = AGENT_RESPONSES.get(agent_type, SAMPLE_CLAUSES)

    return JSONResponse({
        "id": f"mock-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "model": request.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 1000,
            "completion_tokens": 500,
            "total_tokens": 1500,
        },
    })


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/models")
async def list_models() -> JSONResponse:
    return JSONResponse({
        "data": [
            {"id": "qwen3-32b-legal", "object": "model"},
            {"id": "qwen3-a3b-orch", "object": "model"},
        ]
    })


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="Mock vLLM server")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    print(f"Starting mock vLLM on port {args.port}")
    print("This returns sample responses for all agent types.")
    print("Use this for local testing without GPUs.\n")

    uvicorn.run(app, host="0.0.0.0", port=args.port)
