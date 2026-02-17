import React from 'react';
import type { ApplicationFormData } from '../../hooks/useApplicationForm';
import { serviceCategories } from '../../data/loanCategories';

interface LoanDetailsProps {
  formData: ApplicationFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const LoanDetails: React.FC<LoanDetailsProps> = ({ formData, handleChange }) => {
  return (
    <>
      {/* Loan Type */}
      <div>
        <label htmlFor="loanType" className="block text-sm font-medium text-gray-700 mb-1">
          Loan Type
        </label>
        <select
          id="loanType"
          name="loanType"
          value={formData.loanType}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors bg-white"
        >
          <option value="" disabled>Select Loan Type</option>
          {serviceCategories.map((category, index) => (
            <option key={index} value={category.title}>
              {category.title}
            </option>
          ))}
        </select>
      </div>

      {/* Loan Sub-type (Optional) */}
      {formData.loanType && (
        <div className="animate-fade-in"> 
          <label htmlFor="loanSubType" className="block text-sm font-medium text-gray-700 mb-1">
            Loan Sub-type <span className="text-gray-400 text-xs font-normal">(Optional)</span>
          </label>
          <select
            id="loanSubType"
            name="loanSubType"
            value={formData.loanSubType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors bg-white"
          >
            <option value="">Any / Not Sure</option>
            {serviceCategories
              .find((cat) => cat.title === formData.loanType)
              ?.items.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Loan Amount */}
      <div>
        <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Loan Amount
        </label>
        <input
          type="number"
          id="loanAmount"
          name="loanAmount"
          value={formData.loanAmount}
          onChange={handleChange}
          required
          min="1"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors"
          placeholder="Enter amount"
        />
      </div>
    </>
  );
};

export default LoanDetails;
