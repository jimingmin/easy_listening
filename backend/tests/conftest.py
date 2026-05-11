from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import close_all_sessions


BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("EASY_LISTENING_ENV", "test")
os.environ.setdefault("EASY_LISTENING_TEST_DB", "1")
os.environ.setdefault(
    "EASY_LISTENING_TEST_SQLITE_RESOURCE",
    "sqlite:///./data/resource_test.db",
)

from app.db.base import Base
from app.db.session import SessionLocalWrite, resource_write_engine


@pytest.fixture(scope="session", autouse=True)
def _prepare_schema():
    Base.metadata.drop_all(bind=resource_write_engine)
    Base.metadata.create_all(bind=resource_write_engine)
    yield


@pytest.fixture(autouse=True)
def _clean_tables():
    with resource_write_engine.begin() as conn:
        conn.execute(text("DELETE FROM sentences"))
        conn.execute(text("DELETE FROM articles"))
    yield
    close_all_sessions()
