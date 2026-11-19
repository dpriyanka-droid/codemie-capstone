import type { NewBook } from './books-api';

export const READING_STATUSES = ['Want to Read', 'Reading', 'Finished'] as const;

export const DEFAULT_STATUS = 'Want to Read';

/** Field limits from the BookCreate model in app.py. */
export const LIMITS = { title: 200, author: 120, status: 40 } as const;

export const DUNE: NewBook = { title: 'Dune', author: 'Frank Herbert', status: 'Reading' };
export const EMMA: NewBook = { title: 'Emma', author: 'Jane Austen', status: 'Finished' };
export const NEUROMANCER: NewBook = { title: 'Neuromancer', author: 'William Gibson' };
