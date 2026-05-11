from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy.orm import Session, sessionmaker

from .engine import get_resource_engines


resource_write_engine, resource_read_engine = get_resource_engines()

SessionLocalWrite = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=resource_write_engine,
)
SessionLocalRead = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=resource_read_engine,
)


def get_resource_db_write() -> Iterator[Session]:
    db = SessionLocalWrite()
    try:
        yield db
    finally:
        db.close()


def get_resource_db_read() -> Iterator[Session]:
    db = SessionLocalRead()
    try:
        yield db
    finally:
        db.close()
