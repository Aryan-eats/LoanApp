/**
 * API Error Parser Utility
 *
 * Parses API error responses and extracts user-friendly error messages.
 * Handles various error response formats from the backend.
 */

import { AxiosError } from 'axios';

export interface ApiErrorResponse {
  success: boolean;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
  code?: string;
}

type MutableApiError = Error & {
  userMessage?: string;
  originalMessage?: string;
  status?: number;
  code?: string;
};

const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again.';

const formatValidationErrors = (
  errors: Array<{ field: string; message: string }>
): string => {
  const errorMessages = errors.map((err) => `- ${err.message}`).join('\n');
  return `Please fix the following:\n${errorMessages}`;
};

const getStatusMessage = (status?: number): string | null => {
  if (status === 400) {
    return 'We could not process that request. Please review your input and try again.';
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status === 408) {
    return 'The request timed out. Please try again.';
  }
  if (status === 409) {
    return 'This request conflicted with the current state. Please refresh and try again.';
  }
  if (status === 422) {
    return 'Some information looks invalid. Please review the form and try again.';
  }
  if (status === 423) {
    return 'Account is temporarily locked. Please try again later.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status && status >= 500) {
    return 'Server error. Please try again later.';
  }

  return null;
};

export const isRequestCancellationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Partial<AxiosError> & { name?: string; code?: string };
  return (
    candidate.code === 'ERR_CANCELED'
    || candidate.name === 'AbortError'
    || candidate.name === 'CanceledError'
  );
};

/**
 * Parse an API error and return a user-friendly error message.
 *
 * @param error - The error object from a catch block
 * @param defaultMessage - Fallback message if error can't be parsed
 * @returns A user-friendly error message string
 */
export const parseApiError = (
  error: unknown,
  defaultMessage = DEFAULT_ERROR_MESSAGE
): string => {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    const userMessage = (error as MutableApiError).userMessage;
    if (typeof userMessage === 'string' && userMessage.trim() !== '') {
      return userMessage;
    }
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;

    if (responseData) {
      if (
        responseData.errors
        && Array.isArray(responseData.errors)
        && responseData.errors.length > 0
      ) {
        return formatValidationErrors(responseData.errors);
      }

      if (typeof responseData.message === 'string' && responseData.message.trim() !== '') {
        return responseData.message;
      }
    }

    const statusMessage = getStatusMessage(axiosError.response?.status);
    if (statusMessage) {
      return statusMessage;
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as Error;
    if (err.message === 'Network Error') {
      return 'Unable to connect to server. Please check your internet connection.';
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Request failed with status code')) {
      return defaultMessage;
    }
    return error.message;
  }

  return defaultMessage;
};

/**
 * Extract field-specific errors for form validation
 *
 * @param error - The error object from a catch block
 * @returns A map of field names to error messages, or null if not a validation error
 */
export const parseFieldErrors = (
  error: unknown
): Record<string, string> | null => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;

    if (responseData?.errors && Array.isArray(responseData.errors)) {
      const fieldErrors: Record<string, string> = {};
      for (const err of responseData.errors) {
        if (fieldErrors[err.field]) {
          fieldErrors[err.field] += `. ${err.message}`;
        } else {
          fieldErrors[err.field] = err.message;
        }
      }
      return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
    }
  }
  return null;
};

export const decorateApiError = <T>(
  error: T,
  defaultMessage = DEFAULT_ERROR_MESSAGE
): T => {
  const userMessage = parseApiError(error, defaultMessage);

  if (error instanceof Error) {
    const decoratedError = error as MutableApiError;

    if (typeof decoratedError.originalMessage !== 'string') {
      decoratedError.originalMessage = error.message;
    }

    if (
      typeof decoratedError.status !== 'number'
      && error
      && typeof error === 'object'
      && 'response' in error
    ) {
      const axiosError = error as unknown as AxiosError<ApiErrorResponse>;
      if (typeof axiosError.response?.status === 'number') {
        decoratedError.status = axiosError.response.status;
      }
    }

    decoratedError.userMessage = userMessage;
    decoratedError.message = userMessage;
  }

  return error;
};

export default parseApiError;
