from __future__ import annotations

import secrets
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .db.base import Base


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (
        Index("ix_articles_visibility_created_id", "visibility", "created_at", "id"),
        Index("ix_articles_user_title", "user_id", "title"),
        Index("ix_articles_visibility_duration_created_id", "visibility", "duration_ms", "created_at", "id"),
        Index("ix_articles_visibility_level_created_id", "visibility", "level", "created_at", "id"),
        Index("ix_articles_visibility_series_created_id", "visibility", "series", "created_at", "id"),
        Index("ix_articles_visibility_topic_created_id", "visibility", "topic", "created_at", "id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: secrets.token_hex(16))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(200))
    topic: Mapped[str] = mapped_column(String(100), index=True)
    level: Mapped[str] = mapped_column(String(5), index=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
    )
    body_text: Mapped[str | None] = mapped_column(Text(), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sentence_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    paragraph_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    source: Mapped[str] = mapped_column(String(10), default="text", server_default="text", nullable=False)
    visibility: Mapped[str] = mapped_column(String(20), default="public", server_default="public", nullable=False)
    series: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    key_words: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    key_phrases: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    summary: Mapped[dict[str, Any] | str | None] = mapped_column(JSON, nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    audio_processing_ms: Mapped[int] = mapped_column("audio_generation_ms", Integer, default=0, server_default="0")
    llm_analysis_ms: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    static_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    static_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_status: Mapped[str | None] = mapped_column(String(20), default=None, nullable=True)


class Sentence(Base):
    __tablename__ = "sentences"

    article_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("articles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sentence_seq: Mapped[int] = mapped_column(Integer, primary_key=True)
    paragraph: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(Text())
    start_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    speaker_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
