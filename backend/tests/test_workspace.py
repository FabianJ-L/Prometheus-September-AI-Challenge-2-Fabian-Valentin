import pytest

from app import workspace
from app.models.schemas import ProjectFile


def test_handle_run_executes_the_entry_file():
    files = [ProjectFile(path="main.py", content="print(1 + 1)")]
    trace = workspace.handle_run(files, "main.py")
    assert trace.error is None
    assert trace.stdout.strip() == "2"


def test_handle_run_raises_on_missing_entry_path():
    files = [ProjectFile(path="main.py", content="print(1)")]
    with pytest.raises(workspace.WorkspaceError):
        workspace.handle_run(files, "missing.py")
