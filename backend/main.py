"""InsightFlow AI — FastAPI application entry point."""

from __future__ import annotations

import contextlib
from typing import AsyncIterator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.api.capture import router as capture_router
from backend.api.dashboards import router as dashboard_router
from backend.api.reports import router as reports_router
from backend.db.migrations import run_migrations
from backend.shared.config import get_settings
from backend.shared.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Database engine (module-level, shared)
# ---------------------------------------------------------------------------
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    await run_migrations(engine)
    yield
    await engine.dispose()
    logger.info("Shutdown complete")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Powered Product Analytics Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# DB session middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def db_session_middleware(request: Request, call_next) -> Response:
    async with AsyncSessionLocal() as session:
        request.state.db = session
        try:
            response = await call_next(request)
            return response
        except Exception:
            await session.rollback()
            raise


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "InsightFlow AI", "version": settings.app_version}


PREFIX = "/api/v1"
app.include_router(capture_router, prefix=PREFIX, tags=["Capture"])
app.include_router(reports_router, prefix=PREFIX, tags=["Analytics"])
app.include_router(dashboard_router, prefix=PREFIX, tags=["Dashboard"])


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
