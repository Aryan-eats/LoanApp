/**
 * Admin API Client
 * 
 * API functions for admin-specific endpoints.
 * Matches backend /api/admin routes.
 */

import apiClient from './apiClient';

// Types for admin users
export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'manager' | 'agent' | 'viewer' | 'partner';
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UsersResponse {
  users: AdminUser[];
}

export interface AdminStatsResponse {
  stats: {
    totalUsers: number;
    activeUsers: number;
    partners: number;
    admins: number;
    verifiedUsers: number;
    newUsersThisWeek: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data?: T;
}

/**
 * GET /api/admin/users - Get all users
 */
export const getUsers = async (): Promise<ApiResponse<UsersResponse>> => {
  const response = await apiClient.get('/admin/users');
  return response.data;
};

/**
 * POST /api/admin/users - Create a new admin user
 */
export const createUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminUser['role'];
}): Promise<ApiResponse<{ user: AdminUser }>> => {
  const response = await apiClient.post('/admin/users', data);
  return response.data;
};

/**
 * GET /api/admin/users/:id - Get user by ID
 */
export const getUserById = async (id: string): Promise<ApiResponse<{ user: AdminUser }>> => {
  const response = await apiClient.get(`/admin/users/${id}`);
  return response.data;
};

/**
 * PUT /api/admin/users/:id - Update user
 */
export const updateUser = async (
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    role: AdminUser['role'];
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  }>
): Promise<ApiResponse<{ user: AdminUser }>> => {
  const response = await apiClient.put(`/admin/users/${id}`, data);
  return response.data;
};

/**
 * DELETE /api/admin/users/:id - Delete user
 */
export const deleteUser = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete(`/admin/users/${id}`);
  return response.data;
};

/**
 * GET /api/admin/stats - Get admin dashboard statistics
 */
export const getAdminStats = async (): Promise<ApiResponse<AdminStatsResponse>> => {
  const response = await apiClient.get('/admin/stats');
  return response.data;
};

/**
 * GET /api/admin/partners - Get all partners (admin view)
 */
export const getAdminPartners = async (params: {
  status?: string;
} = {}): Promise<ApiResponse<{ partners: unknown[] }>> => {
  const response = await apiClient.get('/admin/partners', { params });
  return response.data;
};

// Types for audit logs
export interface AuditLogEntry {
  id: string;
  event: string;
  userName: string;
  userRole: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsData {
  logs: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * GET /api/admin/audit-logs - Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (params: {
  event?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ApiResponse<AuditLogsData>> => {
  const response = await apiClient.get('/admin/audit-logs', { params });
  return response.data;
};

export default {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getAdminStats,
  getAdminPartners,
  getAuditLogs,
};
