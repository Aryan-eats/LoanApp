import React, { useState, useEffect } from 'react';
import { calculateEmi } from '../api/emiApi';
import { IndianRupee, Percent, CalendarClock, ArrowRight } from 'lucide-react';

const toFiniteNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const buildSafeEmiResult = (principal: number, annualRate: number, tenureYears: number) => {
  const tenureMonths = Math.round(tenureYears * 12);

  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(tenureMonths) || tenureMonths <= 0) {
    return {
      emi: 0,
      total_interest: 0,
      total_payment: 0,
    };
  }

  if (!Number.isFinite(annualRate) || annualRate <= 0) {
    return {
      emi: principal / tenureMonths,
      total_interest: 0,
      total_payment: principal,
    };
  }

  return null;
};

const EmiCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(10.5);
  const [years, setYears] = useState<number>(5);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate on mount or when sliders change (debounced implicitly by fast UI)
  useEffect(() => {
    const fetchCalculate = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await calculateEmi(loanAmount, interestRate, years, undefined);
        setResult({
          emi: toFiniteNumber(data?.emi ?? data?.EMI),
          total_interest: toFiniteNumber(data?.total_interest ?? data?.TotalInterest),
          total_payment: toFiniteNumber(data?.total_payment ?? data?.TotalPayment),
        });
      } catch (err) {
        setError('Unable to calculate EMI at this moment.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    const safeResult = buildSafeEmiResult(loanAmount, interestRate, years);
    if (safeResult) {
      setResult(safeResult);
      setLoading(false);
      setError(null);
      return;
    }

    if (loanAmount > 0 && interestRate > 0 && years > 0) {
      const timer = setTimeout(() => {
        fetchCalculate();
      }, 300); // 300ms debounce
      return () => clearTimeout(timer);
    }

    setResult({ emi: 0, total_interest: 0, total_payment: 0 });
    setLoading(false);
  }, [loanAmount, interestRate, years]);

  const formatCurrency = (val: number | string) => {
    if (!val || isNaN(Number(val))) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  return (
     <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden lg:flex max-w-5xl mx-auto">
       
        {/* Left Side: Interactive Sliders */}
        <div className="p-8 lg:p-12 lg:w-3/5">
           <h3 className="text-2xl font-bold text-[#0A2540] mb-8">Adjust Your Requirements</h3>
           
           <div className="space-y-10">
              {/* Loan Amount Slider */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                    <IndianRupee className="w-4 h-4 text-emerald-500" /> Loan Amount
                  </label>
                  <div className="text-2xl font-bold text-[#0A2540] bg-white px-4 py-1 rounded-lg border border-gray-200">
                    {formatCurrency(loanAmount)}
                  </div>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="10000000"
                  step="50000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between mt-2 text-xs font-medium text-gray-400">
                  <span>₹50K</span>
                  <span>₹1 Cr</span>
                </div>
              </div>

              {/* Interest Rate Slider */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                    <Percent className="w-4 h-4 text-blue-500" /> Interest Rate
                  </label>
                  <div className="text-2xl font-bold text-[#0A2540] bg-white px-4 py-1 rounded-lg border border-gray-200">
                    {interestRate}%
                  </div>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between mt-2 text-xs font-medium text-gray-400">
                  <span>5%</span>
                  <span>25%</span>
                </div>
              </div>

              {/* Tenure Slider */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                    <CalendarClock className="w-4 h-4 text-purple-500" /> Loan Tenure
                  </label>
                  <div className="text-2xl font-bold text-[#0A2540] bg-white px-4 py-1 rounded-lg border border-gray-200">
                     {years} {years === 1 ? 'Year' : 'Years'}
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between mt-2 text-xs font-medium text-gray-400">
                  <span>1 Yr</span>
                  <span>30 Yrs</span>
                </div>
              </div>
           </div>
           
           {error && (
             <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
               {error}
             </div>
           )}
        </div>

        {/* Right Side: Results Card */}
        <div className="bg-[#0A2540] text-white p-8 lg:p-12 lg:w-2/5 flex flex-col justify-center relative overflow-hidden">
           {/* Decorative abstract shapes */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -ml-32 -mb-32"></div>
           
           <div className="relative z-10 space-y-8">
              <div className="text-center md:text-left">
                 <p className="text-blue-200 font-semibold tracking-wider uppercase text-sm mb-3">Your Monthly EMI</p>
                 <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-emerald-200 tracking-tight">
                    {loading ? (
                      <span className="animate-pulse">Calculat...</span>
                    ) : (
                      formatCurrency(result?.emi || result?.EMI || 0)
                    )}
                 </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">Principal Amount</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">Total Interest</span>
                  <span className="text-xl font-bold text-white">
                    {loading ? '...' : formatCurrency(result?.total_interest || result?.TotalInterest || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                  <span className="text-gray-300 font-bold">Total Payment</span>
                  <span className="text-2xl font-bold tracking-tight text-white">
                     {loading ? '...' : formatCurrency(result?.total_payment || result?.TotalPayment || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-8">
                <a href="/apply" className="group flex items-center justify-center gap-2 w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                   Apply instantly <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <p className="text-center text-xs text-gray-500 mt-4">*Indicative figures only. Final rates depend on bank approval.</p>
              </div>
           </div>
        </div>
     </div>
  );
};

export default EmiCalculator;
