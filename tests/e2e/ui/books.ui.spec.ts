import { test, expect } from '../fixtures';
import { DEFAULT_STATUS, DUNE, EMMA, LIMITS, NEUROMANCER, READING_STATUSES } from '../support/data';

test.describe('Book list UI', { tag: '@ui' }, () => {
  test.describe('page load', () => {
    test('shows header, form and empty state with no books', { tag: '@smoke' }, async ({ booksPage }) => {
      await booksPage.goto();

      await expect(booksPage.page).toHaveTitle('BookManagementApp');
      await expect(booksPage.page.getByRole('heading', { level: 2, name: 'Add a book' })).toBeVisible();
      await expect(booksPage.page.getByRole('heading', { level: 2, name: 'My books' })).toBeVisible();
      await expect(booksPage.emptyState).toBeVisible();
      await expect(booksPage.count).toHaveText('0 books');
      await expect(booksPage.cards).toHaveCount(0);
    });

    test('form defaults and constraints', async ({ booksPage }) => {
      await booksPage.goto();

      await expect(booksPage.titleInput).toBeEmpty();
      await expect(booksPage.authorInput).toBeEmpty();
      await expect(booksPage.statusSelect).toHaveValue(DEFAULT_STATUS);
      await expect(booksPage.titleInput).toHaveAttribute('maxlength', String(LIMITS.title));
      await expect(booksPage.authorInput).toHaveAttribute('maxlength', String(LIMITS.author));
      await expect(booksPage.titleInput).toHaveAttribute('required', '');
      await expect(booksPage.authorInput).toHaveAttribute('required', '');
      const options = await booksPage.statusSelect.locator('option').allTextContents();
      expect(options).toEqual([...READING_STATUSES]);
    });

    test('lists books that already exist, newest first', async ({ booksPage, booksApi }) => {
      await booksApi.create({ title: 'First', author: 'A' });
      await booksApi.create({ title: 'Second', author: 'B' });
      await booksApi.create({ title: 'Third', author: 'C' });

      await booksPage.goto();

      await expect(booksPage.cards).toHaveCount(3);
      expect(await booksPage.cardTitles()).toEqual(['Third', 'Second', 'First']);
      await expect(booksPage.count).toHaveText('3 books');
      await expect(booksPage.emptyState).toBeHidden();
    });
  });

  test.describe('add a book', () => {
    test('adds a book and resets the form', { tag: '@smoke' }, async ({ booksPage }) => {
      await booksPage.goto();

      await booksPage.addBook(DUNE);

      await booksPage.expectCard({ ...DUNE, status: 'Reading' });
      await expect(booksPage.count).toHaveText('1 book');
      await expect(booksPage.emptyState).toBeHidden();
      await expect(booksPage.titleInput).toBeEmpty();
      await expect(booksPage.authorInput).toBeEmpty();
      await expect(booksPage.statusSelect).toHaveValue(DEFAULT_STATUS);
      await expect(booksPage.message).toBeEmpty();
    });

    for (const status of READING_STATUSES) {
      test(`stores and displays status "${status}"`, async ({ booksPage }) => {
        await booksPage.goto();

        await booksPage.addBook({ title: `Book (${status})`, author: 'Someone', status });

        await booksPage.expectCard({ title: `Book (${status})`, author: 'Someone', status });
      });
    }

    test('uses the default status when untouched', async ({ booksPage }) => {
      await booksPage.goto();

      await booksPage.addBook(NEUROMANCER);

      await booksPage.expectCard({ ...NEUROMANCER, status: DEFAULT_STATUS });
    });

    test('shows the newest book first and updates the count', async ({ booksPage }) => {
      await booksPage.goto();

      await booksPage.addBook(DUNE);
      await expect(booksPage.count).toHaveText('1 book');
      await booksPage.addBook(EMMA);

      await expect(booksPage.count).toHaveText('2 books');
      await expect.poll(() => booksPage.cardTitles()).toEqual([EMMA.title, DUNE.title]);
    });

    test('persists the book across a reload', async ({ booksPage, booksApi }) => {
      await booksPage.goto();
      await booksPage.addBook(DUNE);
      await expect(booksPage.card(DUNE.title)).toBeVisible();

      await booksPage.page.reload();

      await booksPage.expectCard({ ...DUNE, status: 'Reading' });
      expect(await booksApi.list()).toHaveLength(1);
    });

    test('trims surrounding whitespace', async ({ booksPage }) => {
      await booksPage.goto();

      await booksPage.addBook({ title: '  Padded Title  ', author: '  Padded Author ' });

      await booksPage.expectCard({
        title: 'Padded Title',
        author: 'Padded Author',
        status: DEFAULT_STATUS,
      });
    });

    test('accepts unicode and accented text', async ({ booksPage }) => {
      await booksPage.goto();
      const book = { title: 'Les Misérables 悲惨世界', author: 'Victor Hugo – Çelik', status: 'Finished' };

      await booksPage.addBook(book);

      await booksPage.expectCard(book);
    });

    test('accepts titles and authors at the maximum length', async ({ booksPage }) => {
      await booksPage.goto();
      const title = 'T'.repeat(LIMITS.title);
      const author = 'A'.repeat(LIMITS.author);

      await booksPage.addBook({ title, author });

      await expect(booksPage.cards).toHaveCount(1);
      await expect(booksPage.cards.first()).toContainText(title);
      await expect(booksPage.cards.first()).toContainText(author);
      await expect(booksPage.message).toBeEmpty();
    });

    test('renders HTML and SQL metacharacters as plain text', async ({ booksPage }) => {
      await booksPage.goto();
      const dialogs: string[] = [];
      booksPage.page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });
      const title = `<img src=x onerror="alert('xss')"> x'); DROP TABLE books;--`;

      await booksPage.addBook({ title, author: '<b>bold</b>' });

      await expect(booksPage.cards).toHaveCount(1);
      await expect(booksPage.cards.first().getByRole('heading', { level: 3 })).toHaveText(title);
      await expect(booksPage.cards.first()).toContainText('by <b>bold</b>');
      await expect(booksPage.cards.first().locator('img, b')).toHaveCount(0);
      expect(dialogs).toEqual([]);

      // The table survived the SQL-looking title.
      await booksPage.page.reload();
      await expect(booksPage.cards).toHaveCount(1);
    });
  });

  test.describe('add a book: validation and errors', () => {
    test('blocks submit when required fields are empty (no request sent)', async ({ booksPage }) => {
      await booksPage.goto();
      const posts: string[] = [];
      booksPage.page.on('request', (request) => {
        if (request.method() === 'POST') posts.push(request.url());
      });

      await booksPage.addButton.click();
      const titleMissing = await booksPage.titleInput.evaluate(
        (el: HTMLInputElement) => el.validity.valueMissing,
      );
      expect(titleMissing).toBe(true);

      await booksPage.titleInput.fill('Only a title');
      await booksPage.addButton.click();
      const authorMissing = await booksPage.authorInput.evaluate(
        (el: HTMLInputElement) => el.validity.valueMissing,
      );
      expect(authorMissing).toBe(true);

      expect(posts).toEqual([]);
      await expect(booksPage.cards).toHaveCount(0);
      await expect(booksPage.emptyState).toBeVisible();
    });

    test('shows an error and keeps input when title is whitespace only', async ({ booksPage, booksApi }) => {
      await booksPage.goto();

      await booksPage.addBook({ title: '   ', author: 'Frank Herbert' });

      await expect(booksPage.message).toHaveText('Title and author are required.');
      await expect(booksPage.authorInput).toHaveValue('Frank Herbert');
      await expect(booksPage.cards).toHaveCount(0);
      expect(await booksApi.list()).toEqual([]);
    });

    test('shows an error when the author is whitespace only', async ({ booksPage }) => {
      await booksPage.goto();

      await booksPage.addBook({ title: 'Dune', author: '   ' });

      await expect(booksPage.message).toHaveText('Title and author are required.');
      await expect(booksPage.cards).toHaveCount(0);
    });

    test('server still rejects over-length values when maxlength is bypassed', async ({ booksPage, booksApi }) => {
      await booksPage.goto();
      // Strip the client-side limit to simulate a client that bypasses it.
      await booksPage.titleInput.evaluate((el: HTMLInputElement) => el.removeAttribute('maxlength'));
      await booksPage.addBook({ title: 'T'.repeat(LIMITS.title + 1), author: 'Author' });

      await expect(booksPage.message).toHaveText('Title: String should have at most 200 characters');
      await expect(booksPage.cards).toHaveCount(0);
      expect(await booksApi.list()).toEqual([]);
    });

    test('typing is capped at the maxlength', async ({ booksPage }) => {
      await booksPage.goto();

      await booksPage.authorInput.click();
      await booksPage.page.keyboard.insertText('A'.repeat(LIMITS.author + 20));

      await expect(booksPage.authorInput).toHaveValue('A'.repeat(LIMITS.author));
    });

    test('clears the error once a valid book is added', async ({ booksPage }) => {
      await booksPage.goto();
      await booksPage.addBook({ title: '   ', author: 'Someone' });
      await expect(booksPage.message).toHaveText('Title and author are required.');

      await booksPage.titleInput.fill('Valid Title');
      await booksPage.addButton.click();

      await expect(booksPage.card('Valid Title')).toBeVisible();
      await expect(booksPage.message).toBeEmpty();
    });

    test('shows an error when the server fails (500) and adds nothing', async ({ booksPage }) => {
      await booksPage.goto();
      await booksPage.page.route('**/api/books', (route) =>
        route.request().method() === 'POST'
          ? route.fulfill({ status: 500, json: { detail: 'boom' } })
          : route.fallback(),
      );

      await booksPage.addBook(DUNE);

      await expect(booksPage.message).toHaveText('Could not add this book.');
      await expect(booksPage.cards).toHaveCount(0);
      // Input is preserved so the user can retry.
      await expect(booksPage.titleInput).toHaveValue(DUNE.title);
    });

    test('shows an error when the network drops during add', async ({ booksPage }) => {
      await booksPage.goto();
      await booksPage.page.route('**/api/books', (route) =>
        route.request().method() === 'POST' ? route.abort('failed') : route.fallback(),
      );

      await booksPage.addBook(DUNE);

      await expect(booksPage.message).not.toBeEmpty();
      await expect(booksPage.cards).toHaveCount(0);
    });
  });

  test.describe('remove a book', () => {
    test('removes a book and keeps the others', { tag: '@smoke' }, async ({ booksPage, booksApi }) => {
      await booksApi.create(DUNE);
      await booksApi.create(EMMA);
      await booksPage.goto();
      await expect(booksPage.cards).toHaveCount(2);

      await booksPage.removeBook(DUNE.title);

      await expect(booksPage.card(DUNE.title)).toHaveCount(0);
      await expect(booksPage.card(EMMA.title)).toBeVisible();
      await expect(booksPage.count).toHaveText('1 book');
      expect((await booksApi.list()).map((book) => book.title)).toEqual([EMMA.title]);
    });

    test('shows the empty state after removing the last book', async ({ booksPage, booksApi }) => {
      await booksApi.create(DUNE);
      await booksPage.goto();

      await booksPage.removeBook(DUNE.title);

      await expect(booksPage.emptyState).toBeVisible();
      await expect(booksPage.count).toHaveText('0 books');
      expect(await booksApi.list()).toEqual([]);
    });

    test('removal persists across a reload', async ({ booksPage, booksApi }) => {
      await booksApi.create(DUNE);
      await booksPage.goto();
      await booksPage.removeBook(DUNE.title);
      await expect(booksPage.emptyState).toBeVisible();

      await booksPage.page.reload();

      await expect(booksPage.emptyState).toBeVisible();
    });

    test('removes only the clicked card when titles are duplicated', async ({ booksPage, booksApi }) => {
      const older = await booksApi.create({ title: 'Twin', author: 'Older' });
      await booksApi.create({ title: 'Twin', author: 'Newer' });
      await booksPage.goto();
      await expect(booksPage.cards).toHaveCount(2);

      await booksPage.cards.filter({ hasText: 'by Newer' }).getByRole('button', { name: 'Remove' }).click();

      await expect(booksPage.cards).toHaveCount(1);
      await expect(booksPage.cards.first()).toContainText('by Older');
      expect((await booksApi.list()).map((book) => book.id)).toEqual([older.id]);
    });

    test('shows an error and keeps the card when the server fails', async ({ booksPage, booksApi }) => {
      await booksApi.create(DUNE);
      await booksPage.goto();
      await booksPage.page.route('**/api/books/*', (route) =>
        route.request().method() === 'DELETE'
          ? route.fulfill({ status: 500, json: { detail: 'boom' } })
          : route.fallback(),
      );

      await booksPage.removeBook(DUNE.title);

      await expect(booksPage.message).toHaveText('Could not remove this book.');
      await expect(booksPage.card(DUNE.title)).toBeVisible();
      expect(await booksApi.list()).toHaveLength(1);
    });

    test('refreshes the list and explains when the book was already removed elsewhere (404)', async ({
      booksPage,
      booksApi,
    }) => {
      const book = await booksApi.create(DUNE);
      await booksPage.goto();
      await booksApi.remove(book.id);

      await booksPage.removeBook(DUNE.title);

      await expect(booksPage.message).toHaveText('This book was already removed.');
      await expect(booksPage.card(DUNE.title)).toHaveCount(0);
      await expect(booksPage.emptyState).toBeVisible();
    });
  });

  test.describe('loading errors', () => {
    test('shows an error message when the list cannot be loaded', async ({ booksPage }) => {
      await booksPage.page.route('**/api/books', (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ status: 500, json: { detail: 'boom' } })
          : route.fallback(),
      );

      await booksPage.page.goto('/');

      await expect(booksPage.message).toHaveText('Could not load books.');
      await expect(booksPage.cards).toHaveCount(0);
    });
  });

  test.describe('responsive layout', { tag: '@responsive' }, () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('add and remove work on a narrow screen without horizontal scrolling', async ({
      booksPage,
    }) => {
      await booksPage.goto();

      await booksPage.addBook(DUNE);

      await expect(booksPage.card(DUNE.title)).toBeVisible();
      await expect(booksPage.addButton).toBeVisible();
      const overflows = await booksPage.page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);

      await booksPage.removeBook(DUNE.title);
      await expect(booksPage.emptyState).toBeVisible();
    });
  });
});
