import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-black mb-4">Contact Us</h1>
      <p className="text-gray-700 mb-8">
        Get in touch with our support team for any queries. Please Call between <span className="text-blue-600">(9am-9pm)</span> for quick assistance.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Email</h2>
          <p className="text-gray-600">contact@example.com</p>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Mobile</h2>
          <p className="text-gray-600">+1 (555) 000-0000</p>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Office No.</h2>
          <p className="text-gray-600">+1 (555) 123-4567</p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
