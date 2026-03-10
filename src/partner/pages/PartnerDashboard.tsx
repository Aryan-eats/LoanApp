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
import { useLeadsStore } from '../../stores/leadsStore';
import { useLocalLeadsStore } from '../../stores/localLeadsStore';
import { usePartnerProfileStore } from '../../stores/partnerProfileStore';
import { useAuthStore } from '../../stores/authStore';
import { getLoanTypeLabel } from '@/data/loanProductsData';
import { formatCurrency } from '@/types/shared';
import type { LeadFunnel as LeadFunnelType } from '../types/partner-dashboard';

export default function PartnerDashboard() {
  const { leads, isLoading, fetchLeads, fetchStats } = useLeadsStore();
  const { leads: localLeads, fetchLeads: fetchStoredClients } = useLocalLeadsStore();
  const { partnerInfo, fetchProfile } = usePartnerProfileStore();
  const { user } = useAuthStore();
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
    
    // Clients added this month
    const localThisMonth = localLeads.filter(l => {
      const createdAt = new Date(l.createdAt);
      return createdAt.getMonth() === thisMonth.getMonth() && 
             createdAt.getFullYear() === thisMonth.getFullYear();
    }).length;
    
    const adminThisMonth = leads.filter(l => {
      const createdAt = new Date(l.createdAt);
      return createdAt.getMonth() === thisMonth.getMonth() && 
             createdAt.getFullYear() === thisMonth.getFullYear();
    }).length;
    
    const thisMonthLeads = localThisMonth + adminThisMonth;
    
    // Disbursed this month
    const disbursedLeads = leads.filter(l => l.status === 'disbursed');
    const thisMonthDisbursed = disbursedLeads
      .filter(l => {
        const updatedAt = new Date(l.updatedAt || l.createdAt);
        return updatedAt.getMonth() === thisMonth.getMonth() && 
               updatedAt.getFullYear() === thisMonth.getFullYear();
      })
      .reduce((sum, l) => sum + (l.disbursedAmount || l.loanAmount), 0);

    // Submitted all
    const submittedAll = leads.filter(l => ['submitted', 'bank_processing', 'bank_logged', 'approved', 'disbursed'].includes(l.status)).length;
    const approvedAll = leads.filter(l => ['approved', 'disbursed'].includes(l.status)).length;
    const approvalRate = submittedAll > 0 ? Math.round((approvedAll / submittedAll) * 100) : 0;

    return {
      thisMonthLeads,
      thisMonthDisbursed,
      submittedAll,
      approvalRate
    };
  }, [leads, localLeads]);

  const leadFunnel: LeadFunnelType = useMemo(() => {
    const totalLeads = leads.length + localLeads.length;
    const submitted = leads.filter(l => ['submitted', 'bank_processing', 'bank_logged', 'approved', 'disbursed'].includes(l.status)).length;
    const approved = leads.filter(l => ['approved', 'disbursed'].includes(l.status)).length;
    const disbursed = leads.filter(l => l.status === 'disbursed').length;
    
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
        <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r-lg flex items-center gap-3">
          <WifiOff size={18} className="text-amber-400" />
          <p className="text-sm font-medium text-amber-200">
            You're offline — data may be outdated. You can still browse cached leads.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back! Here's your performance overview.</p>
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
              ? 'bg-red-500/10 border-red-500/30'
              : kycStatus === 'submitted'
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
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
                      ? 'text-red-200'
                      : kycStatus === 'submitted'
                      ? 'text-blue-200'
                      : 'text-amber-200'
                  }`}
                >
                  {kycStatus === 'rejected'
                    ? 'KYC Rejected — Action Required'
                    : kycStatus === 'submitted'
                    ? 'KYC Under Review'
                    : 'Complete Your KYC to Get Started'}
                </p>
                <p
                  className={`text-sm mt-0.5 ${
                    kycStatus === 'rejected'
                      ? 'text-red-300/70'
                      : kycStatus === 'submitted'
                      ? 'text-blue-300/70'
                      : 'text-amber-300/70'
                  }`}
                >
                  {kycStatus === 'rejected'
                    ? 'Your KYC was rejected. Retry verification to submit leads and access all features.'
                    : kycStatus === 'submitted'
                    ? 'Your identity is being verified. This usually takes 24–48 hours.'
                    : 'Submitting leads, viewing bank offers, and earning commissions requires KYC verification.'}
                </p>
              </div>
            </div>
            {kycStatus !== 'submitted' && (
              <Link
                to="/partner/profile"
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  kycStatus === 'rejected'
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20 shadow-sm'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20 shadow-sm'
                }`}
              >
                <Shield size={18} />
                {kycStatus === 'rejected' ? 'Retry KYC' : 'Complete KYC'}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Monthly Disbursal Tracker Banner - Dense Version */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-xl p-4 md:p-5 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500 opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-10 -mb-16 w-24 h-24 rounded-full bg-blue-500 opacity-10 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-12 h-12 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl items-center justify-center shrink-0 shadow-inner block">
              <TrendingUp size={24} className="text-indigo-300" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight">{formatCurrency(dashboardStats.thisMonthDisbursed)}</p>
              </div>
              <p className="text-indigo-200/70 text-xs font-bold uppercase tracking-wider mt-0.5">Disbursed this month</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8 border-t border-white/10 md:border-t-0 pt-3 md:pt-0">
            <div>
              <p className="text-xl font-bold">{dashboardStats.thisMonthLeads}</p>
              <p className="text-indigo-200/70 text-xs font-bold uppercase tracking-wider">New Clients</p>
            </div>
            <div>
              <p className="text-xl font-bold">{dashboardStats.submittedAll}</p>
              <p className="text-indigo-200/70 text-xs font-bold uppercase tracking-wider">Total Submitted</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{dashboardStats.approvalRate}%</p>
              <p className="text-indigo-200/70 text-xs font-bold uppercase tracking-wider">Approval Rate</p>
            </div>
            <Link
              to="/partner/leads"
              className="hidden lg:inline-flex items-center gap-2 px-4 py-3 bg-white/10 text-white border border-white/20 backdrop-blur-md rounded-lg text-sm font-bold hover:bg-white/20 transition-all ml-2 min-h-[48px]"
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
          <div className="bg-slate-900/50 rounded-xl border border-white/10 h-full backdrop-blur-sm">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Recent Admin Submissions</h3>
                <p className="text-sm text-slate-400">Track your latest submitted files</p>
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
                  <tr className="bg-slate-800/50">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                      Client
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                      Loan Type
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-slate-100">{lead.client?.fullName || '—'}</p>
                            <p className="text-xs text-slate-400">{lead.client?.phone || '—'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-slate-300 font-medium bg-white/10 px-2 py-1 rounded-md">{getLoanTypeLabel(lead.loanType)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-slate-100 text-sm whitespace-nowrap">{formatCurrency(lead.loanAmount)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={lead.status} variant="partner" />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/partner/leads/${lead.id}`}
                              className="flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/20 min-h-[48px] min-w-[48px]"
                              title="View details"
                            >
                              <Eye size={20} />
                            </Link>
                            {(lead.status === 'docs_pending' || lead.status === 'submitted') && (
                              <Link
                                to={`/partner/documents/${lead.id}`}
                                className="flex items-center justify-center text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20 min-h-[48px] min-w-[48px]"
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
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/5">
                          <FileText size={24} className="text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-300">No admin submissions yet</p>
                        <p className="text-sm mt-1 text-slate-400">Submit your local clients to the GPS team.</p>
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
