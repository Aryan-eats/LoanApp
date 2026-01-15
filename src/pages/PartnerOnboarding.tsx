import React, { useState } from 'react';
import StepIndicator from '../components/onboarding/StepIndicator';
import StepBasicIdentity from '../components/onboarding/StepBasicIdentity';
import StepBusinessDetails from '../components/onboarding/StepBusinessDetails';
import StepPayoutInfo from '../components/onboarding/StepPayoutInfo';
import StepConsent from '../components/onboarding/StepConsent';
import SubmissionSuccess from '../components/onboarding/SubmissionSuccess';
import type { PartnerFormData } from '../types/partner';
import { initialFormData } from '../types/partner';

const steps = [
  { id: 1, title: 'Basic Identity' },
  { id: 2, title: 'Business Details' },
  { id: 3, title: 'Payout Info' },
  { id: 4, title: 'Consent & Submit' },
];

const PartnerOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PartnerFormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateFormData = (fields: Partial<PartnerFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    // Placeholder for submission logic
    console.log('Form submitted:', formData);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSubmitted) {
    return <SubmissionSuccess />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Partner Onboarding
          </h1>
          <p className="mt-2 text-gray-600">
            Join our network and start earning. Complete the form below to get started.
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sm:p-8 mt-8">
          {currentStep === 1 && (
            <StepBasicIdentity
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
            />
          )}

          {currentStep === 2 && (
            <StepBusinessDetails
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 3 && (
            <StepPayoutInfo
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 4 && (
            <StepConsent
              formData={formData}
              updateFormData={updateFormData}
              onSubmit={handleSubmit}
              onBack={prevStep}
            />
          )}
        </div>

        {/* Trust Indicator */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Your data is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerOnboarding;
