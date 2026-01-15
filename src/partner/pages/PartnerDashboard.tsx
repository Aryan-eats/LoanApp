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
} from 'lucide-react';
import { StatsCard } from '@/components/shared';
import StatusBadge from '../components/StatusBadge';
import LeadFunnel from '../components/LeadFunnel';
import { dashboardStats, leadFunnel, recentLeads } from '../data/placeholderData';
import { getLoanTypeLabel } from '@/data/loanProducts';
import { formatCurrency } from '@/types/shared';

export default function PartnerDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard
          title="Total Leads"
          value={dashboardStats.totalLeads}
          icon={<FileText size={22} />}
          trend={{ value: 12, label: 'vs last month' }}
          variant="info"
        />
        <StatsCard
          title="Approved Loans"
          value={dashboardStats.approvedLoans}
          icon={<CheckCircle size={22} />}
          trend={{ value: 8, label: 'vs last month' }}
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
          trend={{ value: 15, label: 'vs last month' }}
          variant="success"
        />
      </div>

      {/* Monthly Stats Banner */}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lead Funnel - Takes 1 column */}
        <div className="xl:col-span-1">
          <LeadFunnel data={leadFunnel} />
        </div>

        {/* Recent Activity Table - Takes 2 columns */}
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
                  {recentLeads.slice(0, 5).map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{lead.client.fullName}</p>
                          <p className="text-xs text-slate-500">{lead.client.phone}</p>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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
          to="/partner/eligibility"
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
