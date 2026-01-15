import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Building2,
  IndianRupee,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  ChevronDown,
} from 'lucide-react';
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
import Tooltip from '../components/Tooltip';
import { getProductsByCategory, type LoanCategory } from '../../data/loanProducts';

type Step = 'client' | 'loan' | 'employment' | 'address' | 'consent';

const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'client', label: 'Client Details', icon: <User size={18} /> },
  { id: 'loan', label: 'Loan Details', icon: <CreditCard size={18} /> },
  { id: 'employment', label: 'Employment', icon: <Briefcase size={18} /> },
  { id: 'address', label: 'Address', icon: <MapPin size={18} /> },
  { id: 'consent', label: 'Consent', icon: <CheckCircle size={18} /> },
];

// Main loan categories with icons
const loanCategories: { value: LoanCategory; label: string; icon: React.ReactNode }[] = [
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

const employmentTypes = [
  { value: 'salaried', label: 'Salaried', description: 'Working for a company' },
  { value: 'self_employed', label: 'Self Employed', description: 'Running own business' },
  { value: 'business_owner', label: 'Business Owner', description: 'Company/Firm owner' },
  { value: 'professional', label: 'Professional', description: 'Doctor, CA, Lawyer etc.' },
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
];

export default function AddClientPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEligibilityOption, setShowEligibilityOption] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LoanCategory | ''>('');

  const [formData, setFormData] = useState({
    // Client Details
    fullName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    panNumber: '',
    
    // Loan Details
    loanCategory: '',
    loanType: '',
    loanAmount: '',
    tenure: '',
    loanPurpose: '',
    
    // Employment
    employmentType: '',
    monthlyIncome: '',
    companyName: '',
    designation: '',
    workExperience: '',
    businessType: '',
    businessVintage: '',
    annualTurnover: '',
    
    // Address
    currentAddress: '',
    city: '',
    state: '',
    pincode: '',
    residenceType: '',
    
    // Consent
    consentCredit: false,
    consentContact: false,
    consentTerms: false,
  });

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

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowEligibilityOption(true);
  };

  const handleCheckEligibility = () => {
    navigate('/partner/eligibility', { state: { clientData: formData } });
  };

  const handleSubmitLead = () => {
    navigate('/partner/leads', { state: { newLead: true } });
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // Render form input helper
  const renderInput = (
    label: string,
    field: string,
    type: string = 'text',
    placeholder: string = '',
    icon?: React.ReactNode,
    tooltip?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        <span className="flex items-center gap-1.5">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        )}
        <input
          type={type}
          value={formData[field as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            errors[field] ? 'border-red-300 bg-red-50' : 'border-slate-200'
          }`}
        />
      </div>
      {errors[field] && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {errors[field]}
        </p>
      )}
    </div>
  );

  if (showEligibilityOption) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Client Added Successfully!</h2>
          <p className="text-slate-500 mb-8">
            {formData.fullName}'s details have been saved. What would you like to do next?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={handleCheckEligibility}
              className="flex flex-col items-center gap-2 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard size={24} />
              </div>
              <span className="font-semibold text-slate-800">Check Eligibility</span>
              <span className="text-xs text-slate-500">Soft check - No CIBIL impact</span>
            </button>

            <button
              onClick={handleSubmitLead}
              className="flex flex-col items-center gap-2 p-6 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-100 transition-all group"
            >
              <div className="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight size={24} />
              </div>
              <span className="font-semibold text-slate-800">Submit Lead</span>
              <span className="text-xs text-slate-500">Proceed to document upload</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Add New Client</h1>
        <p className="text-slate-500 mt-1">Enter client details to submit a new loan lead</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  currentStep === step.id
                    ? 'bg-blue-50 text-blue-700'
                    : index < currentStepIndex
                    ? 'text-green-600'
                    : 'text-slate-400'
                }`}
                onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : index < currentStepIndex
                      ? 'bg-green-100 text-green-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {index < currentStepIndex ? <CheckCircle size={16} /> : step.icon}
                </div>
                <span className="hidden md:block text-sm font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-8 lg:w-16 h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-green-300' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* Step 1: Client Details */}
        {currentStep === 'client' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">Client Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {renderInput('Full Name *', 'fullName', 'text', 'Enter client full name', <User size={16} />)}
              {renderInput('Mobile Number *', 'phone', 'tel', '10-digit mobile number', <Phone size={16} />)}
              {renderInput('Email Address', 'email', 'email', 'client@email.com', <Mail size={16} />)}
              {renderInput('Date of Birth *', 'dateOfBirth', 'date', '', <Calendar size={16} />)}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                <div className="flex gap-3">
                  {['male', 'female', 'other'].map((gender) => (
                    <label
                      key={gender}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all ${
                        formData.gender === gender
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={formData.gender === gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="sr-only"
                      />
                      <span className="capitalize text-sm font-medium">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>

              {renderInput(
                'PAN Number',
                'panNumber',
                'text',
                'ABCDE1234F',
                <CreditCard size={16} />,
                'PAN is required for loan amounts above ₹50,000'
              )}
            </div>
          </div>
        )}

        {/* Step 2: Loan Details */}
        {currentStep === 'loan' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">Loan Details</h2>
            </div>

            {/* Loan Category Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Loan Category *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {loanCategories.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedCategory === cat.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="loanCategory"
                      value={cat.value}
                      checked={selectedCategory === cat.value}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value as LoanCategory);
                        handleInputChange('loanCategory', e.target.value);
                        handleInputChange('loanType', ''); // Reset sub-type when category changes
                      }}
                      className="sr-only"
                    />
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium text-slate-700 text-center">{cat.label}</span>
                  </label>
                ))}
              </div>
              {errors.loanCategory && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.loanCategory}
                </p>
              )}
            </div>

            {/* Loan Sub-Type Dropdown - Only shown when category is selected */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    Select Specific Loan Type *
                    <Tooltip content="Choose the specific loan product within the selected category" />
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={formData.loanType}
                    onChange={(e) => handleInputChange('loanType', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white ${
                      errors.loanType ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  >
                    <option value="">-- Select loan type --</option>
                    {getProductsByCategory(selectedCategory).map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.icon} {product.shortLabel || product.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {errors.loanType && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.loanType}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    Loan Amount Required *
                    <Tooltip content="Enter the approximate loan amount your client needs" />
                  </span>
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={formData.loanAmount}
                    onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                    placeholder="e.g., 500000"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.loanAmount ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                </div>
                {formData.loanAmount && (
                  <p className="mt-1 text-xs text-slate-500">
                    ₹{Number(formData.loanAmount).toLocaleString('en-IN')}
                  </p>
                )}
                {errors.loanAmount && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.loanAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Preferred Tenure (Months)
                </label>
                <select
                  value={formData.tenure}
                  onChange={(e) => handleInputChange('tenure', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select tenure</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="48">48 Months (4 Years)</option>
                  <option value="60">60 Months (5 Years)</option>
                  <option value="84">84 Months (7 Years)</option>
                  <option value="120">120 Months (10 Years)</option>
                  <option value="180">180 Months (15 Years)</option>
                  <option value="240">240 Months (20 Years)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Purpose of Loan
              </label>
              <textarea
                value={formData.loanPurpose}
                onChange={(e) => handleInputChange('loanPurpose', e.target.value)}
                placeholder="Brief description of why the loan is needed..."
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Employment */}
        {currentStep === 'employment' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">Employment Details</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Employment Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employmentTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.employmentType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="employmentType"
                      value={type.value}
                      checked={formData.employmentType === type.value}
                      onChange={(e) => handleInputChange('employmentType', e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium text-slate-800">{type.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.employmentType && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.employmentType}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Monthly Income *
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                    placeholder="Net monthly income"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.monthlyIncome ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.monthlyIncome && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.monthlyIncome}
                  </p>
                )}
              </div>

              {formData.employmentType === 'salaried' && (
                <>
                  {renderInput('Company Name *', 'companyName', 'text', 'Current employer name', <Building2 size={16} />)}
                  {renderInput('Designation', 'designation', 'text', 'Job title')}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Work Experience (Years)
                    </label>
                    <select
                      value={formData.workExperience}
                      onChange={(e) => handleInputChange('workExperience', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select experience</option>
                      <option value="0-1">Less than 1 year</option>
                      <option value="1-2">1-2 years</option>
                      <option value="2-5">2-5 years</option>
                      <option value="5-10">5-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>
                </>
              )}

              {(formData.employmentType === 'self_employed' || formData.employmentType === 'business_owner') && (
                <>
                  {renderInput('Business Name', 'companyName', 'text', 'Business/Firm name', <Building2 size={16} />)}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Business Type
                    </label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="retail">Retail/Trading</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="services">Services</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Business Vintage (Years)
                    </label>
                    <select
                      value={formData.businessVintage}
                      onChange={(e) => handleInputChange('businessVintage', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vintage</option>
                      <option value="0-1">Less than 1 year</option>
                      <option value="1-3">1-3 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5+">5+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Annual Turnover
                    </label>
                    <div className="relative">
                      <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={formData.annualTurnover}
                        onChange={(e) => handleInputChange('annualTurnover', e.target.value)}
                        placeholder="Approximate annual turnover"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Address */}
        {currentStep === 'address' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">Address Details</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Current Address *
              </label>
              <textarea
                value={formData.currentAddress}
                onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                placeholder="House/Flat No., Building, Street, Area..."
                rows={3}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.currentAddress ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.currentAddress && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.currentAddress}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {renderInput('City *', 'city', 'text', 'City name')}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State *</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.state ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select state</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.state}
                  </p>
                )}
              </div>

              {renderInput('Pincode *', 'pincode', 'text', '6-digit pincode')}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Residence Type</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'owned', label: 'Owned' },
                  { value: 'rented', label: 'Rented' },
                  { value: 'family', label: 'Living with Family' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`px-4 py-2.5 border rounded-lg cursor-pointer transition-all ${
                      formData.residenceType === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="residenceType"
                      value={option.value}
                      checked={formData.residenceType === option.value}
                      onChange={(e) => handleInputChange('residenceType', e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Consent */}
        {currentStep === 'consent' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-800">Consent & Declaration</h2>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-blue-800">About Credit Check</p>
                <p className="text-sm text-blue-700 mt-1">
                  The eligibility check is a soft inquiry and will NOT affect your client's credit score. 
                  A hard inquiry will only be made when the loan application is formally submitted to a bank.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  formData.consentCredit ? 'border-green-500 bg-green-50' : 'border-slate-200'
                } ${errors.consentCredit ? 'border-red-300 bg-red-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.consentCredit}
                  onChange={(e) => handleInputChange('consentCredit', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-800">Credit Check Consent *</span>
                  <p className="text-sm text-slate-500 mt-1">
                    I confirm that the client has given consent to check their credit eligibility and 
                    share their information with lending partners for loan processing.
                  </p>
                </div>
              </label>
              {errors.consentCredit && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.consentCredit}
                </p>
              )}

              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  formData.consentContact ? 'border-green-500 bg-green-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.consentContact}
                  onChange={(e) => handleInputChange('consentContact', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-800">Communication Consent</span>
                  <p className="text-sm text-slate-500 mt-1">
                    The client agrees to receive updates about their loan application via SMS, 
                    email, and phone calls from the platform and lending partners.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  formData.consentTerms ? 'border-green-500 bg-green-50' : 'border-slate-200'
                } ${errors.consentTerms ? 'border-red-300 bg-red-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.consentTerms}
                  onChange={(e) => handleInputChange('consentTerms', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-800">Terms & Conditions *</span>
                  <p className="text-sm text-slate-500 mt-1">
                    I have read and understood the{' '}
                    <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>. 
                    I confirm that all information provided is accurate.
                  </p>
                </div>
              </label>
              {errors.consentTerms && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.consentTerms}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              currentStepIndex === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Save Client
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
