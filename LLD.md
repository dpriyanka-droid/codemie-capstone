# Low-Level Design

## Backend

`app.py` defines the FastAPI application and its SQLite-backed operations.

- Database initialization creates a `books` table if it does not exist.
- Each book has an auto-incrementing `id`, a required `title`, a required `author`, and a `status` that defaults to `Want to Read`.
- `GET /` serves the frontend page.
- `GET /api/books` returns books ordered by newest ID first.
- `POST /api/books` validates and inserts a book, then returns the created record.
- `DELETE /api/books/{book_id}` removes a book or returns `404` if it does not exist.
- SQL statements use parameters for book values and IDs.

## Frontend

- `static/index.html` contains the add-book form and book list.
- `static/style.css` styles the page and adapts the form for narrow screens.
- `static/app.js` loads the list, submits new books, and removes books through the API.
- The list displays each book's title, author, and reading status.
- API failures are displayed in the page's status message.

## Data storage

SQLite database file: `books.db` beside `app.py`.

| Column | Type | Details |
|---|---|---|
| `id` | INTEGER | Primary key, auto-incrementing |
| `title` | TEXT | Required |
| `author` | TEXT | Required |
| `status` | TEXT | Required; defaults to `Want to Read` |
