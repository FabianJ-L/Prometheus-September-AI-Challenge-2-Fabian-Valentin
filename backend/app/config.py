"""Application settings, loaded from environment / `.env`."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
        case_sensitive=False,
    )

    # --- environment -------------------------------------------------------
    env: str = Field(default="development", alias="NOESIS_ENV")
    host: str = Field(default="127.0.0.1", alias="NOESIS_HOST")
    port: int = Field(default=8000, alias="NOESIS_PORT")
    # Comma-separated in the env; use `cors_origins` for the parsed list.
    cors_origins_raw: str = Field(default="http://localhost:3000", alias="NOESIS_CORS_ORIGINS")

    # --- sandboxed executor ---------------------------------------------
    exec_timeout_seconds: float = Field(default=5.0, alias="NOESIS_EXEC_TIMEOUT_SECONDS")
    exec_max_steps: int = Field(default=2000, alias="NOESIS_EXEC_MAX_STEPS")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
