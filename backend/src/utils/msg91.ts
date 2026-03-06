/**
 * MSG91 Utility Service (DEPRECATED)
 * 
 * This file is kept for backward compatibility but should be removed in future cleanup.
 * The widget-based verification has been replaced by direct REST API calls.
 * 
 * @see backend/src/services/smsService.ts for the new implementation
 * @deprecated Use smsService.ts functions instead
 */

/**
 * @deprecated The widget token verification is no longer used.
 * OTP verification is now handled via direct REST API calls in smsService.ts
 */
export const verifyMsg91Token = async (_accessToken: string): Promise<boolean> => {
  throw new Error(
    'verifyMsg91Token is deprecated and must not be called. ' +
    'Use verifyOTP from smsService.ts instead.'
  );
};
