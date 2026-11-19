"""API tests for the BookManagementApp endpoints."""

import sqlite3
from contextlib import closing
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as app_module

BOOKS_URL = "/api/books"


def create_book(client: TestClient, **overrides: str) -> dict:
    payload = {"title": "Dune", "author": "Frank Herbert", **overrides}
    response = client.post(BOOKS_URL, json=payload)
    assert response.status_code == 201
    return response.json()


def test_isolated_database_is_used(client: TestClient, tmp_path: Path) -> None:
    assert app_module.DATABASE_PATH.parent == tmp_path
    assert app_module.DATABASE_PATH.exists()
    assert app_module.DATABASE_PATH.name != "books.db"


def test_home_serves_frontend(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_static_assets_are_served(client: TestClient) -> None:
    response = client.get("/static/app.js")

    assert response.status_code == 200


def test_list_books_empty(client: TestClient) -> None:
    response = client.get(BOOKS_URL)

    assert response.status_code == 200
    assert response.json() == []


def test_add_book_returns_created_record(client: TestClient) -> None:
    response = client.post(
        BOOKS_URL, json={"title": "Dune", "author": "Frank Herbert", "status": "Reading"}
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["title"] == "Dune"
    assert body["author"] == "Frank Herbert"
    assert body["status"] == "Reading"


def test_add_book_defaults_status(client: TestClient) -> None:
    body = create_book(client)

    assert body["status"] == "Want to Read"


def test_add_book_blank_status_falls_back_to_default(client: TestClient) -> None:
    body = create_book(client, status="   ")

    assert body["status"] == "Want to Read"


def test_add_book_strips_whitespace(client: TestClient) -> None:
    body = create_book(client, title="  Dune  ", author="  Frank Herbert ")

    assert body["title"] == "Dune"
    assert body["author"] == "Frank Herbert"


def test_list_books_returns_newest_first(client: TestClient) -> None:
    first = create_book(client, title="First")
    second = create_book(client, title="Second")

    response = client.get(BOOKS_URL)

    assert response.status_code == 200
    assert [book["id"] for book in response.json()] == [second["id"], first["id"]]


def test_added_book_is_persisted_in_temp_database(client: TestClient) -> None:
    created = create_book(client)

    with closing(sqlite3.connect(app_module.DATABASE_PATH)) as connection:
        row = connection.execute(
            "SELECT title FROM books WHERE id = ?", (created["id"],)
        ).fetchone()

    assert row == ("Dune",)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"title": "Dune"},
        {"author": "Frank Herbert"},
        {"title": "", "author": "Frank Herbert"},
        {"title": "Dune", "author": ""},
        {"title": "x" * 201, "author": "Frank Herbert"},
        {"title": "Dune", "author": "x" * 121},
        {"title": "Dune", "author": "Frank Herbert", "status": "x" * 41},
        {"title": 123, "author": ["not", "a", "string"]},
    ],
    ids=[
        "empty-body",
        "missing-author",
        "missing-title",
        "empty-title",
        "empty-author",
        "title-too-long",
        "author-too-long",
        "status-too-long",
        "wrong-types",
    ],
)
def test_add_book_rejects_invalid_payload(client: TestClient, payload: dict) -> None:
    response = client.post(BOOKS_URL, json=payload)

    assert response.status_code == 422
    assert client.get(BOOKS_URL).json() == []


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "   ", "author": "Frank Herbert"},
        {"title": "Dune", "author": "   "},
    ],
    ids=["whitespace-title", "whitespace-author"],
)
def test_add_book_rejects_whitespace_only_fields(client: TestClient, payload: dict) -> None:
    response = client.post(BOOKS_URL, json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "Title and author are required."
    assert client.get(BOOKS_URL).json() == []


def test_add_book_rejects_malformed_json(client: TestClient) -> None:
    response = client.post(
        BOOKS_URL, content="{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422


def test_add_book_stores_sql_metacharacters_literally(client: TestClient) -> None:
    title = "x'); DROP TABLE books;--"

    created = create_book(client, title=title)

    assert created["title"] == title
    assert [book["title"] for book in client.get(BOOKS_URL).json()] == [title]


def test_delete_book_removes_it(client: TestClient) -> None:
    keep = create_book(client, title="Keep")
    remove = create_book(client, title="Remove")

    response = client.delete(f"{BOOKS_URL}/{remove['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert [book["id"] for book in client.get(BOOKS_URL).json()] == [keep["id"]]


def test_delete_missing_book_returns_404(client: TestClient) -> None:
    response = client.delete(f"{BOOKS_URL}/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Book not found."


def test_delete_twice_returns_404_second_time(client: TestClient) -> None:
    created = create_book(client)
    client.delete(f"{BOOKS_URL}/{created['id']}")

    response = client.delete(f"{BOOKS_URL}/{created['id']}")

    assert response.status_code == 404


def test_delete_with_non_integer_id_returns_422(client: TestClient) -> None:
    response = client.delete(f"{BOOKS_URL}/abc")

    assert response.status_code == 422


def test_unknown_route_returns_404(client: TestClient) -> None:
    assert client.get("/api/unknown").status_code == 404


def test_unsupported_method_returns_405(client: TestClient) -> None:
    assert client.put(BOOKS_URL, json={}).status_code == 405
