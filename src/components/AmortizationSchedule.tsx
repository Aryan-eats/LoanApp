import React from 'react';
import type { AmortizationRow } from '../utils/emiCalculator';

type AmortizationScheduleProps = {
  schedule: AmortizationRow[];
  monthlyRate: number;
  tenureMonths: number;
};

const formatCurrency = (value: number, minimumFractionDigits = 2) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits,
  maximumFractionDigits: 2,
}).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const AmortizationSchedule: React.FC<AmortizationScheduleProps> = ({ schedule, monthlyRate, tenureMonths }) => {
  return (
    <section className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100">
        <h3 className="text-2xl font-bold text-[#0A2540]">Amortization Schedule</h3>
        <p className="mt-2 text-sm text-gray-500">
          Monthly principal and interest split across the full tenure.
        </p>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Repayment Term</p>
            <p className="mt-2 text-2xl font-bold text-[#0A2540]">{tenureMonths} months</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Monthly Rate</p>
            <p className="mt-2 text-2xl font-bold text-[#0A2540]">{formatPercent(monthlyRate * 100)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Installments</p>
            <p className="mt-2 text-2xl font-bold text-[#0A2540]">{schedule.length}</p>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Month</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">EMI</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Principal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Interest</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {schedule.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">{row.month}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(row.emi)}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-700">{formatCurrency(row.principal)}</td>
                  <td className="px-4 py-3 text-sm text-right text-amber-700">{formatCurrency(row.interest)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AmortizationSchedule;