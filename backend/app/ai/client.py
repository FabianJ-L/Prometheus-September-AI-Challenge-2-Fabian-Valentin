"""Thin wrapper around the Anthropic Messages API.

Falls back to ``mock`` mode when no API key is configured so the whole app still
runs offline. Uses the official `anthropic` SDK per project convention.
"""

from __future__ import annotations

import logging

from app.config import get_settings

logger = logging.getLogger("noesis.ai")

_MOCK_REPLY = (
    "(offline mode — no ANTHROPIC_API_KEY configured) I can't generate real "
    "guidance right now, but you can still run your code and inspect the trace."
)
_ERROR_REPLY = "Something went wrong reaching the AI. Try again in a moment."


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

    def chat(self, system: str, messages: list[dict]) -> str:
        """Send a multi-turn chat completion and return the plain-text reply.

        ``messages`` is Anthropic-shaped: ``[{"role": "user"|"assistant", "content": str}, ...]``.
        Never raises and never returns an empty string — in mock mode or on any
        failure it returns a clear, honest fallback string so the UI always has
        something to render.
        """
        if self._client is None:
            return _MOCK_REPLY

        try:
            kwargs: dict = {
                "model": self.settings.ai_model,
                "max_tokens": self.settings.ai_max_tokens,
                "system": system,
                "messages": messages,
            }
            if self.settings.ai_thinking == "adaptive":
                kwargs["thinking"] = {"type": "adaptive"}

            message = self._client.messages.create(**kwargs)
            text = "".join(
                block.text for block in message.content if getattr(block, "type", None) == "text"
            )
            return text.strip() or _ERROR_REPLY
        except Exception:  # noqa: BLE001
            logger.exception("AI chat completion failed")
            return _ERROR_REPLY


_client: AIClient | None = None


def get_ai_client() -> AIClient:
    global _client
    if _client is None:
        _client = AIClient()
    return _client
