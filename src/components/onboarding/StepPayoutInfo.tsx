import React, { useState } from 'react';
import type { PartnerFormData } from '../../types/partner';

interface StepPayoutInfoProps {
  formData: PartnerFormData;
  updateFormData: (fields: Partial<PartnerFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepPayoutInfo: React.FC<StepPayoutInfoProps> = ({
  formData,
  updateFormData,
  onNext,
  onBack,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateIfsc = (ifsc: string): string => {
    if (!ifsc) return ''; // Optional for now
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      return 'Enter a valid IFSC code (e.g., SBIN0001234)';
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'ifscCode') {
      updateFormData({ [name]: value.toUpperCase() });
    } else {
      updateFormData({ [name]: value });
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Payout info validation is optional since fields are disabled until approval
    // But we still validate format if values are entered
    const newErrors: Record<string, string> = {};
    
    if (formData.ifscCode) {
      newErrors.ifscCode = validateIfsc(formData.ifscCode);
    }

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error !== '');
    if (!hasErrors) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Payout Information</h2>
        <p className="text-sm text-gray-500 mt-1">Bank details for commission payouts</p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800">Will be activated after approval</p>
          <p className="text-xs text-amber-700 mt-1">
            Your payout details will be verified by our team. You can update these later from your dashboard.
          </p>
        </div>
      </div>

      {/* Account Holder Name */}
      <div className="opacity-75">
        <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-1">
          Account Holder Name
        </label>
        <input
          type="text"
          id="accountHolderName"
          name="accountHolderName"
          value={formData.accountHolderName}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-gray-50"
          placeholder="As per bank records"
        />
        <p className="mt-1 text-xs text-gray-500">
          Name should match exactly with your bank account
        </p>
      </div>

      {/* Bank Name */}
      <div className="opacity-75">
        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
          Bank Name
        </label>
        <input
          type="text"
          id="bankName"
          name="bankName"
          value={formData.bankName}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-gray-50"
          placeholder="e.g., State Bank of India"
        />
      </div>

      {/* Account Number */}
      <div className="opacity-75">
        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Account Number
        </label>
        <input
          type="text"
          id="accountNumber"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-gray-50"
          placeholder="Enter account number"
        />
      </div>

      {/* IFSC Code */}
      <div className="opacity-75">
        <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700 mb-1">
          IFSC Code
        </label>
        <input
          type="text"
          id="ifscCode"
          name="ifscCode"
          value={formData.ifscCode}
          onChange={handleChange}
          maxLength={11}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-gray-50 uppercase ${
            errors.ifscCode ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., SBIN0001234"
        />
        {errors.ifscCode && (
          <p className="mt-1 text-sm text-red-500">{errors.ifscCode}</p>
        )}
      </div>

      {/* UPI ID */}
      <div className="opacity-75">
        <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-1">
          UPI ID <span className="text-gray-400">(Optional)</span>
        </label>
        <input
          type="text"
          id="upiId"
          name="upiId"
          value={formData.upiId}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-gray-50"
          placeholder="yourname@upi"
        />
        <p className="mt-1 text-xs text-gray-500">
          For faster small payouts and instant transfers
        </p>
      </div>

      {/* Verification Note */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-gray-500">
          Bank details verification is done via penny drop. A small amount (₹1) will be credited to verify your account after approval.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          type="submit"
          className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          Continue
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default StepPayoutInfo;
