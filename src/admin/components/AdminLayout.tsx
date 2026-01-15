import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
  onAddLead?: () => void;
  addButtonLabel?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onAddLead, addButtonLabel }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <AdminHeader onMenuToggle={toggleSidebar} onAddLead={onAddLead} addButtonLabel={addButtonLabel} />
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
