import { useState } from 'react';
import { Bell, Search, ChevronDown, Menu, X } from 'lucide-react';
import { partnerProfile, notifications } from '../data/placeholderData';

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const badge = partnerTypeBadges[partnerProfile.partnerType];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'lead_update':
        return '📋';
      case 'commission':
        return '💰';
      case 'document':
        return '📄';
      case 'system':
        return '🔔';
      default:
        return '📌';
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-slate-200 z-30 transition-all duration-300">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left Section - Mobile Menu & Search */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center relative">
            <Search size={18} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
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
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Notifications</h3>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{notification.createdAt}</p>
                        </div>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100">
                  <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
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
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {partnerProfile.fullName.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-700 leading-tight">
                  {partnerProfile.fullName}
                </p>
                <p className="text-xs text-slate-500">{partnerProfile.partnerCode}</p>
              </div>
              <ChevronDown size={16} className="text-slate-400 hidden md:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-medium text-slate-800">{partnerProfile.fullName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{partnerProfile.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        partnerProfile.kycStatus === 'verified' ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    <span className="text-xs text-slate-600 capitalize">
                      KYC {partnerProfile.kycStatus}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <a
                    href="/partner/profile"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    My Profile
                  </a>
                  <a
                    href="/partner/commissions"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    My Earnings
                  </a>
                  <a
                    href="/partner/support"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Help & Support
                  </a>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
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
