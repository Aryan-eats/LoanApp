import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PartnerSidebar from './PartnerSidebar';
import PartnerHeader from './PartnerHeader';
import { PartnerThemeProvider, usePartnerTheme } from './PartnerThemeProvider';

export default function PartnerLayout() {
  return (
    <PartnerThemeProvider>
      <PartnerLayoutShell />
    </PartnerThemeProvider>
  );
}

function PartnerLayoutShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark, theme } = usePartnerTheme();

  return (
    <div
      data-partner-theme={theme}
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_55%,_#f8fafc_100%)] text-slate-900'
      }`}
    >
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className={`lg:block ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <PartnerSidebar />
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className={`fixed inset-0 z-30 lg:hidden ${isDark ? 'bg-black/50' : 'bg-slate-900/20 backdrop-blur-sm'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <PartnerHeader
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
