"""Database models for matter persistence."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


class Matter(Base):
    """A legal matter (deal package) submitted for review."""

    __tablename__ = "matters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    document_names = Column(JSON, nullable=False, default=list)
    total_pages = Column(String(20), nullable=True)
    total_tokens = Column(String(20), nullable=True)

    # Agent results stored as JSON
    clauses = Column(JSON, nullable=True)
    risks = Column(JSON, nullable=True)
    obligations = Column(JSON, nullable=True)
    crossrefs = Column(JSON, nullable=True)

    # Final memo
    memo_markdown = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Engine / session factory
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://counsel:counsel_dev_pw@localhost:5432/counsel",
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    """Create all tables if they don't exist."""
    Base.metadata.create_all(engine)


def get_session() -> Session:
    """Return a new database session."""
    return SessionLocal()
