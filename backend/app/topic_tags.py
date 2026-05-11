from __future__ import annotations

from typing import Optional


STANDARD_TOPICS: list[str] = [
    "Daily Life",
    "Food & Cooking",
    "Home & Living",
    "Hobbies & Interests",
    "Travel & Geography",
    "Movies & TV Shows",
    "Music & Art",
    "Pop Culture",
    "Humor & Jokes",
    "Science & Nature",
    "Technology & Digital",
    "History & Culture",
    "Biography & Stories",
    "Academic & Research",
    "Language Learning",
    "Literature & Classics",
    "Education & Study",
    "Career & Workplace",
    "Business & Economy",
    "Finance & Money",
    "Health & Fitness",
    "Mental Health",
    "News & Current Affairs",
]

_LOWER_TO_CANONICAL = {topic.lower(): topic for topic in STANDARD_TOPICS}

_ALIASES = {
    "technology": "Technology & Digital",
    "science": "Science & Nature",
    "nature": "Science & Nature",
    "finance": "Finance & Money",
    "health": "Health & Fitness",
    "education": "Education & Study",
    "general": "Other",
    "test": "Other",
}


def normalize_topic(raw: Optional[str], *, fallback: str = "Other") -> str:
    if not raw or not isinstance(raw, str):
        return fallback

    cleaned = raw.strip()
    if not cleaned:
        return fallback

    key = cleaned.lower()
    if key in _LOWER_TO_CANONICAL:
        return _LOWER_TO_CANONICAL[key]
    if key in _ALIASES:
        return _ALIASES[key]

    raw_tokens = set(key.replace("&", " ").split())
    best_score = 0.0
    best_topic: str | None = None
    for candidate in STANDARD_TOPICS:
        candidate_tokens = set(candidate.lower().replace("&", " ").split())
        if not candidate_tokens:
            continue
        overlap = len(raw_tokens & candidate_tokens)
        score = overlap / min(len(raw_tokens), len(candidate_tokens))
        if score > best_score:
            best_score = score
            best_topic = candidate

    if best_score >= 0.5 and best_topic:
        return best_topic
    return fallback
