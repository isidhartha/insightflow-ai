"""Analytics reporting endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.analytics.funnel_analyzer import FunnelAnalyzer
from backend.analytics.heatmap import HeatmapService
from backend.analytics.retention import RetentionAnalyzer
from backend.ai.anomaly_detector import AnomalyDetector
from backend.ai.insights_engine import InsightsEngine
from backend.ai.recommendations import RecommendationsEngine
from backend.db.queries import (
    count_events,
    count_sessions,
    count_unique_users,
    list_events,
    pageviews_over_time,
)
from backend.shared.logging import get_logger
from backend.shared.utils import parse_date

logger = get_logger(__name__)
router = APIRouter()

funnel_analyzer = FunnelAnalyzer()
retention_analyzer = RetentionAnalyzer()
heatmap_svc = HeatmapService()
insights_engine = InsightsEngine()
recommendations_engine = RecommendationsEngine()
anomaly_detector = AnomalyDetector()


async def get_db(request: Request) -> AsyncSession:
    return request.state.db


def _date_range(
    start_str: Optional[str], end_str: Optional[str]
) -> tuple:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=30)
    start = parse_date(start_str, start)
    end = parse_date(end_str, end)
    return start, end


@router.get("/analytics/overview")
async def overview(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    s, e = _date_range(start, end)
    total_events, unique_users, sessions = (
        await count_events(db, s, e),
        await count_unique_users(db, s, e),
        await count_sessions(db, s, e),
    )
    return {
        "total_events": total_events,
        "unique_users": unique_users,
        "sessions": sessions,
        "date_range": {"start": s.isoformat(), "end": e.isoformat()},
    }


@router.get("/analytics/pageviews")
async def pageviews(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    granularity: str = Query("day", pattern="^(hour|day|week|month)$"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    s, e = _date_range(start, end)
    series = await pageviews_over_time(db, s, e, granularity)
    anomalies = anomaly_detector.detect(series, "pageviews")
    return {"series": series, "anomalies": anomalies, "granularity": granularity}


@router.post("/analytics/funnel")
async def funnel(
    payload: Dict[str, Any],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    steps: List[Dict[str, str]] = payload.get("steps", [])
    start_str = payload.get("start")
    end_str = payload.get("end")
    s, e = _date_range(start_str, end_str)
    return await funnel_analyzer.analyze(db, steps, s, e)


@router.get("/analytics/retention")
async def retention(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    granularity: str = Query("week", pattern="^(week|month)$"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    s, e = _date_range(start, end)
    return await retention_analyzer.cohort_retention(db, s, e, granularity)


@router.get("/analytics/heatmap")
async def heatmap(
    page_url: str = Query(...),
    viewport_width: int = Query(1280),
    viewport_height: int = Query(720),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await heatmap_svc.get_heatmap(
        db, page_url, viewport_width, viewport_height
    )


@router.get("/analytics/events")
async def events(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    s, e = _date_range(start, end)
    items = await list_events(db, s, e, event_name, limit, offset)
    return {"events": items, "limit": limit, "offset": offset}


@router.post("/ai/insights")
async def ai_insights(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await insights_engine.generate_insights(payload)


@router.post("/ai/recommendations")
async def ai_recommendations(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    recs = await recommendations_engine.generate(payload)
    return {"recommendations": recs}
