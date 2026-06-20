import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PrefetchLink from './shared/PrefetchLink';

const Banner: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative bg-linear-to-r from-black to-gray-800 h-screen max-h-[600px] flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 mt-16 overflow-hidden">
      <div className="max-w-3xl mx-auto z-10">
        <motion.h1 
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.4, ease: "easeOut" }}
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6"
        >
          Financial Solutions for Your Dreams
        </motion.h1>
        <motion.p 
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.4, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.1 }}
          className="text-lg sm:text-xl text-gray-300 mb-8"
        >
          We provide fast, secure, and tailored loan options to help you achieve your personal and business goals.
        </motion.p>
        <motion.div 
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.4, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.18 }}
          className="flex justify-center gap-4"
        >
          <PrefetchLink to="/services" className="bg-white text-black hover:bg-gray-100 font-bold py-3 px-8 rounded-full shadow-lg transition duration-200 sm:transform sm:hover:scale-105">
            Explore Categories
          </PrefetchLink>
          <PrefetchLink to="/onboarding" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black font-bold py-3 px-8 rounded-full transition duration-200 animate-pulse-glow sm:transform sm:hover:scale-105">
            Become a Partner
          </PrefetchLink>
        </motion.div>
      </div>
    </div>
  );
};

export default Banner;
