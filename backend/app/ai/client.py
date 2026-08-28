"""Thin wrapper around the Anthropic Messages API.

Falls back to ``mock`` mode when no API key is configured so the whole app still
runs offline. Uses the official `anthropic` SDK per project convention.
"""

from __future__ import annotations

import json
import logging
import re

from app.config import get_settings

logger = logging.getLogger("noesis.ai")

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


class AIClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        if self.settings.ai_enabled:
            try:
                import anthropic

                self._client = anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
            except Exception:  # noqa: BLE001 - never let AI init break the server
                logger.exception("Anthropic client init failed; falling back to mock mode")
                self._client = None

    @property
    def is_mock(self) -> bool:
        return self._client is None

    def complete_json(self, system: str, user: str) -> dict:
        """Send one turn and parse the model's JSON reply into a dict.

        Returns ``{}`` on any failure — callers must treat that as "no AI result"
        and use their heuristic fallback.
        """
        if self._client is None:
            return {}

        try:
            kwargs: dict = {
                "model": self.settings.ai_model,
                "max_tokens": self.settings.ai_max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            }
            if self.settings.ai_thinking == "adaptive":
                kwargs["thinking"] = {"type": "adaptive"}

            message = self._client.messages.create(**kwargs)
            text = "".join(
                block.text for block in message.content if getattr(block, "type", None) == "text"
            )
            return _extract_json(text)
        except Exception:  # noqa: BLE001
            logger.exception("AI completion failed; using heuristic fallback")
            return {}


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = _JSON_BLOCK.search(text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {}


_client: AIClient | None = None


def get_ai_client() -> AIClient:
    global _client
    if _client is None:
        _client = AIClient()
    return _client
