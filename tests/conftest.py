"""Shared fixtures: every test runs against its own temporary SQLite database."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """Return a TestClient bound to an isolated database; books.db is never touched."""
    test_db = tmp_path / "test_books.db"
    monkeypatch.setattr(app_module, "DATABASE_PATH", test_db)
    # Entering the context manager runs the app lifespan, which creates the schema.
    with TestClient(app_module.app) as test_client:
        yield test_client
