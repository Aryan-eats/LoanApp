import React from 'react';
import {
  CreditCard,
  BriefcaseBusiness,
  Home,
  Landmark,
  Car,
  Stars,
  GraduationCap,
  Sprout,
  Flag,
  ShoppingCart,
  Construction,
  Zap,
} from 'lucide-react';
import type { LoanCategory } from '../../data/loanProductsData';

export type Step = 'client' | 'loan' | 'employment' | 'address' | 'consent';

export const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'client', label: 'Client Details', icon: <CreditCard size={18} /> },
  { id: 'loan', label: 'Loan Details', icon: <CreditCard size={18} /> },
  { id: 'employment', label: 'Employment', icon: <CreditCard size={18} /> },
  { id: 'address', label: 'Address', icon: <CreditCard size={18} /> },
  { id: 'consent', label: 'Consent', icon: <CreditCard size={18} /> },
];

export const loanCategories: { value: LoanCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'personal', label: 'Personal Loan', icon: <CreditCard size={16} /> },
  { value: 'business', label: 'Business Loan', icon: <BriefcaseBusiness size={16} /> },
  { value: 'home', label: 'Home Loan', icon: <Home size={16} /> },
  { value: 'property', label: 'Property Loan', icon: <Landmark size={16} /> },
  { value: 'vehicle', label: 'Vehicle Loan', icon: <Car size={16} /> },
  { value: 'gold_securities', label: 'Gold & Securities', icon: <Stars size={16} /> },
  { value: 'education', label: 'Education Loan', icon: <GraduationCap size={16} /> },
  { value: 'agriculture', label: 'Agriculture Loan', icon: <Sprout size={16} /> },
  { value: 'government', label: 'Govt. Schemes', icon: <Flag size={16} /> },
  { value: 'corporate', label: 'Corporate Loan', icon: <Landmark size={16} /> },
  { value: 'consumer', label: 'Consumer Loan', icon: <ShoppingCart size={16} /> },
  { value: 'short_term', label: 'Short-Term Loan', icon: <Zap size={16} /> },
  { value: 'real_estate', label: 'Real Estate', icon: <Construction size={16} /> },
  { value: 'specialized', label: 'Specialized', icon: <Zap size={16} /> },
];

export const employmentTypes = [
  { value: 'salaried', label: 'Salaried', description: 'Working for a company' },
  { value: 'self_employed', label: 'Self Employed', description: 'Running own business' },
  { value: 'business_owner', label: 'Business Owner', description: 'Company/Firm owner' },
  { value: 'professional', label: 'Professional', description: 'Doctor, CA, Lawyer etc.' },
];

export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
];
