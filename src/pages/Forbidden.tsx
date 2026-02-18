import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import useAuthStore from '../stores/authStore';

const Forbidden: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleSwitchAccount = async () => {
    await logout();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full text-center px-6 py-12">
        <ShieldX className="mx-auto h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          {user
            ? `Your account (${user.email}) does not have permission to access this page.`
            : 'You do not have permission to access this page.'}
        </p>
        <div className="flex flex-col gap-3">
          {user?.role === 'partner' && (
            <Link
              to="/partner"
              className="inline-block rounded-lg bg-black px-6 py-3 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              Go to Partner Dashboard
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="inline-block rounded-lg bg-black px-6 py-3 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              Go to Admin Dashboard
            </Link>
          )}
          <button
            onClick={handleSwitchAccount}
            className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Switch Account
          </button>
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors mt-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
