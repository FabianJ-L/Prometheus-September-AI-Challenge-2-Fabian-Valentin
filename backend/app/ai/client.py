"""Thin wrapper around the Anthropic Messages API.

Falls back to ``mock`` mode when no API key is configured so the whole app still
runs offline. Uses the official `anthropic` SDK per project convention.

The assistant has two output channels — prose and annotation tool calls — so
this runs a small agentic loop: the model calls tools, we validate each one and
hand back whether it landed, and the model finishes its reply knowing what the
student can actually see. A rejected anchor is reported honestly, which lets the
model correct itself within the same turn instead of describing a mark that was
never drawn.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from app.config import get_settings

logger = logging.getLogger("noesis.ai")

# The model may take a few passes: annotate, see what landed, then write.
_MAX_ROUNDS = 4

_MOCK_REPLY = (
    "Offline-Modus — ohne `ANTHROPIC_API_KEY` in `backend/.env` kann ich nicht "
    "wirklich mitdenken. Die Marker im Editor kommen hier direkt aus dem Trace, "
    "nicht aus einem Modell."
)
_ERROR_REPLY = "Something went wrong reaching the AI. Try again in a moment."
_REFUSAL_REPLY = (
    "I can't help with that one. Ask me about the Python in your editor and "
    "I'm all yours."
)

# Anthropic routes around a refusal server-side instead of failing the request.
_FALLBACK_BETA = "server-side-fallback-2026-07-01"

ToolHandler = Callable[[str, dict[str, Any]], str]


def _beta_rejected_types() -> tuple[type[BaseException], ...]:
    """Errors that mean "this SDK/account doesn't know the fallback beta"."""
    types: list[type[BaseException]] = [TypeError]  # SDK too old for the kwargs
    try:
        import anthropic

        types.append(anthropic.BadRequestError)  # API rejected the beta flag
        types.append(anthropic.NotFoundError)
    except Exception:  # noqa: BLE001
        pass
    return tuple(types)


_BETA_REJECTED = _beta_rejected_types()


class AIClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        # Set to False the first time the fallback beta is rejected, so an SDK
        # or account without it degrades once instead of on every message.
        self._fallbacks = True
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

    def converse(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        on_tool_call: ToolHandler | None = None,
    ) -> str:
        """Run the conversation to completion and return the plain-text reply.

        ``on_tool_call`` receives every tool the model invokes and returns the
        result string the model sees. Never raises and never returns an empty
        string — in mock mode or on any failure it returns a clear, honest
        fallback so the UI always has something to render.
        """
        if self._client is None:
            return _MOCK_REPLY

        turns = list(messages)
        collected: list[str] = []

        try:
            for _ in range(_MAX_ROUNDS):
                response = self._create(system, turns, tools)

                if getattr(response, "stop_reason", None) == "refusal":
                    return _REFUSAL_REPLY

                text = "".join(
                    block.text for block in response.content if getattr(block, "type", None) == "text"
                ).strip()
                if text:
                    collected.append(text)

                calls = [b for b in response.content if getattr(b, "type", None) == "tool_use"]
                if not calls or on_tool_call is None:
                    break

                turns.append({"role": "assistant", "content": response.content})
                turns.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": call.id,
                                "content": _safe_handle(on_tool_call, call),
                            }
                            for call in calls
                        ],
                    }
                )
        except Exception:  # noqa: BLE001
            logger.exception("AI conversation failed")
            return "\n\n".join(collected).strip() or _ERROR_REPLY

        return "\n\n".join(collected).strip() or _ERROR_REPLY

    def _create(self, system: str, messages: list[dict], tools: list[dict] | None) -> Any:
        kwargs: dict[str, Any] = {
            "model": self.settings.ai_model,
            "max_tokens": self.settings.ai_max_tokens,
            "system": system,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools
        if self.settings.ai_thinking == "adaptive":
            kwargs["thinking"] = {"type": "adaptive"}

        if self._fallbacks:
            try:
                return self._client.beta.messages.create(
                    **kwargs, betas=[_FALLBACK_BETA], fallbacks="default"
                )
            except _BETA_REJECTED as exc:
                # Only an outright rejection of the beta means "not available
                # here". A rate limit or a server hiccup must stay an error and
                # bubble up, or one bad minute would silently cost us the
                # refusal routing for the rest of the process.
                logger.warning("Refusal fallback unavailable (%s); continuing without it", exc)
                self._fallbacks = False

        return self._client.messages.create(**kwargs)


def _safe_handle(handler: ToolHandler, call: Any) -> str:
    try:
        payload = call.input if isinstance(call.input, dict) else {}
        return handler(call.name, payload) or "ok"
    except Exception:  # noqa: BLE001 - a bad annotation must not kill the reply
        logger.exception("Annotation tool handler failed for %s", getattr(call, "name", "?"))
        return "That annotation could not be placed. Continue without it."


_client: AIClient | None = None


def get_ai_client() -> AIClient:
    global _client
    if _client is None:
        _client = AIClient()
    return _client
