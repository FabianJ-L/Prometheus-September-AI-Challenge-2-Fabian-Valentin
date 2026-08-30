"""Annotations for offline mode.

Without an `ANTHROPIC_API_KEY` the assistant can't reason, but the editor layer
should still have something true to draw — a demo on bad conference wifi is
exactly when you least want a blank screen.

Everything here is derived from the trace, so it is `measured`, not `ai`: these
annotations state what the run did, never what it means. That keeps the offline
path honest instead of putting invented insight in the model's voice.
"""

from __future__ import annotations

from app.models.schemas import (
    REF_KEY,
    Anchor,
    Annotation,
    AnnotationKind,
    AnnotationSource,
    AnnotationTone,
    ExecutionTrace,
    ProjectFile,
)


def _line_text(file: ProjectFile, line: int) -> str | None:
    lines = file.content.splitlines()
    if 1 <= line <= len(lines):
        return lines[line - 1].strip()
    return None


def _anchor(file: ProjectFile, line: int) -> Anchor | None:
    text = _line_text(file, line)
    if text is None:
        return None
    return Anchor(path=file.path, line=line, snippet=text)


def _shared_objects(bindings: dict[str, object]) -> list[list[str]]:
    """Names grouped by the object they point at, for groups larger than one."""
    by_ref: dict[str, list[str]] = {}
    for name, value in bindings.items():
        if isinstance(value, dict) and REF_KEY in value:
            by_ref.setdefault(str(value[REF_KEY]), []).append(name)
    return [names for names in by_ref.values() if len(names) > 1]


def offline_annotations(
    files: list[ProjectFile],
    active_path: str | None,
    trace: ExecutionTrace | None,
) -> list[Annotation]:
    """Facts about the last run, placed on the lines they belong to."""

    file = next((f for f in files if f.path == active_path), None) or (files[0] if files else None)
    if file is None or trace is None:
        return []

    annotations: list[Annotation] = []

    def add(annotation: Annotation | None) -> None:
        if annotation is not None:
            annotations.append(annotation)

    # 1. An error is the most useful thing to point at, so it wins.
    if trace.error and trace.error_line:
        anchor = _anchor(file, trace.error_line)
        if anchor is not None:
            add(
                Annotation(
                    id="offline-error",
                    kind=AnnotationKind.problem,
                    source=AnnotationSource.measured,
                    anchor=anchor,
                    tone=AnnotationTone.danger,
                    label=trace.error,
                )
            )
            add(
                Annotation(
                    id="offline-error-note",
                    kind=AnnotationKind.note,
                    source=AnnotationSource.measured,
                    anchor=anchor.model_copy(),
                    body=(
                        f"Der Lauf endet hier mit **{trace.error}**.\n\n"
                        "Geh im Debugger einen Schritt zurück und schau dir an, "
                        "welchen Wert die beteiligten Variablen an dieser Stelle haben."
                    ),
                )
            )
        return annotations

    # 2. Two names, one object — the misconception this tool exists to catch.
    groups = _shared_objects(trace.final_locals)
    if groups and trace.steps:
        names = groups[0]
        mutation = _last_mutation_line(trace, names)
        anchor = _anchor(file, mutation) if mutation else None
        if anchor is not None:
            joined = " und ".join(f"`{n}`" for n in names)
            add(
                Annotation(
                    id="offline-alias",
                    kind=AnnotationKind.line,
                    source=AnnotationSource.measured,
                    anchor=anchor,
                    tone=AnnotationTone.focus,
                    label="verändert das geteilte Objekt",
                )
            )
            add(
                Annotation(
                    id="offline-alias-memory",
                    kind=AnnotationKind.memory,
                    source=AnnotationSource.measured,
                    anchor=anchor.model_copy(),
                    variables=names,
                )
            )
            add(
                Annotation(
                    id="offline-alias-note",
                    kind=AnnotationKind.note,
                    source=AnnotationSource.measured,
                    anchor=anchor.model_copy(),
                    body=(
                        f"{joined} zeigen auf **dasselbe Objekt** — es wurde nie "
                        "kopiert. Eine Änderung über den einen Namen ist deshalb "
                        "auch über den anderen sichtbar."
                    ),
                )
            )
            return annotations

    # 3. Nothing dramatic happened: mark where the run ended.
    last = next((s for s in reversed(trace.steps) if s.source), None)
    if last is not None:
        anchor = _anchor(file, last.line)
        if anchor is not None:
            add(
                Annotation(
                    id="offline-last",
                    kind=AnnotationKind.line,
                    source=AnnotationSource.measured,
                    anchor=anchor,
                    tone=AnnotationTone.info,
                    label="letzte ausgeführte Zeile",
                )
            )
    return annotations


def _last_mutation_line(trace: ExecutionTrace, names: list[str]) -> int | None:
    """The last line after which one of the shared objects changed size.

    A rough but reliable heuristic: the step where the object the names share
    stopped looking the way it did before is where the mutation happened.
    """
    target = None
    for name in names:
        value = trace.final_locals.get(name)
        if isinstance(value, dict) and REF_KEY in value:
            target = str(value[REF_KEY])
            break
    if target is None:
        return None

    # A step records the state *before* its line runs, so a change first shows
    # up on the step after the one that caused it — report the causing line.
    line: int | None = None
    previous: str | None = None
    previous_line: int | None = None
    for step in trace.steps:
        obj = step.heap.get(target)
        if obj is not None:
            if previous is not None and obj.preview != previous and previous_line is not None:
                line = previous_line
            previous = obj.preview
        previous_line = step.line
    return line
