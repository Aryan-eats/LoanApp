import React from 'react';
import { Link } from 'react-router-dom';

const Banner: React.FC = () => {
  return (
    <div className="relative bg-linear-to-r from-black to-gray-800 h-screen max-h-[600px] flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
          Financial Solutions for Your Dreams
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-8">
          We provide fast, secure, and tailored loan options to help you achieve your personal and business goals.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/services" className="bg-white text-black hover:bg-gray-100 font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105">
            Explore Categories
          </Link>
          <Link to="/onboarding" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black font-bold py-3 px-8 rounded-full transition duration-300 animate-pulse-glow transform hover:scale-105">
            Become a Partner
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Banner;
