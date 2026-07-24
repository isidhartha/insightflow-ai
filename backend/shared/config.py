"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "InsightFlow AI"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://insightflow:password@localhost:5432/insightflow"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # OpenAI / Anthropic
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Security
    project_api_key: str = "if_api_key_change_me"
    cors_origins: str = "http://localhost:3007"

    # Data
    data_retention_days: int = 365

    # Logging
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
