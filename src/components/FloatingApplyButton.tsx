import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const FloatingApplyButton: React.FC = () => {
  return (
    <Link
      to="/apply"
      className="fixed bottom-8 right-8 bg-gradient-to-r from-gray-800 to-black text-white font-bold py-3 px-6 rounded-full shadow-2xl hover:from-gray-700 hover:to-gray-900 transition duration-300 ease-in-out transform hover:scale-110 z-50 animate-pulse flex items-center gap-2"
      style={{ animationDuration: '2s' }}
    >
      Apply Now
      <ArrowUpRight size={20} />
    </Link>
  );
};

export default FloatingApplyButton;
