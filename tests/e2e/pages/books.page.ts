import { expect, type Locator, type Page } from '@playwright/test';
import type { NewBook } from '../support/books-api';

/**
 * Page object for the single-page BookManagementApp.
 *
 * Selector strategy: roles and labels first. The app ships no data-testid attributes, so the
 * book count (a plain span) is the only element addressed by id.
 */
export class BooksPage {
  readonly heading: Locator;
  readonly titleInput: Locator;
  readonly authorInput: Locator;
  readonly statusSelect: Locator;
  readonly addButton: Locator;
  readonly message: Locator;
  readonly count: Locator;
  readonly cards: Locator;
  readonly emptyState: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'BookManagementApp' });
    this.titleInput = page.getByLabel('Title', { exact: true });
    this.authorInput = page.getByLabel('Author', { exact: true });
    this.statusSelect = page.getByLabel('Reading status');
    this.addButton = page.getByRole('button', { name: 'Add book' });
    this.message = page.getByRole('status');
    this.count = page.locator('#book-count');
    this.cards = page.getByRole('article');
    this.emptyState = page.getByText('No books yet. Add one above to get started.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.heading).toBeVisible();
    // The list renders after an async fetch; wait for either cards or the empty state.
    await expect(this.count).toHaveText(/^\d+ books?$/);
  }

  /** Card for a book, matched by exact title heading. */
  card(title: string): Locator {
    return this.cards.filter({
      has: this.page.getByRole('heading', { level: 3, name: title, exact: true }),
    });
  }

  async fillForm(book: NewBook): Promise<void> {
    await this.titleInput.fill(book.title);
    await this.authorInput.fill(book.author);
    if (book.status) {
      await this.statusSelect.selectOption(book.status);
    }
  }

  async addBook(book: NewBook): Promise<void> {
    await this.fillForm(book);
    await this.addButton.click();
  }

  async removeBook(title: string): Promise<void> {
    await this.card(title).getByRole('button', { name: 'Remove' }).click();
  }

  /** Titles in display order (top to bottom). */
  cardTitles(): Promise<string[]> {
    return this.cards.getByRole('heading', { level: 3 }).allTextContents();
  }

  async expectCard(book: NewBook & { status: string }): Promise<void> {
    const card = this.card(book.title);
    await expect(card).toBeVisible();
    await expect(card).toContainText(`by ${book.author}`);
    await expect(card).toContainText(book.status);
  }
}
