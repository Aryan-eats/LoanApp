import { useState } from 'react';
import {
  Building2,
  Percent,
  Clock,
  IndianRupee,
  Star,
  CheckCircle,
  Search,
  ArrowRight,
  Info,
  TrendingUp,
} from 'lucide-react';
import { bankOffers } from '../data/placeholderData';
import type { LoanType } from '../types/partner-dashboard';
import { buildLoanTypeLabels, getLoanIcon, legacyLoanTypes } from '../../data/loanProducts';

// Dynamic labels with icons from registry
const loanTypeLabelsMap = buildLoanTypeLabels(true);
const loanTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = Object.fromEntries(
  Object.entries(loanTypeLabelsMap).map(([code, label]) => [code, { label, icon: getLoanIcon(code) }])
);

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(0)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function BankOffersPage() {
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'interest' | 'amount' | 'time'>('interest');

  const filteredOffers = bankOffers
    .filter((offer) => {
      const matchesLoanType =
        selectedLoanType === 'all' || offer.loanTypes.includes(selectedLoanType as LoanType);
      const matchesSearch = offer.bankName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLoanType && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'interest':
          return a.interestRateMin - b.interestRateMin;
        case 'amount':
          return b.maxAmount - a.maxAmount;
        case 'time':
          return parseInt(a.processingTime) - parseInt(b.processingTime);
        default:
          return 0;
      }
    });

  // Use legacy loan types for filter chips (most common products)
  // Additional loan types will still show in offers that support them
  const loanTypeOptions: (LoanType | 'all')[] = ['all', ...legacyLoanTypes] as (LoanType | 'all')[];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bank Offers</h1>
          <p className="text-slate-500 mt-1">Compare rates and offers from partner banks</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bank name..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Loan Type Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {loanTypeOptions.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedLoanType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLoanType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? 'All Types' : loanTypeLabels[type].label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-slate-500">Sort by:</span>
          <div className="flex items-center gap-2">
            {[
              { value: 'interest', label: 'Interest Rate' },
              { value: 'amount', label: 'Max Amount' },
              { value: 'time', label: 'Processing Time' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as 'interest' | 'amount' | 'time')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === option.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{filteredOffers.length}</span> bank offers
      </div>

      {/* Bank Offer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOffers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Building2 size={28} className="text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 text-lg">{offer.bankName}</h3>
                      {offer.isPopular && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full inline-flex items-center gap-1">
                          <Star size={10} fill="currentColor" />
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {offer.loanTypes.slice(0, 3).map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                        >
                          {loanTypeLabels[type].label}
                        </span>
                      ))}
                      {offer.loanTypes.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                          +{offer.loanTypes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Commission Badge */}
                <div className="text-right">
                  <p className="text-xs text-slate-500">Commission</p>
                  <p className="text-lg font-bold text-green-600">1.0%</p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Percent size={14} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {offer.interestRateMin}% - {offer.interestRateMax}%
                  </p>
                  <p className="text-xs text-slate-500">Interest Rate</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <IndianRupee size={14} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatCurrency(offer.maxAmount)}
                  </p>
                  <p className="text-xs text-slate-500">Max Amount</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Clock size={14} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{offer.processingTime}</p>
                  <p className="text-xs text-slate-500">Processing</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Processing Fee</span>
                  <span className="font-medium text-slate-700">{offer.processingFee}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Max Tenure</span>
                  <span className="font-medium text-slate-700">{offer.maxTenure} months</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Min Amount</span>
                  <span className="font-medium text-slate-700">{formatCurrency(offer.minAmount)}</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Key Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {offer.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full"
                    >
                      <CheckCircle size={10} />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2">
                Apply with this Bank
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Commission Rates Info */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Partner Commission Rates</h3>
            <p className="text-green-100 mt-1">
              Earn competitive commissions on every successful loan disbursement
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
              <p className="text-2xl font-bold">1.0%</p>
              <p className="text-xs text-green-100">Personal Loan</p>
            </div>
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
              <p className="text-2xl font-bold">0.5%</p>
              <p className="text-xs text-green-100">Home Loan</p>
            </div>
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
              <p className="text-2xl font-bold">1.5%</p>
              <p className="text-xs text-green-100">Business Loan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Comparison */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" />
          Quick Rate Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-sm font-semibold text-slate-600">Bank</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-600">Personal</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-600">Home</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-600">Business</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-600">Car</th>
              </tr>
            </thead>
            <tbody>
              {bankOffers.slice(0, 5).map((offer) => (
                <tr key={offer.id} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-800">{offer.bankName}</td>
                  <td className="py-3 text-center text-sm text-slate-600">
                    {offer.loanTypes.includes('personal_loan')
                      ? `${offer.interestRateMin}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-center text-sm text-slate-600">
                    {offer.loanTypes.includes('home_loan')
                      ? `${Math.max(offer.interestRateMin - 2, 8)}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-center text-sm text-slate-600">
                    {offer.loanTypes.includes('business_loan')
                      ? `${offer.interestRateMin + 1}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-center text-sm text-slate-600">
                    {offer.loanTypes.includes('car_loan')
                      ? `${offer.interestRateMin - 1}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500 flex items-center gap-1">
          <Info size={12} />
          Rates are indicative and subject to change. Actual rates depend on customer profile.
        </p>
      </div>
    </div>
  );
}
