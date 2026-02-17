import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLeadsStore } from '../stores/leadsStore';
import { consolidatedBanks } from '../data/mockBanks';
import type { LoanType } from '../partner/types/partner-dashboard';

// Mapping from form loan type titles to bank loan type codes
// TODO: Move this to a shared constant or backend configuration
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
  "General": ["personal_loan"] // Fallback
};

// Helper to check if matching bank offers exist
const hasMatchingOffers = (loanType: string, loanAmount: number): boolean => {
  const mappedTypes = loanTypeMapping[loanType] || [];
  if (mappedTypes.length === 0) return false;
  
  return consolidatedBanks.some(bank => {
    if (bank.status !== 'active') return false;
    const supportsLoanType = bank.supportedLoanTypes.some(t => mappedTypes.includes(t));
    if (!supportsLoanType) return false;
    if (loanAmount < bank.minAmount || loanAmount > bank.maxAmount) return false;
    return true;
  });
};

export interface ApplicationFormData {
  name: string;
  phone: string;
  city: string;
  loanType: string;
  loanSubType: string;
  loanAmount: string;
  salaryType: string;
}

export const useApplicationForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createLead, isLoading } = useLeadsStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent navigate after unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
  
  // State for Form Data
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: '',
    phone: '',
    city: '',
    loanType: '',
    loanSubType: '',
    loanAmount: '',
    salaryType: '',
  });

  // State for Submission Status
  const [status, setStatus] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  // Effect to pre-fill loan type from navigation state
  useEffect(() => {
    if (location.state?.loanType) {
      setFormData(prev => ({
        ...prev,
        loanType: location.state.loanType
      }));
    }
  }, [location.state]);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'loanType') {
      setFormData((prev) => ({
        ...prev,
        loanType: value,
        loanSubType: '', // Reset sub-type when loan type changes
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');

    try {
      // Create lead via API
      const result = await createLead({
        fullName: formData.name,
        phone: formData.phone,
        email: '', // Email is optional in the form
        city: formData.city,
        // Use loanSubType if available, otherwise fallback to loanType (Category)
        // This makes subType optional effectively
        loanType: formData.loanSubType || formData.loanType, 
        loanAmount: Number(formData.loanAmount),
        employmentType: formData.salaryType === 'Salaried' ? 'salaried' : 'self_employed',
      }, false); // Public website form uses /leads endpoint (not partner)

      if (result) {
        // Show success message
        setStatus('Submitted Successfully!');
        setShowPopup(true);
        
        // Store form data before clearing
        const submittedLoanType = formData.loanType;
        const submittedLoanSubType = formData.loanSubType;
        const submittedLoanAmount = Number(formData.loanAmount);
        const leadId = result.id;
        
        // Clear form fields
        setFormData({
          name: '',
          phone: '',
          city: '',
          loanType: '',
          loanSubType: '',
          loanAmount: '',
          salaryType: '',
        });

        // Only redirect if there are matching bank offers
        // Note: Logic here uses Category (submittedLoanType) for matching if subType is missing
        // This assumes hasMatchingOffers logic can handle Categories. 
        // Based on existing code, loanTypeMapping keys ARE categories. 
        // So passing submittedLoanType (the Category) covers it.
        if (hasMatchingOffers(submittedLoanType, submittedLoanAmount)) {
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            navigate('/best-offers', {
              state: {
                loanType: submittedLoanType,
                loanSubType: submittedLoanSubType,
                loanAmount: submittedLoanAmount,
                leadId: leadId,
              }
            });
          }, 1500);
        }
      } else {
        setStatus('Failed to submit. Please try again.');
      }

    } catch (error) {
      console.error("Error:", error);
      setStatus('Failed to submit. Please try again.');
    }
  };

  return {
    formData,
    status,
    showPopup,
    isLoading,
    handleChange,
    handleSubmit,
  };
};
