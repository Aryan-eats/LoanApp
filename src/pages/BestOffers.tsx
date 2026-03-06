import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import BankCard from "../components/BankCard";
import { matchOffers, updatePreferredBank, type MatchedOffer } from "../api/leadsApi";

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface LocationState {
  loanType?: string;
  loanSubType?: string;
  loanAmount?: number;
  leadId?: string;
  leadToken?: string;
  matchedOffers?: MatchedOffer[];
}

const BestOffers = () => {
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const userLoanType = state?.loanType || "";
  const userLoanSubType = state?.loanSubType || "";
  const userLoanAmount = state?.loanAmount || 0;
  const leadId = state?.leadId || "";
  const leadToken = state?.leadToken || "";
  const [offers, setOffers] = useState<MatchedOffer[]>(state?.matchedOffers ?? []);
  const [isLoading, setIsLoading] = useState(!state?.matchedOffers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.matchedOffers) {
      setOffers(state.matchedOffers);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!userLoanType && !userLoanSubType) {
      setOffers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    const loadOffers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await matchOffers({
          loanType: userLoanType || undefined,
          loanSubType: userLoanSubType || undefined,
          loanAmount: userLoanAmount > 0 ? userLoanAmount : undefined,
        });

        if (!isActive) {
          return;
        }

        if (response.success && response.data) {
          setOffers(response.data.offers);
          return;
        }

        setOffers([]);
        setError(response.message ?? 'Unable to load offers right now.');
      } catch {
        if (!isActive) {
          return;
        }

        setOffers([]);
        setError('Unable to load offers right now.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadOffers();

    return () => {
      isActive = false;
    };
  }, [state?.matchedOffers, userLoanAmount, userLoanSubType, userLoanType]);

  const handleApply = async (bankName: string) => {
    // If we have a lead ID, update the preferred bank
    if (leadId && leadToken) {
      try {
        await updatePreferredBank(leadId, bankName, leadToken);
        alert(`Your preference for ${bankName} has been recorded. Our team will contact you soon!`);
      } catch (error) {
        console.error('Failed to update preferred bank:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to record your preference for ${bankName} — please try again. (${message})`);
      }
    } else {
      alert(`Application started for ${bankName}. Our team will contact you soon!`);
    }
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

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Loading matched offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">
              {error ?? 'No offers available for your selected loan type and amount. Please try a different combination.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
            {offers.map((bank) => {
              const tenureText = bank.maxTenure >= 12
                ? `${Math.round(bank.maxTenure / 12)} years`
                : `${bank.maxTenure} months`;

              return (
                <BankCard
                  key={bank.id}
                  id={bank.id}
                  bankName={bank.name}
                  bankLogo={bank.logo || "https://via.placeholder.com/100?text=Bank"}
                  loanAmount={formatCurrency(bank.displayAmount)}
                  roi={`${bank.interestRateMin}%`}
                  emi={formatCurrency(bank.estimatedEmi ?? 0)}
                  tenure={tenureText}
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
