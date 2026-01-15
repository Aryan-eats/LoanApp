import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { serviceCategories } from '../data/loanCategories';
import { useLeadsStore } from '../stores/leadsStore';

const ApplicationForm: React.FC = () => {
  const location = useLocation();
  const addLead = useLeadsStore((state) => state.addLead);
  
  // 1. State for Form Data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    loanType: '',
    loanSubType: '',
    loanAmount: '',
    salaryType: '',
  });

  // 2. State for Submission Status (Success/Error feedback)
  const [status, setStatus] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  // 3. Effect to pre-fill loan type from navigation state
  useEffect(() => {
    if (location.state?.loanType) {
      setFormData(prev => ({
        ...prev,
        loanType: location.state.loanType
      }));
    }
  }, [location.state]);

  // 4. Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'loanType') {
      setFormData((prev) => ({
        ...prev,
        loanType: value,
        loanSubType: '', // Reset sub-type when loan type changes
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // 5. Handle Form Submission - Add to Leads Store
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');

    try {
      // Add lead to the store (will appear in Admin > Leads)
      addLead({
        customerName: formData.name,
        customerPhone: formData.phone,
        city: formData.city,
        loanType: formData.loanType,
        loanSubType: formData.loanSubType,
        loanAmount: Number(formData.loanAmount),
        salaryType: formData.salaryType,
      });

      // Show success message
      setStatus('Submitted Successfully!');
      setShowPopup(true);
      
      // Clear form fields
      setFormData({
        name: '',
        phone: '',
        city: '',
        loanType: '',
        loanSubType: '',
        loanAmount: '',
        salaryType: '',
      });

    } catch (error) {
      console.error("Error:", error);
      setStatus('Failed to submit. Please try again.');
    }
  };

  return (
    <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg max-w-md mx-auto border border-gray-100">
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6 text-center">Tell us about yourself</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Loan Sub-type */}
        {formData.loanType && (
          <div>
            <label htmlFor="loanSubType" className="block text-sm font-medium text-gray-700 mb-1">
              Loan Sub-type
            </label>
            <select
              id="loanSubType"
              name="loanSubType"
              value={formData.loanSubType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors bg-white"
            >
              <option value="" disabled>Select Sub-type</option>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-colors"
            placeholder="Enter amount"
          />
        </div>

        {/* Salary Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Salary Type
          </label>
          <div className="flex space-x-4 mt-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="salaryType"
                value="Salaried"
                checked={formData.salaryType === 'Salaried'}
                onChange={handleChange}
                className="form-radio text-black focus:ring-black"
                required
              />
              <span className="ml-2 text-gray-700">Salaried</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="salaryType"
                value="Self-employed"
                checked={formData.salaryType === 'Self-employed'}
                onChange={handleChange}
                className="form-radio text-black focus:ring-black"
                required
              />
              <span className="ml-2 text-gray-700">Self-employed</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'Sending...'}
          className="w-full bg-black text-white font-bold py-3 px-4 rounded-md hover:bg-gray-800 transition duration-300 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'Sending...' ? 'Submitting...' : 'Submit Application'}
        </button>

        {/* Status Message Display */}
        {status && !showPopup && (
          <div className={`text-center mt-4 p-2 rounded font-medium ${status.includes('Failed') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
            {status}
          </div>
        )}

      </form>

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center mx-4 transform transition-all scale-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h3>
            <p className="text-gray-600 mb-6">Our team will contact you in 24-48 hours.</p>
            <button 
              onClick={() => setShowPopup(false)}
              className="w-full bg-black text-white font-bold py-3 px-4 rounded-md hover:bg-gray-800 transition duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationForm;