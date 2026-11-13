import sqlite3
from contextlib import asynccontextmanager, closing
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "books.db"


def initialize_database() -> None:
    with closing(sqlite3.connect(DATABASE_PATH)) as connection, connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Want to Read'
            )
            """
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="BookManagementApp", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=120)
    status: str = Field(default="Want to Read", max_length=40)


@app.get("/")
def home() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/api/books")
def list_books() -> list[dict[str, int | str]]:
    with closing(sqlite3.connect(DATABASE_PATH)) as connection, connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT id, title, author, status FROM books ORDER BY id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/books", status_code=201)
def add_book(book: BookCreate) -> dict[str, int | str]:
    title = book.title.strip()
    author = book.author.strip()
    if not title or not author:
        raise HTTPException(status_code=422, detail="Title and author are required.")

    with closing(sqlite3.connect(DATABASE_PATH)) as connection, connection:
        connection.row_factory = sqlite3.Row
        cursor = connection.execute(
            "INSERT INTO books (title, author, status) VALUES (?, ?, ?)",
            (title, author, book.status.strip() or "Want to Read"),
        )
        row = connection.execute(
            "SELECT id, title, author, status FROM books WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return dict(row)


@app.delete("/api/books/{book_id}", status_code=204)
def delete_book(book_id: int) -> Response:
    with closing(sqlite3.connect(DATABASE_PATH)) as connection, connection:
        cursor = connection.execute("DELETE FROM books WHERE id = ?", (book_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Book not found.")
    return Response(status_code=204)
