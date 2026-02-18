import React from "react";
import { Clock } from "lucide-react";

interface BankCardProps {
  id: string;
  bankName: string;
  bankLogo: string;
  loanAmount: string; // e.g., "₹1,71,87,527"
  roi: string; // e.g., "7.2%*"
  emi: string; // e.g., "₹1,16,667"
  tenure: string; // e.g., "30 years"
  processingFeeText?: string; // e.g., "Rs. 10000 + GST"
  onApply?: () => void;
}

const BankCard: React.FC<BankCardProps> = ({
  bankName,
  bankLogo,
  loanAmount,
  roi,
  emi,
  tenure,
  processingFeeText = "Rs. 10000 + GST",
  onApply,
}) => {
  return (
    <div className="bg-[#F8F9FD] rounded-2xl p-6 shadow-sm border border-gray-100 max-w-xl w-full font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden p-1">
            <img
              src={bankLogo}
              alt={`${bankName} logo`}
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-gray-600 font-medium text-lg tracking-wide uppercase">
            {bankName}
          </h3>
        </div>
        <div className="bg-[#F3EBFD] text-gray-800 px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 text-gray-600" />
          <span>{tenure}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center sm:text-left">
          <p className="text-sm text-black font-medium mb-1">Loan Amount</p>
          <p className="text-xl font-semibold text-gray-800 tracking-tight">
            {loanAmount}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-black font-medium mb-1">ROI</p>
          <p className="text-xl font-semibold text-gray-800">{roi}</p>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-sm text-black font-medium mb-1">EMI</p>
          <p className="text-xl font-semibold text-gray-800">{emi}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 w-full mb-6 relative"></div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="bg-[#EFF4FF] w-full sm:w-auto px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm font-medium text-gray-800 min-w-[200px]">
          <span>{processingFeeText}</span>
        </div>

        <button
          onClick={onApply}
          className="w-full sm:w-auto bg-[#48348C] hover:bg-[#3a2a70] text-white font-medium py-3 px-8 rounded-full transition-colors duration-200 shadow-md text-nowrap"
        >
          Apply Now
        </button>
      </div>
    </div>
  );
};

export default BankCard;
