import React, { useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { buildLoanTypeLabels } from '../../../data/loanProductsData';
import { createAdminLead } from '../../../api/leadsApi';
import { parseApiError } from '../../../utils/parseApiError';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  loanType: string;
  loanAmount: string;
  city: string;
  pincode: string;
  preferredBank: string;
};

const initialFormState: FormState = {
  fullName: '',
  phone: '',
  email: '',
  loanType: '',
  loanAmount: '',
  city: '',
  pincode: '',
  preferredBank: '',
};

const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loanTypeOptions = useMemo(() => {
    const labels = buildLoanTypeLabels(true);
    return Object.entries(labels).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required';

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-()\s]{7,16}$/.test(formData.phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!formData.loanType) nextErrors.loanType = 'Loan type is required';

    const loanAmount = Number(formData.loanAmount);

    if (!formData.loanAmount.trim()) {
      nextErrors.loanAmount = 'Loan amount is required';
    } else if (Number.isNaN(loanAmount)) {
      nextErrors.loanAmount = 'Enter a valid loan amount';
    } else if (loanAmount <= 0) {
      nextErrors.loanAmount = 'Loan amount must be greater than 0';
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      nextErrors.pincode = 'Pincode must be 6 digits';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await createAdminLead({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        loanType: formData.loanType,
        loanAmount: Number(formData.loanAmount),
        city: formData.city.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        preferredBank: formData.preferredBank.trim() || undefined,
      });

      if (!response.success || !response.data?.lead) {
        throw new Error(response.message || 'Failed to create lead');
      }

      await onCreated();
      setFormData(initialFormState);
      setErrors({});
      onClose();
    } catch (error) {
      setSubmitError(parseApiError(error, 'Failed to create lead.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Lead</h2>
              <p className="text-sm text-gray-500">Create a new lead from the admin dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close add lead modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="e.g. Priya Sharma"
            />
            {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="e.g. 9876543210"
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="e.g. name@example.com"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.loanType}
                onChange={(e) => handleChange('loanType', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.loanType ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <option value="">Select loan type</option>
                {loanTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.loanType && <p className="text-xs text-red-600 mt-1">{errors.loanType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.loanAmount}
                onChange={(e) => handleChange('loanAmount', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.loanAmount ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="e.g. 500000"
                min="0"
              />
              {errors.loanAmount && <p className="text-xs text-red-600 mt-1">{errors.loanAmount}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.pincode ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="e.g. 400001"
              />
              {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Bank</label>
            <input
              type="text"
              value={formData.preferredBank}
              onChange={(e) => handleChange('preferredBank', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g. HDFC Bank"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLeadModal;
