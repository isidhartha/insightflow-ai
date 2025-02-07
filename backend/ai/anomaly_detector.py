"""Statistical anomaly detection for analytics metrics."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple


class AnomalyDetector:
    """
    Z-score based anomaly detection.

    A data point is anomalous when |z-score| > threshold (default 2.5).
    """

    def __init__(self, threshold: float = 2.5) -> None:
        self.threshold = threshold

    def detect(
        self, series: List[Dict[str, Any]], value_key: str = "value"
    ) -> List[Dict[str, Any]]:
        """
        Return list of anomalous points with z-scores.

        Parameters
        ----------
        series:    list of dicts with at least `value_key` and `date` keys
        value_key: which key to read the numeric metric from
        """
        values = [float(p.get(value_key, 0) or 0) for p in series]
        if len(values) < 3:
            return []

        mean, std = self._stats(values)
        if std == 0:
            return []

        anomalies = []
        for point, val in zip(series, values):
            z = (val - mean) / std
            if abs(z) > self.threshold:
                anomalies.append(
                    {
                        "date": point.get("date"),
                        "value": val,
                        "z_score": round(z, 3),
                        "direction": "spike" if z > 0 else "drop",
                        "severity": self._severity(abs(z)),
                    }
                )
        return anomalies

    def _stats(self, values: List[float]) -> Tuple[float, float]:
        n = len(values)
        mean = sum(values) / n
        variance = sum((v - mean) ** 2 for v in values) / n
        return mean, math.sqrt(variance)

    def _severity(self, abs_z: float) -> str:
        if abs_z > 4:
            return "critical"
        if abs_z > 3:
            return "high"
        return "medium"

    def rolling_anomalies(
        self,
        series: List[Dict[str, Any]],
        value_key: str = "value",
        window: int = 7,
    ) -> List[Dict[str, Any]]:
        """Use a rolling window for more sensitive detection."""
        anomalies: List[Dict[str, Any]] = []
        for i in range(window, len(series)):
            window_values = [
                float(series[j].get(value_key, 0) or 0)
                for j in range(i - window, i)
            ]
            mean, std = self._stats(window_values)
            if std == 0:
                continue
            current = float(series[i].get(value_key, 0) or 0)
            z = (current - mean) / std
            if abs(z) > self.threshold:
                point = series[i].copy()
                point["z_score"] = round(z, 3)
                point["direction"] = "spike" if z > 0 else "drop"
                point["severity"] = self._severity(abs(z))
                anomalies.append(point)
        return anomalies
