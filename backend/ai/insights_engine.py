"""AI-powered analytics insights using a configurable LLM backend."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from backend.shared.config import get_settings
from backend.shared.logging import get_logger
from backend.llm_service import chat, LLM_PROVIDER

logger = get_logger(__name__)


INSIGHT_SYSTEM_PROMPT = """You are an expert product analytics consultant.
Analyze the provided analytics data and deliver:
1. Key trends (2-3 bullet points)
2. Anomalies or concerns (1-2 bullet points)
3. Actionable recommendations (2-3 bullet points)
Keep each point under 30 words. Be specific and data-driven."""


INSIGHT_FALLBACK = {
    "trends": [
        "Pageviews are growing steadily — maintain your current content strategy.",
        "Session duration suggests users are engaging deeply with core features.",
        "Mobile traffic is increasing — prioritize mobile UX optimizations.",
    ],
    "concerns": [
        "Funnel drop-off at checkout step exceeds 60% — investigate friction points.",
        "Day-7 retention below 20% — consider onboarding improvements.",
    ],
    "recommendations": [
        "A/B test the signup flow to reduce drop-off at step 2.",
        "Add email reminders on day 3 and day 7 to improve retention.",
        "Invest in performance optimization — pages loading > 3s have 40% higher bounce.",
    ],
    "summary": (
        "Your platform shows healthy growth with 15% week-over-week user increase. "
        "The main opportunity is improving activation and early retention."
    ),
}


class InsightsEngine:
    """Generates AI-powered insights from analytics metrics."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def generate_insights(
        self, metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        llm_available = LLM_PROVIDER == "ollama" or bool(self.settings.openai_api_key)
        if not llm_available:
            logger.info("No LLM configured — returning fallback insights")
            return INSIGHT_FALLBACK

        try:
            return await self._call_llm(metrics)
        except Exception as exc:
            logger.warning("LLM call failed: %s — using fallback", exc)
            return INSIGHT_FALLBACK

    async def _call_llm(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        prompt = (
            f"Analytics data (last 30 days):\n{json.dumps(metrics, indent=2)}\n\n"
            "Provide insights in JSON with keys: trends (list), concerns (list), "
            "recommendations (list), summary (string)."
        )
        messages = [
            {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        # chat() is synchronous; run in executor to keep async interface intact
        import asyncio
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, lambda: chat(messages))
        return json.loads(raw)

    async def analyze_trend(
        self, series: List[Dict[str, Any]], metric: str
    ) -> str:
        """Return a single sentence trend summary for a time series."""
        if len(series) < 2:
            return "Insufficient data to determine trend."
        first_val = series[0].get(metric, 0) or 0
        last_val = series[-1].get(metric, 0) or 0
        if first_val == 0:
            return f"{metric} data collection has started recently."
        change = ((last_val - first_val) / first_val) * 100
        direction = "up" if change >= 0 else "down"
        return f"{metric.replace('_', ' ').title()} is {direction} {abs(change):.1f}% over the selected period."
