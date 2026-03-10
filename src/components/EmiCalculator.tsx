import React, { useState } from 'react';
import { IndianRupee, Percent, CalendarClock, ArrowRight } from 'lucide-react';
import AmortizationSchedule from './AmortizationSchedule';
import { calculateEmiDetails, type TenureUnit } from '../utils/emiCalculator';

const TENURE_LIMITS: Record<TenureUnit, { min: number; max: number; step: number; startLabel: string; endLabel: string }> = {
  years: { min: 1, max: 30, step: 1, startLabel: '1 Yr', endLabel: '30 Yrs' },
  months: { min: 1, max: 360, step: 1, startLabel: '1 Mo', endLabel: '360 Mos' },
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const EmiCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(10.5);
  const [tenureValue, setTenureValue] = useState<number>(5);
  const [tenureUnit, setTenureUnit] = useState<TenureUnit>('years');

  const calculation = calculateEmiDetails(loanAmount, interestRate, tenureValue, tenureUnit);
  const tenureConfig = TENURE_LIMITS[tenureUnit];

  const formatCurrency = (val: number | string, minimumFractionDigits = 0) => {
    if (!val || isNaN(Number(val))) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits,
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  const handleTenureUnitChange = (nextUnit: TenureUnit) => {
    if (nextUnit === tenureUnit) {
      return;
    }

    const nextValue = nextUnit === 'months'
      ? calculation.tenureMonths || tenureValue * 12
      : Math.max(1, Math.round((calculation.tenureMonths || tenureValue) / 12));

    setTenureUnit(nextUnit);
    setTenureValue(Math.min(TENURE_LIMITS[nextUnit].max, Math.max(TENURE_LIMITS[nextUnit].min, nextValue)));
  };

  const handleManualNumberChange = (
    rawValue: string,
    setter: React.Dispatch<React.SetStateAction<number>>,
    min: number,
    max: number
  ) => {
    const nextValue = Number(rawValue);

    if (Number.isNaN(nextValue)) {
      return;
    }

    setter(clampValue(nextValue, min, max));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden lg:flex">
        <div className="p-8 lg:p-12 lg:w-3/5">
          <h3 className="text-2xl font-bold text-[#0A2540] mb-8">Adjust Your Requirements</h3>

          <div className="space-y-10">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-4 gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                  <IndianRupee className="w-4 h-4 text-emerald-500" /> Loan Amount
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-[#0A2540] bg-white px-4 py-1 rounded-lg border border-gray-200">
                    {formatCurrency(loanAmount)}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="50000"
                    max="10000000"
                    step="50000"
                    value={loanAmount}
                    onChange={(e) => handleManualNumberChange(e.target.value, setLoanAmount, 50000, 10000000)}
                    className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#0A2540] shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    aria-label="Loan Amount manual input"
                  />
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

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-4 gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                  <Percent className="w-4 h-4 text-blue-500" /> Annual Interest Rate
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-[#0A2540] bg-white px-4 py-1 rounded-lg border border-gray-200">
                    {interestRate}%
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="5"
                    max="25"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => handleManualNumberChange(e.target.value, setInterestRate, 5, 25)}
                    className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#0A2540] shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    aria-label="Interest Rate manual input"
                  />
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

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                  <CalendarClock className="w-4 h-4 text-purple-500" /> Loan Tenure
                </label>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1">
                    <button
                      type="button"
                      onClick={() => handleTenureUnitChange('months')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tenureUnit === 'months' ? 'bg-[#0A2540] text-white' : 'text-gray-500 hover:text-[#0A2540]'}`}
                    >
                      Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureUnitChange('years')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tenureUnit === 'years' ? 'bg-[#0A2540] text-white' : 'text-gray-500 hover:text-[#0A2540]'}`}
                    >
                      Years
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-[#0A2540] bg-white px-4 py-1 rounded-lg border border-gray-200">
                    {tenureValue} {tenureUnit === 'years' ? (tenureValue === 1 ? 'Year' : 'Years') : (tenureValue === 1 ? 'Month' : 'Months')}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={tenureConfig.min}
                    max={tenureConfig.max}
                    step={tenureConfig.step}
                    value={tenureValue}
                    onChange={(e) => handleManualNumberChange(e.target.value, setTenureValue, tenureConfig.min, tenureConfig.max)}
                    className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#0A2540] shadow-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    aria-label="Loan Tenure manual input"
                  />
                </div>
              </div>
              <input
                type="range"
                min={tenureConfig.min}
                max={tenureConfig.max}
                step={tenureConfig.step}
                value={tenureValue}
                onChange={(e) => setTenureValue(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between mt-2 text-xs font-medium text-gray-400">
                <span>{tenureConfig.startLabel}</span>
                <span>{tenureConfig.endLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A2540] text-white p-8 lg:p-12 lg:w-2/5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -ml-32 -mb-32"></div>

          <div className="relative z-10 space-y-8">
            <div className="text-center md:text-left">
              <p className="text-blue-200 font-semibold tracking-wider uppercase text-sm mb-3">Monthly EMI</p>
              <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-emerald-200 tracking-tight">
                {formatCurrency(calculation.monthlyEmi, 2)}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-gray-700/50">
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-400 font-medium">Principal Amount</span>
                <span className="text-xl font-bold text-white">{formatCurrency(loanAmount)}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-400 font-medium">Total Interest Payable</span>
                <span className="text-xl font-bold text-white">{formatCurrency(calculation.totalInterest, 2)}</span>
              </div>
              <div className="flex justify-between items-center gap-4 pt-2 border-t border-gray-700/50">
                <span className="text-gray-300 font-bold">Total Amount Payable</span>
                <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(calculation.totalAmount, 2)}</span>
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

      <AmortizationSchedule
        schedule={calculation.schedule}
        monthlyRate={calculation.monthlyRate}
        tenureMonths={calculation.tenureMonths}
      />
    </div>
  );
};

export default EmiCalculator;
