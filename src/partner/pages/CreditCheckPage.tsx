import { useState } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Building2,
  Clock,
  IndianRupee,
  Info,
  ArrowRight,
  Percent,
  User,
  Phone,
  Briefcase,
} from 'lucide-react';
import Tooltip from '../components/Tooltip';

interface EligibilityFormData {
  clientName: string;
  phone: string;
  monthlyIncome: string;
  employmentType: string;
  loanType: string;
  loanAmount: string;
  existingEMI: string;
}

interface EligibilityResult {
  isEligible: boolean;
  score: number;
  maxLoanAmount: number;
  minLoanAmount: number;
  estimatedEMI: number;
  eligibleBanks: EligibleBank[];
  factors: EligibilityFactor[];
}

interface EligibleBank {
  id: string;
  name: string;
  logo?: string;
  interestRate: string;
  maxAmount: number;
  processingFee: string;
  processingTime: string;
  features: string[];
}

interface EligibilityFactor {
  factor: string;
  status: 'positive' | 'neutral' | 'negative';
  description: string;
  weight: number;
}

// Mock eligibility check result
const mockEligibilityResult: EligibilityResult = {
  isEligible: true,
  score: 78,
  maxLoanAmount: 2500000,
  minLoanAmount: 100000,
  estimatedEMI: 28500,
  eligibleBanks: [
    {
      id: '1',
      name: 'HDFC Bank',
      interestRate: '10.5% - 12.5%',
      maxAmount: 2500000,
      processingFee: '1% + GST',
      processingTime: '3-5 days',
      features: ['No prepayment charges', 'Flexible tenure', 'Quick disbursement'],
    },
    {
      id: '2',
      name: 'ICICI Bank',
      interestRate: '10.75% - 13%',
      maxAmount: 2200000,
      processingFee: '0.5% + GST',
      processingTime: '2-4 days',
      features: ['Zero documentation for existing customers', 'Balance transfer option'],
    },
    {
      id: '3',
      name: 'Axis Bank',
      interestRate: '11% - 14%',
      maxAmount: 2000000,
      processingFee: '1.5% + GST',
      processingTime: '5-7 days',
      features: ['Top-up loan available', 'Part payment allowed'],
    },
    {
      id: '4',
      name: 'Bajaj Finserv',
      interestRate: '12% - 16%',
      maxAmount: 1500000,
      processingFee: '2% + GST',
      processingTime: '24-48 hours',
      features: ['Instant approval', 'Minimal documentation'],
    },
  ],
  factors: [
    { factor: 'Income Level', status: 'positive', description: 'Monthly income meets requirement', weight: 30 },
    { factor: 'Employment Stability', status: 'positive', description: 'Stable employment with reputed employer', weight: 25 },
    { factor: 'Debt-to-Income Ratio', status: 'neutral', description: 'Existing obligations are moderate', weight: 20 },
    { factor: 'Credit History', status: 'positive', description: 'Good credit behavior assumed', weight: 25 },
  ],
};

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function CreditCheckPage() {
  const [formData, setFormData] = useState<EligibilityFormData>({
    clientName: '',
    phone: '',
    monthlyIncome: '',
    employmentType: '',
    loanType: '',
    loanAmount: '',
    existingEMI: '',
  });

  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleInputChange = (field: keyof EligibilityFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckEligibility = async () => {
    setIsChecking(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setResult(mockEligibilityResult);
    setIsChecking(false);
    setShowResult(true);
  };

  const handleReset = () => {
    setFormData({
      clientName: '',
      phone: '',
      monthlyIncome: '',
      employmentType: '',
      loanType: '',
      loanAmount: '',
      existingEMI: '',
    });
    setResult(null);
    setShowResult(false);
  };

  const getFactorIcon = (status: string) => {
    switch (status) {
      case 'positive':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'negative':
        return <TrendingDown size={16} className="text-red-500" />;
      default:
        return <Minus size={16} className="text-amber-500" />;
    }
  };

  const getFactorColor = (status: string) => {
    switch (status) {
      case 'positive':
        return 'border-green-200 bg-green-50';
      case 'negative':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-amber-200 bg-amber-50';
    }
  };

  if (showResult && result) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Eligibility Result</h1>
            <p className="text-slate-500 mt-1">Soft check completed for {formData.clientName}</p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Check Another Client
          </button>
        </div>

        {/* Soft Check Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Shield className="text-blue-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-blue-800">Soft Check – No CIBIL Impact</p>
            <p className="text-sm text-blue-700 mt-1">
              This eligibility check is based on the information provided and does not impact your client's credit score.
              Final approval and terms are subject to bank verification and actual credit score.
            </p>
          </div>
        </div>

        {/* Result Summary */}
        <div className={`rounded-xl p-6 ${result.isEligible ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${result.isEligible ? 'bg-green-100' : 'bg-red-100'}`}>
                {result.isEligible ? (
                  <CheckCircle size={32} className="text-green-600" />
                ) : (
                  <XCircle size={32} className="text-red-600" />
                )}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${result.isEligible ? 'text-green-800' : 'text-red-800'}`}>
                  {result.isEligible ? 'Eligible for Loan!' : 'Not Eligible'}
                </h2>
                <p className={`text-sm ${result.isEligible ? 'text-green-700' : 'text-red-700'}`}>
                  {result.isEligible
                    ? 'Your client qualifies for multiple bank offers'
                    : 'Current profile does not meet eligibility criteria'}
                </p>
              </div>
            </div>

            {/* Eligibility Score */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke={result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(result.score / 100) * 226} 226`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">
                    {result.score}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Eligibility Score</p>
              </div>
            </div>
          </div>

          {/* Loan Range */}
          {result.isEligible && (
            <div className="mt-6 pt-6 border-t border-green-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-xs text-green-700 font-medium">Eligible Loan Range</p>
                <p className="text-lg font-bold text-green-800 mt-1">
                  {formatCurrency(result.minLoanAmount)} - {formatCurrency(result.maxLoanAmount)}
                </p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-xs text-green-700 font-medium">Estimated EMI</p>
                <p className="text-lg font-bold text-green-800 mt-1">
                  {formatCurrency(result.estimatedEMI)}/month
                </p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-xs text-green-700 font-medium">Banks Available</p>
                <p className="text-lg font-bold text-green-800 mt-1">{result.eligibleBanks.length} Options</p>
              </div>
            </div>
          )}
        </div>

        {/* Eligibility Factors */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Eligibility Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.factors.map((factor, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getFactorColor(factor.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getFactorIcon(factor.status)}
                    <span className="font-medium text-slate-800">{factor.factor}</span>
                  </div>
                  <span className="text-xs text-slate-500">{factor.weight}% weight</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Eligible Banks */}
        {result.isEligible && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Eligible Banks & NBFCs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.eligibleBanks.map((bank) => (
                <div
                  key={bank.id}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Building2 size={24} className="text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{bank.name}</h4>
                        <p className="text-xs text-slate-500">Up to {formatCurrency(bank.maxAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Percent size={14} className="text-slate-400" />
                      <span className="text-slate-600">{bank.interestRate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-slate-600">{bank.processingTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm col-span-2">
                      <IndianRupee size={14} className="text-slate-400" />
                      <span className="text-slate-600">Processing: {bank.processingFee}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {bank.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Ready to Proceed?</h3>
          <p className="text-blue-100 text-sm mb-4">
            Submit this lead with required documents to get formal offers from banks.
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Submit Lead
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Credit Check / Eligibility</h1>
        <p className="text-slate-500 mt-1">Check your client's loan eligibility instantly</p>
      </div>

      {/* Soft Check Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Shield className="text-blue-600 flex-shrink-0" size={20} />
        <div>
          <p className="text-sm font-medium text-blue-800">Soft Check – No CIBIL Impact</p>
          <p className="text-sm text-blue-700 mt-1">
            This is a preliminary eligibility check based on basic information. It does NOT affect your client's 
            credit score. A hard inquiry will only be made when the application is formally submitted to a bank.
          </p>
        </div>
      </div>

      {/* Eligibility Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Client Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Client Name *</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client's full name"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number *</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Employment Type *</label>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={formData.employmentType}
                onChange={(e) => handleInputChange('employmentType', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">Select employment type</option>
                <option value="salaried">Salaried</option>
                <option value="self_employed">Self Employed</option>
                <option value="business_owner">Business Owner</option>
                <option value="professional">Professional (Doctor, CA, etc.)</option>
              </select>
            </div>
          </div>

          {/* Monthly Income */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                Monthly Income *
                <Tooltip content="Enter net monthly income (take-home salary for salaried, average monthly profit for self-employed)" />
              </span>
            </label>
            <div className="relative">
              <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                placeholder="e.g., 50000"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Loan Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Loan Type *</label>
            <select
              value={formData.loanType}
              onChange={(e) => handleInputChange('loanType', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select loan type</option>
              <option value="personal_loan">Personal Loan</option>
              <option value="home_loan">Home Loan</option>
              <option value="business_loan">Business Loan</option>
              <option value="car_loan">Car Loan</option>
              <option value="lap">Loan Against Property</option>
              <option value="education_loan">Education Loan</option>
            </select>
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Required Loan Amount *</label>
            <div className="relative">
              <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={formData.loanAmount}
                onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                placeholder="e.g., 500000"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Existing EMI */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                Existing EMI Obligations (Optional)
                <Tooltip content="Total of all existing loan EMIs per month. Leave blank if none." />
              </span>
            </label>
            <div className="relative max-w-md">
              <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={formData.existingEMI}
                onChange={(e) => handleInputChange('existingEMI', e.target.value)}
                placeholder="Monthly EMI amount (if any)"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Check Button */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleCheckEligibility}
            disabled={!formData.clientName || !formData.phone || !formData.monthlyIncome || !formData.employmentType || !formData.loanType || !formData.loanAmount || isChecking}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isChecking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking Eligibility...
              </>
            ) : (
              <>
                <Search size={18} />
                Check Eligibility
              </>
            )}
          </button>
          <p className="text-sm text-slate-500">
            <Info size={14} className="inline mr-1" />
            This check takes less than 30 seconds
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">How Eligibility Check Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
              1
            </div>
            <div>
              <h4 className="font-medium text-slate-800">Enter Details</h4>
              <p className="text-sm text-slate-500 mt-1">
                Provide basic client information like income and loan requirements
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
              2
            </div>
            <div>
              <h4 className="font-medium text-slate-800">Instant Analysis</h4>
              <p className="text-sm text-slate-500 mt-1">
                Our system analyzes eligibility across 20+ banks in seconds
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
              3
            </div>
            <div>
              <h4 className="font-medium text-slate-800">Get Results</h4>
              <p className="text-sm text-slate-500 mt-1">
                See eligible loan amount range and best matching bank offers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
