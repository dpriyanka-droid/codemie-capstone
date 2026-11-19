const form = document.querySelector("#book-form");
const bookList = document.querySelector("#book-list");
const bookCount = document.querySelector("#book-count");
const message = document.querySelector("#message");

async function loadBooks() {
  bookList.replaceChildren();

  try {
    const response = await fetch("/api/books");
    if (!response.ok) {
      throw new Error("Could not load books.");
    }

    const books = await response.json();
    bookCount.textContent = `${books.length} ${books.length === 1 ? "book" : "books"}`;

    if (books.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "No books yet. Add one above to get started.";
      bookList.append(emptyState);
      return;
    }

    for (const book of books) {
      const card = document.createElement("article");
      card.className = "book-card";

      const details = document.createElement("div");
      details.className = "book-meta";

      const title = document.createElement("h3");
      title.textContent = book.title;
      const author = document.createElement("p");
      author.textContent = `by ${book.author}`;
      const status = document.createElement("span");
      status.className = "book-status";
      status.textContent = book.status;
      details.append(title, author, status);

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "Remove";
      deleteButton.addEventListener("click", () => removeBook(book.id));

      card.append(details, deleteButton);
      bookList.append(card);
    }
  } catch (error) {
    message.textContent = error.message;
  }
}

async function validationMessage(response, fallback) {
  if (response.status !== 422) {
    return fallback;
  }

  try {
    const { detail } = await response.json();
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const { loc, msg } = detail[0];
      const field = loc?.at(-1);
      const label = typeof field === "string" ? `${field[0].toUpperCase()}${field.slice(1)}` : "Book";
      return `${label}: ${msg}`;
    }
  } catch {
    // The body was not JSON; fall back to the generic message.
  }
  return fallback;
}

async function removeBook(bookId) {
  message.textContent = "";
  try {
    const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    if (response.status === 404) {
      // The book is already gone (for example removed in another tab): refresh the stale list.
      await loadBooks();
      message.textContent = "This book was already removed.";
      return;
    }
    if (!response.ok) {
      throw new Error("Could not remove this book.");
    }
    await loadBooks();
  } catch (error) {
    message.textContent = error.message;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const book = {
    title: form.elements.title.value,
    author: form.elements.author.value,
    status: form.elements.status.value,
  };

  try {
    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });

    if (!response.ok) {
      throw new Error(await validationMessage(response, "Could not add this book."));
    }

    form.reset();
    await loadBooks();
  } catch (error) {
    message.textContent = error.message;
  }
});

loadBooks();
