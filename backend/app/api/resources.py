from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_resource_db_read
from app.repositories.resources import (
    get_public_article_detail,
    list_public_articles,
    list_public_collections,
    list_public_topics,
)
from app.schemas import ArticleDetailResponse, ArticleListResponse, CollectionListResponse, TopicSummary


router = APIRouter(prefix="/resources", tags=["resources"])
legacy_router = APIRouter(tags=["legacy-public-resources"])


@router.get("/articles", response_model=ArticleListResponse)
@legacy_router.get("/articles", response_model=ArticleListResponse)
def get_articles(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    series: str | None = None,
    level: str | None = None,
    duration: Literal["short", "medium", "long", "extra-long"] | None = None,
    topic: str | None = None,
    search: str | None = None,
    sort: Literal["newest", "difficulty", "duration"] = "newest",
    db: Session = Depends(get_resource_db_read),
) -> ArticleListResponse:
    total, items = list_public_articles(
        db,
        limit=limit,
        offset=offset,
        series=series,
        level=level,
        duration=duration,
        topic=topic,
        search=search,
        sort=sort,
    )
    return ArticleListResponse(total=total, limit=limit, offset=offset, sort=sort, items=items)


@router.get("/articles/{article_id}", response_model=ArticleDetailResponse)
@legacy_router.get("/articles/{article_id}", response_model=ArticleDetailResponse)
def get_article_detail(
    article_id: str,
    db: Session = Depends(get_resource_db_read),
) -> ArticleDetailResponse:
    item = get_public_article_detail(db, article_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Article not found.")
    return item


@router.get("/collections", response_model=CollectionListResponse)
@legacy_router.get("/series", response_model=CollectionListResponse)
def get_collections(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = None,
    db: Session = Depends(get_resource_db_read),
) -> CollectionListResponse:
    total, items = list_public_collections(db, limit=limit, offset=offset, search=search)
    return CollectionListResponse(total=total, limit=limit, offset=offset, items=items)


@router.get("/topics", response_model=list[TopicSummary])
@legacy_router.get("/topics", response_model=list[TopicSummary])
def get_topics(db: Session = Depends(get_resource_db_read)) -> list[TopicSummary]:
    return list_public_topics(db)
