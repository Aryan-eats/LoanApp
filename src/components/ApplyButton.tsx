import React from "react";
import { Link } from "react-router-dom";

interface ApplyButtonProps {
  category: string;
}

const ApplyButton: React.FC<ApplyButtonProps> = ({ category }) => {
  return (
    <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
      <Link
        to="/apply"
        state={{ loanType: category }}
        className="block w-full py-2 px-4 border border-black text-white bg-black rounded-md text-sm font-semibold text-center hover:bg-gray-800 transition-colors"
      >
        Apply
      </Link>
    </div>
  );
};

export default ApplyButton;
