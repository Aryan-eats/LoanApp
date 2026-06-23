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

export type PermissionResource = 'leads' | 'partners' | 'banks' | 'users' | 'roles';
export type PermissionAction = 'read' | 'create' | 'update' | 'delete';
export type RolePermissions = Record<PermissionResource, Record<PermissionAction, boolean>>;

export interface RolePermissionEntry {
  role: Exclude<AdminUser['role'], 'partner'>;
  permissions: RolePermissions;
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
 * GET /api/admin/roles - Get role permissions
 */
export const getRolePermissions = async (): Promise<ApiResponse<{ roles: RolePermissionEntry[] }>> => {
  const response = await apiClient.get('/admin/roles');
  return response.data;
};

/**
 * PUT /api/admin/roles/:role/permissions - Update role permissions
 */
export const updateRolePermissions = async (
  role: RolePermissionEntry['role'],
  permissions: RolePermissions
): Promise<ApiResponse<{ role: RolePermissionEntry['role']; permissions: RolePermissions }>> => {
  const response = await apiClient.put(`/admin/roles/${role}/permissions`, { permissions });
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
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
    currentCursor: string | null;
  };
  counts: {
    total: number;
    loginEvents: number;
    securityEvents: number;
    authEvents: number;
  };
  latestCursor: string | null;
  mode?: 'incremental';
}

/**
 * GET /api/admin/audit-logs - Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (params: {
  event?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  since?: string;
  limit?: number;
} = {}): Promise<ApiResponse<AuditLogsData>> => {
  const response = await apiClient.get('/admin/audit-logs', { params });
  return response.data;
};

/**
 * GET /api/admin/audit-logs/export - Export audit logs as CSV (direct for small datasets)
 */
export const exportAuditLogs = async (params: {
  userId?: string;
  event?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<Blob> => {
  const response = await apiClient.get('/admin/audit-logs/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export interface AuditExportJobData {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  rowCount?: number;
  error?: string | null;
}

/**
 * POST /api/admin/audit-logs/export/jobs - Start async audit CSV export job
 */
export const createAuditLogsExportJob = async (params: {
  userId?: string;
  event?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<ApiResponse<AuditExportJobData>> => {
  const response = await apiClient.post('/admin/audit-logs/export/jobs', params);
  return response.data;
};

/**
 * GET /api/admin/audit-logs/export/jobs/:jobId - Get async export job status
 */
export const getAuditLogsExportJob = async (jobId: string): Promise<ApiResponse<AuditExportJobData>> => {
  const response = await apiClient.get(`/admin/audit-logs/export/jobs/${jobId}`);
  return response.data;
};

/**
 * GET /api/admin/audit-logs/export/jobs/:jobId/download - Download completed export
 */
export const downloadAuditLogsExportJob = async (jobId: string): Promise<Blob> => {
  const response = await apiClient.get(`/admin/audit-logs/export/jobs/${jobId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getRolePermissions,
  updateRolePermissions,
  getAdminStats,
  getAdminPartners,
  getAuditLogs,
  exportAuditLogs,
  createAuditLogsExportJob,
  getAuditLogsExportJob,
  downloadAuditLogsExportJob,
};
