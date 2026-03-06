import React, { useState, useRef, useEffect } from 'react';
import type { PartnerFormData } from '../../types/partner';
import { useOTPVerification } from '../../hooks/useOTPVerification';

interface StepBasicIdentityProps {
  formData: PartnerFormData;
  updateFormData: (fields: Partial<PartnerFormData>) => void;
  onNext: () => void;
}

const partnerTypes = [
  { value: '', label: 'Select Partner Type' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'used-car-dealer', label: 'Used Car Dealer' },
  { value: 'property-dealer', label: 'Property Dealer' },
  { value: 'builder', label: 'Builder' },
  { value: 'sub-dsa', label: 'Sub-DSA' },
];

const StepBasicIdentity: React.FC<StepBasicIdentityProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // MSG91 REST API integration (replaces widget)
  const { sendOTP, verifyOTP, resendOTP } = useOTPVerification({
    onSuccess: (data: { verificationToken?: string }) => {
      updateFormData({
        otpVerified: true,
        phoneVerificationToken: data.verificationToken || 'verified',
      });
      setIsVerifying(false);
      setErrors((prev) => ({ ...prev, mobileNumber: '' }));
    },
    onError: (error: string) => {
      setIsVerifying(false);
      setErrors((prev) => ({
        ...prev,
        mobileNumber: error || 'Verification failed. Please try again.',
      }));
    },
  });

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'fullName':
        return value.trim().length < 2 ? 'Please enter your full name' : '';
      case 'mobileNumber':
        return !/^[6-9]\d{9}$/.test(value) ? 'Enter a valid 10-digit mobile number' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address' : '';
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain a lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain an uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain a number';
        if (!/(?=.*[@$!%*?&])/.test(value)) return 'Password must contain a special character (@$!%*?&)';
        return '';
      case 'confirmPassword':
        return value !== formData.password ? 'Passwords do not match' : '';
      case 'partnerType':
        return !value ? 'Please select a partner type' : '';
      case 'city':
        return value.trim().length < 2 ? 'Please enter your city' : '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleVerifyMobile = async () => {
    if (isVerifying || formData.otpVerified || otpSent) return;

    const mobileError = validateField('mobileNumber', formData.mobileNumber);
    if (mobileError) {
      setErrors((prev) => ({ ...prev, mobileNumber: mobileError }));
      return;
    }

    setIsVerifying(true);
    setErrors((prev) => ({ ...prev, mobileNumber: '' }));

    try {
      const sent = await sendOTP(formData.mobileNumber);
      if (sent) {
        setOtpSent(true);
        setResendTimer(30);
        // Auto-focus first OTP input
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        setErrors((prev) => ({ ...prev, mobileNumber: prev.mobileNumber || 'Failed to send OTP. Please try again.' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, mobileNumber: 'Failed to send OTP. Please try again.' }));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;

    setIsVerifying(true);
    setErrors((prev) => ({ ...prev, mobileNumber: '' }));
    try {
      const verified = await verifyOTP(formData.mobileNumber, otpString);
      if (!verified) {
        // onError callback may have already set the real error message
        setErrors((prev) => ({
          ...prev,
          mobileNumber: prev.mobileNumber || 'Invalid OTP. Please try again.',
        }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, mobileNumber: 'Verification failed. Please try again.' }));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      const sent = await resendOTP(formData.mobileNumber);
      if (sent) {
        setResendTimer(30);
        setOtp(['', '', '', '', '', '']);
        setErrors((prev) => ({ ...prev, mobileNumber: '' }));
      } else {
        // onError callback may have already set the real error message
        setErrors((prev) => ({
          ...prev,
          mobileNumber: prev.mobileNumber || 'Failed to resend OTP. Please try again.',
        }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, mobileNumber: 'Failed to resend OTP. Please try again.' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    newErrors.fullName = validateField('fullName', formData.fullName);
    newErrors.mobileNumber = validateField('mobileNumber', formData.mobileNumber);
    newErrors.email = validateField('email', formData.email);
    newErrors.password = validateField('password', formData.password);
    newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);
    newErrors.partnerType = validateField('partnerType', formData.partnerType);
    newErrors.city = validateField('city', formData.city);

    setErrors(newErrors);

    // Check if any errors exist
    const hasErrors = Object.values(newErrors).some((error) => error !== '');
    if (!hasErrors) {
      if (!formData.otpVerified) {
        setErrors((prev) => ({ ...prev, mobileNumber: 'Please verify your mobile number.' }));
        return;
      }
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
        <p className="text-sm text-gray-500 mt-1">This will only take 30 seconds</p>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
            errors.fullName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your full name"
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
        )}
      </div>

      {/* Mobile Number with MSG91 Verification */}
      <div>
        <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">+91</span>
            <input
              type="tel"
              id="mobileNumber"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              disabled={formData.otpVerified || otpSent}
              className={`w-full pl-12 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                errors.mobileNumber ? 'border-red-500' : 'border-gray-300'
              } ${formData.otpVerified || otpSent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="10-digit mobile number"
            />
          </div>
          {!otpSent && !formData.otpVerified && (
            <button
              type="button"
              onClick={handleVerifyMobile}
              disabled={isVerifying}
              className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isVerifying ? 'Sending...' : 'Verify Mobile'}
            </button>
          )}
          {formData.otpVerified && (
            <span className="px-4 py-2.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg whitespace-nowrap flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified ✓
            </span>
          )}
        </div>

        {/* Inline OTP Input */}
        {otpSent && !formData.otpVerified && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  aria-label={`OTP digit ${index + 1} of 6`}
                  className="w-10 h-10 text-center border border-gray-300 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              ))}
              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={otp.some((d) => !d) || isVerifying}
                className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-green-600">OTP sent to +91 {formData.mobileNumber}</p>
              {resendTimer > 0 ? (
                <span className="text-sm text-gray-500">Retry in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {errors.mobileNumber && (
          <p className="mt-1 text-sm text-red-500">{errors.mobileNumber}</p>
        )}

        {formData.otpVerified && (
          <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified successfully
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="your.email@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Create a strong password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-500">{errors.password}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Must be 8+ characters with uppercase, lowercase, number, and special character
        </p>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Re-enter your password"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Partner Type */}
      <div>
        <label htmlFor="partnerType" className="block text-sm font-medium text-gray-700 mb-1">
          Partner Type <span className="text-red-500">*</span>
        </label>
        <select
          id="partnerType"
          name="partnerType"
          value={formData.partnerType}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
            errors.partnerType ? 'border-red-500' : 'border-gray-300'
          } ${!formData.partnerType ? 'text-gray-400' : ''}`}
        >
          {partnerTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.partnerType && (
          <p className="mt-1 text-sm text-red-500">{errors.partnerType}</p>
        )}
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          City / Area of Operation <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="city"
          name="city"
          value={formData.city}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
            errors.city ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your city"
        />
        {errors.city && (
          <p className="mt-1 text-sm text-red-500">{errors.city}</p>
        )}
      </div>

      {/* Privacy Note */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
        <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-gray-500">
          Your information is secure and will only be used for partner onboarding and communication purposes.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2"
      >
        Continue
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
};

export default StepBasicIdentity;
