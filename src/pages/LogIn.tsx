import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Users, Shield } from 'lucide-react';
import useAuthStore from '../stores/authStore';

type LoginType = 'select' | 'partner' | 'admin';

const LogIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error: authError, clearError } = useAuthStore();
  
  const [loginType, setLoginType] = useState<LoginType>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get the page they were trying to visit
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();

    try {
      await login(email, password);
      
      // Get user from store after login
      const user = useAuthStore.getState().user;
      
      // Validate that the user role matches the selected login type
      if (loginType === 'admin' && user?.role !== 'admin') {
        setError('You do not have admin access');
        return;
      }

      if (loginType === 'partner' && user?.role !== 'partner') {
        setError('Please use admin login for admin accounts');
        return;
      }

      // Redirect to the page they were trying to visit, or to dashboard
      if (from) {
        navigate(from, { replace: true });
      } else if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user?.role === 'partner') {
        navigate('/partner', { replace: true });
      }
    } catch (err) {
      // Use centralized error parser
      const { parseApiError } = await import('../utils/parseApiError');
      setError(parseApiError(err, 'Login failed. Please try again.'));
    }
  };

  const handleBack = () => {
    setLoginType('select');
    setEmail('');
    setPassword('');
    setError(null);
    clearError();
  };

  const displayError = error || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      {/* Promotional Banner */}
      {loginType === 'partner' && (
        <div className="w-full max-w-4xl text-center mb-6 sm:mb-8 px-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-snug sm:leading-tight">
            "Cross five monthly disbursals to activate your 80% high-performance commission."
          </h2>
        </div>
      )}
      
      <div className="w-full max-w-md">
        {loginType === 'select' ? (
          // Login Type Selection
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Choose your login type to continue</p>
            </div>

            <div className="space-y-4">
              {/* Partner Login - Attractive/Prominent */}
              <button
                onClick={() => setLoginType('partner')}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-5 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Users size={24} />
                  </div>
                  <div className="text-left">
                    <div className="text-lg">Partner Login</div>
                    <div className="text-sm text-blue-100 font-normal">Access your partner dashboard</div>
                  </div>
                </div>
              </button>

              {/* Admin Login - Lowkey/Subtle */}
              <button
                onClick={() => setLoginType('admin')}
                className="w-full text-gray-400 hover:text-gray-600 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <Shield size={14} />
                <span>Admin Access</span>
              </button>
            </div>

            <div className="mt-8 text-center">
              <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center gap-1">
                <ArrowLeft size={14} />
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          // Login Form
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="text-center mb-4">
              <div className={`inline-flex p-2 rounded-xl mb-2 ${
                loginType === 'partner' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                  : 'bg-gray-800'
              }`}>
                {loginType === 'partner' ? (
                  <Users size={22} className="text-white" />
                ) : (
                  <Shield size={22} className="text-white" />
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-0.5">
                {loginType === 'partner' ? 'Partner Login' : 'Admin Login'}
              </h1>
              <p className="text-gray-600 text-xs">
                {loginType === 'partner' 
                  ? 'Enter your credentials to access your dashboard' 
                  : 'Authorized personnel only'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {displayError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                  {displayError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center">
                  <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="ml-2 text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full font-bold py-2.5 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-[1.02] text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  loginType === 'partner'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-900 text-white'
                }`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {loginType === 'partner' && (
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-xs">
                  Don't have an account?{' '}
                  <Link to="/onboarding" className="text-blue-600 hover:text-blue-700 font-medium">
                    Become a Partner
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogIn;
