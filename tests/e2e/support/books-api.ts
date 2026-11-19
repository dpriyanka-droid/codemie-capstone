import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export interface Book {
  id: number;
  title: string;
  author: string;
  status: string;
}

export interface NewBook {
  title: string;
  author: string;
  status?: string;
}

/** Thin wrapper over the REST API, used for test data setup/teardown and API specs. */
export class BooksApi {
  constructor(private readonly request: APIRequestContext) {}

  /** Raw calls: return the response so negative tests can assert status codes. */
  listRaw(): Promise<APIResponse> {
    return this.request.get('/api/books');
  }

  createRaw(payload: unknown): Promise<APIResponse> {
    return this.request.post('/api/books', { data: payload as object });
  }

  removeRaw(id: number | string): Promise<APIResponse> {
    return this.request.delete(`/api/books/${id}`);
  }

  /** Convenience calls: assert success and return parsed data. */
  async list(): Promise<Book[]> {
    const response = await this.listRaw();
    expect(response.status()).toBe(200);
    return response.json();
  }

  async create(book: NewBook): Promise<Book> {
    const response = await this.createRaw(book);
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  }

  async remove(id: number): Promise<void> {
    const response = await this.removeRaw(id);
    expect(response.status()).toBe(204);
  }

  async deleteAll(): Promise<void> {
    for (const book of await this.list()) {
      await this.remove(book.id);
    }
  }
}
