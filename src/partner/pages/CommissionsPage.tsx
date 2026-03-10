import { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Download,
  Info,
  Building2,
} from 'lucide-react';
import StatsCard from '../../components/shared/StatsCard';
import StatusBadge from '../../components/shared/StatusBadge';
import { commissions } from '../data/placeholderData';
import type { CommissionStatus, LoanType } from '../types/partner-dashboard';

const loanTypeLabels: Record<LoanType, string> = {
  home_loan: 'Home Loan',
  personal_loan: 'Personal Loan',
  business_loan: 'Business Loan',
  car_loan: 'Car Loan',
  lap: 'Loan Against Property',
  education_loan: 'Education Loan',
};

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const calculateSummary = () => {
  const totalEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionAmount, 0);
  const totalPending = commissions
    .filter((c) => c.status === 'pending' || c.status === 'processing')
    .reduce((sum, c) => sum + c.commissionAmount, 0);
  
  const thisMonth = 78000;
  const lastMonth = 65000;
  const growth = ((thisMonth - lastMonth) / lastMonth) * 100;

  return { totalEarned, totalPaid, totalPending, thisMonth, lastMonth, growth };
};

export default function CommissionsPage() {
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');

  const summary = calculateSummary();

  const filteredCommissions = commissions.filter((commission) => {
    if (statusFilter === 'all') return true;
    return commission.status === statusFilter;
  });

  const statusOptions: { value: CommissionStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'pending', label: 'Pending' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Commissions</h1>
          <p className="text-slate-400 mt-1">Track your earnings and payout status</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-slate-100 transition-colors">
          <Download size={16} />
          Download Statement
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Earned"
          value={formatCurrency(summary.totalEarned)}
          subtitle="All time earnings"
          icon={<Wallet size={22} />}
          variant="success"
        />
        <StatsCard
          title="Amount Paid"
          value={formatCurrency(summary.totalPaid)}
          subtitle="Successfully credited"
          icon={<CheckCircle size={22} />}
          variant="success"
        />
        <StatsCard
          title="Pending Payout"
          value={formatCurrency(summary.totalPending)}
          subtitle="In processing queue"
          icon={<Clock size={22} />}
          variant="warning"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(summary.thisMonth)}
          icon={<TrendingUp size={22} />}
          trend={{ value: Math.round(summary.growth), label: 'vs last month' }}
          variant="info"
        />
      </div>

      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-xl border border-emerald-700/50 p-6 text-emerald-50 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-emerald-200/80 text-sm">Next Payout</p>
            <p className="text-3xl font-bold mt-1 text-emerald-100">{formatCurrency(summary.totalPending)}</p>
            <p className="text-emerald-300 text-sm mt-2 font-medium">Expected by 15th January 2026</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-black/20 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-200/80 text-xs text-uppercase tracking-wider">Commission Rate</p>
              <p className="text-xl font-bold text-emerald-400">1.0%</p>
            </div>
            <div className="text-center px-4 py-2 bg-black/20 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-200/80 text-xs text-uppercase tracking-wider">Avg. per Lead</p>
              <p className="text-xl font-bold text-emerald-400">₹28,500</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-5">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">By Loan Type</h3>
          <div className="space-y-3">
            {[
              { type: 'Home Loan', amount: 180000, count: 4, color: 'bg-indigo-500' },
              { type: 'Personal Loan', amount: 95000, count: 8, color: 'bg-emerald-500' },
              { type: 'Business Loan', amount: 120000, count: 3, color: 'bg-violet-500' },
              { type: 'Car Loan', amount: 45000, count: 5, color: 'bg-amber-500' },
              { type: 'LAP', amount: 16000, count: 1, color: 'bg-pink-500' },
            ].map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-slate-300">{item.type}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-200">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-slate-500">{item.count} loans</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-5 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Monthly Earnings</h3>
          <div className="flex items-end gap-2 h-40">
            {[
              { month: 'Aug', amount: 42000 },
              { month: 'Sep', amount: 58000 },
              { month: 'Oct', amount: 45000 },
              { month: 'Nov', amount: 65000 },
              { month: 'Dec', amount: 72000 },
              { month: 'Jan', amount: 78000 },
            ].map((item, index) => {
              const maxAmount = 80000;
              const height = (item.amount / maxAmount) * 100;
              const isCurrentMonth = index === 5;

              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      isCurrentMonth ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className={`text-xs ${isCurrentMonth ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-100">Commission History</h3>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-white/5">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-white/10 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Lead Details
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Loan Info
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Disbursed
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Payout Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCommissions.map((commission) => (
                <tr key={commission.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-slate-200">{commission.clientName}</p>
                      <p className="text-xs text-slate-400 font-mono">{commission.leadId}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-300">{loanTypeLabels[commission.loanType]}</p>
                        <p className="text-xs text-slate-500">{commission.bankName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-200">{formatCurrency(commission.disbursedAmount)}</p>
                    <p className="text-xs text-slate-400">{commission.disbursedAt}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-semibold text-emerald-400">{formatCurrency(commission.commissionAmount)}</p>
                      <p className="text-xs text-slate-400">{commission.commissionRate}% rate</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={commission.status} variant="partner" />
                  </td>
                  <td className="px-5 py-4">
                    {commission.paidAt ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        <Calendar size={14} className="text-slate-500" />
                        {commission.paidAt}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {filteredCommissions.length} of {commissions.length} entries
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-slate-200">
              Total: <span className="text-emerald-400">{formatCurrency(
                filteredCommissions.reduce((sum, c) => sum + c.commissionAmount, 0)
              )}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="text-indigo-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-indigo-300">Payout Information</h4>
            <ul className="mt-2 space-y-1 text-sm text-indigo-200/80">
              <li>• Commissions are processed twice a month - 1st and 15th</li>
              <li>• Minimum payout threshold is ₹1,000</li>
              <li>• TDS @5% is deducted as per Income Tax regulations</li>
              <li>• Payouts are credited to your registered bank account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
