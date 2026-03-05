import React from 'react';
import { ShieldAlert, MapPin, Mail, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#051320] text-gray-300 py-16 w-full shrink-0 border-t border-gray-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-gray-800 pb-12">
          
          {/* Brand & About */}
          <div className="md:col-span-1">
            <img src="/logo1.png" alt="GPS India Financial Services" className="h-16 w-auto -ml-3 mb-6 invert opacity-90" />
            <p className="text-gray-400 leading-relaxed mb-6">
              Empowering your financial journey with transparent, fast, and reliable loan solutions tailored for every Indian.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Products</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Personal Loans</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Business Loans</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Home Loans</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Loan Against Property</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Reach Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <span className="text-gray-400">123 Financial District, Phase 2, New Delhi, India 110001</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="text-gray-400">1800-123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="text-gray-400">support@gpsindia.financial</span>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Regulatory</h4>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <ShieldAlert className="w-6 h-6 text-emerald-500 mb-3" />
              <p className="text-xs text-gray-400 leading-relaxed">
                GPS India is an authorized Direct Selling Agent (DSA). We do not lend directly but facilitate loans through our RBI-registered partner Banks and NBFCs.
              </p>
            </div>
          </div>

        </div>

        {/* RBI Warning */}
        <div className="mb-8 p-4 border border-gray-800 rounded-lg bg-[#081828]">
           <p className="text-xs text-gray-500 text-center leading-relaxed">
             <strong className="text-gray-400">RBI Caution:</strong> Never share your OTP, PIN, or banking passwords with anyone. GPS India representatives will never ask for upfront processing fees via personal UPI or bank accounts. All loans are subject to credit approval by the respective lending partner.
           </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
           <p>© {new Date().getFullYear()} GPS India Financial Services. All rights reserved.</p>
           <div className="flex gap-6 mt-4 md:mt-0">
             <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
             <a href="#" className="hover:text-white transition-colors">Grievance Redressal</a>
           </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
