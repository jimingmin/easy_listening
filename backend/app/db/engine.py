from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.pool import NullPool

from app.config import settings


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite:")


def _is_mysql(url: str) -> bool:
    return url.startswith("mysql+") or url.startswith("mysql:")


def _looks_like_test_mode() -> bool:
    argv = " ".join(sys.argv).lower() if hasattr(sys, "argv") else ""
    return (
        settings.runtime_env == "test"
        or os.getenv("PYTEST_CURRENT_TEST") is not None
        or os.getenv("EASY_LISTENING_TEST_DB", "").lower() in {"1", "true", "yes"}
        or os.getenv("SOUNDANDLEARN_TEST_DB", "").lower() in {"1", "true", "yes"}
        or "pytest" in argv
    )


def _sqlite_connect_args() -> dict[str, object]:
    return {"check_same_thread": False, "timeout": 30}


def _ensure_sqlite_parent_dir(url: str) -> None:
    database_path = make_url(url).database
    if not database_path or database_path == ":memory:":
        return
    Path(database_path).parent.mkdir(parents=True, exist_ok=True)


def _apply_sqlite_pragmas(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        cursor = None
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.close()
        except Exception:
            if cursor is not None:
                try:
                    cursor.close()
                except Exception:
                    pass


def _normalize_mysql_driver(url: str) -> str:
    if url.startswith("mysql://"):
        return "mysql+pymysql://" + url[len("mysql://") :]
    return url


def build_engine(url: str) -> Engine:
    if _is_sqlite(url):
        _ensure_sqlite_parent_dir(url)
        engine = create_engine(
            url,
            connect_args=_sqlite_connect_args(),
            poolclass=NullPool,
            pool_pre_ping=True,
            echo=settings.db_echo,
        )
        _apply_sqlite_pragmas(engine)
        return engine

    if _is_mysql(url):
        if _looks_like_test_mode():
            raise RuntimeError(
                "Test mode detected but MySQL was requested. Aborting to protect the real database."
            )
        normalized = _normalize_mysql_driver(url)
        return create_engine(
            normalized,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,
            pool_pre_ping=True,
            echo=settings.db_echo,
            connect_args={
                "charset": "utf8mb4",
                "read_timeout": 300,
                "write_timeout": 300,
                "connect_timeout": 10,
            },
        )

    return create_engine(url, pool_pre_ping=True, echo=settings.db_echo)


def get_resource_engines() -> tuple[Engine, Engine]:
    write_url = settings.resource_database_url or settings.sqlite_resource_path
    if not write_url:
        raise RuntimeError("A resource database URL or sqlite path is required.")
    read_url = settings.resource_database_url_read or write_url
    return build_engine(write_url), build_engine(read_url)
