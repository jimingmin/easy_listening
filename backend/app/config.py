from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from pydantic import BaseModel


APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

_ENV_ALIASES = {
    "development": "dev",
    "dev": "dev",
    "production": "prod",
    "prod": "prod",
    "test": "test",
}


def _first_env(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value is not None and value != "":
            return value
    return default


def _as_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str | None, *, default: int) -> int:
    if value is None or value == "":
        return default
    return int(value)


def _normalize_runtime_env(raw: str | None) -> str:
    cleaned = (raw or "dev").strip().lower()
    return _ENV_ALIASES.get(cleaned, "dev")


def _load_environment_files() -> str:
    runtime_env = _normalize_runtime_env(
        _first_env("EASY_LISTENING_ENV", "SOUNDANDLEARN_ENV", "ENV", default="dev")
    )
    os.environ["EASY_LISTENING_ENV"] = runtime_env
    os.environ["SOUNDANDLEARN_ENV"] = runtime_env

    try:
        from dotenv import load_dotenv
    except Exception:
        return runtime_env

    initial_environ = dict(os.environ)

    def _load_env_file(path: Path, *, override: bool) -> None:
        if not path.exists():
            return
        load_dotenv(dotenv_path=path, override=override)
        for key, value in initial_environ.items():
            if os.environ.get(key) != value:
                os.environ[key] = value

    root_env = REPO_ROOT / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env, override=False)

    _load_env_file(BACKEND_DIR / ".env", override=True)
    _load_env_file(BACKEND_DIR / f".env_{runtime_env}", override=True)
    return runtime_env


def _looks_like_test_mode(runtime_env: str) -> bool:
    argv = " ".join(sys.argv).lower() if hasattr(sys, "argv") else ""
    return (
        runtime_env == "test"
        or os.getenv("PYTEST_CURRENT_TEST") is not None
        or _as_bool(_first_env("EASY_LISTENING_TEST_DB", "SOUNDANDLEARN_TEST_DB"), default=False)
        or "pytest" in argv
    )


def _normalize_sqlite_url(url: str | None) -> str | None:
    if not url or not url.startswith("sqlite:///") or url.startswith("sqlite:////"):
        return url
    relative = url[len("sqlite:///") :]
    if relative.startswith("./"):
        relative = relative[2:]
    absolute = BACKEND_DIR / relative
    return f"sqlite:////{absolute}"


def _rewrite_mysql_database_name(url: str | None, *, runtime_env: str) -> str | None:
    if not url or not url.startswith("mysql"):
        return url
    parts = urlsplit(url)
    database_name = parts.path.lstrip("/")
    if runtime_env == "dev" and database_name == "resources":
        return urlunsplit(parts._replace(path="/dev_resources"))
    if runtime_env == "prod" and database_name == "dev_resources":
        return urlunsplit(parts._replace(path="/resources"))
    return url


_runtime_env = _load_environment_files()


class Settings(BaseModel):
    app_name: str = _first_env("EASY_LISTENING_APP_NAME", default="Easy Listening API") or "Easy Listening API"
    api_prefix: str = _first_env("EASY_LISTENING_API_PREFIX", default="/api") or "/api"
    runtime_env: str = _normalize_runtime_env(
        _first_env("EASY_LISTENING_ENV", "SOUNDANDLEARN_ENV", "ENV", default="dev")
    )

    db_vendor: str = (
        _first_env("EASY_LISTENING_DB_VENDOR", "SOUNDANDLEARN_DB", default="auto") or "auto"
    ).strip().lower()

    resource_database_url: str | None = _first_env(
        "EASY_LISTENING_DATABASE_URL_RESOURCE",
        "DATABASE_URL_RESOURCE",
        "EASY_LISTENING_DATABASE_URL",
        "DATABASE_URL",
    )
    resource_database_url_read: str | None = _first_env(
        "EASY_LISTENING_DATABASE_URL_RESOURCE_READ",
        "DATABASE_URL_RESOURCE_READ",
        "EASY_LISTENING_DATABASE_URL_READ",
        "DATABASE_URL_READ",
    )
    sqlite_resource_path: str = (
        _first_env(
            "EASY_LISTENING_SQLITE_RESOURCE",
            "SOUNDANDLEARN_SQLITE_RESOURCE",
            default="sqlite:///./data/dev_resources.db",
        )
        or "sqlite:///./data/dev_resources.db"
    )
    test_sqlite_resource_path: str = (
        _first_env(
            "EASY_LISTENING_TEST_SQLITE_RESOURCE",
            "SOUNDANDLEARN_TEST_SQLITE_RESOURCE",
            default="sqlite:///./data/resource_test.db",
        )
        or "sqlite:///./data/resource_test.db"
    )

    db_pool_size: int = _as_int(_first_env("DB_POOL_SIZE"), default=5)
    db_max_overflow: int = _as_int(_first_env("DB_MAX_OVERFLOW"), default=10)
    db_pool_timeout: int = _as_int(_first_env("DB_POOL_TIMEOUT"), default=30)
    db_pool_recycle: int = _as_int(_first_env("DB_POOL_RECYCLE"), default=280)
    db_echo: bool = _as_bool(_first_env("DB_ECHO"), default=False)

    public_visibility: str = _first_env("EASY_LISTENING_PUBLIC_VISIBILITY", default="public") or "public"
    include_non_ready_public_articles: bool = _as_bool(
        _first_env("EASY_LISTENING_INCLUDE_NON_READY_PUBLIC_ARTICLES"),
        default=True,
    )
    cors_allow_origins_raw: str = _first_env(
        "EASY_LISTENING_CORS_ALLOW_ORIGINS",
        "SOUNDANDLEARN_CORS_ALLOW_ORIGINS",
        default="*",
    ) or "*"

    @property
    def cors_allow_origins(self) -> list[str]:
        values = [item.strip() for item in self.cors_allow_origins_raw.split(",") if item.strip()]
        return values or ["*"]

settings = Settings()

if _looks_like_test_mode(_runtime_env):
    settings.runtime_env = "test"
    settings.db_vendor = "sqlite"
    settings.resource_database_url = None
    settings.resource_database_url_read = None
    settings.sqlite_resource_path = settings.test_sqlite_resource_path

settings.sqlite_resource_path = _normalize_sqlite_url(settings.sqlite_resource_path) or settings.sqlite_resource_path
settings.test_sqlite_resource_path = (
    _normalize_sqlite_url(settings.test_sqlite_resource_path) or settings.test_sqlite_resource_path
)
settings.resource_database_url = _rewrite_mysql_database_name(
    settings.resource_database_url,
    runtime_env=settings.runtime_env,
)
settings.resource_database_url_read = _rewrite_mysql_database_name(
    settings.resource_database_url_read,
    runtime_env=settings.runtime_env,
)

if settings.db_vendor == "auto":
    if settings.resource_database_url:
        settings.db_vendor = "mysql" if settings.resource_database_url.startswith("mysql") else "sqlite"
    else:
        settings.db_vendor = "sqlite"
