import React from "react";
import PageTransition from "../components/shared/PageTransition";
import EmiCalculator from "../components/EmiCalculator";

const Calculator: React.FC = () => {
  return (
    <PageTransition className="bg-[#F8FAFC] min-h-screen pb-24">
      {/* Premium Header Segment */}
      <div className="bg-linear-to-r from-black to-gray-800 pt-28 pb-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
             Smart EMI <br className="hidden md:block" />
             <span className="text-gray-300 font-serif italic font-medium tracking-normal">Planner</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-4">
             Determine your exact monthly commitment before you apply. Adjust the variables below to find the perfect loan structure for your budget.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
         <EmiCalculator />
      </div>
    </PageTransition>
  );
};

export default Calculator;
