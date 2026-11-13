import { test, expect } from '../fixtures';
import { DEFAULT_STATUS, DUNE, EMMA, LIMITS } from '../support/data';

/**
 * Black-box API checks against the running server over real HTTP.
 * They complement (not replace) the in-process pytest suite in tests/test_api.py, so the focus
 * is on contract shape, boundary values that pytest does not cover, and full round trips.
 */
test.describe('Books API', { tag: '@api' }, () => {
  test.describe('GET /api/books', () => {
    test('returns an empty JSON array when there are no books', { tag: '@smoke' }, async ({ booksApi }) => {
      const response = await booksApi.listRaw();

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
      expect(await response.json()).toEqual([]);
    });

    test('returns books newest first with the documented fields', async ({ booksApi }) => {
      const first = await booksApi.create({ title: 'First', author: 'A' });
      const second = await booksApi.create({ title: 'Second', author: 'B', status: 'Finished' });

      const books = await booksApi.list();

      expect(books).toEqual([second, first]);
      expect(Object.keys(books[0]).sort()).toEqual(['author', 'id', 'status', 'title']);
    });
  });

  test.describe('POST /api/books', () => {
    test('creates a book (201) with a generated integer id', { tag: '@smoke' }, async ({ booksApi }) => {
      const response = await booksApi.createRaw(DUNE);

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(Number.isInteger(body.id)).toBe(true);
      expect(body).toMatchObject(DUNE);
    });

    test('defaults the status when omitted', async ({ booksApi }) => {
      const book = await booksApi.create({ title: 'Dune', author: 'Frank Herbert' });

      expect(book.status).toBe(DEFAULT_STATUS);
    });

    test('trims title, author and status', async ({ booksApi }) => {
      const book = await booksApi.create({ title: ' Dune ', author: ' Herbert ', status: ' Reading ' });

      expect(book).toMatchObject({ title: 'Dune', author: 'Herbert', status: 'Reading' });
    });

    test('accepts values exactly at the maximum lengths', async ({ booksApi }) => {
      const book = await booksApi.create({
        title: 'T'.repeat(LIMITS.title),
        author: 'A'.repeat(LIMITS.author),
        status: 'S'.repeat(LIMITS.status),
      });

      expect(book.title).toHaveLength(LIMITS.title);
      expect(book.author).toHaveLength(LIMITS.author);
      expect(book.status).toHaveLength(LIMITS.status);
    });

    test('round-trips unicode text', async ({ booksApi }) => {
      const created = await booksApi.create({ title: 'Les Misérables 悲惨世界', author: 'Çelik' });

      expect((await booksApi.list())[0]).toEqual(created);
    });

    test('allows duplicate books and gives each a distinct id', async ({ booksApi }) => {
      const a = await booksApi.create(DUNE);
      const b = await booksApi.create(DUNE);

      expect(a.id).not.toBe(b.id);
      expect(await booksApi.list()).toHaveLength(2);
    });

    const invalidPayloads: Array<[string, unknown]> = [
      ['empty object', {}],
      ['missing author', { title: 'Dune' }],
      ['missing title', { author: 'Frank Herbert' }],
      ['empty title', { title: '', author: 'Frank Herbert' }],
      ['title one over limit', { title: 'T'.repeat(LIMITS.title + 1), author: 'A' }],
      ['author one over limit', { title: 'T', author: 'A'.repeat(LIMITS.author + 1) }],
      ['status one over limit', { title: 'T', author: 'A', status: 'S'.repeat(LIMITS.status + 1) }],
      ['non-string title', { title: 123, author: 'A' }],
      ['null author', { title: 'T', author: null }],
    ];
    for (const [name, payload] of invalidPayloads) {
      test(`rejects invalid payload: ${name} (422)`, async ({ booksApi }) => {
        const response = await booksApi.createRaw(payload);

        expect(response.status()).toBe(422);
        expect(await booksApi.list()).toEqual([]);
      });
    }

    test('rejects whitespace-only title with a clear message', async ({ booksApi }) => {
      const response = await booksApi.createRaw({ title: '   ', author: 'Frank Herbert' });

      expect(response.status()).toBe(422);
      expect((await response.json()).detail).toBe('Title and author are required.');
    });

    test('rejects a non-JSON body (422)', async ({ request }) => {
      const response = await request.post('/api/books', {
        headers: { 'Content-Type': 'application/json' },
        data: '{not json',
      });

      expect(response.status()).toBe(422);
    });

    test('stores SQL metacharacters literally', async ({ booksApi }) => {
      const title = "x'); DROP TABLE books;--";

      await booksApi.create({ title, author: 'Mallory' });

      expect((await booksApi.list()).map((book) => book.title)).toEqual([title]);
    });
  });

  test.describe('DELETE /api/books/{id}', () => {
    test('deletes a book (204, empty body) and it disappears from the list', { tag: '@smoke' }, async ({ booksApi }) => {
      const keep = await booksApi.create(DUNE);
      const remove = await booksApi.create(EMMA);

      const response = await booksApi.removeRaw(remove.id);

      expect(response.status()).toBe(204);
      expect(await response.text()).toBe('');
      expect(await booksApi.list()).toEqual([keep]);
    });

    test('returns 404 for an unknown id', async ({ booksApi }) => {
      const response = await booksApi.removeRaw(999_999);

      expect(response.status()).toBe(404);
      expect((await response.json()).detail).toBe('Book not found.');
    });

    test('returns 404 when deleting the same book twice', async ({ booksApi }) => {
      const book = await booksApi.create(DUNE);
      await booksApi.remove(book.id);

      expect((await booksApi.removeRaw(book.id)).status()).toBe(404);
    });

    test('returns 422 for a non-integer id', async ({ booksApi }) => {
      expect((await booksApi.removeRaw('abc')).status()).toBe(422);
    });

    test('does not reuse the id of a deleted book', async ({ booksApi }) => {
      const first = await booksApi.create(DUNE);
      await booksApi.remove(first.id);

      const second = await booksApi.create(DUNE);

      expect(second.id).toBeGreaterThan(first.id);
    });
  });

  test.describe('service contract', () => {
    test('serves the frontend page and static assets', async ({ request }) => {
      const home = await request.get('/');
      expect(home.status()).toBe(200);
      expect(home.headers()['content-type']).toContain('text/html');
      expect(await home.text()).toContain('BookManagementApp');

      expect((await request.get('/static/app.js')).status()).toBe(200);
      expect((await request.get('/static/style.css')).status()).toBe(200);
    });

    test('rejects unsupported methods and unknown routes', async ({ request }) => {
      expect((await request.put('/api/books', { data: {} })).status()).toBe(405);
      expect((await request.get('/api/unknown')).status()).toBe(404);
    });

    test('publishes an OpenAPI schema describing the book model', async ({ request }) => {
      const response = await request.get('/openapi.json');

      expect(response.status()).toBe(200);
      const schema = await response.json();
      expect(Object.keys(schema.paths)).toEqual(
        expect.arrayContaining(['/api/books', '/api/books/{book_id}']),
      );
      expect([...schema.components.schemas.BookCreate.required].sort()).toEqual(['author', 'title']);
    });
  });
});
