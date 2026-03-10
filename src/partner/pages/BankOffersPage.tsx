import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader2,
} from 'lucide-react';
import { getPartnerBanks } from '../../api/banksApi';
import type { BankFromApi } from '../../api/banksApi';
import type { LoanType } from '../../partner/types/partner-dashboard';
import { buildLoanTypeLabels, getLoanIcon, legacyLoanTypes } from '../../data/loanProducts';

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
  const [banks, setBanks] = useState<BankFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPartnerBanks()
      .then((res) => {
        if (active && res.success && res.data?.banks) {
          setBanks(res.data.banks);
        }
      })
      .catch(() => {/* keep empty list */})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredOffers = useMemo(() => {
    return banks
      .filter((offer) => {
        const matchesLoanType =
          selectedLoanType === 'all' || offer.supportedLoanTypes.includes(selectedLoanType as string);
        const matchesSearch = offer.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesLoanType && matchesSearch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'interest':
            return Number(a.interestRateMin) - Number(b.interestRateMin);
          case 'amount':
            return Number(b.maxAmount) - Number(a.maxAmount);
          case 'time':
            return parseInt(a.processingTime) - parseInt(b.processingTime);
          default:
            return 0;
        }
      });
  }, [banks, selectedLoanType, searchQuery, sortBy]);

  const loanTypeOptions: (LoanType | 'all')[] = ['all', ...legacyLoanTypes] as (LoanType | 'all')[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bank Offers</h1>
          <p className="text-slate-400 mt-1">Compare rates and offers from partner banks</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bank name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 text-slate-100 border border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {loanTypeOptions.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedLoanType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLoanType === type
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {type === 'all' ? 'All Types' : loanTypeLabels[type].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-slate-400">Sort by:</span>
          <div className="flex items-center gap-2">
            {[
              { value: 'interest', label: 'Interest Rate' },
              { value: 'amount', label: 'Max Amount' },
              { value: 'time', label: 'Processing Time' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as 'interest' | 'amount' | 'time')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  sortBy === option.value
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="ml-2 text-slate-400">Loading bank offers…</span>
        </div>
      )}

      <div className="text-sm text-slate-400">
        Showing <span className="font-medium text-slate-200">{filteredOffers.length}</span> bank offers
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOffers.map((offer) => (
          <div
            key={offer.id}
            className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
          >
            <div className="p-5 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                     {offer.logo ? (
                        <img src={offer.logo} alt={offer.name} className="w-full h-full object-contain" />
                     ) : (
                        <Building2 size={28} className="text-slate-400" />
                     )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-100 text-lg">{offer.name}</h3>
                      {offer.isPopular && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium rounded-full inline-flex items-center gap-1">
                          <Star size={10} fill="currentColor" />
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {offer.supportedLoanTypes.slice(0, 3).map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-full"
                        >
                          {loanTypeLabels[type].label}
                        </span>
                      ))}
                      {offer.supportedLoanTypes.length > 3 && (
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-full">
                          +{offer.supportedLoanTypes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Commission</p>
                  <p className="text-lg font-bold text-emerald-400">Up to 2.5%</p> 
                  {/* Note: Commission varies by loan type, showing static "Up to" for now or could take max */}
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Percent size={14} />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {Number(offer.interestRateMin)}% - {Number(offer.interestRateMax)}%
                  </p>
                  <p className="text-xs text-slate-400">Interest Rate</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <IndianRupee size={14} />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {formatCurrency(Number(offer.maxAmount))}
                  </p>
                  <p className="text-xs text-slate-400">Max Amount</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Clock size={14} />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">{offer.processingTime}</p>
                  <p className="text-xs text-slate-400">Processing</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Processing Fee</span>
                  <span className="font-medium text-slate-200">{offer.processingFee}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Max Tenure</span>
                  <span className="font-medium text-slate-200">{offer.maxTenure} months</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Min Amount</span>
                  <span className="font-medium text-slate-200">{formatCurrency(Number(offer.minAmount))}</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-slate-400 mb-2">Key Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {offer.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full"
                    >
                      <CheckCircle size={10} />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => navigate(`/partner/bank-offers/${offer.id}`)}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors inline-flex items-center justify-center gap-2"
              >
                Explore Loan types
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-xl border border-emerald-700/50 p-6 text-emerald-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Partner Commission Rates</h3>
            <p className="text-emerald-200/80 mt-1">
              Earn competitive commissions on every successful loan disbursement
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center px-4 py-2 bg-black/20 border border-emerald-500/20 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">1.0%</p>
              <p className="text-xs text-emerald-200/80">Personal Loan</p>
            </div>
            <div className="text-center px-4 py-2 bg-black/20 border border-emerald-500/20 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">0.5%</p>
              <p className="text-xs text-emerald-200/80">Home Loan</p>
            </div>
            <div className="text-center px-4 py-2 bg-black/20 border border-emerald-500/20 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">1.5%</p>
              <p className="text-xs text-emerald-200/80">Business Loan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-400" />
          Quick Rate Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 text-sm font-semibold text-slate-300">Bank</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-300">Personal</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-300">Home</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-300">Business</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-300">Car</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.slice(0, 5).map((offer) => (
                <tr key={offer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 font-medium text-slate-200 px-2">{offer.name}</td>
                  <td className="py-3 text-center text-sm text-slate-400">
                    {offer.supportedLoanTypes.includes('personal_loan')
                      ? `${Number(offer.interestRateMin)}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-center text-sm text-slate-400">
                    {offer.supportedLoanTypes.includes('home_loan')
                      ? `${Math.max(Number(offer.interestRateMin) - 2, 8)}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-center text-sm text-slate-400">
                    {offer.supportedLoanTypes.includes('business_loan')
                      ? `${Number(offer.interestRateMin) + 1}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-center text-sm text-slate-400">
                    {offer.supportedLoanTypes.includes('car_loan')
                      ? `${Number(offer.interestRateMin) - 1}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400 flex items-center gap-1">
          <Info size={12} />
          Rates are indicative and subject to change. Actual rates depend on customer profile.
        </p>
      </div>
    </div>
  );
}
