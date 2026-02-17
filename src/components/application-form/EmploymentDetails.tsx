import React from 'react';
import type { ApplicationFormData } from '../../hooks/useApplicationForm';

interface EmploymentDetailsProps {
  formData: ApplicationFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EmploymentDetails: React.FC<EmploymentDetailsProps> = ({ formData, handleChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Salary Type
      </label>
      <div className="flex space-x-4 mt-2">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            name="salaryType"
            value="Salaried"
            checked={formData.salaryType === 'Salaried'}
            onChange={handleChange}
            className="form-radio text-black focus:ring-black w-4 h-4"
            required
          />
          <span className="ml-2 text-gray-700">Salaried</span>
        </label>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            name="salaryType"
            value="Self-employed"
            checked={formData.salaryType === 'Self-employed'}
            onChange={handleChange}
            className="form-radio text-black focus:ring-black w-4 h-4"
            required
          />
          <span className="ml-2 text-gray-700">Self-employed</span>
        </label>
      </div>
    </div>
  );
};

export default EmploymentDetails;
