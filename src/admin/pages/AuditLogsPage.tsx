import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  getAuditLogs,
  createAuditLogsExportJob,
  getAuditLogsExportJob,
  downloadAuditLogsExportJob,
} from '../../api/adminApi';
import type { AuditEventType, AuditLog, AuditLogsPagination } from '../types/admin';

const eventLabels: Record<AuditEventType, string> = {
  // Auth
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
  // Lead lifecycle
  LEAD_CREATED: 'Lead Created',
  LEAD_UPDATED: 'Lead Updated',
  LEAD_STATUS_CHANGED: 'Lead Status Changed',
  LEAD_DELETED: 'Lead Deleted',
  LEAD_ASSIGNED: 'Lead Assigned',
  // Documents
  DOCUMENT_UPLOADED: 'Document Uploaded',
  DOCUMENT_VIEWED: 'Document Viewed',
  DOCUMENT_DOWNLOADED: 'Document Downloaded',
  DOCUMENT_VERIFIED: 'Document Verified',
  DOCUMENT_REJECTED: 'Document Rejected',
  DOCUMENT_DELETED: 'Document Deleted',
  // Partners
  PARTNER_UPDATED: 'Partner Updated',
  PARTNER_APPROVED: 'Partner Approved',
  PARTNER_SUSPENDED: 'Partner Suspended',
  PARTNER_KYC_UPDATED: 'Partner KYC Updated',
  // Financials
  COMMISSION_CALCULATED: 'Commission Calculated',
  COMMISSION_PAID: 'Commission Paid',
  COMMISSION_RATE_CHANGED: 'Commission Rate Changed',
  // Consent & Data Rights
  CONSENT_GIVEN: 'Consent Given',
  CONSENT_WITHDRAWN: 'Consent Withdrawn',
  DATA_DELETION_REQUEST: 'Data Deletion Request',
  // Admin
  ADMIN_ROLE_CHANGED: 'Admin Role Changed',
  ADMIN_USER_CREATED: 'Admin User Created',
  ADMIN_USER_DELETED: 'Admin User Deleted',
  BULK_EXPORT: 'Bulk Export',
  PII_ACCESS: 'PII Access',
  BANK_UPDATED: 'Bank Updated',
  BANK_STATUS_CHANGED: 'Bank Status Changed',
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
  // Lead
  LEAD_CREATED: 'bg-blue-100 text-blue-700',
  LEAD_UPDATED: 'bg-blue-100 text-blue-700',
  LEAD_STATUS_CHANGED: 'bg-indigo-100 text-indigo-700',
  LEAD_DELETED: 'bg-red-100 text-red-700',
  LEAD_ASSIGNED: 'bg-teal-100 text-teal-700',
  // Documents
  DOCUMENT_UPLOADED: 'bg-green-100 text-green-700',
  DOCUMENT_VIEWED: 'bg-gray-100 text-gray-700',
  DOCUMENT_DOWNLOADED: 'bg-gray-100 text-gray-700',
  DOCUMENT_VERIFIED: 'bg-green-100 text-green-700',
  DOCUMENT_REJECTED: 'bg-red-100 text-red-700',
  DOCUMENT_DELETED: 'bg-red-100 text-red-700',
  // Partners
  PARTNER_UPDATED: 'bg-blue-100 text-blue-700',
  PARTNER_APPROVED: 'bg-green-100 text-green-700',
  PARTNER_SUSPENDED: 'bg-red-100 text-red-700',
  PARTNER_KYC_UPDATED: 'bg-yellow-100 text-yellow-700',
  // Financials
  COMMISSION_CALCULATED: 'bg-emerald-100 text-emerald-700',
  COMMISSION_PAID: 'bg-green-100 text-green-700',
  COMMISSION_RATE_CHANGED: 'bg-yellow-100 text-yellow-700',
  // Consent
  CONSENT_GIVEN: 'bg-green-100 text-green-700',
  CONSENT_WITHDRAWN: 'bg-orange-100 text-orange-700',
  DATA_DELETION_REQUEST: 'bg-red-100 text-red-700',
  // Admin
  ADMIN_ROLE_CHANGED: 'bg-red-100 text-red-700',
  ADMIN_USER_CREATED: 'bg-blue-100 text-blue-700',
  ADMIN_USER_DELETED: 'bg-red-100 text-red-700',
  BULK_EXPORT: 'bg-yellow-100 text-yellow-700',
  PII_ACCESS: 'bg-orange-100 text-orange-700',
  BANK_UPDATED: 'bg-blue-100 text-blue-700',
  BANK_STATUS_CHANGED: 'bg-yellow-100 text-yellow-700',
};

const severityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-200 text-red-900',
};

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditLogsPagination>({
    limit: 50,
    total: 0,
    hasMore: false,
    nextCursor: null,
    currentCursor: null,
  });
  const [counts, setCounts] = useState({ loginEvents: 0, securityEvents: 0, authEvents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<AuditEventType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hideTokenRefresh, setHideTokenRefresh] = useState(true);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [latestCursor, setLatestCursor] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const applyClientFilters = useCallback((records: AuditLog[]) => {
    let filtered = records;
    if (statusFilter === 'success') filtered = filtered.filter((l) => l.success);
    if (statusFilter === 'failed') filtered = filtered.filter((l) => !l.success);
    if (hideTokenRefresh) filtered = filtered.filter((l) => l.event !== 'TOKEN_REFRESH');
    return filtered;
  }, [hideTokenRefresh, statusFilter]);

  const fetchLogs = useCallback(async (options?: { cursor?: string | null; silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const requestId = ++latestRequestIdRef.current;

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: {
        limit: number;
        search?: string;
        event?: AuditEventType;
        dateFrom?: string;
        dateTo?: string;
        cursor?: string;
      } = { limit: 50 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (eventFilter) params.event = eventFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (options?.cursor) params.cursor = options.cursor;

      const response = await getAuditLogs(params);
      if (requestId !== latestRequestIdRef.current) return;

      if (response.success && response.data) {
        setLogs(applyClientFilters(response.data.logs as AuditLog[]));
        setPagination(response.data.pagination);
        if (response.data.counts) setCounts(response.data.counts);
        if (response.data.latestCursor) setLatestCursor(response.data.latestCursor);
        setLastUpdatedAt(new Date());
      } else {
        setError(response.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      if (requestId === latestRequestIdRef.current) {
        setError('Failed to fetch audit logs');
        console.error('Audit logs fetch error:', err);
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, eventFilter, dateFrom, dateTo, applyClientFilters]);

  const pollNewLogs = useCallback(async () => {
    if (!latestCursor || currentCursor !== null) return;
    const requestId = ++latestRequestIdRef.current;
    setError(null);

    try {
      const params: {
        limit: number;
        search?: string;
        event?: AuditEventType;
        dateFrom?: string;
        dateTo?: string;
        since: string;
      } = { limit: 200, since: latestCursor };
      if (debouncedSearch) params.search = debouncedSearch;
      if (eventFilter) params.event = eventFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await getAuditLogs(params);
      if (requestId !== latestRequestIdRef.current) return;
      if (!response.success || !response.data) return;

      const incremental = response.data.logs as AuditLog[];
      if (incremental.length > 0) {
        setLogs((prev) => {
          const existing = new Set(prev.map((l) => l.id));
          const additions = incremental.filter((l) => !existing.has(l.id));
          if (additions.length === 0) return prev;
          return applyClientFilters([...additions, ...prev]);
        });
      }
      if (response.data.counts) setCounts(response.data.counts);
      if (response.data.pagination) {
        const total = response.data.pagination.total;
        setPagination((prev) => ({ ...prev, total }));
      }
      if (response.data.latestCursor) setLatestCursor(response.data.latestCursor);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error('Audit logs poll error:', err);
    }
  }, [latestCursor, currentCursor, debouncedSearch, eventFilter, dateFrom, dateTo, applyClientFilters]);

  useEffect(() => {
    setCursorHistory([]);
    setCurrentCursor(null);
    setLatestCursor(null);
    fetchLogs({ cursor: null });
  }, [fetchLogs]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      pollNewLogs();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [pollNewLogs]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Preparing export...');
    try {
      const start = await createAuditLogsExportJob({
        event: eventFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: debouncedSearch || undefined,
      });
      const jobId = start.data?.jobId;
      if (!start.success || !jobId) {
        setError(start.message || 'Failed to start export');
        return;
      }

      const startedAt = Date.now();
      const timeoutMs = 2 * 60 * 1000;
      let status = start.data?.status;
      while (status !== 'completed') {
        if (status === 'failed') {
          setError('Audit export failed');
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          setError('Export is still processing. Please try again shortly.');
          return;
        }
        setExportStatus('Building CSV file...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const next = await getAuditLogsExportJob(jobId);
        if (!next.success || !next.data) {
          setError(next.message || 'Failed to check export status');
          return;
        }
        status = next.data.status;
      }

      const blob = await downloadAuditLogsExportJob(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export audit logs');
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">System activity and security monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isExporting ? (exportStatus || 'Exporting...') : 'Export CSV'}
          </button>
          <button
            onClick={() => fetchLogs({ cursor: currentCursor })}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0H15m4.419 0A8.003 8.003 0 014.582 15" />
            </svg>
            Refresh Now
          </button>
        </div>
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
              <p className="text-2xl font-bold text-blue-600">{counts.loginEvents}</p>
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
              <p className="text-2xl font-bold text-red-600">{counts.securityEvents}</p>
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
              <p className="text-2xl font-bold text-yellow-600">{counts.authEvents}</p>
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
            <optgroup label="Auth">
              {(['LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT','REGISTER','PASSWORD_CHANGE','ACCOUNT_LOCKED','SUSPICIOUS_ACTIVITY'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
            <optgroup label="Leads">
              {(['LEAD_CREATED','LEAD_UPDATED','LEAD_STATUS_CHANGED','LEAD_DELETED','LEAD_ASSIGNED'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
            <optgroup label="Documents">
              {(['DOCUMENT_UPLOADED','DOCUMENT_VIEWED','DOCUMENT_DOWNLOADED','DOCUMENT_VERIFIED','DOCUMENT_REJECTED','DOCUMENT_DELETED'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
            <optgroup label="Partners">
              {(['PARTNER_UPDATED','PARTNER_APPROVED','PARTNER_SUSPENDED','PARTNER_KYC_UPDATED'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
            <optgroup label="Financials">
              {(['COMMISSION_CALCULATED','COMMISSION_PAID','COMMISSION_RATE_CHANGED'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
            <optgroup label="Compliance">
              {(['CONSENT_GIVEN','CONSENT_WITHDRAWN','DATA_DELETION_REQUEST'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
            <optgroup label="Admin">
              {(['ADMIN_ROLE_CHANGED','ADMIN_USER_CREATED','ADMIN_USER_DELETED','BULK_EXPORT','PII_ACCESS','BANK_UPDATED','BANK_STATUS_CHANGED'] as AuditEventType[]).map(v =>
                <option key={v} value={v}>{eventLabels[v]}</option>
              )}
            </optgroup>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="all">All Status</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed Only</option>
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

        <div className="flex items-center gap-4 mt-3 text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideTokenRefresh}
              onChange={(e) => setHideTokenRefresh(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Hide Token Refresh events
          </label>
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
            <button onClick={() => fetchLogs({ cursor: currentCursor })} className="mt-3 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const date = new Date(log.createdAt);
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString();
                const userName = (log.userName || 'System').trim();
                const initials = userName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2) || 'SY';
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
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{userName}</p>
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
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityColors[log.severity] || 'bg-gray-100 text-gray-600'}`}>
                      {log.severity}
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
                    {log.entityType ? (
                      <div>
                        <p className="text-xs font-medium text-gray-700 capitalize">{log.entityType}</p>
                        <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]" title={log.entityId || ''}>{log.entityId ? log.entityId.slice(0, 8) + '...' : '-'}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
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
            {(cursorHistory.length > 0 || pagination.hasMore) && (
              <span> &middot; Cursor page {cursorHistory.length + 1}</span>
            )}
            {lastUpdatedAt && (
              <span> &middot; Updated {lastUpdatedAt.toLocaleTimeString()}</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={cursorHistory.length === 0}
              onClick={async () => {
                if (cursorHistory.length === 0) return;
                const previous = cursorHistory[cursorHistory.length - 1];
                setCursorHistory((prev) => prev.slice(0, -1));
                setCurrentCursor(previous ?? null);
                await fetchLogs({ cursor: previous ?? null });
              }}
            >
              Previous
            </button>
            <button
              className="px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={!pagination.hasMore || !pagination.nextCursor}
              onClick={async () => {
                if (!pagination.nextCursor) return;
                setCursorHistory((prev) => [...prev, currentCursor]);
                setCurrentCursor(pagination.nextCursor);
                await fetchLogs({ cursor: pagination.nextCursor });
              }}
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
            Audit logs are retained for 5 years in compliance with RBI Master Direction on Digital Lending
            and IT Act 2000 requirements. For logs beyond the online window, contact the system administrator.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AuditLogsPage;
