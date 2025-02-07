"""Event capture API — compatible with PostHog /capture/ format."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.analytics.event_tracker import EventIngestionService
from backend.analytics.session_tracker import SessionTracker
from backend.shared.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

ingestion_svc = EventIngestionService()
session_tracker = SessionTracker()


class CapturePayload(BaseModel):
    event: str = Field(..., min_length=1, max_length=255)
    distinct_id: str = Field(..., min_length=1, max_length=255)
    properties: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[str] = None


class BatchPayload(BaseModel):
    batch: List[CapturePayload]


async def get_db(request: Request) -> AsyncSession:
    return request.state.db


@router.post("/capture", status_code=status.HTTP_200_OK)
async def capture_event(
    payload: CapturePayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Single event capture — drop-in compatible with PostHog /capture/."""
    ts = None
    if payload.timestamp:
        try:
            ts = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        except ValueError:
            pass

    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    user_agent = request.headers.get("User-Agent", "")
    session_id = payload.properties.get("$session_id")

    await ingestion_svc.ingest(
        db,
        event=payload.event,
        distinct_id=payload.distinct_id,
        properties=payload.properties,
        session_id=session_id,
        ip=client_ip,
        user_agent=user_agent,
        timestamp=ts,
    )
    return {"status": "ok"}


@router.post("/capture/batch", status_code=status.HTTP_200_OK)
async def capture_batch(
    payload: BatchPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Batch event capture — up to 100 events per request."""
    if len(payload.batch) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size must not exceed 100 events",
        )

    client_ip = request.headers.get("X-Forwarded-For", "")
    user_agent = request.headers.get("User-Agent", "")
    count = 0

    for item in payload.batch:
        ts = None
        if item.timestamp:
            try:
                ts = datetime.fromisoformat(item.timestamp.replace("Z", "+00:00"))
            except ValueError:
                pass
        await ingestion_svc.ingest(
            db,
            event=item.event,
            distinct_id=item.distinct_id,
            properties=item.properties,
            session_id=item.properties.get("$session_id"),
            ip=client_ip,
            user_agent=user_agent,
            timestamp=ts,
        )
        count += 1

    return {"status": "ok", "processed": count}
