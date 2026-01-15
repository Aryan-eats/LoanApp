import { useState } from 'react';
import {
  User,
  Building2,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Edit2,
  Camera,
  Copy,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { partnerProfile } from '../data/placeholderData';
import type { KYCStatus } from '../types/partner-dashboard';

const kycStatusConfig: Record<KYCStatus, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  pending: { icon: <Clock size={16} />, label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100' },
  submitted: { icon: <FileText size={16} />, label: 'Submitted', color: 'text-blue-600', bg: 'bg-blue-100' },
  verified: { icon: <CheckCircle size={16} />, label: 'Verified', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { icon: <XCircle size={16} />, label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
};

const partnerTypeBadges: Record<string, { label: string; color: string }> = {
  freelancer: { label: 'Freelancer', color: 'bg-purple-100 text-purple-700' },
  car_dealer: { label: 'Car Dealer', color: 'bg-amber-100 text-amber-700' },
  property_dealer: { label: 'Property Dealer', color: 'bg-emerald-100 text-emerald-700' },
  builder: { label: 'Builder', color: 'bg-blue-100 text-blue-700' },
  sub_dsa: { label: 'Sub DSA', color: 'bg-slate-100 text-slate-700' },
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [editData, setEditData] = useState({ ...partnerProfile });
  
  const kycConfig = kycStatusConfig[partnerProfile.kycStatus];
  const partnerBadge = partnerTypeBadges[partnerProfile.partnerType];

  const maskNumber = (num: string, visibleChars: number = 4): string => {
    if (num.length <= visibleChars) return num;
    return '•'.repeat(num.length - visibleChars) + num.slice(-visibleChars);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profile & KYC</h1>
          <p className="text-slate-500 mt-1">Manage your profile and verification details</p>
        </div>
      </div>

      {/* KYC Status Banner */}
      {partnerProfile.kycStatus !== 'verified' && (
        <div
          className={`rounded-xl p-4 border ${
            partnerProfile.kycStatus === 'rejected'
              ? 'bg-red-50 border-red-200'
              : partnerProfile.kycStatus === 'submitted'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={
                partnerProfile.kycStatus === 'rejected'
                  ? 'text-red-600'
                  : partnerProfile.kycStatus === 'submitted'
                  ? 'text-blue-600'
                  : 'text-amber-600'
              }
              size={20}
            />
            <div>
              <h3
                className={`font-medium ${
                  partnerProfile.kycStatus === 'rejected'
                    ? 'text-red-800'
                    : partnerProfile.kycStatus === 'submitted'
                    ? 'text-blue-800'
                    : 'text-amber-800'
                }`}
              >
                {partnerProfile.kycStatus === 'rejected'
                  ? 'KYC Verification Rejected'
                  : partnerProfile.kycStatus === 'submitted'
                  ? 'KYC Verification In Progress'
                  : 'Complete Your KYC'}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  partnerProfile.kycStatus === 'rejected'
                    ? 'text-red-700'
                    : partnerProfile.kycStatus === 'submitted'
                    ? 'text-blue-700'
                    : 'text-amber-700'
                }`}
              >
                {partnerProfile.kycStatus === 'rejected'
                  ? 'Your KYC documents were rejected. Please re-upload correct documents.'
                  : partnerProfile.kycStatus === 'submitted'
                  ? 'Your documents are being verified. This usually takes 24-48 hours.'
                  : 'Complete your KYC to start submitting leads and earning commissions.'}
              </p>
              {partnerProfile.kycStatus !== 'submitted' && (
                <button className="mt-3 px-4 py-2 bg-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-shadow">
                  {partnerProfile.kycStatus === 'rejected' ? 'Re-upload Documents' : 'Complete KYC'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Avatar Section */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {partnerProfile.fullName.charAt(0)}
                  </span>
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
                  <Camera size={14} className="text-slate-600" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mt-4">{partnerProfile.fullName}</h2>
              <p className="text-sm text-slate-500">{partnerProfile.email}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${partnerBadge?.color}`}>
                  {partnerBadge?.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${kycConfig.bg} ${kycConfig.color}`}>
                  {kycConfig.icon}
                  KYC {kycConfig.label}
                </span>
              </div>
            </div>

            {/* Partner Code */}
            <div className="p-4 bg-slate-50 rounded-lg mb-4">
              <p className="text-xs text-slate-500 mb-1">Partner Code</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-slate-800">{partnerProfile.partnerCode}</span>
                <button
                  onClick={() => handleCopy(partnerProfile.partnerCode)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Member Since</span>
                <span className="font-medium text-slate-700">{partnerProfile.joinedDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Leads</span>
                <span className="font-medium text-slate-700">156</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Success Rate</span>
                <span className="font-medium text-green-600">57%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="text-blue-600" size={20} />
                <h3 className="font-semibold text-slate-800">Personal Information</h3>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 size={14} />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.fullName}
                      onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-slate-800">{partnerProfile.fullName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-slate-800">{partnerProfile.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-slate-800">{partnerProfile.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Business Name</label>
                  <p className="text-slate-800">{partnerProfile.businessName || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
                  <p className="text-slate-800">
                    {partnerProfile.city}, {partnerProfile.state} - {partnerProfile.pincode}
                  </p>
                </div>
              </div>
              {isEditing && (
                <div className="mt-6 flex items-center gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* KYC Documents */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              <h3 className="font-semibold text-slate-800">KYC Documents</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PAN */}
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">PAN Number</p>
                      <p className="text-lg font-mono font-semibold text-slate-800 mt-1">
                        {partnerProfile.panNumber}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <CheckCircle size={12} />
                      Verified
                    </span>
                  </div>
                </div>

                {/* Aadhaar */}
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Aadhaar Number</p>
                      <p className="text-lg font-mono font-semibold text-slate-800 mt-1">
                        {maskNumber(partnerProfile.aadhaarNumber.replace(/\s/g, ''), 4)}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <CheckCircle size={12} />
                      Verified
                    </span>
                  </div>
                </div>

                {/* GST */}
                {partnerProfile.gstNumber && (
                  <div className="p-4 border border-slate-200 rounded-lg md:col-span-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">GST Number</p>
                        <p className="text-lg font-mono font-semibold text-slate-800 mt-1">
                          {partnerProfile.gstNumber}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <CheckCircle size={12} />
                        Verified
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-600" size={20} />
                <h3 className="font-semibold text-slate-800">Bank Account for Payouts</h3>
              </div>
              {partnerProfile.bankDetails.isVerified && (
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle size={12} />
                  Verified
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Account Holder Name</p>
                  <p className="text-slate-800">{partnerProfile.bankDetails.accountHolderName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Bank Name</p>
                  <p className="text-slate-800">{partnerProfile.bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-mono">
                      {showAccountNumber
                        ? partnerProfile.bankDetails.accountNumber
                        : maskNumber(partnerProfile.bankDetails.accountNumber, 4)}
                    </p>
                    <button
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">IFSC Code</p>
                  <p className="text-slate-800 font-mono">{partnerProfile.bankDetails.ifscCode}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Edit2 size={14} />
                  Update Bank Details
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              <h3 className="font-semibold text-slate-800">Security</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">Password</p>
                  <p className="text-sm text-slate-500">Last changed 30 days ago</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  Change Password
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-500">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
