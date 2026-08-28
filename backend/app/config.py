"""Application settings, loaded from environment / `.env`."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
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
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        alias="NOESIS_CORS_ORIGINS",
    )

    # --- AI --------------------------------------------------------------
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    ai_model: str = Field(default="claude-opus-5", alias="NOESIS_AI_MODEL")
    ai_thinking: str = Field(default="adaptive", alias="NOESIS_AI_THINKING")
    ai_max_tokens: int = Field(default=4096, alias="NOESIS_AI_MAX_TOKENS")

    # --- sandboxed executor ---------------------------------------------
    exec_timeout_seconds: float = Field(default=5.0, alias="NOESIS_EXEC_TIMEOUT_SECONDS")
    exec_max_steps: int = Field(default=2000, alias="NOESIS_EXEC_MAX_STEPS")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def ai_enabled(self) -> bool:
        """True when a real Anthropic key is configured; otherwise mock mode."""
        return bool(self.anthropic_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
