import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import { getAdminStats } from '../../api/adminApi';
import { getLeads } from '../../api/leadsApi';
import type { LeadStatus } from '../types/admin';

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

interface DashboardStats {
  newUsersThisWeek: number;
  totalUsers: number;
  activePartners: number;
  verifiedUsers: number;
  activeUsers: number;
  totalCommissionMTD: number;
  pendingReview: number;
  leadsByLoanType: { type: string; count: number }[];
}

interface RecentLead {
  id: string;
  customerName: string;
  customerPhone: string;
  loanType: string;
  loanAmount: number;
  partnerName: string;
  status: LeadStatus;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    newUsersThisWeek: 0,
    totalUsers: 0,
    activePartners: 0,
    verifiedUsers: 0,
    activeUsers: 0,
    totalCommissionMTD: 0,
    pendingReview: 0,
    leadsByLoanType: [],
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setDashboardError(null);
        
        const statsResponse = await getAdminStats();
        if (statsResponse.success && statsResponse.data) {
          const apiStats = statsResponse.data.stats;
          setStats({
            newUsersThisWeek: apiStats.newUsersThisWeek || 0,
            totalUsers: apiStats.totalUsers || 0,
            activePartners: apiStats.partners || 0,
            verifiedUsers: apiStats.verifiedUsers || 0,
            activeUsers: apiStats.activeUsers || 0,
            totalCommissionMTD: 0,
            pendingReview: 0,
            leadsByLoanType: [],
          });
        }

        const leadsResponse = await getLeads({ limit: 5 }, true);
        if (leadsResponse.success && leadsResponse.data) {
          const apiLeads: RecentLead[] = [];
          let skippedLeads = 0;

          for (const lead of leadsResponse.data.leads) {
            try {
              const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
              const createdAtValue =
                createdAt && !Number.isNaN(createdAt.getTime())
                  ? createdAt.toISOString().split('T')[0]
                  : 'Unknown';

              apiLeads.push({
                id: lead.id,
                customerName: lead.client?.fullName || 'Unknown',
                customerPhone: lead.client?.phone || '',
                loanType: lead.loanType ?? '',
                loanAmount: Number.isFinite(lead.loanAmount) ? lead.loanAmount : 0,
                partnerName: lead.partnerName || 'Direct',
                status: lead.status,
                createdAt: createdAtValue,
              });
            } catch (leadError) {
              skippedLeads += 1;
              console.warn('Skipping invalid lead entry:', leadError);
            }
          }

          if (skippedLeads > 0) {
            console.warn(`Skipped ${skippedLeads} lead(s) due to invalid data.`);
          }

          setRecentLeads(apiLeads);

          const loanTypeCounts: Record<string, number> = {};
          leadsResponse.data.leads.forEach((lead) => {
            const type = lead.loanType || 'Other';
            loanTypeCounts[type] = (loanTypeCounts[type] || 0) + 1;
          });
          
          const leadsByType = Object.entries(loanTypeCounts)
            .map(([type, count]) => ({
              type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
          
          setStats(prev => ({ ...prev, leadsByLoanType: leadsByType }));
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unknown error';
        setDashboardError(
          `Unable to load dashboard data. Please try again. (${message})`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your loan distribution business</p>
      </div>

      {dashboardError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {dashboardError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatsCard
          title="Active Partners"
          value={stats.activePartners}
          trend={{ value: 8, isPositive: true }}
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          trend={{ value: 5, isPositive: true }}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          trend={{ value: 15, isPositive: true }}
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatsCard
          title="Verified Users"
          value={stats.verifiedUsers}
          trend={{ value: 5, isPositive: true }}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="New This Week"
          value={stats.newUsersThisWeek}
          subtitle="Users"
          trend={{ value: 12, isPositive: true }}
          color="default"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Recent Leads"
          value={recentLeads.length}
          subtitle="Loaded"
          color="red"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Leads by Loan Type</h3>
          <div className="space-y-3">
            {stats.leadsByLoanType.length > 0 ? (
              stats.leadsByLoanType.map((item, index) => {
                const maxCount = Math.max(...stats.leadsByLoanType.map(i => i.count));
                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{item.type}</span>
                      <span className="text-sm font-medium text-gray-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No lead data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Partners</span>
              <span className="text-lg font-semibold text-gray-900">{stats.activePartners}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="text-lg font-semibold text-gray-900">{stats.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="text-lg font-semibold text-green-600">{stats.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Recent Leads</span>
              <span className="text-lg font-semibold text-gray-900">{recentLeads.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recent Leads</h3>
          <Link to="/admin/leads" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loan Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.id.slice(-6)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lead.customerName}</p>
                        <p className="text-xs text-gray-500">{lead.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{lead.loanType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(lead.loanAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.partnerName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{lead.createdAt}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    {isLoading ? 'Loading...' : 'No leads found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
