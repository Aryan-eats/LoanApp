import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { getAccessToken } from '../api/apiClient';

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
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const didCheck = useRef(false);

  useEffect(() => {
    // Run exactly once on mount to avoid re-render loops
    if (didCheck.current) return;
    didCheck.current = true;

    const validateAuth = async () => {
      // Re-check auth if persisted state says authenticated but in-memory token is missing.
      if (!isAuthenticated || !getAccessToken()) {
        await checkAuth();
      }
      setIsChecking(false);
    };

    validateAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return <LoadingSpinner />;
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

