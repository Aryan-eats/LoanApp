// TO BE IMPORTED FROM /ADMIN/BANKS

import React from 'react';
import { Building, BadgeCheck, Landmark, Briefcase, CreditCard, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const partners = [
  { name: "HDFC Bank", icon: <Building className="w-5 h-5 text-blue-800" /> },
  { name: "ICICI Bank", icon: <BadgeCheck className="w-5 h-5 text-red-600" /> },
  { name: "Axis Bank", icon: <Landmark className="w-5 h-5 text-rose-800" /> },
  { name: "Kotak Mahindra", icon: <Briefcase className="w-5 h-5 text-red-700" /> },
  { name: "SBI", icon: <Building className="w-5 h-5 text-blue-500" /> },
  { name: "Bank of Baroda", icon: <Landmark className="w-5 h-5 text-orange-600" /> },
  { name: "Punjab National Bank", icon: <Shield className="w-5 h-5 text-yellow-600" /> },
  { name: "IndusInd Bank", icon: <Building className="w-5 h-5 text-red-900" /> },
  { name: "Yes Bank", icon: <CreditCard className="w-5 h-5 text-blue-700" /> },
  { name: "IDFC FIRST Bank", icon: <BadgeCheck className="w-5 h-5 text-rose-900" /> },
  { name: "Bajaj Finserv", icon: <Briefcase className="w-5 h-5 text-blue-900" /> },
  { name: "Tata Capital", icon: <Building className="w-5 h-5 text-zinc-800" /> },
  { name: "Aditya Birla", icon: <Landmark className="w-5 h-5 text-red-600" /> },
  { name: "Muthoot Finance", icon: <Shield className="w-5 h-5 text-red-700" /> },
  { name: "L&T Finance", icon: <Building className="w-5 h-5 text-yellow-500" /> },
  { name: "Cholamandalam", icon: <Briefcase className="w-5 h-5 text-blue-800" /> },
  { name: "Mahindra Finance", icon: <BadgeCheck className="w-5 h-5 text-red-600" /> },
  { name: "Piramal Finance", icon: <Landmark className="w-5 h-5 text-orange-500" /> },
  { name: "Hero Fincorp", icon: <Building className="w-5 h-5 text-red-500" /> },
  { name: "Shriram Finance", icon: <Shield className="w-5 h-5 text-amber-700" /> },
];

const TrustStrip: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="bg-white border-b border-gray-200 py-6 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <p className="text-center text-sm font-semibold text-gray-400 tracking-widest uppercase mb-6 relative z-10 bg-white inline-block px-4 left-1/2 -translate-x-1/2">
          Authorized DSA Partner For
        </p>
        
        {/* Gradient Masks for smooth fade on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-linear-to-r from-white to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-linear-to-l from-white to-transparent z-10"></div>
        
        <div className="flex overflow-hidden">
          <div className="flex w-max animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused] opacity-80 hover:opacity-100 transition-opacity duration-300 will-change-transform">
            {/* First Set of Partners */}
            {partners.map((partner, index) => (
              <div key={`partner-1-${index}`} className="flex items-center gap-2 mx-6 md:mx-10 whitespace-nowrap">
                {partner.icon}
                <span className="text-xl font-bold font-sans text-gray-800 tracking-tight">{partner.name}</span>
              </div>
            ))}
            {/* Duplicate Set of Partners for Seamless Looping */}
            {partners.map((partner, index) => (
              <div key={`partner-2-${index}`} className="flex items-center gap-2 mx-6 md:mx-10 whitespace-nowrap">
                {partner.icon}
                <span className="text-xl font-bold font-sans text-gray-800 tracking-tight">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TrustStrip;
