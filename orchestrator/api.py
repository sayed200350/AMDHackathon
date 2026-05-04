"""FastAPI backend — REST endpoints for the Counsel-in-a-Box pipeline."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from agents.export import memo_to_docx
from orchestrator.crew import run_review
from orchestrator.models import Matter, get_session, init_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(
    title="Counsel-in-a-Box",
    description="Legal contract review swarm on AMD MI300X",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class MatterResponse(BaseModel):
    id: str
    name: str
    status: str
    document_names: list[str]
    total_pages: str | None = None
    total_tokens: str | None = None
    created_at: str
    updated_at: str


class MatterDetailResponse(MatterResponse):
    clauses: list[dict[str, Any]] | None = None
    risks: list[dict[str, Any]] | None = None
    obligations: list[dict[str, Any]] | None = None
    crossrefs: list[dict[str, Any]] | None = None
    memo_markdown: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _matter_to_response(matter: Matter) -> MatterResponse:
    return MatterResponse(
        id=matter.id,
        name=matter.name,
        status=matter.status,
        document_names=matter.document_names or [],
        total_pages=matter.total_pages,
        total_tokens=matter.total_tokens,
        created_at=matter.created_at.isoformat() if matter.created_at else "",
        updated_at=matter.updated_at.isoformat() if matter.updated_at else "",
    )


def _concatenate_documents(file_contents: dict[str, str]) -> str:
    """Concatenate all documents with clear headers for context."""
    parts: list[str] = []
    for name, content in file_contents.items():
        parts.append(f"=== DOCUMENT: {name} ===\n{content}\n=== END: {name} ===\n")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/matters", response_model=MatterResponse)
async def create_matter(
    name: str,
    files: list[UploadFile],
    background_tasks: BackgroundTasks,
) -> MatterResponse:
    """Upload documents and start a new legal review."""
    session = get_session()

    try:
        # Read all uploaded files
        file_contents: dict[str, str] = {}
        for f in files:
            raw = await f.read()
            file_contents[f.filename or "unknown"] = raw.decode("utf-8", errors="replace")

        # Create matter record
        matter = Matter(
            name=name,
            status="pending",
            document_names=list(file_contents.keys()),
        )
        session.add(matter)
        session.commit()
        session.refresh(matter)

        # Concatenate documents for the pipeline
        documents = _concatenate_documents(file_contents)

        # Run review in background
        background_tasks.add_task(run_review, matter.id, documents)

        return _matter_to_response(matter)

    finally:
        session.close()


@app.get("/api/matters/{matter_id}", response_model=MatterDetailResponse)
async def get_matter(matter_id: str) -> MatterDetailResponse:
    """Get the status and results of a matter."""
    session = get_session()

    try:
        matter = session.get(Matter, matter_id)
        if matter is None:
            raise HTTPException(status_code=404, detail="Matter not found")

        return MatterDetailResponse(
            id=matter.id,
            name=matter.name,
            status=matter.status,
            document_names=matter.document_names or [],
            total_pages=matter.total_pages,
            total_tokens=matter.total_tokens,
            clauses=matter.clauses,
            risks=matter.risks,
            obligations=matter.obligations,
            crossrefs=matter.crossrefs,
            memo_markdown=matter.memo_markdown,
            created_at=matter.created_at.isoformat() if matter.created_at else "",
            updated_at=matter.updated_at.isoformat() if matter.updated_at else "",
        )

    finally:
        session.close()


@app.get("/api/matters/{matter_id}/memo/docx")
async def download_memo_docx(matter_id: str) -> Response:
    """Download the final memo as a DOCX file."""
    session = get_session()

    try:
        matter = session.get(Matter, matter_id)
        if matter is None:
            raise HTTPException(status_code=404, detail="Matter not found")
        if not matter.memo_markdown:
            raise HTTPException(status_code=400, detail="Memo not yet generated")

        result = memo_to_docx(matter.memo_markdown, matter.name)

        return Response(
            content=result.content,
            media_type=result.content_type,
            headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
        )

    finally:
        session.close()


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
