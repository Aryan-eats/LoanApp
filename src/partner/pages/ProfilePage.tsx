import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { usePartnerProfileStore } from '../../stores/partnerProfileStore';
import { useLeadsStore } from '../../stores/leadsStore';
import type { KYCStatus, PartnerProfile } from '../types/partner-dashboard';

const kycStatusConfig: Record<KYCStatus, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  pending: { icon: <Clock size={16} />, label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20' },
  submitted: { icon: <FileText size={16} />, label: 'Submitted', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border border-indigo-500/20' },
  verified: { icon: <CheckCircle size={16} />, label: 'Verified', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
  rejected: { icon: <XCircle size={16} />, label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20' },
};

const partnerTypeBadges: Record<string, { label: string; color: string }> = {
  freelancer: { label: 'Freelancer', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  car_dealer: { label: 'Car Dealer', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  property_dealer: { label: 'Property Dealer', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  builder: { label: 'Builder', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  sub_dsa: { label: 'Sub DSA', color: 'bg-slate-500/10 text-slate-300 border border-slate-500/20' },
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [editData, setEditData] = useState<PartnerProfile | null>(null);
  
  const { user } = useAuthStore();
  const { partnerInfo, isLoading: profileLoading, fetchProfile } = usePartnerProfileStore();
  const { leads, fetchLeads } = useLeadsStore();

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      fetchLeads();
    }
  }, [user?.id, fetchProfile, fetchLeads]);

  const partnerProfile = partnerInfo?.profile ?? null;
  const isLoading = profileLoading && !partnerProfile;


  
  const totalLeads = leads.length;
  const approvedLeads = leads.filter(l => l.status === 'approved' || l.status === 'disbursed').length;
  const successRate = totalLeads > 0 ? Math.round((approvedLeads / totalLeads) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!partnerProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-slate-400">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-600" />
          <p>Unable to load profile. Please try again.</p>
        </div>
      </div>
    );
  }
  
  const kycConfig = kycStatusConfig[partnerProfile.kycStatus];
  const partnerBadge = partnerTypeBadges[partnerProfile.partnerType];

  const maskNumber = (num: string, visibleChars: number = 4): string => {
    if (num.length <= visibleChars) return num;
    return '•'.repeat(num.length - visibleChars) + num.slice(-visibleChars);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Profile & KYC</h1>
          <p className="text-slate-400 mt-1">Manage your profile and verification details</p>
        </div>
      </div>

      {partnerProfile.kycStatus !== 'verified' && (
        <div
          className={`rounded-xl p-4 border ${
            partnerProfile.kycStatus === 'rejected'
              ? 'bg-red-500/10 border-red-500/20'
              : partnerProfile.kycStatus === 'submitted'
              ? 'bg-indigo-500/10 border-indigo-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={
                partnerProfile.kycStatus === 'rejected'
                  ? 'text-red-400'
                  : partnerProfile.kycStatus === 'submitted'
                  ? 'text-indigo-400'
                  : 'text-amber-400'
              }
              size={20}
            />
            <div>
              <h3
                className={`font-medium ${
                  partnerProfile.kycStatus === 'rejected'
                    ? 'text-red-300'
                    : partnerProfile.kycStatus === 'submitted'
                    ? 'text-indigo-300'
                    : 'text-amber-300'
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
                    ? 'text-red-200/80'
                    : partnerProfile.kycStatus === 'submitted'
                    ? 'text-indigo-200/80'
                    : 'text-amber-200/80'
                }`}
              >
                {partnerProfile.kycStatus === 'rejected'
                  ? 'Your KYC documents were rejected. Please re-upload correct documents.'
                  : partnerProfile.kycStatus === 'submitted'
                  ? 'Your documents are being verified. This usually takes 24-48 hours.'
                  : 'Complete your KYC to start submitting leads and earning commissions.'}
              </p>
              {partnerProfile.kycStatus !== 'submitted' && (
                <button className="mt-3 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors border border-white/10">
                  {partnerProfile.kycStatus === 'rejected' ? 'Re-upload Documents' : 'Complete KYC'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white text-3xl font-bold">
                    {partnerProfile.fullName.charAt(0)}
                  </span>
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-700 transition-colors">
                  <Camera size={14} className="text-slate-300" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mt-4">{partnerProfile.fullName}</h2>
              <p className="text-sm text-slate-400">{partnerProfile.email}</p>
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

            <div className="p-4 bg-slate-800/50 rounded-lg mb-4 border border-white/5">
              <p className="text-xs text-slate-400 mb-1">Partner Code</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-slate-200">{partnerProfile.partnerCode}</span>
                <button
                  onClick={() => handleCopy(partnerProfile.partnerCode)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Member Since</span>
                <span className="font-medium text-slate-200">{partnerProfile.joinedDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Leads</span>
                <span className="font-medium text-slate-200">{totalLeads}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Success Rate</span>
                <span className="font-medium text-emerald-400">{successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="text-indigo-400" size={20} />
                <h3 className="font-semibold text-slate-100">Personal Information</h3>
              </div>
              <button
                onClick={() => {
                  if (!isEditing && partnerProfile) {
                    setEditData(partnerProfile);
                  }
                  setIsEditing(!isEditing);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/20"
              >
                <Edit2 size={14} />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  {isEditing && editData ? (
                    <input
                      type="text"
                      value={editData.fullName}
                      onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-slate-200">{partnerProfile.fullName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  {isEditing && editData ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-slate-200">{partnerProfile.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
                  {isEditing && editData ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-slate-200">{partnerProfile.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Business Name</label>
                  <p className="text-slate-200">{partnerProfile.businessName || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Address</label>
                  <p className="text-slate-200">
                    {partnerProfile.city}, {partnerProfile.state} - {partnerProfile.pincode}
                  </p>
                </div>
              </div>
              {isEditing && (
                <div className="mt-6 flex items-center gap-3">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors">
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
              <Shield className="text-indigo-400" size={20} />
              <h3 className="font-semibold text-slate-100">KYC Verification</h3>
            </div>
            <div className="p-6">
              {partnerProfile.kycStatus === 'verified' ? (
                <div className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <CheckCircle size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-300">KYC Verified</h4>
                    <p className="text-sm text-emerald-200/80 mt-1">
                      Your identity has been successfully verified. You have full access to submit leads, view bank offers, and earn commissions.
                    </p>
                  </div>
                </div>
              ) : partnerProfile.kycStatus === 'submitted' ? (
                <div className="flex items-start gap-4 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0 border border-indigo-500/30">
                    <Clock size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-300">Verification In Progress</h4>
                    <p className="text-sm text-indigo-200/80 mt-1">
                      Your KYC is being reviewed by our team. This typically takes 24–48 hours. We'll notify you once it's done.
                    </p>
                  </div>
                </div>
              ) : partnerProfile.kycStatus === 'rejected' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center shrink-0 border border-red-500/30">
                      <XCircle size={24} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-300">Verification Rejected</h4>
                      <p className="text-sm text-red-200/80 mt-1">
                        Your KYC could not be verified. Please retry with accurate information to regain full portal access.
                      </p>
                      <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500 transition-colors">
                        Retry Verification
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start gap-4 p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 border border-amber-500/30">
                      <AlertCircle size={24} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-300">KYC Not Completed</h4>
                      <p className="text-sm text-amber-200/80 mt-1">
                        Complete your KYC to unlock full portal access — submit leads, view bank offers, access loan information, and receive commissions.
                      </p>
                      <button className="mt-3 px-4 py-2 bg-amber-600 text-slate-950 rounded-lg text-sm font-medium hover:bg-amber-500 transition-colors">
                        Start KYC Verification
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-1">
                    {['Submit & track leads', 'Access bank offers', 'View loan documents', 'Receive commissions'].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-600 shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="text-indigo-400" size={20} />
                <h3 className="font-semibold text-slate-100">Bank Account for Payouts</h3>
              </div>
              {partnerProfile.bankDetails.isVerified && (
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1 border border-emerald-500/20">
                  <CheckCircle size={12} />
                  Verified
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Account Holder Name</p>
                  <p className="text-slate-200">{partnerProfile.bankDetails.accountHolderName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Bank Name</p>
                  <p className="text-slate-200">{partnerProfile.bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-200 font-mono">
                      {showAccountNumber
                        ? partnerProfile.bankDetails.accountNumber
                        : maskNumber(partnerProfile.bankDetails.accountNumber, 4)}
                    </p>
                    <button
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">IFSC Code</p>
                  <p className="text-slate-200 font-mono">{partnerProfile.bankDetails.ifscCode}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                  <Edit2 size={14} />
                  Update Bank Details
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
              <Shield className="text-indigo-400" size={20} />
              <h3 className="font-semibold text-slate-100">Security</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-white/5">
                <div>
                  <p className="font-medium text-slate-200">Password</p>
                  <p className="text-sm text-slate-400">Last changed 30 days ago</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/20">
                  Change Password
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-white/5">
                <div>
                  <p className="font-medium text-slate-200">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-400">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
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
