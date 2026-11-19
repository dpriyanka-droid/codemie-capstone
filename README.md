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
