import React from 'react';
import type { ApplicationFormData } from '../../hooks/useApplicationForm';

interface PersonalInfoProps {
  formData: ApplicationFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({ formData, handleChange }) => {
  return (
    <>
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors"
          placeholder="Enter your full name"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors"
          placeholder="Enter your phone number"
        />
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          City
        </label>
        <input
          type="text"
          id="city"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors"
          placeholder="Enter your city"
        />
      </div>
    </>
  );
};

export default PersonalInfo;
