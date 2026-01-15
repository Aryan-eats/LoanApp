export interface PartnerFormData {
  // Step 1: Basic Identity
  fullName: string;
  mobileNumber: string;
  email: string;
  partnerType: string;
  city: string;
  otpVerified: boolean;

  // Step 2: Business Details
  businessName: string;
  businessAddress: string;
  yearsInOperation: string;
  panNumber: string;
  gstNumber: string;
  hasExperience: string;
  expectedLeads: string;

  // Step 3: Payout Info
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;

  // Step 4: Consent
  consentDataShare: boolean;
  consentCommission: boolean;
  declarationNotEmployed: boolean;
  consentPrivacyPolicy: boolean;
}

export const initialFormData: PartnerFormData = {
  fullName: '',
  mobileNumber: '',
  email: '',
  partnerType: '',
  city: '',
  otpVerified: false,
  businessName: '',
  businessAddress: '',
  yearsInOperation: '',
  panNumber: '',
  gstNumber: '',
  hasExperience: '',
  expectedLeads: '',
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  consentDataShare: false,
  consentCommission: false,
  declarationNotEmployed: false,
  consentPrivacyPolicy: false,
};
