"""Start the app for Playwright e2e runs against a throwaway SQLite database.

app.py keeps its database location in a module constant, so this wrapper repoints it at a
temporary directory before the server starts. The real books.db is never read or modified.
"""

import importlib
import os
import sys
import tempfile
from pathlib import Path

import uvicorn

REPO_ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    sys.path.insert(0, str(REPO_ROOT))
    app_module = importlib.import_module("app")
    port = int(os.environ.get("E2E_PORT", "8123"))

    with tempfile.TemporaryDirectory(prefix="bookapp-e2e-") as tmp_dir:
        app_module.DATABASE_PATH = Path(tmp_dir) / "e2e_books.db"
        uvicorn.run(app_module.app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
