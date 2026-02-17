import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAuditLogs } from '../../api/adminApi';
import type { AuditEventType, AuditLog, AuditLogsPagination } from '../types/admin';

const eventLabels: Record<AuditEventType, string> = {
  LOGIN_SUCCESS: 'Login Success',
  LOGIN_FAILED: 'Login Failed',
  LOGOUT: 'Logout',
  REGISTER: 'Register',
  PASSWORD_RESET_REQUEST: 'Password Reset Request',
  PASSWORD_RESET_SUCCESS: 'Password Reset Success',
  PASSWORD_CHANGE: 'Password Change',
  OTP_SENT: 'OTP Sent',
  OTP_VERIFIED: 'OTP Verified',
  ACCOUNT_LOCKED: 'Account Locked',
  TOKEN_REFRESH: 'Token Refresh',
  SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
};

const eventColors: Record<AuditEventType, string> = {
  LOGIN_SUCCESS: 'bg-green-100 text-green-700',
  LOGIN_FAILED: 'bg-red-100 text-red-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  REGISTER: 'bg-blue-100 text-blue-700',
  PASSWORD_RESET_REQUEST: 'bg-yellow-100 text-yellow-700',
  PASSWORD_RESET_SUCCESS: 'bg-green-100 text-green-700',
  PASSWORD_CHANGE: 'bg-blue-100 text-blue-700',
  OTP_SENT: 'bg-purple-100 text-purple-700',
  OTP_VERIFIED: 'bg-purple-100 text-purple-700',
  ACCOUNT_LOCKED: 'bg-red-100 text-red-700',
  TOKEN_REFRESH: 'bg-gray-100 text-gray-700',
  SUSPICIOUS_ACTIVITY: 'bg-red-100 text-red-700',
};

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditLogsPagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<AuditEventType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (eventFilter) params.event = eventFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await getAuditLogs(params as any);
      if (response.success && response.data) {
        setLogs(response.data.logs as AuditLog[]);
        setPagination(response.data.pagination);
      } else {
        setError(response.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Failed to fetch audit logs');
      console.error('Audit logs fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, eventFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const loginEvents = logs.filter(l => l.event === 'LOGIN_SUCCESS' || l.event === 'LOGIN_FAILED' || l.event === 'LOGOUT').length;
  const securityEvents = logs.filter(l => l.event === 'ACCOUNT_LOCKED' || l.event === 'SUSPICIOUS_ACTIVITY').length;
  const authEvents = logs.filter(l => ['REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS'].includes(l.event)).length;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">System activity and security monitoring</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Login Events</p>
              <p className="text-2xl font-bold text-blue-600">{loginEvents}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Security Events</p>
              <p className="text-2xl font-bold text-red-600">{securityEvents}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Auth Changes</p>
              <p className="text-2xl font-bold text-yellow-600">{authEvents}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by user, entity ID, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as AuditEventType | '')}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="">All Events</option>
            {Object.entries(eventLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="From"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-500">Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-red-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button onClick={() => fetchLogs(pagination.page)} className="mt-3 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
              Retry
            </button>
          </div>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const date = new Date(log.createdAt);
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString();
                return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{dateStr}</p>
                      <p className="text-xs text-gray-500">{timeStr}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {log.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                        <p className="text-xs text-gray-500">{log.userRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${eventColors[log.event] || 'bg-gray-100 text-gray-700'}`}>
                      {eventLabels[log.event] || log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.success ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-gray-500">{log.ip || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-xs truncate" title={log.failureReason || ''}>
                      {log.failureReason || (log.metadata ? JSON.stringify(log.metadata) : '-')}
                    </p>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No audit logs found</p>
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{logs.length}</span> of <span className="font-medium">{pagination.total}</span> logs
            {pagination.totalPages > 1 && (
              <span> &middot; Page {pagination.page} of {pagination.totalPages}</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              className="px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
        </>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-900">Audit Log Retention Policy</p>
          <p className="text-sm text-blue-700 mt-1">
            Audit logs are retained for 90 days as per compliance requirements. For logs older than 90 days, please contact the system administrator.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AuditLogsPage;
