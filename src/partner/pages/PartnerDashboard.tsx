import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Wallet,
  Clock,
  TrendingUp,
  ArrowRight,
  IndianRupee,
  Users,
  Eye,
  Upload,
  Loader2,
} from 'lucide-react';
import { StatsCard } from '@/components/shared';
import StatusBadge from '../components/StatusBadge';
import LeadFunnel from '../components/LeadFunnel';
import { useLeadsStore } from '../../stores/leadsStore';
import { getLoanTypeLabel } from '@/data/loanProductsData';
import { formatCurrency } from '@/types/shared';
import type { LeadFunnel as LeadFunnelType } from '../types/partner-dashboard';

export default function PartnerDashboard() {
  const { leads, stats, isLoading, fetchLeads, fetchStats } = useLeadsStore();

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [fetchLeads, fetchStats]);

  const dashboardStats = useMemo(() => {
    const totalLeads = stats?.total ?? leads.length;
    const approvedLoans = leads.filter(l => l.status === 'approved' || l.status === 'disbursed').length;
    const disbursedLeads = leads.filter(l => l.status === 'disbursed');
    const disbursedAmount = disbursedLeads.reduce((sum, l) => sum + (l.disbursedAmount || l.loanAmount), 0);
    const pendingLeads = leads.filter(l => ['submitted', 'docs_pending', 'docs_uploaded', 'bank_processing'].includes(l.status)).length;
    
    const totalCommission = disbursedLeads.reduce((sum, l) => sum + (l.commission?.amount || 0), 0);
    const pendingCommission = leads
      .filter(l => l.commission?.status === 'pending')
      .reduce((sum, l) => sum + (l.commission?.amount || 0), 0);
    
    const thisMonth = new Date();
    const thisMonthLeads = leads.filter(l => {
      const createdAt = new Date(l.createdAt);
      return createdAt.getMonth() === thisMonth.getMonth() && 
             createdAt.getFullYear() === thisMonth.getFullYear();
    }).length;
    
    const thisMonthDisbursed = disbursedLeads
      .filter(l => {
        const updatedAt = new Date(l.updatedAt || l.createdAt);
        return updatedAt.getMonth() === thisMonth.getMonth() && 
               updatedAt.getFullYear() === thisMonth.getFullYear();
      })
      .reduce((sum, l) => sum + (l.disbursedAmount || l.loanAmount), 0);

    return {
      totalLeads,
      approvedLoans,
      disbursedAmount,
      pendingLeads,
      totalCommission,
      pendingCommission,
      thisMonthLeads,
      thisMonthDisbursed,
    };
  }, [leads, stats]);

  const leadFunnel: LeadFunnelType = useMemo(() => ({
    submitted: leads.length, // All leads count as submitted (entry point of funnel)
    docsCollected: leads.filter(l => ['docs_uploaded', 'bank_processing', 'approved', 'disbursed'].includes(l.status)).length,
    bankProcessing: leads.filter(l => ['bank_processing', 'approved', 'disbursed'].includes(l.status)).length,
    approved: leads.filter(l => ['approved', 'disbursed'].includes(l.status)).length,
    disbursed: leads.filter(l => l.status === 'disbursed').length,
  }), [leads]);

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [leads]);

  if (isLoading && leads.length === 0) {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's your performance overview.</p>
        </div>
        <Link
          to="/partner/add-client"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Users size={18} />
          Add New Client
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard
          title="Total Leads"
          value={dashboardStats.totalLeads}
          icon={<FileText size={22} />}
          variant="info"
        />
        <StatsCard
          title="Approved Loans"
          value={dashboardStats.approvedLoans}
          icon={<CheckCircle size={22} />}
          variant="success"
        />
        <StatsCard
          title="Disbursed Amount"
          value={formatCurrency(dashboardStats.disbursedAmount)}
          subtitle="Total disbursements"
          icon={<IndianRupee size={22} />}
          variant="success"
        />
        <StatsCard
          title="Pending Leads"
          value={dashboardStats.pendingLeads}
          icon={<Clock size={22} />}
          variant="warning"
        />
        <StatsCard
          title="Commission Earned"
          value={formatCurrency(dashboardStats.totalCommission)}
          subtitle={`Pending: ${formatCurrency(dashboardStats.pendingCommission)}`}
          icon={<Wallet size={22} />}
          variant="success"
        />
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-sm">This Month's Performance</p>
              <p className="text-2xl font-bold mt-0.5">{dashboardStats.thisMonthLeads} New Leads</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-blue-100 text-xs">Disbursed</p>
              <p className="text-xl font-semibold">{formatCurrency(dashboardStats.thisMonthDisbursed)}</p>
            </div>
            <Link
              to="/partner/leads"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
            >
              View Details
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <LeadFunnel data={leadFunnel} />
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Recent Leads</h3>
                <p className="text-sm text-slate-500">Your latest submitted leads</p>
              </div>
              <Link
                to="/partner/leads"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                View all
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Loan Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-slate-800">{lead.client?.fullName || '—'}</p>
                            <p className="text-xs text-slate-500">{lead.client?.phone || '—'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600">{getLoanTypeLabel(lead.loanType)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-medium text-slate-800">{formatCurrency(lead.loanAmount)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/partner/leads/${lead.id}`}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye size={16} />
                            </Link>
                            {(lead.status === 'docs_pending' || lead.status === 'submitted') && (
                              <Link
                                to={`/partner/documents/${lead.id}`}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Upload documents"
                              >
                                <Upload size={16} />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                        <p>No leads yet. Start by adding your first client.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/partner/add-client"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-800">Add New Client</p>
              <p className="text-xs text-slate-500">Submit a new lead</p>
            </div>
          </div>
        </Link>

        <Link
          to="/partner/credit-check"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-green-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-800">Check Eligibility</p>
              <p className="text-xs text-slate-500">Soft credit check</p>
            </div>
          </div>
        </Link>

        <Link
          to="/partner/bank-offers"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-800">Bank Offers</p>
              <p className="text-xs text-slate-500">View latest rates</p>
            </div>
          </div>
        </Link>

        <Link
          to="/partner/commissions"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-800">My Earnings</p>
              <p className="text-xs text-slate-500">View commissions</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
