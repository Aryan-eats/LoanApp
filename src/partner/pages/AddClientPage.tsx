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
  Save,
  Send,
  FolderOpen,
} from 'lucide-react';
import Tooltip from '../components/Tooltip';
import { getProductsByCategory, type LoanCategory } from '../../data/loanProductsData';
import { useAddClientForm } from '../hooks/useAddClientForm';
import { steps, loanCategories, employmentTypes, indianStates } from '../data/addClientConstants';

export default function AddClientPage() {
  const {
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
    handleSaveLocally,
    handleSubmitToAdmin,
    handleCheckEligibility,
    handleSubmitLead,
    handleViewMyClients,
  } = useAddClientForm();

  const renderInput = (
    label: string,
    field: string,
    type: string = 'text',
    placeholder: string = '',
    icon?: React.ReactNode,
    tooltip?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        <span className="flex items-center gap-1.5">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
        )}
        <input
          type={type}
          value={formData[field as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 bg-slate-900 border text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-500 ${
            errors[field] ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'
          }`}
        />
      </div>
      {errors[field] && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} />
          {errors[field]}
        </p>
      )}
    </div>
  );

  if (showEligibilityOption) {
    const isLocal = saveTarget === 'local';
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center">
          <div className={`w-16 h-16 ${isLocal ? 'bg-slate-800' : 'bg-emerald-500/20'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isLocal ? (
              <Save size={32} className="text-slate-400" />
            ) : (
              <CheckCircle size={32} className="text-emerald-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            {isLocal ? 'Client Saved Locally!' : 'Lead Submitted to Admin!'}
          </h2>
          <p className="text-slate-400 mb-2">
            {formData.fullName}'s details have been {isLocal ? 'saved to your device' : 'submitted for processing'}.
          </p>
          {isLocal && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block mb-6">
              This lead is stored locally on your device. Submit it to admin when you're ready to process it.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={handleCheckEligibility}
              className="flex flex-col items-center gap-2 p-6 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-xl hover:border-indigo-500/40 hover:bg-indigo-500/20 transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard size={24} />
              </div>
              <span className="font-semibold text-slate-200">Check Eligibility</span>
              <span className="text-xs text-slate-400">Soft check - No CIBIL impact</span>
            </button>

            {isLocal ? (
              <button
                onClick={handleViewMyClients}
                className="flex flex-col items-center gap-2 p-6 bg-white/5 border-2 border-white/10 rounded-xl hover:border-white/20 hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 bg-slate-700 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderOpen size={24} />
                </div>
                <span className="font-semibold text-slate-200">View My Clients</span>
                <span className="text-xs text-slate-400">Manage locally saved leads</span>
              </button>
            ) : (
              <button
                onClick={handleSubmitLead}
                className="flex flex-col items-center gap-2 p-6 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowRight size={24} />
                </div>
                <span className="font-semibold text-slate-200">Submit Lead</span>
                <span className="text-xs text-slate-400">Proceed to document upload</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Add New Client</h1>
        <p className="text-slate-400 mt-1">Enter client details to submit a new loan lead</p>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  currentStep === step.id
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : index < currentStepIndex
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
                onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === step.id
                      ? 'bg-indigo-500 text-white'
                      : index < currentStepIndex
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {index < currentStepIndex ? <CheckCircle size={16} /> : step.icon}
                </div>
                <span className="hidden md:block text-sm font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-8 lg:w-16 h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-emerald-500/50' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        {currentStep === 'client' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-indigo-400" size={20} />
              <h2 className="text-lg font-semibold text-slate-100">Client Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {renderInput('Full Name *', 'fullName', 'text', 'Enter client full name', <User size={16} />)}
              {renderInput('Mobile Number *', 'phone', 'tel', '10-digit mobile number', <Phone size={16} />)}
              {renderInput('Email Address', 'email', 'email', 'client@email.com', <Mail size={16} />)}
              {renderInput('Date of Birth *', 'dateOfBirth', 'date', '', <Calendar size={16} />)}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Gender</label>
                <div className="flex gap-3">
                  {['male', 'female', 'other'].map((gender) => (
                    <label
                      key={gender}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all ${
                        formData.gender === gender
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                          : 'border-white/10 hover:border-white/20 bg-slate-900/50 text-slate-300'
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

        {currentStep === 'loan' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-indigo-400" size={20} />
              <h2 className="text-lg font-semibold text-slate-100">Loan Details</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Select Loan Category *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {loanCategories.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedCategory === cat.value
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                        : 'border-white/10 hover:border-white/20 bg-slate-900/50 text-slate-400 hover:bg-white/5'
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
                        handleInputChange('loanType', '');
                      }}
                      className="sr-only"
                    />
                    <span className="text-2xl">{cat.icon}</span>
                    <span className={`text-xs font-medium text-center ${selectedCategory === cat.value ? 'text-indigo-400' : 'text-slate-400'}`}>{cat.label}</span>
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

            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    Select Specific Loan Type *
                    <Tooltip content="Choose the specific loan product within the selected category" />
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={formData.loanType}
                    onChange={(e) => handleInputChange('loanType', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-slate-900 text-slate-100 ${
                      errors.loanType ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="">-- Select loan type --</option>
                    {getProductsByCategory(selectedCategory).map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.icon} {product.shortLabel || product.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {errors.loanType && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.loanType}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    Loan Amount Required *
                    <Tooltip content="Enter the approximate loan amount your client needs" />
                  </span>
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={formData.loanAmount}
                    onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                    placeholder="e.g., 500000"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-900 text-slate-100 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 ${
                      errors.loanAmount ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  />
                </div>
                {formData.loanAmount && (
                  <p className="mt-1 text-xs text-slate-400">
                    ₹{Number(formData.loanAmount).toLocaleString('en-IN')}
                  </p>
                )}
                {errors.loanAmount && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.loanAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Preferred Tenure (Months)
                </label>
                <select
                  value={formData.tenure}
                  onChange={(e) => handleInputChange('tenure', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 text-slate-100 border border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Purpose of Loan
              </label>
              <textarea
                value={formData.loanPurpose}
                onChange={(e) => handleInputChange('loanPurpose', e.target.value)}
                placeholder="Brief description of why the loan is needed..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900 border text-slate-100 border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-500"
              />
            </div>
          </div>
        )}

        {currentStep === 'employment' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="text-indigo-400" size={20} />
              <h2 className="text-lg font-semibold text-slate-100">Employment Details</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Employment Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employmentTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.employmentType === type.value
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/10 hover:border-white/20 bg-slate-900/50 hover:bg-white/5'
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
                      <span className="font-medium text-slate-200">{type.label}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.employmentType && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.employmentType}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Monthly Income *
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                    placeholder="Net monthly income"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-900 border text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 ${
                      errors.monthlyIncome ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  />
                </div>
                {errors.monthlyIncome && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
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
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Work Experience (Years)
                    </label>
                    <select
                      value={formData.workExperience}
                      onChange={(e) => handleInputChange('workExperience', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 text-slate-100 border border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Business Type
                    </label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 text-slate-100 border border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Business Vintage (Years)
                    </label>
                    <select
                      value={formData.businessVintage}
                      onChange={(e) => handleInputChange('businessVintage', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 text-slate-100 border border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select vintage</option>
                      <option value="0-1">Less than 1 year</option>
                      <option value="1-3">1-3 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5+">5+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Annual Turnover
                    </label>
                    <div className="relative">
                      <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        value={formData.annualTurnover}
                        onChange={(e) => handleInputChange('annualTurnover', e.target.value)}
                        placeholder="Approximate annual turnover"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 text-slate-100 border border-white/10 hover:border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentStep === 'address' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-indigo-400" size={20} />
              <h2 className="text-lg font-semibold text-slate-100">Address Details</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Current Address *
              </label>
              <textarea
                value={formData.currentAddress}
                onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                placeholder="House/Flat No., Building, Street, Area..."
                rows={3}
                className={`w-full px-4 py-2.5 bg-slate-900 border text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-500 ${
                  errors.currentAddress ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'
                }`}
              />
              {errors.currentAddress && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.currentAddress}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {renderInput('City *', 'city', 'text', 'City name')}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">State *</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-4 py-2.5 bg-slate-900 border text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.state ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <option value="">Select state</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.state}
                  </p>
                )}
              </div>

              {renderInput('Pincode *', 'pincode', 'text', '6-digit pincode')}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Residence Type</label>
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
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                        : 'border-white/10 hover:border-white/20 bg-slate-900/50 text-slate-300'
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

        {currentStep === 'consent' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-indigo-400" size={20} />
              <h2 className="text-lg font-semibold text-slate-100">Consent & Declaration</h2>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex gap-3">
              <Info className="text-indigo-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-indigo-300">About Credit Check</p>
                <p className="text-sm text-indigo-200/80 mt-1">
                  The eligibility check is a soft inquiry and will NOT affect your client's credit score. 
                  A hard inquiry will only be made when the loan application is formally submitted to a bank.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  formData.consentCredit ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                } ${errors.consentCredit ? 'border-red-500/50 bg-red-500/10' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.consentCredit}
                  onChange={(e) => handleInputChange('consentCredit', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-200">Credit Check Consent *</span>
                  <p className="text-sm text-slate-400 mt-1">
                    I confirm that the client has given consent to check their credit eligibility and 
                    share their information with lending partners for loan processing.
                  </p>
                </div>
              </label>
              {errors.consentCredit && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.consentCredit}
                </p>
              )}

              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  formData.consentContact ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.consentContact}
                  onChange={(e) => handleInputChange('consentContact', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-200">Communication Consent</span>
                  <p className="text-sm text-slate-400 mt-1">
                    The client agrees to receive updates about their loan application via SMS, 
                    email, and phone calls from the platform and lending partners.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  formData.consentTerms ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                } ${errors.consentTerms ? 'border-red-500/50 bg-red-500/10' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.consentTerms}
                  onChange={(e) => handleInputChange('consentTerms', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-200">Terms & Conditions *</span>
                  <p className="text-sm text-slate-400 mt-1">
                    I have read and understood the{' '}
                    <a href="#" className="text-indigo-400 hover:text-indigo-300 hover:underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-indigo-400 hover:text-indigo-300 hover:underline">Privacy Policy</a>. 
                    I confirm that all information provided is accurate.
                  </p>
                </div>
              </label>
              {errors.consentTerms && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.consentTerms}
                </p>
              )}
            </div>
          </div>
        )}

        {submitError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-red-300">Submission Failed</p>
              <p className="text-sm text-red-400/80 mt-1">{submitError}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              currentStepIndex === 0
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveLocally}
                disabled={isSubmitting}
                title="Save to your device only — you control the status"
                className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-slate-300 rounded-lg font-medium hover:bg-white/5 hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                Save Locally
              </button>
              <button
                onClick={handleSubmitToAdmin}
                disabled={isSubmitting}
                title="Submit lead to admin for processing"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit to Admin
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
