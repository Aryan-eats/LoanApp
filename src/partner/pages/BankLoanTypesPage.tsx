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
} from 'lucide-react';
import { bankOffers } from '../data/placeholderData';
import { getLoanLabel, getLoanIcon, getLoanProduct, categoryLabels } from '../../data/loanProducts';
import type { LoanType, LoanTypeCommission } from '../types/partner-dashboard';

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function BankLoanTypesPage() {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();

  const bank = bankOffers.find((b) => b.id === bankId);

  if (!bank) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <Building2 size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Bank not found</h2>
        <p className="text-slate-500">The requested bank could not be found.</p>
        <button
          onClick={() => navigate('/partner/bank-offers')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Bank Offers
        </button>
      </div>
    );
  }

  // Create a map of loan type to commission info for quick lookup
  const commissionMap = new Map<string, LoanTypeCommission>();
  bank.commissionRates?.forEach((rate) => {
    commissionMap.set(rate.loanType, rate);
  });

  // Group loan types by category
  const loanTypesByCategory: Record<string, LoanType[]> = {};
  bank.loanTypes.forEach((loanType) => {
    const product = getLoanProduct(loanType);
    const category = product?.category || 'other';
    if (!loanTypesByCategory[category]) {
      loanTypesByCategory[category] = [];
    }
    loanTypesByCategory[category].push(loanType);
  });

  // Calculate average partner commission
  const avgCommission = bank.commissionRates && bank.commissionRates.length > 0
    ? (bank.commissionRates.reduce((sum, r) => sum + r.partnerCommission, 0) / bank.commissionRates.length).toFixed(2)
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/partner/bank-offers')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{bank.bankName}</h1>
          <p className="text-slate-500 mt-1">Loan types, interest rates & partner commissions</p>
        </div>
      </div>

      {/* Bank Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
              <Building2 size={32} className="text-slate-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-800">{bank.bankName}</h2>
                {bank.isPopular && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full inline-flex items-center gap-1">
                    <Star size={10} fill="currentColor" />
                    Popular
                  </span>
                )}
              </div>
              <p className="text-slate-500 mt-1">
                {bank.loanTypes.length} loan types available
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <Percent size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {bank.interestRateMin}% - {bank.interestRateMax}%
              </p>
              <p className="text-xs text-slate-500">Interest Rate</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <IndianRupee size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {formatCurrency(bank.maxAmount)}
              </p>
              <p className="text-xs text-slate-500">Max Amount</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <Clock size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-800">{bank.processingTime}</p>
              <p className="text-xs text-slate-500">Processing</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <IndianRupee size={14} />
              </div>
              <p className="text-sm font-semibold text-slate-800">{bank.processingFee}</p>
              <p className="text-xs text-slate-500">Processing Fee</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <Coins size={14} />
              </div>
              <p className="text-sm font-semibold text-green-700">{avgCommission}%</p>
              <p className="text-xs text-green-600">Avg. Commission</p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-3">Key Features</p>
          <div className="flex flex-wrap gap-2">
            {bank.features.map((feature, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-full"
              >
                <CheckCircle size={12} />
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Commission Summary Card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={24} />
          <h3 className="text-lg font-semibold">Partner Commission Rates</h3>
        </div>
        <p className="text-green-100 mb-4">
          Earn commissions on every successful loan disbursement through {bank.bankName}. 
          Commission is calculated on the disbursed loan amount.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bank.commissionRates?.slice(0, 4).map((rate) => (
            <div key={rate.loanType} className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{rate.partnerCommission}%</p>
              <p className="text-xs text-green-100 mt-1 truncate">{getLoanLabel(rate.loanType, true)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commission Split Banner */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Standard Split */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Coins size={20} className="text-slate-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Standard Commission Split</h4>
                <p className="text-xs text-slate-500">Current sharing ratio</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-blue-600">70%</span>
                </div>
                <p className="text-sm font-medium text-slate-700">Partner</p>
                <p className="text-xs text-slate-500">Your Share</p>
              </div>
              <div className="text-2xl font-light text-slate-300">:</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-slate-500">30%</span>
                </div>
                <p className="text-sm font-medium text-slate-700">GPS India</p>
                <p className="text-xs text-slate-500">Platform Fee</p>
              </div>
            </div>
          </div>

          {/* Special Offer Split */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 relative">
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full inline-flex items-center gap-1">
                <Sparkles size={12} />
                LIMITED OFFER
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Gift size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">High Volume Partner Offer</h4>
                <p className="text-xs text-amber-600 font-medium">For partners with 5+ leads/month</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-green-200">
                  <span className="text-2xl font-bold text-white">80%</span>
                </div>
                <p className="text-sm font-medium text-slate-700">Partner</p>
                <p className="text-xs text-green-600 font-medium">+10% Bonus!</p>
              </div>
              <div className="text-2xl font-light text-amber-300">:</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-slate-500">20%</span>
                </div>
                <p className="text-sm font-medium text-slate-700">GPS India</p>
                <p className="text-xs text-slate-500">Reduced Fee</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 text-center mt-2 bg-amber-100/80 backdrop-blur rounded-lg py-2.5 px-4 border border-amber-200/50">
              Submit <strong>5+ leads</strong> this month to unlock exclusive partner rates
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Loan Types Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            Loan Types & Commission Details ({bank.loanTypes.length})
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Complete breakdown of loan types, interest rates, loan limits, and partner commissions
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Loan Type</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Interest Rate</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Min Amount</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Max Amount</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Max Tenure</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-green-600 bg-green-50">Partner Commission</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(loanTypesByCategory).map(([category, loanTypes]) => (
                <>
                  <tr key={`cat-${category}`} className="bg-slate-100">
                    <td colSpan={6} className="py-2 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {categoryLabels[category as keyof typeof categoryLabels] || category}
                    </td>
                  </tr>
                  {loanTypes.map((loanType) => {
                    const commission = commissionMap.get(loanType);
                    return (
                      <tr key={loanType} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                              {getLoanIcon(loanType, 'small')}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{getLoanLabel(loanType)}</p>
                              {getLoanProduct(loanType)?.shortLabel && 
                               getLoanProduct(loanType)?.shortLabel !== getLoanProduct(loanType)?.label && (
                                <p className="text-xs text-slate-500">{getLoanProduct(loanType)?.shortLabel}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-medium text-slate-700">
                            {commission?.interestRate || `${bank.interestRateMin}% - ${bank.interestRateMax}%`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-slate-600">
                            {commission?.minAmount ? formatCurrency(commission.minAmount) : formatCurrency(bank.minAmount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-slate-600">
                            {commission?.maxAmount ? formatCurrency(commission.maxAmount) : formatCurrency(bank.maxAmount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-slate-600">
                            {commission?.maxTenure ? `${commission.maxTenure} months` : `${bank.maxTenure} months`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center bg-green-50">
                          {commission ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                              <Coins size={12} />
                              {commission.partnerCommission}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Earning Example */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Coins size={20} className="text-green-600" />
          Earning Potential Example
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bank.commissionRates?.slice(0, 3).map((rate) => {
            const exampleAmount = rate.maxAmount ? Math.min(rate.maxAmount / 2, 5000000) : 1000000;
            const earning = (exampleAmount * rate.partnerCommission) / 100;
            return (
              <div key={rate.loanType} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {getLoanIcon(rate.loanType, 'small')}
                  </div>
                  <p className="font-medium text-slate-800">{getLoanLabel(rate.loanType, true)}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Loan Amount:</span>
                    <span className="font-medium text-slate-700">{formatCurrency(exampleAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commission Rate:</span>
                    <span className="font-medium text-slate-700">{rate.partnerCommission}%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-green-600 font-medium">Your Earning:</span>
                    <span className="font-bold text-green-600">{formatCurrency(earning)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Commission is paid upon successful loan disbursement. Interest rates, 
            processing fees, and eligibility may vary based on customer profile and market conditions.
            Commission rates are subject to change as per bank policy.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Ready to submit a lead?</h3>
            <p className="text-blue-100 mt-1">
              Add a client and choose {bank.bankName} as your preferred bank
            </p>
          </div>
          <Link
            to="/partner/add-client"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-center"
          >
            Add New Client
          </Link>
        </div>
      </div>
    </div>
  );
}
