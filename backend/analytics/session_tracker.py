"""Session creation and update logic."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Session as SessionModel
from backend.shared.logging import get_logger
from backend.shared.utils import generate_id, now_utc

logger = get_logger(__name__)

SESSION_TIMEOUT_SECONDS = 30 * 60  # 30 minutes


class SessionTracker:
    """Manages session lifecycle for anonymous and identified users."""

    async def get_or_create(
        self,
        db: AsyncSession,
        distinct_id: str,
        session_id: Optional[str],
        referrer: Optional[str] = None,
        device_type: Optional[str] = None,
    ) -> SessionModel:
        if session_id:
            result = await db.execute(
                select(SessionModel).where(SessionModel.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                return session

        return await self._create_session(db, distinct_id, referrer, device_type)

    async def _create_session(
        self,
        db: AsyncSession,
        distinct_id: str,
        referrer: Optional[str],
        device_type: Optional[str],
    ) -> SessionModel:
        session = SessionModel(
            id=generate_id(),
            distinct_id=distinct_id,
            start_time=now_utc(),
            page_count=1,
            referrer=referrer,
            device_type=device_type,
        )
        db.add(session)
        await db.flush()
        logger.debug("Created session %s for %s", session.id, distinct_id)
        return session

    async def record_pageview(
        self,
        db: AsyncSession,
        session_id: str,
        timestamp: datetime,
    ) -> None:
        result = await db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return
        session.page_count = (session.page_count or 0) + 1
        session.end_time = timestamp
        if session.start_time:
            session.duration = (timestamp - session.start_time).total_seconds()
