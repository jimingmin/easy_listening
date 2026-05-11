from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.resources import legacy_router, router as resources_router
from app.config import settings
from app.schemas import HealthOut


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resources_router, prefix=settings.api_prefix)
app.include_router(legacy_router, prefix=settings.api_prefix)


@app.exception_handler(OperationalError)
def handle_operational_error(_request, _exc: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Resource database is unavailable.",
            "environment": settings.runtime_env,
        },
    )


@app.get("/healthz", response_model=HealthOut)
def healthz() -> HealthOut:
    return HealthOut(
        status="ok",
        environment=settings.runtime_env,
        database_vendor=settings.db_vendor,
    )
