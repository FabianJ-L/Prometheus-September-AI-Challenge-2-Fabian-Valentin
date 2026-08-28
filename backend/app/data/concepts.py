"""The concept map for Python Fundamentals.

Nodes + prerequisite edges. The frontend renders this as the Concepts view;
the student model attaches a mastery estimate to each node.
"""

from __future__ import annotations

from app.models.schemas import ConceptNode

CONCEPTS: list[ConceptNode] = [
    ConceptNode(
        id="variables",
        label="Variables",
        summary="A name bound to a value.",
    ),
    ConceptNode(
        id="assignment",
        label="Assignment",
        summary="`=` binds the name on the left to the value on the right, replacing any previous binding.",
        prerequisites=["variables"],
    ),
    ConceptNode(
        id="accumulation",
        label="Accumulation",
        summary="Building a result across steps by combining it with its own previous value (`total = total + x`).",
        prerequisites=["assignment"],
    ),
    ConceptNode(
        id="conditionals",
        label="Conditionals",
        summary="Choosing which statements run based on a boolean test.",
        prerequisites=["variables"],
    ),
    ConceptNode(
        id="loops",
        label="Loops",
        summary="Repeating a block of statements.",
        prerequisites=["variables"],
    ),
    ConceptNode(
        id="iteration",
        label="Iteration",
        summary="Walking through the items of a sequence one at a time.",
        prerequisites=["loops"],
    ),
    ConceptNode(
        id="functions",
        label="Functions",
        summary="A reusable, parameterised block of code that returns a value.",
        prerequisites=["assignment"],
    ),
    ConceptNode(
        id="scope",
        label="Scope",
        summary="Where a name is visible; function bodies have their own local namespace.",
        prerequisites=["functions"],
    ),
    ConceptNode(
        id="references",
        label="References & Mutable State",
        summary="Several names can point at the same object; mutating through one is visible through the others.",
        prerequisites=["assignment", "functions"],
    ),
    ConceptNode(
        id="recursion",
        label="Recursion",
        summary="A function defined in terms of itself, with a base case that stops it.",
        prerequisites=["functions", "scope"],
    ),
]


def concept_map() -> dict[str, ConceptNode]:
    return {c.id: c for c in CONCEPTS}
