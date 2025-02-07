"""Shared utility functions."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_id() -> str:
    return str(uuid.uuid4())


def hash_ip(ip: str) -> str:
    """One-way hash of IP for privacy-preserving analytics."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def parse_date(value: Optional[str], default: datetime) -> datetime:
    if not value:
        return default
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return default


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def chunk_list(lst: list, size: int) -> list:
    return [lst[i : i + size] for i in range(0, len(lst), size)]
