"""Database migration runner — creates all tables on startup."""

from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from backend.db.models import Base
from backend.shared.config import get_settings
from backend.shared.logging import get_logger

logger = get_logger(__name__)


async def run_migrations(engine: AsyncEngine) -> None:
    """Create all tables if they do not exist (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database migrations complete")


async def drop_all(engine: AsyncEngine) -> None:
    """Drop all tables — for test teardown only."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All tables dropped")


if __name__ == "__main__":
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=True)
    asyncio.run(run_migrations(engine))
