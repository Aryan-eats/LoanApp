import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading, authInitialized } = useAuthStore();

  // Show loading while checking authentication
  if (isLoading || !authInitialized) {
    return <LoadingSpinner />;
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated || !user) {
    return <Navigate to="/login/partner" state={{ from: location }} replace />;
  }

  // Check if user role is allowed
  if (!allowedRoles.includes(user.role)) {
    // User is authenticated but doesn't have permission for this route
    // Redirect to a dedicated forbidden page to avoid redirect loops
    return <Navigate to="/forbidden" state={{ from: location, roleRequired: allowedRoles }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

