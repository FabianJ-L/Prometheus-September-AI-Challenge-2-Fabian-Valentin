"""Source → structural summary.

We parse the student's snippet into an AST and pull out the features the
diagnostic pipeline cares about: which concepts the code touches, the names it
binds, whether it loops, mutates, defines functions, recurses, etc. This is the
cheap, deterministic first pass — the LLM never sees raw code without it.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field


@dataclass
class CodeSummary:
    valid: bool
    syntax_error: str | None = None
    assigned_names: list[str] = field(default_factory=list)
    called_names: list[str] = field(default_factory=list)
    defined_functions: list[str] = field(default_factory=list)
    has_loop: bool = False
    has_conditional: bool = False
    has_augmented_assignment: bool = False  # `total += x`
    has_recursion: bool = False
    prints: bool = False
    concept_ids: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "valid": self.valid,
            "syntax_error": self.syntax_error,
            "assigned_names": self.assigned_names,
            "called_names": self.called_names,
            "defined_functions": self.defined_functions,
            "has_loop": self.has_loop,
            "has_conditional": self.has_conditional,
            "has_augmented_assignment": self.has_augmented_assignment,
            "has_recursion": self.has_recursion,
            "prints": self.prints,
            "concept_ids": self.concept_ids,
        }


def summarize(source: str) -> CodeSummary:
    """Return a :class:`CodeSummary` for ``source`` (never raises)."""

    try:
        tree = ast.parse(source)
    except SyntaxError as exc:  # noqa: BLE001 - we want the message, not the type
        return CodeSummary(valid=False, syntax_error=f"{exc.msg} (line {exc.lineno})")

    summary = CodeSummary(valid=True)
    func_names: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While, ast.comprehension)):
            summary.has_loop = True
        elif isinstance(node, ast.If):
            summary.has_conditional = True
        elif isinstance(node, ast.AugAssign):
            summary.has_augmented_assignment = True
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                _collect_names(target, summary.assigned_names)
        elif isinstance(node, ast.FunctionDef):
            summary.defined_functions.append(node.name)
            func_names.add(node.name)
        elif isinstance(node, ast.Call):
            name = _call_name(node)
            if name:
                summary.called_names.append(name)
                if name == "print":
                    summary.prints = True

    summary.has_recursion = any(name in func_names for name in summary.called_names)
    summary.concept_ids = _infer_concepts(summary)
    _dedupe(summary)
    return summary


def _collect_names(node: ast.AST, out: list[str]) -> None:
    if isinstance(node, ast.Name):
        out.append(node.id)
    elif isinstance(node, (ast.Tuple, ast.List)):
        for elt in node.elts:
            _collect_names(elt, out)


def _call_name(node: ast.Call) -> str | None:
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return None


def _infer_concepts(s: CodeSummary) -> list[str]:
    concepts: list[str] = []
    if s.assigned_names:
        concepts.append("variables")
        concepts.append("assignment")
    if s.has_augmented_assignment:
        concepts.append("accumulation")
    if s.has_loop:
        concepts.append("loops")
        concepts.append("iteration")
    if s.has_conditional:
        concepts.append("conditionals")
    if s.defined_functions:
        concepts.append("functions")
        concepts.append("scope")
    if s.has_recursion:
        concepts.append("recursion")
    return concepts


def _dedupe(s: CodeSummary) -> None:
    for attr in ("assigned_names", "called_names", "defined_functions", "concept_ids"):
        seen: dict[str, None] = {}
        for item in getattr(s, attr):
            seen.setdefault(item, None)
        setattr(s, attr, list(seen))
