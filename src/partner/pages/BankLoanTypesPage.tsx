import { Fragment, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Percent,
  Clock,
  IndianRupee,
  ChevronLeft,
  Star,
  CheckCircle,
  Info,
  TrendingUp,
  Coins,
  Gift,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { getPartnerBanks } from '../../api/banksApi';
import type { BankFromApi } from '../../api/banksApi';
import { getLoanLabel, getLoanIcon, getLoanProduct, categoryLabels } from '../../data/loanProducts';
import type { LoanType } from '../types/partner-dashboard';

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function BankLoanTypesPage() {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const [bank, setBank] = useState<BankFromApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPartnerBanks()
      .then((res) => {
        if (active && res.success && res.data?.banks) {
          const found = res.data.banks.find((b) => b.id === bankId) ?? null;
          setBank(found);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bankId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center border border-white/10">
          <Building2 size={32} className="text-slate-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Bank not found</h2>
        <p className="text-slate-400">The requested bank could not be found.</p>
        <button
          onClick={() => navigate('/partner/bank-offers')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
        >
          Back to Bank Offers
        </button>
      </div>
    );
  }

  // Create a map of loan type to commission info for quick lookup
  const commissionMap = new Map<string, BankFromApi['commissionRates'][number]>();
  bank.commissionRates?.forEach((rate) => {
    commissionMap.set(rate.loanType, rate);
  });

  // Group loan types by category
  const loanTypesByCategory: Record<string, LoanType[]> = {};
  bank.supportedLoanTypes.forEach((loanType) => {
    const product = getLoanProduct(loanType);
    const category = product?.category || 'other';
    if (!loanTypesByCategory[category]) {
      loanTypesByCategory[category] = [];
    }
    loanTypesByCategory[category].push(loanType as LoanType);
  });

  // Calculate average partner commission
  const avgCommission = bank.commissionRates && bank.commissionRates.length > 0
    ? (bank.commissionRates.reduce((sum, r) => sum + Number(r.partnerCommission), 0) / bank.commissionRates.length).toFixed(2)
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/partner/bank-offers')}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Go back to bank offers"
        >
          <ChevronLeft size={24} className="text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{bank.name}</h1>
          <p className="text-slate-400 mt-1">Loan types, interest rates & partner commissions</p>
        </div>
      </div>

      {/* Bank Summary Card */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <Building2 size={32} className="text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-100">{bank.name}</h2>
                {bank.isPopular && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium rounded-full inline-flex items-center gap-1">
                    <Star size={10} fill="currentColor" />
                    Popular
                  </span>
                )}
              </div>
              <p className="text-slate-400 mt-1">
                {bank.supportedLoanTypes.length} loan types available
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <Percent size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {bank.interestRateMin}% - {bank.interestRateMax}%
              </p>
              <p className="text-xs text-slate-400">Interest Rate</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <IndianRupee size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {formatCurrency(Number(bank.maxAmount))}
              </p>
              <p className="text-xs text-slate-400">Max Amount</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <Clock size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-200">{bank.processingTime}</p>
              <p className="text-xs text-slate-400">Processing</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <IndianRupee size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-200">{bank.processingFee}</p>
              <p className="text-xs text-slate-400">Processing Fee</p>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <Coins size={14} />
              </div>
              <p className="text-sm font-semibold text-emerald-300">{avgCommission}%</p>
              <p className="text-xs text-emerald-400/80">Avg. Commission</p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs font-medium text-slate-400 mb-3">Key Features</p>
          <div className="flex flex-wrap gap-2">
            {bank.features.map((feature, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-full"
              >
                <CheckCircle size={12} />
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Commission Summary Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 rounded-xl border border-emerald-700/50 p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={24} className="text-emerald-400" />
          <h3 className="text-lg font-semibold text-emerald-50">Partner Commission Rates</h3>
        </div>
        <p className="text-emerald-200/80 mb-4">
          Earn commissions on every successful loan disbursement through {bank.name}. 
          Commission is calculated on the disbursed loan amount.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bank.commissionRates?.slice(0, 4).map((rate) => (
            <div key={rate.loanType} className="bg-black/20 border border-emerald-500/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{rate.partnerCommission}%</p>
              <p className="text-xs text-emerald-200/80 mt-1 truncate">{getLoanLabel(rate.loanType, true)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commission Split Banner */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Standard Split */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                <Coins size={20} className="text-slate-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">Standard Commission Split</h4>
                <p className="text-xs text-slate-400">Current sharing ratio</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-indigo-400">70%</span>
                </div>
                <p className="text-sm font-medium text-slate-200">Partner</p>
                <p className="text-xs text-slate-400">Your Share</p>
              </div>
              <div className="text-2xl font-light text-slate-600">:</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-slate-400">30%</span>
                </div>
                <p className="text-sm font-medium text-slate-200">GPS India</p>
                <p className="text-xs text-slate-400">Platform Fee</p>
              </div>
            </div>
          </div>

          {/* Special Offer Split */}
          <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 relative">
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold rounded-full inline-flex items-center gap-1">
                <Sparkles size={12} />
                LIMITED OFFER
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Gift size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">High Volume Partner Offer</h4>
                <p className="text-xs text-amber-400 font-medium">For partners with 5+ leads/month</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <span className="text-2xl font-bold text-white">80%</span>
                </div>
                <p className="text-sm font-medium text-slate-200">Partner</p>
                <p className="text-xs text-emerald-400 font-medium">+10% Bonus!</p>
              </div>
              <div className="text-2xl font-light text-amber-500/50">:</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-slate-400">20%</span>
                </div>
                <p className="text-sm font-medium text-slate-200">GPS India</p>
                <p className="text-xs text-slate-400">Reduced Fee</p>
              </div>
            </div>
            <p className="text-xs text-amber-200 text-center mt-2 bg-amber-500/20 backdrop-blur rounded-lg py-2.5 px-4 border border-amber-500/30">
              Submit <strong className="text-amber-400">5+ leads</strong> this month to unlock exclusive partner rates
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Loan Types Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-slate-100">
            Loan Types & Commission Details ({bank.supportedLoanTypes.length})
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Complete breakdown of loan types, interest rates, loan limits, and partner commissions
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Loan Type</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Interest Rate</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Min Amount</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Max Amount</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Max Tenure</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border-l border-white/5">Partner Commission</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(loanTypesByCategory).map(([category, loanTypes]) => (
                <Fragment key={`cat-${category}`}>
                  <tr className="bg-white/5">
                    <td colSpan={6} className="py-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {categoryLabels[category as keyof typeof categoryLabels] || category}
                    </td>
                  </tr>
                  {loanTypes.map((loanType) => {
                    const commission = commissionMap.get(loanType);
                    return (
                      <tr key={loanType} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                              {getLoanIcon(loanType, 'small')}
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">{getLoanLabel(loanType)}</p>
                              {getLoanProduct(loanType)?.shortLabel && 
                               getLoanProduct(loanType)?.shortLabel !== getLoanProduct(loanType)?.label && (
                                <p className="text-xs text-slate-400">{getLoanProduct(loanType)?.shortLabel}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-medium text-slate-300">
                            {commission?.interestRate || `${bank.interestRateMin}% - ${bank.interestRateMax}%`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-slate-400">
                            {commission?.minAmount ? formatCurrency(Number(commission.minAmount)) : formatCurrency(Number(bank.minAmount))}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-slate-400">
                            {commission?.maxAmount ? formatCurrency(Number(commission.maxAmount)) : formatCurrency(Number(bank.maxAmount))}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-slate-400">
                            {commission?.maxTenure ? `${commission.maxTenure} months` : `${bank.maxTenure} months`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center bg-emerald-500/5">
                          {commission ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-semibold border border-emerald-500/20">
                              <Coins size={12} />
                              {commission.partnerCommission}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Earning Example */}
      {/* Commission Earning Example */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Coins size={20} className="text-emerald-400" />
          Earning Potential Example
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bank.commissionRates?.slice(0, 3).map((rate) => {
            const maxAmt = rate.maxAmount ? Number(rate.maxAmount) : 0;
            const commPct = Number(rate.partnerCommission);
            const exampleAmount = maxAmt > 0 ? Math.min(maxAmt / 2, 5000000) : 1000000;
            const earning = (exampleAmount * commPct) / 100;
            return (
              <div key={rate.loanType} className="bg-slate-900/80 rounded-lg p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    {getLoanIcon(rate.loanType, 'small')}
                  </div>
                  <p className="font-medium text-slate-200">{getLoanLabel(rate.loanType, true)}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loan Amount:</span>
                    <span className="font-medium text-slate-300">{formatCurrency(exampleAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commission Rate:</span>
                    <span className="font-medium text-slate-300">{rate.partnerCommission}%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10 mt-2">
                    <span className="text-emerald-400 font-medium">Your Earning:</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(earning)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-indigo-200/80">
            <strong className="text-indigo-300">Note:</strong> Commission is paid upon successful loan disbursement. Interest rates, 
            processing fees, and eligibility may vary based on customer profile and market conditions.
            Commission rates are subject to change as per bank policy.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 rounded-xl border border-indigo-700/50 p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Ready to submit a lead?</h3>
            <p className="text-indigo-200 mt-1">
              Add a client and choose {bank.name} as your preferred bank
            </p>
          </div>
          <Link
            to="/partner/add-client"
            className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors border border-indigo-400 shadow-md text-center"
          >
            Add New Client
          </Link>
        </div>
      </div>
    </div>
  );
}
