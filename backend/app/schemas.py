from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthOut(BaseModel):
    status: str
    environment: str
    database_vendor: str


class ArticleListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    title: str
    topic: str
    level: str
    word_count: int
    sentence_count: int
    paragraph_count: int | None = None
    duration_ms: int | None = None
    audio_url: str | None = None
    image_url: str | None = None
    summary_text: str | None = None
    tags: list[str] = Field(default_factory=list)
    processing_status: str | None = None
    visibility: str | None = None
    series: str | None = None
    static_version: int = 0
    static_updated_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SentenceItem(BaseModel):
    article_id: str
    sentence_seq: int
    paragraph: int | None = None
    text: str
    start_ms: int | None = None
    end_ms: int | None = None
    translation: str | None = None


class ArticleListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    sort: Literal["newest", "difficulty", "duration"]
    items: list[ArticleListItem]


class ArticleDetailResponse(ArticleListItem):
    body_text: str | None = None
    key_words: list[object] = Field(default_factory=list)
    key_phrases: list[object] = Field(default_factory=list)
    sentences: list[SentenceItem] = Field(default_factory=list)


class CollectionSummary(BaseModel):
    name: str
    article_count: int
    cover_image_url: str | None = None
    latest_article_id: str | None = None
    latest_title: str | None = None
    last_updated: datetime | None = None


class CollectionListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[CollectionSummary]


class TopicSummary(BaseModel):
    name: str
    count: int
