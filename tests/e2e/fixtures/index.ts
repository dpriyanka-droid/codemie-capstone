import { test as base, expect } from '@playwright/test';
import { BooksPage } from '../pages/books.page';
import { BooksApi } from '../support/books-api';

interface Fixtures {
  booksApi: BooksApi;
  booksPage: BooksPage;
  cleanDatabase: void;
}

export const test = base.extend<Fixtures>({
  booksApi: async ({ request }, use) => {
    await use(new BooksApi(request));
  },

  // Auto fixture: every test starts and ends with an empty book table, so tests never depend
  // on each other or on execution order. Teardown runs even when the test fails.
  cleanDatabase: [
    async ({ booksApi }, use) => {
      await booksApi.deleteAll();
      await use();
      await booksApi.deleteAll();
    },
    { auto: true },
  ],

  // Does not navigate, so tests can seed data through the API first and then call goto().
  booksPage: async ({ page }, use) => {
    await use(new BooksPage(page));
  },
});

export { expect };
