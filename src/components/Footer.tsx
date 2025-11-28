import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white py-10 w-full shrink-0 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-left">
          <div className="mb-6 md:mb-0 flex flex-col items-start">
            <img src="/logo1.png" alt="Logo" className="h-24 w-auto -ml-4" />
            <p className="text-gray-400 text-sm">© 2025 Loan App. All rights reserved.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm font-medium">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Compliance</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
