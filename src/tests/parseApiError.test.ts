import { describe, expect, it } from 'vitest';
import { decorateApiError, parseApiError } from '../utils/parseApiError';

describe('parseApiError utilities', () => {
  it('maps generic HTTP status codes to user-friendly messages', () => {
    const error = Object.assign(new Error('Request failed with status code 403'), {
      response: {
        status: 403,
        data: {
          success: false,
        },
      },
    });

    decorateApiError(error);

    expect(error.message).toBe('You do not have permission to perform this action.');
    expect(parseApiError(error)).toBe('You do not have permission to perform this action.');
  });

  it('preserves explicit backend messages when available', () => {
    const error = Object.assign(new Error('Request failed with status code 401'), {
      response: {
        status: 401,
        data: {
          success: false,
          message: 'Invalid credentials',
        },
      },
    });

    decorateApiError(error);

    expect(error.message).toBe('Invalid credentials');
    expect(parseApiError(error)).toBe('Invalid credentials');
  });
});
