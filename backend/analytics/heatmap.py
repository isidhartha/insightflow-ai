"""Heatmap data aggregation and normalization."""

from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.queries import heatmap_data
from backend.shared.logging import get_logger

logger = get_logger(__name__)

# Grid dimensions for aggregated heatmap buckets
GRID_X = 100
GRID_Y = 100


class HeatmapService:
    """Fetches raw click data and normalizes it into a density grid."""

    async def get_heatmap(
        self,
        db: AsyncSession,
        page_url: str,
        viewport_width: int = 1280,
        viewport_height: int = 720,
        limit: int = 2000,
    ) -> Dict[str, Any]:
        raw_points = await heatmap_data(db, page_url, limit=limit)
        aggregated = self._aggregate(
            raw_points, viewport_width, viewport_height
        )
        return {
            "page_url": page_url,
            "total_clicks": len(raw_points),
            "points": raw_points[:500],          # raw sample for fine-grain rendering
            "grid": aggregated,
            "viewport": {"width": viewport_width, "height": viewport_height},
        }

    def _aggregate(
        self,
        points: List[Dict[str, Any]],
        vp_w: int,
        vp_h: int,
    ) -> List[Dict[str, Any]]:
        """Bin clicks into a percentage-based grid."""
        buckets: Dict[tuple, int] = {}
        for p in points:
            bx = int((p["x"] / vp_w) * GRID_X) if vp_w else 0
            by = int((p["y"] / vp_h) * GRID_Y) if vp_h else 0
            bx = max(0, min(bx, GRID_X - 1))
            by = max(0, min(by, GRID_Y - 1))
            buckets[(bx, by)] = buckets.get((bx, by), 0) + 1

        if not buckets:
            return []
        max_val = max(buckets.values())
        return [
            {
                "x": bx,
                "y": by,
                "value": count,
                "intensity": round(count / max_val, 4) if max_val else 0,
            }
            for (bx, by), count in sorted(buckets.items(), key=lambda i: -i[1])
        ]
