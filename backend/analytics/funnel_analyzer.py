"""Funnel conversion analysis."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.shared.logging import get_logger

logger = get_logger(__name__)


class FunnelStep:
    def __init__(self, event: str, label: str) -> None:
        self.event = event
        self.label = label


class FunnelAnalyzer:
    """
    Calculates ordered funnel conversions.

    Each user must complete step N before step N+1 is counted.
    Window: events within the date range in chronological order.
    """

    async def analyze(
        self,
        db: AsyncSession,
        steps: List[Dict[str, str]],
        start: datetime,
        end: datetime,
    ) -> Dict[str, Any]:
        if not steps:
            return {"steps": [], "overall_conversion": 0}

        step_counts = await self._ordered_step_counts(db, steps, start, end)
        return self._build_result(steps, step_counts)

    async def _ordered_step_counts(
        self,
        db: AsyncSession,
        steps: List[Dict[str, str]],
        start: datetime,
        end: datetime,
    ) -> List[int]:
        """
        For each step, count distinct users who completed all prior steps first.
        Uses a sequential subquery approach compatible with standard PostgreSQL.
        """
        counts: List[int] = []

        for i, step in enumerate(steps):
            if i == 0:
                sql = text(
                    """
                    SELECT COUNT(DISTINCT distinct_id)
                    FROM events
                    WHERE event = :evt
                      AND timestamp BETWEEN :start AND :end
                    """
                )
                result = await db.execute(
                    sql, {"evt": step["event"], "start": start, "end": end}
                )
                counts.append(result.scalar_one() or 0)
            else:
                prev_event = steps[i - 1]["event"]
                curr_event = step["event"]
                sql = text(
                    """
                    SELECT COUNT(DISTINCT e2.distinct_id)
                    FROM events e1
                    JOIN events e2
                      ON e1.distinct_id = e2.distinct_id
                     AND e2.timestamp > e1.timestamp
                     AND e2.timestamp BETWEEN :start AND :end
                    WHERE e1.event = :prev_evt
                      AND e1.timestamp BETWEEN :start AND :end
                      AND e2.event = :curr_evt
                    """
                )
                result = await db.execute(
                    sql,
                    {
                        "prev_evt": prev_event,
                        "curr_evt": curr_event,
                        "start": start,
                        "end": end,
                    },
                )
                counts.append(result.scalar_one() or 0)
        return counts

    def _build_result(
        self, steps: List[Dict[str, str]], counts: List[int]
    ) -> Dict[str, Any]:
        result_steps = []
        for i, (step, count) in enumerate(zip(steps, counts)):
            prev_count = counts[i - 1] if i > 0 else count
            conversion = (count / prev_count * 100) if prev_count else 0
            drop_off = 100 - conversion
            result_steps.append(
                {
                    "step": i + 1,
                    "event": step["event"],
                    "label": step.get("label", step["event"]),
                    "users": count,
                    "conversion_rate": round(conversion, 2),
                    "drop_off_rate": round(drop_off, 2),
                }
            )

        first = counts[0] if counts else 0
        last = counts[-1] if counts else 0
        overall = round(last / first * 100, 2) if first else 0

        return {"steps": result_steps, "overall_conversion": overall}
