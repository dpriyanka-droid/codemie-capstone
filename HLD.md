# High-Level Design

## Application

**BookManagementApp** is a small web application for keeping a basic reading list.

## Architecture

- **Frontend:** Static HTML, CSS, and JavaScript served by FastAPI.
- **Backend:** FastAPI provides the page and JSON API endpoints.
- **Database:** SQLite 3 stores the book records in `books.db`, created when the application starts.

## Main flow

1. The browser requests the application page from FastAPI.
2. The frontend fetches the book list from the API.
3. Add and remove actions send requests to the API.
4. FastAPI reads or updates SQLite and returns results to the frontend.

## Current scope

Books can be listed, added, and removed. Editing and sorting are not implemented.
