# BookManagementApp 

A deliberately small book list app built with HTML, CSS, and JavaScript, a FastAPI backend, and SQLite 3.

It can list books, add a book, and remove a book. Editing, sorting, and other library features are intentionally left unfinished.

## Run locally

From this folder, install the Python packages and start the development server:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Open <http://127.0.0.1:8000>. The SQLite database (`books.db`) is created automatically beside `app.py` when the server starts.

## Lint and test locally

Install the development tools (this also installs the app requirements):

```powershell
python -m pip install -r requirements-dev.txt
```

Run the linter ([Ruff](https://docs.astral.sh/ruff/), configured in `pyproject.toml`) and the formatting check:

```powershell
python -m ruff check .
python -m ruff format --check .
```

Run the API tests (pytest and FastAPI `TestClient`):

```powershell
python -m pytest
```

Each test uses its own temporary SQLite database (the fixture in `tests/conftest.py` points `app.DATABASE_PATH` at a pytest temp directory), so `books.db` is never read or modified.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request targeting `main` and on every push to `main`. It installs `requirements-dev.txt` on Python 3.12, then runs `ruff check`, `ruff format --check`, and `pytest`. Any failing step fails the check. The workflow only has read access to repository contents.
