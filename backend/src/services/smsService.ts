/**
 * MSG91 SMS Service
 * Handles OTP operations via MSG91 REST APIs (no widget dependency)
 */

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
// Helpers
// --------------------------------

const getAuthKey = (): string => process.env.MSG91_AUTH_KEY || '';
const getTemplateId = (): string => process.env.MSG91_TEMPLATE_ID || '';

/**
 * Format phone number to 91XXXXXXXXXX format
 */
const formatIndianNumber = (phone: string): string => {
  const trimmed = phone.replace(/\s+/g, '').replace(/^\+/, '');
  if (trimmed.startsWith('91') && trimmed.length === 12) {
    return trimmed;
  }
  if (trimmed.length === 10) {
    return `91${trimmed}`;
  }
  return trimmed;
};

// --------------------------------
// MSG91 REST API Functions
// --------------------------------

/**
 * Send OTP to mobile number
 * POST https://control.msg91.com/api/v5/otp
 */
export const sendOTP = async (mobile: string): Promise<OTPResult> => {
  const authKey = getAuthKey();
  const templateId = getTemplateId();

  if (!authKey || !templateId) {
    return {
      success: false,
      message: 'MSG91 configuration missing (AUTH_KEY or TEMPLATE_ID)',
    };
  }

  try {
    const formattedMobile = formatIndianNumber(mobile);
    const url = 'https://control.msg91.com/api/v5/otp';

    const response = await fetch(url, {
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

    const data = (await response.json()) as Msg91Response;

    if (data.type === 'success') {
      return {
        success: true,
        message: data.message || 'OTP sent successfully',
        requestId: data.request_id,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to send OTP',
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
  const authKey = getAuthKey();

  if (!authKey) {
    return {
      success: false,
      message: 'MSG91 configuration missing (AUTH_KEY)',
    };
  }

  try {
    const formattedMobile = formatIndianNumber(mobile);
    const url = new URL('https://control.msg91.com/api/v5/otp/verify');
    url.searchParams.append('mobile', formattedMobile);
    url.searchParams.append('otp', otp);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        authkey: authKey,
      },
    });

    const data = (await response.json()) as Msg91Response;

    if (data.type === 'success') {
      return {
        success: true,
        message: data.message || 'OTP verified successfully',
        type: 'success',
      };
    }

    return {
      success: false,
      message: data.message || 'Invalid OTP',
      type: data.type,
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
  const authKey = getAuthKey();

  if (!authKey) {
    return {
      success: false,
      message: 'MSG91 configuration missing (AUTH_KEY)',
    };
  }

  try {
    const formattedMobile = formatIndianNumber(mobile);
    const url = new URL('https://control.msg91.com/api/v5/otp/retry');
    url.searchParams.append('mobile', formattedMobile);
    url.searchParams.append('retrytype', retryType);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        authkey: authKey,
      },
    });

    const data = (await response.json()) as Msg91Response;

    if (data.type === 'success') {
      return {
        success: true,
        message: data.message || 'OTP resent successfully',
        requestId: data.request_id,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to resend OTP',
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
