"""Reusable async analytics query helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Event, HeatmapClick, Person, Session


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------


async def count_events(
    db: AsyncSession, start: datetime, end: datetime
) -> int:
    result = await db.execute(
        select(func.count(Event.id)).where(
            Event.timestamp >= start, Event.timestamp <= end
        )
    )
    return result.scalar_one() or 0


async def count_unique_users(
    db: AsyncSession, start: datetime, end: datetime
) -> int:
    result = await db.execute(
        select(func.count(func.distinct(Event.distinct_id))).where(
            Event.timestamp >= start, Event.timestamp <= end
        )
    )
    return result.scalar_one() or 0


async def count_sessions(
    db: AsyncSession, start: datetime, end: datetime
) -> int:
    result = await db.execute(
        select(func.count(Session.id)).where(
            Session.start_time >= start, Session.start_time <= end
        )
    )
    return result.scalar_one() or 0


# ---------------------------------------------------------------------------
# Pageviews over time
# ---------------------------------------------------------------------------


async def pageviews_over_time(
    db: AsyncSession, start: datetime, end: datetime, granularity: str = "day"
) -> List[Dict[str, Any]]:
    trunc_map = {"hour": "hour", "day": "day", "week": "week", "month": "month"}
    trunc = trunc_map.get(granularity, "day")

    sql = text(
        f"""
        SELECT
            DATE_TRUNC('{trunc}', timestamp AT TIME ZONE 'UTC') AS period,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT distinct_id) AS unique_visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp BETWEEN :start AND :end
        GROUP BY 1
        ORDER BY 1
        """
    )
    rows = await db.execute(sql, {"start": start, "end": end})
    return [
        {
            "date": r.period.isoformat() if r.period else None,
            "pageviews": r.pageviews,
            "unique_visitors": r.unique_visitors,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Events list (paginated)
# ---------------------------------------------------------------------------


async def list_events(
    db: AsyncSession,
    start: datetime,
    end: datetime,
    event_name: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    q = select(Event).where(Event.timestamp >= start, Event.timestamp <= end)
    if event_name:
        q = q.where(Event.event == event_name)
    q = q.order_by(Event.timestamp.desc()).limit(limit).offset(offset)
    rows = await db.execute(q)
    events = rows.scalars().all()
    return [
        {
            "id": e.id,
            "distinct_id": e.distinct_id,
            "event": e.event,
            "properties": e.properties,
            "timestamp": e.timestamp.isoformat(),
            "page_url": e.page_url,
            "session_id": e.session_id,
        }
        for e in events
    ]


# ---------------------------------------------------------------------------
# Heatmap
# ---------------------------------------------------------------------------


async def heatmap_data(
    db: AsyncSession, page_url: str, limit: int = 2000
) -> List[Dict[str, Any]]:
    q = (
        select(HeatmapClick)
        .where(HeatmapClick.page_url == page_url)
        .order_by(HeatmapClick.timestamp.desc())
        .limit(limit)
    )
    rows = await db.execute(q)
    clicks = rows.scalars().all()
    return [
        {
            "x": c.x,
            "y": c.y,
            "scroll_depth": c.scroll_depth,
            "element": c.element_selector,
            "timestamp": c.timestamp.isoformat(),
        }
        for c in clicks
    ]
