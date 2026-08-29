"""AI layer: the Socratic coding assistant.

    code + files + trace → context block → chat messages → LLM → reply

The LLM only ever runs on top of the structured context assembled by
`app.ai.prompts.render_context_block`. It decides the next teaching move; it
never rewrites the user's code.
"""
