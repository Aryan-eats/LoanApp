import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  ArrowRight,
  Users,
  Eye,
  Upload,
  Loader2,
  Shield,
  AlertCircle,
  XCircle,
  WifiOff,
  Clock,
} from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import LeadFunnel from '../components/LeadFunnel';
import ActivePipelineWidget from '../components/ActivePipelineWidget';
import PendingDocumentsWidget from '../components/PendingDocumentsWidget';
import RecentActivityFeed from '../components/RecentActivityFeed';
import FollowUpReminders from '../components/FollowUpReminders';
import QuickToolsPanel from '../components/QuickToolsPanel';
import CustomerContextPills from '../components/CustomerContextPills';
import { useLeadsStore } from '../../stores/leadsStore';
import { useLocalLeadsStore } from '../../stores/localLeadsStore';
import { usePartnerProfileStore } from '../../stores/partnerProfileStore';
import { useAuthStore } from '../../stores/authStore';
import { usePartnerTheme } from '../components/PartnerThemeProvider';
import { getLoanTypeLabel } from '@/data/loanProductsData';
import { formatCurrency } from '@/types/shared';
import type { LeadFunnel as LeadFunnelType } from '../types/partner-dashboard';
import {
  resolveConsentSummary,
  resolveCustomerId,
  resolveCustomerKey,
  resolveLeadScore,
  resolveLeadSource,
  resolveScoreBand,
} from '../utils/customerCrm';

export default function PartnerDashboard() {
  const { leads, isLoading, fetchLeads, fetchStats } = useLeadsStore();
  const { leads: localLeads, fetchLeads: fetchStoredClients } = useLocalLeadsStore();
  const { partnerInfo, fetchProfile } = usePartnerProfileStore();
  const { user } = useAuthStore();
  const { isDark } = usePartnerTheme();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchStats();
    fetchStoredClients();
  }, [fetchLeads, fetchStats, fetchStoredClients]);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user?.id, fetchProfile]);

  const kycStatus = partnerInfo?.kycStatus;

  const dashboardStats = useMemo(() => {
    const thisMonth = new Date();

    const localThisMonth = localLeads.filter((lead) => {
      const createdAt = new Date(lead.createdAt);
      return createdAt.getMonth() === thisMonth.getMonth()
        && createdAt.getFullYear() === thisMonth.getFullYear();
    }).length;

    const adminThisMonth = leads.filter((lead) => {
      const createdAt = new Date(lead.createdAt);
      return createdAt.getMonth() === thisMonth.getMonth()
        && createdAt.getFullYear() === thisMonth.getFullYear();
    }).length;

    const thisMonthLeads = localThisMonth + adminThisMonth;

    const disbursedLeads = leads.filter((lead) => lead.status === 'disbursed');
    const thisMonthDisbursed = disbursedLeads
      .filter((lead) => {
        const updatedAt = new Date(lead.updatedAt || lead.createdAt);
        return updatedAt.getMonth() === thisMonth.getMonth()
          && updatedAt.getFullYear() === thisMonth.getFullYear();
      })
      .reduce((sum, lead) => sum + (lead.disbursedAmount || lead.loanAmount), 0);

    const submittedAll = leads.filter((lead) => ['submitted', 'bank_processing', 'bank_logged', 'approved', 'disbursed'].includes(lead.status)).length;
    const approvedAll = leads.filter((lead) => ['approved', 'disbursed'].includes(lead.status)).length;
    const approvalRate = submittedAll > 0 ? Math.round((approvedAll / submittedAll) * 100) : 0;

    return {
      thisMonthLeads,
      thisMonthDisbursed,
      submittedAll,
      approvalRate,
    };
  }, [leads, localLeads]);

  const leadFunnel: LeadFunnelType = useMemo(() => {
    const totalLeads = leads.length + localLeads.length;
    const submitted = leads.filter((lead) => ['submitted', 'bank_processing', 'bank_logged', 'approved', 'disbursed'].includes(lead.status)).length;
    const approved = leads.filter((lead) => ['approved', 'disbursed'].includes(lead.status)).length;
    const disbursed = leads.filter((lead) => lead.status === 'disbursed').length;

    return {
      totalLeads,
      submitted,
      approved,
      disbursed,
    };
  }, [leads, localLeads]);

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [leads]);

  if (isLoading && leads.length === 0 && localLeads.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {isOffline && (
        <div className={`border-l-4 border-amber-500 p-3 rounded-r-lg flex items-center gap-3 ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <WifiOff size={18} className="text-amber-400" />
          <p className={`text-sm font-medium ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
            You are offline. Data may be outdated, but cached leads are still available.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Dashboard</h1>
          <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Welcome back! Here is your performance overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/partner/add-client"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Users size={18} />
            Add New Client
          </Link>
        </div>
      </div>

      {kycStatus && kycStatus !== 'verified' && (
        <div
          className={`rounded-xl p-4 border ${
            kycStatus === 'rejected'
              ? isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
              : kycStatus === 'submitted'
                ? isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                : isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {kycStatus === 'rejected' ? (
                <XCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
              ) : kycStatus === 'submitted' ? (
                <Clock className="text-blue-400 shrink-0 mt-0.5" size={20} />
              ) : (
                <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              )}
              <div>
                <p
                  className={`font-medium ${
                    kycStatus === 'rejected'
                      ? isDark ? 'text-red-200' : 'text-red-800'
                      : kycStatus === 'submitted'
                        ? isDark ? 'text-blue-200' : 'text-blue-800'
                        : isDark ? 'text-amber-200' : 'text-amber-800'
                  }`}
                >
                  {kycStatus === 'rejected'
                    ? 'KYC Rejected - Action Required'
                    : kycStatus === 'submitted'
                      ? 'KYC Under Review'
                      : 'Complete Your KYC to Get Started'}
                </p>
                <p
                  className={`text-sm mt-0.5 ${
                    kycStatus === 'rejected'
                      ? isDark ? 'text-red-300/70' : 'text-red-700/80'
                      : kycStatus === 'submitted'
                        ? isDark ? 'text-blue-300/70' : 'text-blue-700/80'
                        : isDark ? 'text-amber-300/70' : 'text-amber-700/80'
                  }`}
                >
                  {kycStatus === 'rejected'
                    ? 'Your KYC was rejected. Retry verification to submit leads and access all features.'
                    : kycStatus === 'submitted'
                      ? 'Your identity is being verified. This usually takes 24-48 hours.'
                      : 'Submitting leads, viewing bank offers, and earning commissions requires KYC verification.'}
                </p>
              </div>
            </div>
            {kycStatus !== 'submitted' && (
              <Link
                to="/partner/profile"
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  kycStatus === 'rejected'
                    ? isDark
                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20 shadow-sm'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 shadow-sm'
                    : isDark
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20 shadow-sm'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 shadow-sm'
                }`}
              >
                <Shield size={18} />
                {kycStatus === 'rejected' ? 'Retry KYC' : 'Complete KYC'}
              </Link>
            )}
          </div>
        </div>
      )}

      <div
        className={`rounded-xl p-4 md:p-5 relative overflow-hidden ring-1 ${
          isDark
            ? 'bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-900/20 ring-white/10'
            : 'bg-[linear-gradient(135deg,_#dbeafe_0%,_#eff6ff_40%,_#ffffff_100%)] text-slate-900 shadow-[0_24px_60px_rgba(59,130,246,0.16)] ring-indigo-100'
        }`}
      >
        <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-indigo-500 opacity-10' : 'bg-indigo-300 opacity-40'}`} />
        <div className={`absolute bottom-0 left-10 -mb-16 w-24 h-24 rounded-full blur-2xl ${isDark ? 'bg-blue-500 opacity-10' : 'bg-cyan-300 opacity-35'}`} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex w-12 h-12 backdrop-blur-md rounded-xl items-center justify-center shrink-0 shadow-inner ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/70 border border-white/80'}`}>
              <TrendingUp size={24} className={isDark ? 'text-indigo-300' : 'text-indigo-600'} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight">{formatCurrency(dashboardStats.thisMonthDisbursed)}</p>
              </div>
              <p className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${isDark ? 'text-indigo-200/70' : 'text-indigo-700/70'}`}>Disbursed this month</p>
            </div>
          </div>

          <div className={`flex items-center gap-4 sm:gap-8 border-t md:border-t-0 pt-3 md:pt-0 ${isDark ? 'border-white/10' : 'border-indigo-100'}`}>
            <div>
              <p className="text-xl font-bold">{dashboardStats.thisMonthLeads}</p>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-indigo-200/70' : 'text-indigo-700/70'}`}>New Clients</p>
            </div>
            <div>
              <p className="text-xl font-bold">{dashboardStats.submittedAll}</p>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-indigo-200/70' : 'text-indigo-700/70'}`}>Total Submitted</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{dashboardStats.approvalRate}%</p>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-indigo-200/70' : 'text-indigo-700/70'}`}>Approval Rate</p>
            </div>
            <Link
              to="/partner/leads"
              className={`hidden lg:inline-flex items-center gap-2 px-4 py-3 border backdrop-blur-md rounded-lg text-sm font-bold transition-all ml-2 min-h-[48px] ${
                isDark
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  : 'bg-white text-indigo-700 border-white/80 hover:bg-indigo-50'
              }`}
            >
              View Pipeline
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <ActivePipelineWidget leads={leads} localLeads={localLeads} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PendingDocumentsWidget leads={leads} />
        <FollowUpReminders leads={leads} localLeads={localLeads} />
        <RecentActivityFeed leads={leads} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className={`rounded-xl h-full backdrop-blur-sm transition-colors ${
              isDark
                ? 'bg-slate-900/50 border border-white/10'
                : 'bg-white/90 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.12)]'
            }`}
          >
            <div className={`px-5 py-4 flex items-center justify-between ${isDark ? 'border-b border-white/10' : 'border-b border-slate-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Recent Admin Submissions</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Track your latest submitted files</p>
              </div>
              <Link
                to="/partner/leads"
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                View all
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400 border-b border-white/5' : 'text-slate-500 border-b border-slate-100'}`}>
                      Client
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400 border-b border-white/5' : 'text-slate-500 border-b border-slate-100'}`}>
                      Loan Type
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400 border-b border-white/5' : 'text-slate-500 border-b border-slate-100'}`}>
                      Amount
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400 border-b border-white/5' : 'text-slate-500 border-b border-slate-100'}`}>
                      Status
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-right ${isDark ? 'text-slate-400 border-b border-white/5' : 'text-slate-500 border-b border-slate-100'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
                  {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                      <tr key={lead.id} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-3">
                          <div>
                            <p className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{lead.client?.fullName || '-'}</p>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lead.client?.phone || '-'}</p>
                            <CustomerContextPills
                              className="mt-2"
                              customerId={resolveCustomerId(lead)}
                              customerKey={resolveCustomerKey(lead)}
                              leadSource={resolveLeadSource(lead)}
                              leadScore={resolveLeadScore(lead)}
                              scoreBand={resolveScoreBand(lead)}
                              consentSummary={resolveConsentSummary(lead)}
                              compact
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-sm font-medium px-2 py-1 rounded-md ${isDark ? 'text-slate-300 bg-white/10' : 'text-slate-700 bg-slate-100'}`}>{getLoanTypeLabel(lead.loanType)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-medium text-sm whitespace-nowrap ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(lead.loanAmount)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={lead.status} variant="partner" />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/partner/leads/${lead.id}`}
                              className={`flex items-center justify-center rounded-lg transition-colors border border-transparent min-h-[48px] min-w-[48px] ${
                                isDark
                                  ? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/20'
                                  : 'text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 hover:border-indigo-200'
                              }`}
                              title="View details"
                            >
                              <Eye size={20} />
                            </Link>
                            {(lead.status === 'docs_pending' || lead.status === 'submitted') && (
                              <Link
                                to={`/partner/documents/${lead.id}`}
                                className={`flex items-center justify-center rounded-lg transition-colors border border-transparent min-h-[48px] min-w-[48px] ${
                                  isDark
                                    ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20'
                                    : 'text-amber-600 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-200'
                                }`}
                                title="Upload documents"
                              >
                                <Upload size={20} />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                          <FileText size={24} className={isDark ? 'text-slate-400' : 'text-slate-300'} />
                        </div>
                        <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No admin submissions yet</p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Submit your local clients to the GPS team.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <LeadFunnel data={leadFunnel} />
        </div>
      </div>

      <QuickToolsPanel />
    </div>
  );
}
