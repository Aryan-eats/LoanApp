import React from 'react';
import { CreditCard } from 'lucide-react';
import {
  Business,
  Home,
  AccountBalance,
  DriveEta,
  Stars,
  School,
  Grass,
  Flag,
  ShoppingCart,
  Construction,
  FlashOn,
} from '@mui/icons-material';
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
  { value: 'personal', label: 'Personal Loan', icon: <CreditCard fontSize="small" /> },
  { value: 'business', label: 'Business Loan', icon: <Business fontSize="small" /> },
  { value: 'home', label: 'Home Loan', icon: <Home fontSize="small" /> },
  { value: 'property', label: 'Property Loan', icon: <AccountBalance fontSize="small" /> },
  { value: 'vehicle', label: 'Vehicle Loan', icon: <DriveEta fontSize="small" /> },
  { value: 'gold_securities', label: 'Gold & Securities', icon: <Stars fontSize="small" /> },
  { value: 'education', label: 'Education Loan', icon: <School fontSize="small" /> },
  { value: 'agriculture', label: 'Agriculture Loan', icon: <Grass fontSize="small" /> },
  { value: 'government', label: 'Govt. Schemes', icon: <Flag fontSize="small" /> },
  { value: 'corporate', label: 'Corporate Loan', icon: <AccountBalance fontSize="small" /> },
  { value: 'consumer', label: 'Consumer Loan', icon: <ShoppingCart fontSize="small" /> },
  { value: 'short_term', label: 'Short-Term Loan', icon: <FlashOn fontSize="small" /> },
  { value: 'real_estate', label: 'Real Estate', icon: <Construction fontSize="small" /> },
  { value: 'specialized', label: 'Specialized', icon: <FlashOn fontSize="small" /> },
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
