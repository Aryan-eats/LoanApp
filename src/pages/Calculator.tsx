import React from "react";
import EmiCalculator from "../components/EmiCalculator";

const Calculator: React.FC = () => {
  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <p className="text-gray-600 max-w-2xl mx-auto">
        Plan your finances with our easy-to-use EMI calculator. Enter your loan
        details below to get an instant estimate of your monthly payments.
      </p>

      <EmiCalculator />
    </div>
  );
};

export default Calculator;
