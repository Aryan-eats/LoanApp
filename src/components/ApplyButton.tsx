import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ApplyButtonProps {
  category: string;
}

const ApplyButton: React.FC<ApplyButtonProps> = ({ category }) => {
  return (
    <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto">
      <Link
        to="/apply"
        state={{ loanType: category }}
        className="group flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#0A2540] text-white hover:bg-black rounded-lg text-sm font-bold text-center transition-all duration-300 shadow-sm hover:shadow-md"
      >
        Check Eligibility
        <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
      </Link>
    </div>
  );
};

export default ApplyButton;
