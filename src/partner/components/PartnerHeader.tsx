import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { usePartnerProfileStore } from '../../stores/partnerProfileStore';
import type { KYCStatus } from '../types/partner-dashboard';
import { usePartnerTheme } from './PartnerThemeProvider';

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
  const { isDark, theme, toggleTheme } = usePartnerTheme();

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
    <header
      className={`fixed top-0 right-0 left-0 lg:left-64 h-16 backdrop-blur-md z-30 transition-all duration-300 ${
        isDark
          ? 'bg-slate-950/80 border-b border-white/10'
          : 'bg-white/82 border-b border-slate-200/80 shadow-[0_10px_35px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left Section - Mobile Menu & Search */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center relative">
            <Search size={18} className={`absolute left-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search leads, clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-80 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                isDark
                  ? 'bg-slate-900/50 border border-white/10 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Right Section - Notifications & Profile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>

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
              className={`p-2 rounded-lg relative transition-colors ${
                isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <Bell size={20} />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl overflow-hidden z-50 ${
                  isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'
                }`}
              >
                <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'border-b border-white/5' : 'border-b border-slate-100'}`}>
                  <h3 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Notifications</h3>
                </div>
                <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  <Bell size={32} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
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
              className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {displayInfo.fullName.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className={`text-sm font-medium leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {displayInfo.fullName}
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{displayInfo.partnerCode}</p>
              </div>
              <ChevronDown size={16} className={`hidden md:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfile && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl overflow-hidden z-50 ${
                  isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'
                }`}
              >
                <div className={`px-4 py-3 ${isDark ? 'border-b border-white/5' : 'border-b border-slate-100'}`}>
                  <p className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{displayInfo.fullName}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{displayInfo.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        displayInfo.kycStatus === 'verified' ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    <span className={`text-xs capitalize ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
                      KYC {displayInfo.kycStatus}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    to="/partner/profile"
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/partner/commissions"
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    My Earnings
                  </Link>
                  <Link
                    to="/partner/support"
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    Help & Support
                  </Link>
                </div>
                <div className={`py-1 ${isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}`}>
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
