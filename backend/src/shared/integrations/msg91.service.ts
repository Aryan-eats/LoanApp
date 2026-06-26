/**
 * MSG91 SMS Service
 * Handles OTP operations via MSG91 REST APIs (no widget dependency)
 */

import {
  getMockOtp,
  isMockVerificationEnabled,
  matchesMockOtp,
} from '../../modules/auth/mockVerification.service.js';

// --------------------------------
// Types
// --------------------------------

interface OTPResult {
  success: boolean;
  message: string;
  requestId?: string;
}

interface VerifyResult {
  success: boolean;
  message: string;
  type?: string;
}

interface Msg91Response {
  type?: string;
  message?: string;
  request_id?: string;
}

// --------------------------------
// Constants
// --------------------------------

/** Timeout for MSG91 API calls in milliseconds. */
const API_TIMEOUT_MS = 10_000;

// --------------------------------
// Helpers
// --------------------------------

const getAuthKey = (): string => process.env.MSG91_AUTH_KEY || '';
const getTemplateId = (): string => process.env.MSG91_TEMPLATE_ID || '';

/**
 * Format phone number to 91XXXXXXXXXX format.
 * Returns `null` if the input is not a valid 10-digit or 91+10-digit number.
 */
export const formatIndianNumber = (phone: string): string | null => {
  const trimmed = phone.replace(/\s+/g, '').replace(/^\+/, '');
  // Already in 91XXXXXXXXXX format
  if (/^91\d{10}$/.test(trimmed)) {
    return trimmed;
  }
  // Plain 10-digit number
  if (/^\d{10}$/.test(trimmed)) {
    return `91${trimmed}`;
  }
  // Anything else is invalid
  return null;
};

/**
 * Helper: execute a fetch with AbortController timeout and response.ok check.
 * Returns the parsed JSON on success, or an error result on failure.
 */
async function safeFetch(
  url: string | URL,
  init: RequestInit,
): Promise<{ ok: true; data: Msg91Response } | { ok: false; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url instanceof URL ? url.toString() : url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, message: `MSG91 API error (HTTP ${response.status})` };
    }

    const data = (await response.json()) as Msg91Response;
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'MSG91 API request timed out' };
    }
    throw error; // re-throw unexpected errors to be caught by the caller
  } finally {
    clearTimeout(timer);
  }
}

// --------------------------------
// MSG91 REST API Functions
// --------------------------------

/**
 * Send OTP to mobile number
 * POST https://control.msg91.com/api/v5/otp
 */
export const sendOTP = async (mobile: string): Promise<OTPResult> => {
  if (isMockVerificationEnabled()) {
    if (!getMockOtp('phone')) {
      return {
        success: false,
        message: 'Mock phone OTP not configured',
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      requestId: 'mock-msg91-request',
    };
  }

  const authKey = getAuthKey();
  const templateId = getTemplateId();

  if (!authKey || !templateId) {
    return {
      success: false,
      message: 'MSG91 configuration missing (AUTH_KEY or TEMPLATE_ID)',
    };
  }

  const formattedMobile = formatIndianNumber(mobile);
  if (!formattedMobile) {
    return {
      success: false,
      message: 'Invalid phone number. Provide a 10-digit Indian mobile number.',
    };
  }

  try {
    const url = 'https://control.msg91.com/api/v5/otp';

    const result = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: formattedMobile,
        otp_expiry: 10,
      }),
    });

    if (!result.ok) {
      return { success: false, message: result.message };
    }

    if (result.data.type === 'success') {
      return {
        success: true,
        message: result.data.message || 'OTP sent successfully',
        requestId: result.data.request_id,
      };
    }

    return {
      success: false,
      message: result.data.message || 'Failed to send OTP',
    };
  } catch (error) {
    console.error('MSG91 sendOTP error:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
    };
  }
};

/**
 * Verify OTP
 * GET https://control.msg91.com/api/v5/otp/verify
 */
export const verifyOTP = async (mobile: string, otp: string): Promise<VerifyResult> => {
  if (isMockVerificationEnabled()) {
    if (!getMockOtp('phone')) {
      return {
        success: false,
        message: 'Mock phone OTP not configured',
      };
    }

    return matchesMockOtp('phone', otp)
      ? {
          success: true,
          message: 'OTP verified successfully',
          type: 'success',
        }
      : {
          success: false,
          message: 'Invalid OTP',
          type: 'error',
        };
  }

  const authKey = getAuthKey();

  if (!authKey) {
    return {
      success: false,
      message: 'MSG91 configuration missing (AUTH_KEY)',
    };
  }

  const formattedMobile = formatIndianNumber(mobile);
  if (!formattedMobile) {
    return {
      success: false,
      message: 'Invalid phone number. Provide a 10-digit Indian mobile number.',
    };
  }

  try {
    const url = new URL('https://control.msg91.com/api/v5/otp/verify');
    url.searchParams.append('mobile', formattedMobile);
    url.searchParams.append('otp', otp);

    const result = await safeFetch(url, {
      method: 'GET',
      headers: {
        authkey: authKey,
      },
    });

    if (!result.ok) {
      return { success: false, message: result.message };
    }

    if (result.data.type === 'success') {
      return {
        success: true,
        message: result.data.message || 'OTP verified successfully',
        type: 'success',
      };
    }

    return {
      success: false,
      message: result.data.message || 'Invalid OTP',
      type: result.data.type,
    };
  } catch (error) {
    console.error('MSG91 verifyOTP error:', error);
    return {
      success: false,
      message: 'Failed to verify OTP. Please try again.',
    };
  }
};

/**
 * Resend OTP
 * GET https://control.msg91.com/api/v5/otp/retry
 * @param retryType - 'text' for SMS, 'voice' for voice call
 */
export const resendOTP = async (
  mobile: string,
  retryType: 'text' | 'voice' = 'text'
): Promise<OTPResult> => {
  if (isMockVerificationEnabled()) {
    if (!getMockOtp('phone')) {
      return {
        success: false,
        message: 'Mock phone OTP not configured',
      };
    }

    return {
      success: true,
      message: 'OTP resent successfully',
      requestId: 'mock-msg91-request',
    };
  }

  const authKey = getAuthKey();

  if (!authKey) {
    return {
      success: false,
      message: 'MSG91 configuration missing (AUTH_KEY)',
    };
  }

  const formattedMobile = formatIndianNumber(mobile);
  if (!formattedMobile) {
    return {
      success: false,
      message: 'Invalid phone number. Provide a 10-digit Indian mobile number.',
    };
  }

  try {
    const url = new URL('https://control.msg91.com/api/v5/otp/retry');
    url.searchParams.append('mobile', formattedMobile);
    url.searchParams.append('retrytype', retryType);

    const result = await safeFetch(url, {
      method: 'GET',
      headers: {
        authkey: authKey,
      },
    });

    if (!result.ok) {
      return { success: false, message: result.message };
    }

    if (result.data.type === 'success') {
      return {
        success: true,
        message: result.data.message || 'OTP resent successfully',
        requestId: result.data.request_id,
      };
    }

    return {
      success: false,
      message: result.data.message || 'Failed to resend OTP',
    };
  } catch (error) {
    console.error('MSG91 resendOTP error:', error);
    return {
      success: false,
      message: 'Failed to resend OTP. Please try again.',
    };
  }
};

// --------------------------------
// Legacy Export (keeping for backwards compat)
// --------------------------------

export const sendOtpSms = sendOTP;
