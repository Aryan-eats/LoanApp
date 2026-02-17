import React from 'react';
import { useApplicationForm } from '../hooks/useApplicationForm';
import PersonalInfo from './application-form/PersonalInfo';
import LoanDetails from './application-form/LoanDetails';
import EmploymentDetails from './application-form/EmploymentDetails';
import SuccessPopup from './application-form/SuccessPopup';

const ApplicationForm: React.FC = () => {
  const {
    formData,
    status,
    showPopup,
    isLoading,
    handleChange,
    handleSubmit,
  } = useApplicationForm();

  return (
    <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg max-w-md mx-auto border border-gray-100">
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6 text-center">Tell us about yourself</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <PersonalInfo formData={formData} handleChange={handleChange} />
        
        <LoanDetails formData={formData} handleChange={handleChange} />
        
        <EmploymentDetails formData={formData} handleChange={handleChange} />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'Sending...' || isLoading}
          className="w-full bg-black text-white font-bold py-3 px-4 rounded-md hover:bg-gray-800 transition duration-300 mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === 'Sending...' || isLoading ? 'Submitting...' : 'Submit Application'}
        </button>

        {/* Status Message Display */}
        {status && !showPopup && (
          <div className={`text-center mt-4 p-2 rounded font-medium ${status.includes('Failed') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
            {status}
          </div>
        )}
      </form>

      <SuccessPopup show={showPopup} />
    </div>
  );
};

export default ApplicationForm;
