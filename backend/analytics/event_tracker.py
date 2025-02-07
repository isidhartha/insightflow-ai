"""Event ingestion — validates and persists captured events."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Event, HeatmapClick, Person, Session
from backend.shared.logging import get_logger
from backend.shared.utils import generate_id, hash_ip, now_utc

logger = get_logger(__name__)


class EventIngestionService:
    """Validates incoming events and persists them to the database."""

    CLICK_EVENT = "$click"
    PAGEVIEW_EVENT = "$pageview"
    IDENTIFY_EVENT = "$identify"
    HEATMAP_EVENTS = {"$click", "$heatmap"}

    async def ingest(
        self,
        db: AsyncSession,
        *,
        event: str,
        distinct_id: str,
        properties: Dict[str, Any],
        session_id: Optional[str] = None,
        page_url: Optional[str] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ) -> Event:
        ts = timestamp or now_utc()
        hashed_ip = hash_ip(ip) if ip else None

        record = Event(
            id=generate_id(),
            distinct_id=distinct_id,
            event=event,
            properties=properties,
            timestamp=ts,
            session_id=session_id,
            page_url=page_url or properties.get("$current_url"),
            ip=hashed_ip,
            user_agent=user_agent,
        )
        db.add(record)

        await self._update_person(db, distinct_id, properties, ts)

        if event in self.HEATMAP_EVENTS:
            await self._record_heatmap(db, record, properties)

        await db.commit()
        logger.debug("Ingested event %s for %s", event, distinct_id)
        return record

    async def _update_person(
        self,
        db: AsyncSession,
        distinct_id: str,
        properties: Dict[str, Any],
        ts: datetime,
    ) -> None:
        result = await db.execute(
            select(Person).where(Person.distinct_id == distinct_id)
        )
        person = result.scalar_one_or_none()
        if person is None:
            person = Person(
                id=generate_id(),
                distinct_id=distinct_id,
                properties=properties,
                created_at=ts,
                last_seen=ts,
                email=properties.get("email"),
                name=properties.get("name"),
            )
            db.add(person)
        else:
            person.last_seen = ts
            if properties.get("email"):
                person.email = properties["email"]
            if properties.get("name"):
                person.name = properties["name"]

    async def _record_heatmap(
        self,
        db: AsyncSession,
        event: Event,
        properties: Dict[str, Any],
    ) -> None:
        x = properties.get("x") or properties.get("clientX", 0)
        y = properties.get("y") or properties.get("clientY", 0)
        if x is None or y is None:
            return
        click = HeatmapClick(
            id=generate_id(),
            page_url=event.page_url or "",
            x=float(x),
            y=float(y),
            scroll_depth=properties.get("scrollDepth"),
            element_selector=properties.get("selector"),
            timestamp=event.timestamp,
            session_id=event.session_id,
        )
        db.add(click)
