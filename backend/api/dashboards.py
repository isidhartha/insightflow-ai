"""Dashboard CRUD API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Dashboard
from backend.shared.logging import get_logger
from backend.shared.utils import generate_id, now_utc

logger = get_logger(__name__)
router = APIRouter()


class DashboardWidget(BaseModel):
    id: str
    type: str
    title: str
    x: int = 0
    y: int = 0
    w: int = 6
    h: int = 4
    config: Dict[str, Any] = Field(default_factory=dict)


class DashboardPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    widgets: List[DashboardWidget] = Field(default_factory=list)


async def get_db(request: Request) -> AsyncSession:
    return request.state.db


@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Return the default (first) dashboard, or a starter layout."""
    result = await db.execute(select(Dashboard).order_by(Dashboard.created_at).limit(1))
    dash = result.scalar_one_or_none()
    if not dash:
        return _default_dashboard()
    return {
        "id": dash.id,
        "name": dash.name,
        "layout": dash.layout,
        "created_at": dash.created_at.isoformat(),
        "updated_at": dash.updated_at.isoformat(),
    }


@router.put("/dashboard")
async def save_dashboard(
    payload: DashboardPayload,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Upsert dashboard layout."""
    result = await db.execute(select(Dashboard).order_by(Dashboard.created_at).limit(1))
    dash = result.scalar_one_or_none()

    layout = {"name": payload.name, "widgets": [w.model_dump() for w in payload.widgets]}

    if dash is None:
        dash = Dashboard(
            id=generate_id(),
            name=payload.name,
            layout=layout,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(dash)
    else:
        dash.name = payload.name
        dash.layout = layout
        dash.updated_at = now_utc()

    await db.commit()
    return {"id": dash.id, "name": dash.name, "status": "saved"}


def _default_dashboard() -> Dict[str, Any]:
    return {
        "id": "default",
        "name": "Main Dashboard",
        "layout": {
            "widgets": [
                {"id": "w1", "type": "metrics_grid", "title": "Overview Metrics", "x": 0, "y": 0, "w": 12, "h": 2},
                {"id": "w2", "type": "pageviews_chart", "title": "Pageviews Over Time", "x": 0, "y": 2, "w": 8, "h": 4},
                {"id": "w3", "type": "ai_insights", "title": "AI Insights", "x": 8, "y": 2, "w": 4, "h": 4},
                {"id": "w4", "type": "funnel_chart", "title": "Conversion Funnel", "x": 0, "y": 6, "w": 6, "h": 4},
                {"id": "w5", "type": "retention_table", "title": "Retention", "x": 6, "y": 6, "w": 6, "h": 4},
                {"id": "w6", "type": "events_table", "title": "Live Events", "x": 0, "y": 10, "w": 12, "h": 4},
            ]
        },
        "created_at": None,
        "updated_at": None,
    }
