/**
 * Authentication API functions
 * 
 * Uses the apiClient for consistent token handling.
 */

import apiClient, { setAccessToken } from './apiClient';

export interface PartnerRegistrationData {
  // Step 1: Basic Identity
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  partnerType: string;
  city: string;
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
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'partner';
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new partner with onboarding data
 */
export const registerPartner = async (
  data: PartnerRegistrationData
): Promise<ApiResponse<AuthResponse>> => {
  const response = await apiClient.post('/auth/register-partner', data);
  
  // Store tokens
  if (response.data.data?.accessToken) {
    setAccessToken(response.data.data.accessToken);
  }
  if (response.data.data?.refreshToken) {
    localStorage.setItem('refreshToken', response.data.data.refreshToken);
  }

  return response.data;
};

/**
 * Login user
 */
export const login = async (
  email: string,
  password: string
): Promise<ApiResponse<AuthResponse>> => {
  const response = await apiClient.post('/auth/login', { email, password });
  
  // Store tokens
  if (response.data.data?.accessToken) {
    setAccessToken(response.data.data.accessToken);
  }
  if (response.data.data?.refreshToken) {
    localStorage.setItem('refreshToken', response.data.data.refreshToken);
  }

  return response.data;
};

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
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (): Promise<ApiResponse<{ accessToken: string }>> => {
  const storedRefreshToken = localStorage.getItem('refreshToken');
  const response = await apiClient.post('/auth/refresh-token', {
    refreshToken: storedRefreshToken,
  });
  
  if (response.data.data?.accessToken) {
    setAccessToken(response.data.data.accessToken);
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
 * Reset password with token
 */
export const resetPassword = async (
  token: string,
  password: string
): Promise<ApiResponse> => {
  const response = await apiClient.post('/auth/reset-password', { token, password });
  return response.data;
};

export default {
  registerPartner,
  login,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
};
