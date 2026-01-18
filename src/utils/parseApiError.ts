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
}

/**
 * Parse an API error and return a user-friendly error message.
 * 
 * @param error - The error object from a catch block
 * @param defaultMessage - Fallback message if error can't be parsed
 * @returns A user-friendly error message string
 */
export const parseApiError = (
  error: unknown,
  defaultMessage = 'An error occurred. Please try again.'
): string => {
  // Handle Axios errors with response data
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;

    if (responseData) {
      // Handle validation errors array
      if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        const errorMessages = responseData.errors.map((err) => `• ${err.message}`).join('\n');
        return `Please fix the following:\n${errorMessages}`;
      }

      // Handle simple message
      if (responseData.message) {
        return responseData.message;
      }
    }

    // Handle status-based messages
    const status = axiosError.response?.status;
    if (status === 401) {
      return 'Authentication failed. Please check your credentials.';
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 404) {
      return 'The requested resource was not found.';
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
  }

  // Handle network errors
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as Error;
    if (err.message === 'Network Error') {
      return 'Unable to connect to server. Please check your internet connection.';
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Don't show raw axios error messages to users
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
        // If there are multiple errors for the same field, join them
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

export default parseApiError;
