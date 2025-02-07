"""Cohort retention analysis — N-day / N-week retention matrix."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.shared.logging import get_logger

logger = get_logger(__name__)


class RetentionAnalyzer:
    """
    Builds a cohort retention matrix.

    Rows  = cohorts (users grouped by their first-seen week/month).
    Cols  = periods after acquisition (0, 1, 2, … N weeks/months).
    Value = % of cohort members who performed any event in that period.
    """

    async def cohort_retention(
        self,
        db: AsyncSession,
        start: datetime,
        end: datetime,
        granularity: str = "week",
    ) -> Dict[str, Any]:
        cohort_users = await self._get_cohort_users(db, start, end, granularity)
        if not cohort_users:
            return {"cohorts": [], "max_periods": 0}

        max_periods = self._max_periods(cohort_users, end, granularity)
        rows = []
        for cohort_label, (cohort_start, users) in cohort_users.items():
            row = await self._build_row(
                db,
                cohort_label=cohort_label,
                cohort_start=cohort_start,
                users=users,
                max_periods=max_periods,
                granularity=granularity,
            )
            rows.append(row)
        return {"cohorts": rows, "max_periods": max_periods}

    async def _get_cohort_users(
        self,
        db: AsyncSession,
        start: datetime,
        end: datetime,
        granularity: str,
    ) -> Dict[str, tuple]:
        trunc = "week" if granularity == "week" else "month"
        sql = text(
            f"""
            SELECT
                DATE_TRUNC('{trunc}', first_seen AT TIME ZONE 'UTC') AS cohort_start,
                ARRAY_AGG(distinct_id) AS users
            FROM (
                SELECT distinct_id, MIN(timestamp) AS first_seen
                FROM events
                WHERE timestamp BETWEEN :start AND :end
                GROUP BY distinct_id
            ) sub
            GROUP BY 1
            ORDER BY 1
            """
        )
        result = await db.execute(sql, {"start": start, "end": end})
        cohorts: Dict[str, tuple] = {}
        for row in result:
            label = row.cohort_start.strftime(
                "%Y-W%W" if granularity == "week" else "%Y-%m"
            )
            cohorts[label] = (row.cohort_start, row.users)
        return cohorts

    async def _build_row(
        self,
        db: AsyncSession,
        *,
        cohort_label: str,
        cohort_start: datetime,
        users: List[str],
        max_periods: int,
        granularity: str,
    ) -> Dict[str, Any]:
        size = len(users)
        periods = []
        for period_idx in range(max_periods + 1):
            period_start, period_end = self._period_bounds(
                cohort_start, period_idx, granularity
            )
            retained = await self._count_retained(db, users, period_start, period_end)
            pct = round(retained / size * 100, 1) if size else 0
            periods.append(
                {"period": period_idx, "users": retained, "percentage": pct}
            )
        return {
            "cohort": cohort_label,
            "cohort_size": size,
            "periods": periods,
        }

    async def _count_retained(
        self,
        db: AsyncSession,
        users: List[str],
        period_start: datetime,
        period_end: datetime,
    ) -> int:
        sql = text(
            """
            SELECT COUNT(DISTINCT distinct_id)
            FROM events
            WHERE distinct_id = ANY(:users)
              AND timestamp BETWEEN :start AND :end
            """
        )
        result = await db.execute(
            sql, {"users": users, "start": period_start, "end": period_end}
        )
        return result.scalar_one() or 0

    def _period_bounds(
        self, cohort_start: datetime, period: int, granularity: str
    ) -> tuple:
        if granularity == "week":
            delta = timedelta(weeks=period)
            window = timedelta(weeks=1)
        else:
            # Approximate month as 30 days
            delta = timedelta(days=30 * period)
            window = timedelta(days=30)
        start = cohort_start + delta
        end = start + window
        return start, end

    def _max_periods(
        self,
        cohort_users: Dict[str, tuple],
        end: datetime,
        granularity: str,
    ) -> int:
        first_cohort = list(cohort_users.values())[0][0]
        delta = end - first_cohort
        if granularity == "week":
            return min(int(delta.days / 7), 12)
        return min(int(delta.days / 30), 12)
