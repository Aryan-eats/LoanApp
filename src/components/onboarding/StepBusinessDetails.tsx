import React, { useState } from 'react';
import type { PartnerFormData } from '../../types/partner';

interface StepBusinessDetailsProps {
  formData: PartnerFormData;
  updateFormData: (fields: Partial<PartnerFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const yearsOptions = [
  { value: '', label: 'Select years in operation' },
  { value: '0-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10+', label: 'More than 10 years' },
];

const leadsOptions = [
  { value: '', label: 'Select expected monthly leads' },
  { value: '1-5', label: '1-5 leads' },
  { value: '5-10', label: '5-10 leads' },
  { value: '10-25', label: '10-25 leads' },
  { value: '25-50', label: '25-50 leads' },
  { value: '50+', label: 'More than 50 leads' },
];

const StepBusinessDetails: React.FC<StepBusinessDetailsProps> = ({
  formData,
  updateFormData,
  onNext,
  onBack,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDealer = ['used-car-dealer', 'property-dealer', 'builder'].includes(formData.partnerType);
  const isFreelancer = ['freelancer', 'sub-dsa'].includes(formData.partnerType);

  const validatePan = (pan: string): string => {
    if (!pan) return 'PAN number is required';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) {
      return 'Enter a valid PAN number (e.g., ABCDE1234F)';
    }
    return '';
  };

  const validateGst = (gst: string): string => {
    if (!gst) return ''; // GST is optional
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase())) {
      return 'Enter a valid GST number';
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-uppercase PAN and GST
    if (name === 'panNumber' || name === 'gstNumber') {
      updateFormData({ [name]: value.toUpperCase() });
    } else {
      updateFormData({ [name]: value });
    }

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate PAN
    newErrors.panNumber = validatePan(formData.panNumber);

    if (isDealer) {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      }
      if (!formData.businessAddress.trim()) {
        newErrors.businessAddress = 'Business address is required';
      }
      if (!formData.yearsInOperation) {
        newErrors.yearsInOperation = 'Please select years in operation';
      }
      newErrors.gstNumber = validateGst(formData.gstNumber);
    }

    if (isFreelancer) {
      if (!formData.hasExperience) {
        newErrors.hasExperience = 'Please select your experience';
      }
      if (!formData.expectedLeads) {
        newErrors.expectedLeads = 'Please select expected monthly leads';
      }
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
        <h2 className="text-xl font-semibold text-gray-900">Business Details</h2>
        <p className="text-sm text-gray-500 mt-1">
          {isDealer 
            ? 'Tell us about your business' 
            : 'Share your experience and expectations'}
        </p>
      </div>

      {/* PAN Number - Common for all */}
      <div>
        <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-1">
          PAN Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="panNumber"
          name="panNumber"
          value={formData.panNumber}
          onChange={handleChange}
          maxLength={10}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors uppercase ${
            errors.panNumber ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="ABCDE1234F"
        />
        <p className="mt-1 text-xs text-gray-500">
          Required for commission payouts and compliance
        </p>
        {errors.panNumber && (
          <p className="mt-1 text-sm text-red-500">{errors.panNumber}</p>
        )}
      </div>

      {/* Dealer/Builder Fields */}
      {isDealer && (
        <>
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                errors.businessName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your business name"
            />
            {errors.businessName && (
              <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>
            )}
          </div>

          <div>
            <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Business Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="businessAddress"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                errors.businessAddress ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your business address"
            />
            {errors.businessAddress && (
              <p className="mt-1 text-sm text-red-500">{errors.businessAddress}</p>
            )}
          </div>

          <div>
            <label htmlFor="yearsInOperation" className="block text-sm font-medium text-gray-700 mb-1">
              Years in Operation <span className="text-red-500">*</span>
            </label>
            <select
              id="yearsInOperation"
              name="yearsInOperation"
              value={formData.yearsInOperation}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                errors.yearsInOperation ? 'border-red-500' : 'border-gray-300'
              } ${!formData.yearsInOperation ? 'text-gray-400' : ''}`}
            >
              {yearsOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.yearsInOperation && (
              <p className="mt-1 text-sm text-red-500">{errors.yearsInOperation}</p>
            )}
          </div>

          <div>
            <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 mb-1">
              GST Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="gstNumber"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              maxLength={15}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors uppercase ${
                errors.gstNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="22AAAAA0000A1Z5"
            />
            {errors.gstNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.gstNumber}</p>
            )}
          </div>
        </>
      )}

      {/* Freelancer/Sub-DSA Fields */}
      {isFreelancer && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you have experience in Financial Services? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasExperience"
                  value="yes"
                  checked={formData.hasExperience === 'yes'}
                  onChange={handleChange}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasExperience"
                  value="no"
                  checked={formData.hasExperience === 'no'}
                  onChange={handleChange}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-gray-700">No</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Experience is not mandatory. We provide training to all partners.
            </p>
            {errors.hasExperience && (
              <p className="mt-1 text-sm text-red-500">{errors.hasExperience}</p>
            )}
          </div>

          <div>
            <label htmlFor="expectedLeads" className="block text-sm font-medium text-gray-700 mb-1">
              Expected Monthly Leads <span className="text-red-500">*</span>
            </label>
            <select
              id="expectedLeads"
              name="expectedLeads"
              value={formData.expectedLeads}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                errors.expectedLeads ? 'border-red-500' : 'border-gray-300'
              } ${!formData.expectedLeads ? 'text-gray-400' : ''}`}
            >
              {leadsOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This helps us understand your potential and provide better support
            </p>
            {errors.expectedLeads && (
              <p className="mt-1 text-sm text-red-500">{errors.expectedLeads}</p>
            )}
          </div>
        </>
      )}

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

export default StepBusinessDetails;
