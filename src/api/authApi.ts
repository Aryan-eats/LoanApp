/**
 * Authentication API functions
 * 
 * Uses the apiClient for consistent token handling with JWT authentication.
 * Refresh tokens are managed via httpOnly cookies (set by the server).
 * Access tokens are kept in memory via apiClient's setAccessToken.
 */

import apiClient, { setAccessToken, getAccessToken, startSilentRefresh } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface PartnerRegistrationData {
  // Step 1: Basic Identity
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  partnerType: string;
  city: string;
  phoneVerificationToken?: string;
  // Step 2: Business Details
  businessName: string;
  businessAddress: string;
  yearsInOperation: string;
  panNumber: string;
  gstNumber: string;
  hasExperience: string;
  expectedLeads: string;
  // Step 3: Payout Info
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  // Step 4: Consent
  consentDataShare: boolean;
  consentCommission: boolean;
  declarationNotEmployed: boolean;
  consentPrivacyPolicy: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  code?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'agent' | 'viewer' | 'partner';
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  onboardingStatus?: 'pending' | 'approved' | 'rejected' | null;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export interface RegistrationResponse {
  user: AuthUser;
}

/**
 * Register a new user
 */
export const register = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<ApiResponse<RegistrationResponse>> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

/**
 * Register a new partner with onboarding data
 */
export const registerPartner = async (
  data: PartnerRegistrationData
): Promise<ApiResponse<RegistrationResponse>> => {
  const response = await apiClient.post('/auth/register-partner', data);
  return response.data;
};

/**
 * Login user
 */
export const login = async (
  email: string,
  password: string,
  portal: 'partner' | 'admin' = 'partner'
): Promise<ApiResponse<AuthResponse>> => {
  const endpoint = portal === 'admin'
    ? '/auth/login/restricted-access'
    : '/auth/login/partner';
  const response = await apiClient.post(endpoint, { email, password });
  
  // Store access token in memory if login successful
  if (response.data.success && response.data.data) {
    const data = response.data.data as AuthResponse;
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      if (typeof data.expiresIn === 'number' && data.expiresIn > 0) {
        startSilentRefresh(data.expiresIn);
      }
    }
  }

  return response.data;
};

export const getGooglePartnerOAuthUrl = (): string =>
  `${API_BASE_URL}/auth/login/partner/google`;

/**
 * Get current user profile
 */
export const getMe = async (): Promise<ApiResponse<{ user: AuthUser }>> => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  } finally {
    // Always clear in-memory token on logout attempt
    setAccessToken(null);
  }
};

/**
 * Refresh access token (cookie-based — no body needed)
 */
export const refreshToken = async (): Promise<ApiResponse<{ 
  accessToken: string;
  expiresIn: number;
}>> => {
  const response = await apiClient.post('/auth/refresh-token');
  
  if (response.data.data?.accessToken) {
    setAccessToken(response.data.data.accessToken);
    if (
      typeof response.data.data.expiresIn === 'number'
      && response.data.data.expiresIn > 0
    ) {
      startSilentRefresh(response.data.data.expiresIn);
    }
  }

  return response.data;
};

/**
 * Request password reset
 */
export const forgotPassword = async (email: string): Promise<ApiResponse> => {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Reset password with code
 */
export const resetPassword = async (
  email: string,
  code: string,
  password: string
): Promise<ApiResponse> => {
  const response = await apiClient.post('/auth/reset-password', { email, code, password });
  return response.data;
};

/**
 * Send OTP for verification
 */
type OtpRecipient =
  | { phone: string; email?: never }
  | { email: string; phone?: never };

export const sendOTP = async (params: OtpRecipient): Promise<ApiResponse> => {
  if (!params.phone && !params.email) {
    return {
      success: false,
      message: 'Phone or email is required to send OTP',
    };
  }
  const response = await apiClient.post('/auth/send-otp', params);
  return response.data;
};

/**
 * Verify OTP
 */
export const verifyOTP = async (
  params: OtpRecipient & { otp: string }
): Promise<ApiResponse<{ user?: AuthUser; verificationToken?: string }>> => {
  if (!params.phone && !params.email) {
    return {
      success: false,
      message: 'Phone or email is required to verify OTP',
    };
  }
  const response = await apiClient.post('/auth/verify-otp', params);
  return response.data;
};

/**
 * Verify OTP using MSG91 token
 */
export const verifyMsg91OTP = async (params: {
  token: string;
  type: 'phone' | 'email';
  userId: string;
}): Promise<ApiResponse<{ user: AuthUser }>> => {
  const response = await apiClient.post('/auth/verify-msg91', params);
  return response.data;
};

/**
 * Check if user is authenticated (has in-memory access token)
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

/**
 * Initialize auth state from in-memory token
 * (no-op now since tokens are only in memory, but kept for API compatibility)
 */
export const initializeAuth = (): void => {
  // Access token is already in memory via apiClient module scope.
  // Refresh token is managed by httpOnly cookie.
};

// =========================================
// MSG91 REST API Functions (New)
// =========================================

/**
 * Send OTP via MSG91 REST API
 */
export const sendOTPApi = async (mobile: string): Promise<ApiResponse<{ requestId?: string }>> => {
  const response = await apiClient.post('/auth/otp/send', { mobile });
  return response.data;
};

export interface VerifyOTPPayload {
  mobile: string;
  otp: string;
}

/**
 * Verify OTP via MSG91 REST API
 */
export const verifyOTPApi = async (
  params: VerifyOTPPayload
): Promise<ApiResponse<{ verificationToken?: string }>> => {
  const response = await apiClient.post('/auth/otp/verify', params);
  return response.data;
};

/**
 * Resend OTP via MSG91 REST API
 */
export const resendOTPApi = async (
  mobile: string,
  retryType: 'text' | 'voice' = 'text'
): Promise<ApiResponse<{ requestId?: string }>> => {
  const response = await apiClient.post('/auth/otp/resend', { mobile, retryType });
  return response.data;
};

export default {
  register,
  registerPartner,
  login,
  getGooglePartnerOAuthUrl,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  verifyMsg91OTP,
  isAuthenticated,
  initializeAuth,
  // New MSG91 REST API functions
  sendOTPApi,
  verifyOTPApi,
  resendOTPApi,
};
