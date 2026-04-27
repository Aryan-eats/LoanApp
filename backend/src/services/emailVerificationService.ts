import { getMockOtp, isMockVerificationEnabled } from './mockVerificationService.js';

interface EmailVerificationResult {
  success: boolean;
  message: string;
}

const getSendGridApiKey = (): string => process.env.SENDGRID_API_KEY || '';
const getSendGridTemplateId = (): string =>
  process.env.SENDGRID_VERIFICATION_TEMPLATE_ID || '';

export const sendVerificationCode = async (
  _email: string,
  _otp: string
): Promise<EmailVerificationResult> => {
  if (isMockVerificationEnabled()) {
    if (!getMockOtp('email')) {
      return {
        success: false,
        message: 'Mock email OTP not configured',
      };
    }

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  if (!getSendGridApiKey() || !getSendGridTemplateId()) {
    return {
      success: false,
      message: 'SendGrid verification provider not configured',
    };
  }

  return {
    success: false,
    message: 'SendGrid verification provider not implemented',
  };
};
