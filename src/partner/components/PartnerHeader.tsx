import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { usePartnerProfileStore } from '../../stores/partnerProfileStore';
import type { KYCStatus } from '../types/partner-dashboard';

interface PartnerHeaderProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

const partnerTypeBadges: Record<string, { label: string; color: string }> = {
  freelancer: { label: 'Freelancer', color: 'bg-purple-100 text-purple-700' },
  car_dealer: { label: 'Car Dealer', color: 'bg-amber-100 text-amber-700' },
  property_dealer: { label: 'Property Dealer', color: 'bg-emerald-100 text-emerald-700' },
  builder: { label: 'Builder', color: 'bg-blue-100 text-blue-700' },
  sub_dsa: { label: 'Sub DSA', color: 'bg-slate-100 text-slate-700' },
};

export default function PartnerHeader({ onMenuToggle, isMobileMenuOpen }: PartnerHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { partnerInfo, fetchProfile } = usePartnerProfileStore();

  // Fetch partner info via shared store (uses TTL cache)
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, fetchProfile]);

  // Use auth user as fallback while loading
  const displayInfo = partnerInfo || {
    fullName: user ? `${user.firstName} ${user.lastName}` : 'Partner',
    email: user?.email || '',
    partnerType: 'freelancer',
    partnerCode: user?.id ? `GPS-${user.id.slice(-8).toUpperCase()}` : '',
    kycStatus: 'pending' as KYCStatus,
  };

  const badge = partnerTypeBadges[displayInfo.partnerType] || partnerTypeBadges.freelancer;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-30 transition-all duration-300">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left Section - Mobile Menu & Search */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center relative">
            <Search size={18} className="absolute left-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search leads, clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500"
            />
          </div>
        </div>

        {/* Right Section - Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Partner Type Badge */}
          <span className={`hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-medium ${badge?.color}`}>
            {badge?.label}
          </span>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 relative transition-colors"
            >
              <Bell size={20} />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-100">Notifications</h3>
                </div>
                <div className="px-4 py-8 text-center text-slate-500">
                  <Bell size={32} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">No new notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {displayInfo.fullName.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-200 leading-tight">
                  {displayInfo.fullName}
                </p>
                <p className="text-xs text-slate-500">{displayInfo.partnerCode}</p>
              </div>
              <ChevronDown size={16} className="text-slate-400 hidden md:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="font-medium text-slate-100">{displayInfo.fullName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{displayInfo.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        displayInfo.kycStatus === 'verified' ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    <span className="text-xs text-slate-600 capitalize">
                      KYC {displayInfo.kycStatus}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    to="/partner/profile"
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/partner/commissions"
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    My Earnings
                  </Link>
                  <Link
                    to="/partner/support"
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    Help & Support
                  </Link>
                </div>
                <div className="border-t border-white/5 py-1">
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handler */}
      {(showNotifications || showProfile) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowProfile(false);
          }}
        />
      )}
    </header>
  );
}
