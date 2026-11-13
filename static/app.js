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

async function removeBook(bookId) {
  message.textContent = "";
  try {
    const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
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
      throw new Error("Could not add this book.");
    }

    form.reset();
    await loadBooks();
  } catch (error) {
    message.textContent = error.message;
  }
});

loadBooks();
