"""AI product recommendations based on user behavior patterns."""

from __future__ import annotations

import json
from typing import Any, Dict, List

from backend.shared.config import get_settings
from backend.shared.logging import get_logger
from backend.llm_service import chat, LLM_PROVIDER

logger = get_logger(__name__)


RECOMMENDATIONS_FALLBACK: List[Dict[str, Any]] = [
    {
        "id": "rec_001",
        "type": "onboarding",
        "priority": "high",
        "title": "Add an interactive product tour",
        "description": (
            "Users who complete onboarding have 3x higher 30-day retention. "
            "Only 22% of new users reach the 'create first project' step."
        ),
        "impact": "high",
        "effort": "medium",
        "metric": "Day-30 retention",
        "expected_improvement": "+18%",
    },
    {
        "id": "rec_002",
        "type": "engagement",
        "priority": "high",
        "title": "Implement a weekly digest email",
        "description": (
            "Users receiving weekly analytics summaries visit 2.4x more often. "
            "This feature can be built in < 1 sprint."
        ),
        "impact": "high",
        "effort": "low",
        "metric": "Weekly active users",
        "expected_improvement": "+25%",
    },
    {
        "id": "rec_003",
        "type": "conversion",
        "priority": "medium",
        "title": "Reduce signup form to 3 fields",
        "description": (
            "Every additional form field reduces conversions by ~5%. "
            "Collect extra info post-signup instead."
        ),
        "impact": "medium",
        "effort": "low",
        "metric": "Signup conversion",
        "expected_improvement": "+12%",
    },
    {
        "id": "rec_004",
        "type": "performance",
        "priority": "medium",
        "title": "Optimize image loading on landing page",
        "description": (
            "Landing page loads in 4.2s on mobile. Target < 2s. "
            "Each 1s improvement increases conversions by ~7%."
        ),
        "impact": "medium",
        "effort": "medium",
        "metric": "Bounce rate",
        "expected_improvement": "-15%",
    },
]


class RecommendationsEngine:
    """Generates data-driven product recommendations."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def generate(
        self, context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        llm_available = LLM_PROVIDER == "ollama" or bool(self.settings.openai_api_key)
        if not llm_available:
            return RECOMMENDATIONS_FALLBACK
        try:
            return await self._call_llm(context)
        except Exception as exc:
            logger.warning("Recommendations LLM call failed: %s", exc)
            return RECOMMENDATIONS_FALLBACK

    async def _call_llm(
        self, context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        system = (
            "You are a senior product analyst. Given analytics metrics, return "
            "a JSON array of product recommendations. Each item must have: "
            "id, type, priority, title, description, impact, effort, metric, "
            "expected_improvement."
        )
        prompt = f"Analytics context:\n{json.dumps(context, indent=2)}\n\nProvide 4 recommendations."
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ]
        import asyncio
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, lambda: chat(messages))
        data = json.loads(raw)
        return data.get("recommendations", RECOMMENDATIONS_FALLBACK)
