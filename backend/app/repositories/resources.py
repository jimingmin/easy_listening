from __future__ import annotations

from collections import defaultdict
from typing import Literal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.schemas import ArticleDetailResponse, ArticleListItem, CollectionSummary, SentenceItem, TopicSummary
from app.topic_tags import STANDARD_TOPICS, normalize_topic


DurationFilter = Literal["short", "medium", "long", "extra-long"]
SortOrder = Literal["newest", "difficulty", "duration"]


def _extract_summary_text(summary: object) -> str | None:
    if isinstance(summary, str):
        return summary.strip() or None
    if isinstance(summary, dict):
        raw = summary.get("article_summary")
        if isinstance(raw, str):
            return raw.strip() or None
    return None


def _extract_tags(article: models.Article) -> list[str]:
    summary = article.summary
    if isinstance(summary, dict):
        raw_tags = summary.get("tags")
        if isinstance(raw_tags, list):
            tags = [str(item).strip() for item in raw_tags if isinstance(item, str) and str(item).strip()]
            if tags:
                return tags
        raw_tag = summary.get("tag")
        if isinstance(raw_tag, str) and raw_tag.strip():
            return [raw_tag.strip()]
    if article.topic and article.topic.strip():
        return [article.topic.strip()]
    return []


def _sentence_count_fallbacks(db: Session, articles: list[models.Article]) -> dict[str, int]:
    missing_ids = [article.id for article in articles if not int(article.sentence_count or 0)]
    if not missing_ids:
        return {}
    rows = (
        db.query(models.Sentence.article_id, func.count().label("sentence_count"))
        .filter(models.Sentence.article_id.in_(missing_ids))
        .group_by(models.Sentence.article_id)
        .all()
    )
    return {article_id: int(sentence_count) for article_id, sentence_count in rows}


def _serialize_article_list_item(
    article: models.Article,
    *,
    fallback_sentence_counts: dict[str, int],
) -> ArticleListItem:
    sentence_count = int(article.sentence_count or 0) or fallback_sentence_counts.get(article.id, 0)
    return ArticleListItem(
        id=article.id,
        user_id=article.user_id,
        title=article.title,
        topic=article.topic,
        level=article.level,
        word_count=int(article.word_count or 0),
        sentence_count=sentence_count,
        paragraph_count=article.paragraph_count,
        duration_ms=article.duration_ms,
        audio_url=article.audio_url,
        image_url=article.image_url,
        summary_text=_extract_summary_text(article.summary),
        tags=_extract_tags(article),
        processing_status=article.processing_status,
        visibility=article.visibility,
        series=article.series,
        static_version=int(article.static_version or 0),
        static_updated_at=article.static_updated_at,
        created_at=article.created_at,
        updated_at=article.updated_at,
    )


def _serialize_sentence(sentence: models.Sentence) -> SentenceItem:
    return SentenceItem(
        article_id=sentence.article_id,
        sentence_seq=sentence.sentence_seq,
        paragraph=sentence.paragraph,
        text=sentence.text,
        start_ms=sentence.start_ms,
        end_ms=sentence.end_ms,
        translation=sentence.translation,
    )


def _apply_duration_filter(query, duration: DurationFilter | None):
    if not duration:
        return query

    ten_minutes = 10 * 60 * 1000
    twenty_minutes = 20 * 60 * 1000
    thirty_minutes = 30 * 60 * 1000
    if duration == "short":
        return query.filter(models.Article.duration_ms.isnot(None), models.Article.duration_ms < ten_minutes)
    if duration == "medium":
        return query.filter(models.Article.duration_ms >= ten_minutes, models.Article.duration_ms < twenty_minutes)
    if duration == "long":
        return query.filter(models.Article.duration_ms >= twenty_minutes, models.Article.duration_ms < thirty_minutes)
    return query.filter(models.Article.duration_ms >= thirty_minutes)


def _base_public_query(db: Session):
    query = db.query(models.Article).filter(models.Article.visibility == settings.public_visibility)
    if not settings.include_non_ready_public_articles:
        query = query.filter(
            (models.Article.processing_status.is_(None))
            | (models.Article.processing_status == "")
            | (models.Article.processing_status == "ready")
        )
    return query


def list_public_articles(
    db: Session,
    *,
    limit: int,
    offset: int,
    series: str | None,
    level: str | None,
    duration: DurationFilter | None,
    topic: str | None,
    search: str | None,
    sort: SortOrder,
) -> tuple[int, list[ArticleListItem]]:
    query = _base_public_query(db)

    if series:
        query = query.filter(models.Article.series == series)
    if level:
        query = query.filter(models.Article.level.ilike(level.strip()))
    if topic:
        if topic == "Other":
            query = query.filter(~models.Article.topic.in_(STANDARD_TOPICS))
        else:
            query = query.filter(models.Article.topic == topic)
    if search:
        search_value = search.strip()
        if search_value:
            query = query.filter(models.Article.title.ilike(f"%{search_value}%"))

    query = _apply_duration_filter(query, duration)
    total = query.count()

    if sort == "difficulty":
        query = query.order_by(models.Article.level.asc(), models.Article.created_at.desc(), models.Article.id.desc())
    elif sort == "duration":
        query = query.order_by(
            models.Article.duration_ms.is_(None).asc(),
            models.Article.duration_ms.asc(),
            models.Article.created_at.desc(),
            models.Article.id.desc(),
        )
    else:
        query = query.order_by(models.Article.created_at.desc(), models.Article.id.desc())

    articles = query.offset(offset).limit(limit).all()
    fallback_counts = _sentence_count_fallbacks(db, articles)
    return total, [
        _serialize_article_list_item(article, fallback_sentence_counts=fallback_counts)
        for article in articles
    ]


def list_public_collections(
    db: Session,
    *,
    limit: int,
    offset: int,
    search: str | None,
) -> tuple[int, list[CollectionSummary]]:
    query = _base_public_query(db).filter(models.Article.series.isnot(None), models.Article.series != "")
    if search:
        search_value = search.strip()
        if search_value:
            query = query.filter(models.Article.series.ilike(f"%{search_value}%"))

    grouped_query = (
        query.with_entities(
            models.Article.series.label("name"),
            func.count().label("article_count"),
            func.max(models.Article.created_at).label("latest_created_at"),
        )
        .group_by(models.Article.series)
        .order_by(func.max(models.Article.created_at).desc(), models.Article.series.asc())
    )

    total = grouped_query.count()
    rows = grouped_query.offset(offset).limit(limit).all()

    items: list[CollectionSummary] = []
    for name, article_count, latest_created_at in rows:
        latest_article = (
            query.filter(models.Article.series == name)
            .order_by(models.Article.created_at.desc(), models.Article.id.desc())
            .first()
        )
        items.append(
            CollectionSummary(
                name=str(name),
                article_count=int(article_count or 0),
                cover_image_url=getattr(latest_article, "image_url", None),
                latest_article_id=getattr(latest_article, "id", None),
                latest_title=getattr(latest_article, "title", None),
                last_updated=latest_created_at,
            )
        )

    return total, items


def list_public_topics(db: Session) -> list[TopicSummary]:
    rows = (
        _base_public_query(db)
        .with_entities(models.Article.topic, func.count().label("topic_count"))
        .filter(models.Article.topic.isnot(None), models.Article.topic != "")
        .group_by(models.Article.topic)
        .all()
    )

    aggregated_counts: dict[str, int] = defaultdict(int)
    for raw_topic, count in rows:
        normalized = normalize_topic(raw_topic, fallback="Other")
        aggregated_counts[normalized] += int(count or 0)

    ordered_topics = [
        TopicSummary(name=topic_name, count=aggregated_counts[topic_name])
        for topic_name in STANDARD_TOPICS
        if aggregated_counts.get(topic_name)
    ]
    if aggregated_counts.get("Other"):
        ordered_topics.append(TopicSummary(name="Other", count=aggregated_counts["Other"]))
    return ordered_topics


def get_public_article_detail(db: Session, article_id: str) -> ArticleDetailResponse | None:
    article = _base_public_query(db).filter(models.Article.id == article_id).first()
    if article is None:
        return None

    fallback_counts = _sentence_count_fallbacks(db, [article])
    list_item = _serialize_article_list_item(article, fallback_sentence_counts=fallback_counts)
    sentences = (
        db.query(models.Sentence)
        .filter(models.Sentence.article_id == article_id)
        .order_by(models.Sentence.sentence_seq.asc())
        .all()
    )
    return ArticleDetailResponse(
        **list_item.model_dump(),
        body_text=article.body_text,
        key_words=list(article.key_words or []),
        key_phrases=list(article.key_phrases or []),
        sentences=[_serialize_sentence(sentence) for sentence in sentences],
    )
