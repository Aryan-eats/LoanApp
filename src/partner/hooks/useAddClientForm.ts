import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeadsStore } from '../../stores/leadsStore';
import { useLocalLeadsStore } from '../../stores/localLeadsStore';
import type { LoanCategory } from '../../data/loanProductsData';
import type { Step } from '../data/addClientConstants';
import { steps } from '../data/addClientConstants';

export type SaveTarget = 'local' | 'admin';

export interface AddClientFormData {
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  panNumber: string;
  loanCategory: string;
  loanType: string;
  loanAmount: string;
  tenure: string;
  loanPurpose: string;
  employmentType: string;
  monthlyIncome: string;
  companyName: string;
  designation: string;
  workExperience: string;
  businessType: string;
  businessVintage: string;
  annualTurnover: string;
  currentAddress: string;
  city: string;
  state: string;
  pincode: string;
  residenceType: string;
  consentCredit: boolean;
  consentContact: boolean;
  consentTerms: boolean;
}

const initialFormData: AddClientFormData = {
  fullName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  panNumber: '',
  loanCategory: '',
  loanType: '',
  loanAmount: '',
  tenure: '',
  loanPurpose: '',
  employmentType: '',
  monthlyIncome: '',
  companyName: '',
  designation: '',
  workExperience: '',
  businessType: '',
  businessVintage: '',
  annualTurnover: '',
  currentAddress: '',
  city: '',
  state: '',
  pincode: '',
  residenceType: '',
  consentCredit: false,
  consentContact: false,
  consentTerms: false,
};

export function useAddClientForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEligibilityOption, setShowEligibilityOption] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SaveTarget>('admin');
  const [selectedCategory, setSelectedCategory] = useState<LoanCategory | ''>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { createLead } = useLeadsStore();
  const { addLead: addLocalLead } = useLocalLeadsStore();

  const [formData, setFormData] = useState<AddClientFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'client':
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Enter valid 10-digit mobile number';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Enter valid email address';
        }
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        break;

      case 'loan':
        if (!formData.loanCategory) newErrors.loanCategory = 'Please select a loan category';
        if (!formData.loanType) newErrors.loanType = 'Please select a loan type';
        if (!formData.loanAmount) newErrors.loanAmount = 'Loan amount is required';
        else if (Number(formData.loanAmount) < 50000) newErrors.loanAmount = 'Minimum loan amount is ₹50,000';
        break;

      case 'employment':
        if (!formData.employmentType) newErrors.employmentType = 'Employment type is required';
        if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Monthly income is required';
        if (formData.employmentType === 'salaried' && !formData.companyName) {
          newErrors.companyName = 'Company name is required';
        }
        break;

      case 'address':
        if (!formData.currentAddress.trim()) newErrors.currentAddress = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state) newErrors.state = 'State is required';
        if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
        else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Enter valid 6-digit pincode';
        break;

      case 'consent':
        if (!formData.consentCredit) newErrors.consentCredit = 'Credit check consent is required';
        if (!formData.consentTerms) newErrors.consentTerms = 'Please accept terms and conditions';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  /** Save client details to the database (partner_data table) */
  const handleSaveLocally = async () => {
    if (!validateStep()) return;
    setSaveTarget('local');
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addLocalLead({
        localStatus: 'new',
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        panNumber: formData.panNumber,
        employmentType: formData.employmentType,
        monthlyIncome: formData.monthlyIncome ? Number(formData.monthlyIncome) : undefined,
        companyName: formData.companyName,
        designation: formData.designation,
        workExperience: formData.workExperience,
        city: formData.city,
        pincode: formData.pincode,
        state: formData.state,
        currentAddress: formData.currentAddress,
        residenceType: formData.residenceType,
        loanCategory: formData.loanCategory,
        loanType: formData.loanType || formData.loanCategory || 'personal_loan',
        loanAmount: Number(formData.loanAmount),
        tenure: formData.tenure ? Number(formData.tenure) : undefined,
        loanPurpose: formData.loanPurpose,
      });

      setShowEligibilityOption(true);
    } catch (err) {
      setSubmitError('Failed to save client. Please try again.');
      console.error('handleSaveLocally error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Submit lead to the admin backend */
  const handleSubmitToAdmin = async () => {
    if (!validateStep()) return;
    setSaveTarget('admin');
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const lead = await createLead({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email || 'not-provided@placeholder.com',
        city: formData.city,
        pincode: formData.pincode,
        employmentType: formData.employmentType,
        monthlyIncome: formData.monthlyIncome ? Number(formData.monthlyIncome) : undefined,
        companyName: formData.companyName,
        loanType: formData.loanType || formData.loanCategory || 'personal_loan',
        loanAmount: Number(formData.loanAmount),
        tenure: formData.tenure ? Number(formData.tenure) : undefined,
      }, true);

      if (lead) {
        setShowEligibilityOption(true);
      } else {
        setSubmitError('Failed to submit lead. Please try again.');
      }
    } catch (error) {
      console.error('Submit lead error:', error);
      const { parseApiError } = await import('../../utils/parseApiError');
      setSubmitError(parseApiError(error, 'Failed to submit lead. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Keep backward-compat alias so nothing else breaks */
  const handleSubmit = handleSubmitToAdmin;

  const handleCheckEligibility = () => {
    navigate('/partner/credit-check', { state: { clientData: formData } });
  };

  const handleSubmitLead = () => {
    navigate('/partner/leads', { state: { newLead: true } });
  };

  const handleViewMyClients = () => {
    navigate('/partner/leads');
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return {
    currentStep,
    setCurrentStep,
    currentStepIndex,
    isSubmitting,
    showEligibilityOption,
    saveTarget,
    selectedCategory,
    setSelectedCategory,
    submitError,
    formData,
    errors,
    handleInputChange,
    handleNext,
    handleBack,
    handleSubmit,
    handleSaveLocally,
    handleSubmitToAdmin,
    handleCheckEligibility,
    handleSubmitLead,
    handleViewMyClients,
  };
}
