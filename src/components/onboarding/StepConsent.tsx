import React, { useState } from 'react';
import type { PartnerFormData } from '../../types/partner';

interface StepConsentProps {
  formData: PartnerFormData;
  updateFormData: (fields: Partial<PartnerFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const StepConsent: React.FC<StepConsentProps> = ({
  formData,
  updateFormData,
  onSubmit,
  onBack,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    updateFormData({ [name]: checked });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.consentDataShare) {
      newErrors.consentDataShare = 'This consent is required';
    }
    if (!formData.consentCommission) {
      newErrors.consentCommission = 'This agreement is required';
    }
    if (!formData.declarationNotEmployed) {
      newErrors.declarationNotEmployed = 'This declaration is required';
    }
    if (!formData.consentPrivacyPolicy) {
      newErrors.consentPrivacyPolicy = 'You must accept the Privacy Policy & Terms';
    }

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error !== '');
    if (!hasErrors) {
      setIsSubmitting(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onSubmit();
    }
  };

  // Placeholder function for document links
  const openDocument = (docType: string) => {
    console.log('Opening document:', docType);
    // Placeholder - would open actual document
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Consent & Agreements</h2>
        <p className="text-sm text-gray-500 mt-1">Please review and accept the following to proceed</p>
      </div>

      {/* Consent 1: Data Sharing */}
      <div className={`p-4 rounded-lg border ${errors.consentDataShare ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consentDataShare"
            checked={formData.consentDataShare}
            onChange={handleCheckboxChange}
            className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                Consent to share customer data with banks/NBFCs
              </span>
              <button
                type="button"
                onClick={() => openDocument('data-sharing-agreement')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View Data Sharing Agreement"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              I authorize GPS India Financial Services to share customer leads and related information with partner banks and NBFCs for loan processing.
            </p>
          </div>
        </label>
        {errors.consentDataShare && (
          <p className="mt-2 text-sm text-red-500 ml-7">{errors.consentDataShare}</p>
        )}
      </div>

      {/* Consent 2: Commission Structure */}
      <div className={`p-4 rounded-lg border ${errors.consentCommission ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consentCommission"
            checked={formData.consentCommission}
            onChange={handleCheckboxChange}
            className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                Agreement to commission structure
              </span>
              <button
                type="button"
                onClick={() => openDocument('commission-structure')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View Commission Structure"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              I have read and agree to the commission structure, payout terms, and conditions applicable to partner referrals.
            </p>
          </div>
        </label>
        {errors.consentCommission && (
          <p className="mt-2 text-sm text-red-500 ml-7">{errors.consentCommission}</p>
        )}
      </div>

      {/* Declaration 3: Not Employed */}
      <div className={`p-4 rounded-lg border ${errors.declarationNotEmployed ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="declarationNotEmployed"
            checked={formData.declarationNotEmployed}
            onChange={handleCheckboxChange}
            className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                Declaration: Not employed by any bank/NBFC
              </span>
              <button
                type="button"
                onClick={() => openDocument('declaration-form')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View Declaration Details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              I declare that I am not currently employed by any bank, NBFC, or financial institution in a capacity that would conflict with this partnership.
            </p>
          </div>
        </label>
        {errors.declarationNotEmployed && (
          <p className="mt-2 text-sm text-red-500 ml-7">{errors.declarationNotEmployed}</p>
        )}
      </div>

      {/* Consent 4: Privacy Policy */}
      <div className={`p-4 rounded-lg border ${errors.consentPrivacyPolicy ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consentPrivacyPolicy"
            checked={formData.consentPrivacyPolicy}
            onChange={handleCheckboxChange}
            className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                Accept Privacy Policy & Terms of Service
              </span>
              <button
                type="button"
                onClick={() => openDocument('privacy-policy')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View Privacy Policy"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => openDocument('terms-of-service')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View Terms of Service"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              I have read and agree to the Privacy Policy and Terms of Service of GPS India Financial Services.
            </p>
          </div>
        </label>
        {errors.consentPrivacyPolicy && (
          <p className="mt-2 text-sm text-red-500 ml-7">{errors.consentPrivacyPolicy}</p>
        )}
      </div>

      {/* Summary Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-blue-700">
          By submitting, you confirm that all information provided is accurate and complete. False information may result in rejection or termination of partnership.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </>
          ) : (
            <>
              Submit for Verification
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default StepConsent;
