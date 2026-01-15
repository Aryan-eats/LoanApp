import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  CheckCircle,
  Upload,
  Wallet,
  Building2,
  User,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/partner' },
  { id: 'add-client', label: 'Add Client', icon: <UserPlus size={20} />, path: '/partner/add-client' },
  { id: 'leads', label: 'My Leads', icon: <FileText size={20} />, path: '/partner/leads', badge: 3 },
  { id: 'eligibility', label: 'Credit Check', icon: <CheckCircle size={20} />, path: '/partner/eligibility' },
  { id: 'documents', label: 'Documents', icon: <Upload size={20} />, path: '/partner/documents' },
  { id: 'commissions', label: 'Commissions', icon: <Wallet size={20} />, path: '/partner/commissions' },
  { id: 'bank-offers', label: 'Bank Offers', icon: <Building2 size={20} />, path: '/partner/bank-offers' },
  { id: 'profile', label: 'Profile & KYC', icon: <User size={20} />, path: '/partner/profile' },
  { id: 'support', label: 'Support', icon: <HelpCircle size={20} />, path: '/partner/support' },
];

export default function PartnerSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/partner') {
      return location.pathname === '/partner';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GrowthPath" className="h-18 w-auto" />
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center mx-auto">
            <img src="/logo.png" alt="GrowthPath" className="h-8 w-8 object-contain" />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
              isActive(item.path)
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span
              className={`flex-shrink-0 ${
                isActive(item.path) ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            >
              {item.icon}
            </span>
            {!isCollapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {isCollapsed && item.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 bg-white">
        <button
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
