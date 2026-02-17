
import { useLocation } from "react-router-dom";
import BankCard from "../components/BankCard";
import { consolidatedBanks } from "../data/mockBanks";
import { updatePreferredBank } from "../api/leadsApi";
import type { LoanType } from "../partner/types/partner-dashboard";

// Mapping from form loan type titles to bank loan type codes
const loanTypeMapping: Record<string, LoanType[]> = {
  "Personal Loans": ["personal_loan"],
  "Business Loans": ["business_loan", "working_capital_loan", "invoice_financing"],
  "Home Loans": ["home_loan", "pmay_home_loan"],
  "Property-Backed Loans": ["lap", "lrd"],
  "Vehicle Loans": ["car_loan", "used_car_loan", "two_wheeler_loan", "commercial_vehicle_loan", "tractor_loan"],
  "Gold & Securities Loans": ["gold_loan", "loan_against_fd"],
  "Education Loans": ["education_loan"],
  "Corporate / Large Loans": ["business_loan", "working_capital_loan"],
  "Government Scheme Loans": ["mudra_shishu", "mudra_kishor", "mudra_tarun", "pmay_home_loan", "kcc"],
  "Agriculture Loans": ["kcc", "tractor_loan"],
  "Consumer & Retail Loans": ["consumer_durable_loan", "emi_card_loan"],
  "Salary & Short-Term Loans": ["personal_loan"],
  "Real Estate & Builder Loans": ["home_loan", "lap"],
  "Specialized Loans": ["ev_loan", "solar_panel_loan"],
};

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper to calculate EMI
const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): string => {
  const r = annualRate / 12 / 100;
  if (r === 0) return formatCurrency(Math.round(principal / tenureMonths));
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return formatCurrency(Math.round(emi));
};

interface LocationState {
  loanType?: string;
  loanSubType?: string;
  loanAmount?: number;
  leadId?: string;
}

const BestOffers = () => {
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const userLoanType = state?.loanType || "";
  const userLoanAmount = state?.loanAmount || 0;
  const leadId = state?.leadId || "";
  
  // Get the mapped loan type codes for the selected loan category
  const mappedLoanTypes = userLoanType ? loanTypeMapping[userLoanType] || [] : [];
  
  // Filter active banks that support the user's loan type
  const filteredBanks = consolidatedBanks.filter(bank => {
    // Must be active
    if (bank.status !== 'active') return false;
    
    // If user selected a loan type, filter by it
    if (mappedLoanTypes.length > 0) {
      const bankSupportsLoanType = bank.supportedLoanTypes.some(
        bankLoanType => mappedLoanTypes.includes(bankLoanType)
      );
      if (!bankSupportsLoanType) return false;
      
      // Also check if user's loan amount is within bank's range
      if (userLoanAmount > 0) {
        if (userLoanAmount < bank.minAmount || userLoanAmount > bank.maxAmount) {
          return false;
        }
      }
    }
    
    return true;
  });

  const handleApply = async (bankName: string) => {
    // If we have a lead ID, update the preferred bank
    if (leadId) {
      try {
        await updatePreferredBank(leadId, bankName);
        alert(`Your preference for ${bankName} has been recorded. Our team will contact you soon!`);
      } catch (error) {
        console.error('Failed to update preferred bank:', error);
        alert(`Application started for ${bankName}. Our team will contact you soon!`);
      }
    } else {
      alert(`Application started for ${bankName}. Our team will contact you soon!`);
    }
  };

  // Display amount: use user's requested amount if available, otherwise bank's max
  const getDisplayAmount = (bankMaxAmount: number) => {
    return userLoanAmount > 0 ? userLoanAmount : bankMaxAmount;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Best Loan Offers for You
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            {userLoanType 
              ? `Showing offers for ${userLoanType}${userLoanAmount > 0 ? ` - ${formatCurrency(userLoanAmount)}` : ''}`
              : 'Compare and choose from the best banks with the lowest interest rates.'}
          </p>
        </div>

        {filteredBanks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">
              No offers available for your selected loan type and amount. Please try a different combination.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
            {filteredBanks.map((bank) => {
              const displayAmount = getDisplayAmount(bank.maxAmount);
              return (
                <BankCard
                  key={bank.id}
                  id={bank.id}
                  bankName={bank.name}
                  bankLogo={bank.logo || "https://via.placeholder.com/100?text=Bank"}
                  loanAmount={formatCurrency(displayAmount)}
                  roi={`${bank.interestRateMin}%`}
                  emi={calculateEMI(displayAmount, bank.interestRateMin, bank.maxTenure)}
                  tenure={`${Math.round(bank.maxTenure / 12)} years`}
                  processingFeeText={bank.processingFee}
                  onApply={() => handleApply(bank.name)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BestOffers;
