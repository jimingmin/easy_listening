from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

import app.api.resources as resources_api
from app.db.session import SessionLocalWrite
from app.main import app
from app.models import Article, Sentence


client = TestClient(app)


def _create_article(
    *,
    article_id: str,
    title: str,
    topic: str,
    level: str = "B1",
    series: str | None = None,
    visibility: str = "public",
    summary: object | None = None,
    sentence_count: int = 0,
    created_at_offset_hours: int = 0,
) -> None:
    created_at = datetime.now(timezone.utc) + timedelta(hours=created_at_offset_hours)
    db = SessionLocalWrite()
    try:
        db.add(
            Article(
                id=article_id,
                user_id="admin",
                title=title,
                topic=topic,
                level=level,
                word_count=100,
                sentence_count=sentence_count,
                paragraph_count=1,
                duration_ms=8 * 60 * 1000,
                visibility=visibility,
                series=series,
                image_url=f"https://cdn.example.com/{article_id}.jpg",
                summary=summary,
                created_at=created_at,
            )
        )
        if sentence_count == 0:
            db.add(
                Sentence(
                    article_id=article_id,
                    sentence_seq=1,
                    paragraph=1,
                    text="Sentence one.",
                )
            )
        db.commit()
    finally:
        db.close()


def test_list_articles_returns_public_rows_only():
    _create_article(
        article_id="a1",
        title="Public One",
        topic="Technology & Digital",
        sentence_count=0,
        summary={"article_summary": "First summary", "tags": ["Technology & Digital"]},
    )
    _create_article(
        article_id="a2",
        title="Public Two",
        topic="Travel & Geography",
        series="BBC 6 Minute English",
        sentence_count=2,
    )
    _create_article(
        article_id="a3",
        title="Private Hidden",
        topic="Daily Life",
        visibility="private",
        sentence_count=1,
    )

    response = client.get("/api/resources/articles?limit=10&offset=0")
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["total"] == 2
    assert len(payload["items"]) == 2
    assert {item["id"] for item in payload["items"]} == {"a1", "a2"}
    first_article = next(item for item in payload["items"] if item["id"] == "a1")
    assert first_article["sentence_count"] == 1
    assert first_article["summary_text"] == "First summary"


def test_list_collections_groups_series():
    _create_article(
        article_id="b1",
        title="Collection One",
        topic="Daily Life",
        series="BBC 6 Minute English",
        created_at_offset_hours=-1,
    )
    _create_article(
        article_id="b2",
        title="Collection Two",
        topic="Daily Life",
        series="BBC 6 Minute English",
        created_at_offset_hours=1,
    )
    _create_article(
        article_id="b3",
        title="Another Collection",
        topic="Science & Nature",
        series="TED-Ed",
    )

    response = client.get("/api/resources/collections")
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["total"] == 2
    bbc_collection = next(item for item in payload["items"] if item["name"] == "BBC 6 Minute English")
    assert bbc_collection["article_count"] == 2
    assert bbc_collection["latest_article_id"] == "b2"


def test_article_detail_returns_sentences():
    _create_article(
        article_id="detail-1",
        title="Detail Story",
        topic="Daily Life",
        series="Starter Listening",
        summary={"article_summary": "Story summary"},
        sentence_count=0,
    )

    response = client.get("/api/resources/articles/detail-1")
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["id"] == "detail-1"
    assert payload["summary_text"] == "Story summary"
    assert len(payload["sentences"]) == 1
    assert payload["sentences"][0]["sentence_seq"] == 1


def test_list_topics_normalizes_unknown_values_to_other():
    _create_article(article_id="c1", title="Tech", topic="Technology & Digital")
    _create_article(article_id="c2", title="Legacy", topic="general")
    _create_article(article_id="c3", title="Unknown", topic="Extremely Niche Topic")

    response = client.get("/api/resources/topics")
    assert response.status_code == 200, response.text
    payload = response.json()

    counts = {item["name"]: item["count"] for item in payload}
    assert counts["Technology & Digital"] == 1
    assert counts["Other"] == 2


def test_operational_error_becomes_503(monkeypatch):
    def _boom(*args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("db unavailable"))

    monkeypatch.setattr(resources_api, "list_public_articles", _boom)

    response = client.get("/api/resources/articles")
    assert response.status_code == 503
    assert response.json()["detail"] == "Resource database is unavailable."
