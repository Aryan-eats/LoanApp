import React, { useState } from 'react';
import { calculateEmi } from '../api/emiApi';

const EmiCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [years, setYears] = useState<number | ''>('');
  // const [startDate, setStartDate] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await calculateEmi(
        Number(loanAmount),
        Number(interestRate),
        Number(years),
        undefined // startDate was unused
      );
      setResult(data);
    } catch (err) {
      setError('An error occurred while calculating EMI. Please check your inputs and API configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      {/* <h2 className="text-2xl font-bold mb-6 text-center">Smart EMI Calculator</h2> */}
      
      <form onSubmit={handleCalculate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            placeholder="Enter amount"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (% per annum)</label>
          <input
            type="number"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            placeholder="Enter interest rate"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tenure (Years)</label>
          <input
            type="number"
            step="0.1"
            value={years}
            onChange={(e) => setYears(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            placeholder="Enter years"
            required
          />
        </div>

        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Optional)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
          />
        </div> */}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Calculating...' : 'Calculate EMI'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-3">Calculation Result</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Monthly EMI</p>
              <p className="text-xl font-bold text-black">{result.emi || result.EMI || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Interest</p>
              <p className="text-xl font-bold text-black">{result.total_interest || result.TotalInterest || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-xl font-bold text-black">{result.total_payment || result.TotalPayment || 'N/A'}</p>
            </div>
            {/* {result.finish_date && (
              <div>
                <p className="text-sm text-gray-500">Finish Date</p>
                <p className="text-xl font-bold text-black">{result.finish_date}</p>
              </div>
            )} */}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmiCalculator;
