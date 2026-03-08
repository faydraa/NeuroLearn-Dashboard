import { useState } from 'react';
import { Brain, AlertCircle, Eye, EyeOff, Mail, HelpCircle, X } from 'lucide-react';
import { loginUser, signUpUser } from '../library/auth';
import { supabase } from '../library/supabase';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showNeedHelp, setShowNeedHelp] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await loginUser(email, password);
      } else {
        await signUpUser(email, password, userId, fullName);
        setSuccessMessage('Account created. Please check your email to verify your account before signing in.');
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('Invalid login credentials. Please try again.');
      } else {
      setError(err.message || 'Something went wrong. Please try again.');
      }

      const form = document.getElementById('login-form');
      form?.classList.add('shake');
      setTimeout(() => form?.classList.remove('shake'), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Unable to send reset email.');
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .shake {
          animation: shake 0.5s;
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Brain className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">NeuroLearn</h1>
            <p className="text-gray-600">Personalise Your Learning with EEG Technology</p>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'signup'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="Choose a user ID"
                    required={mode === 'signup'}
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="Enter your full name"
                    required={mode === 'signup'}
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? mode === 'login'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => setShowForgotPassword(true)}
              className="text-indigo-600 hover:text-indigo-700 font-medium transition"
            >
              Forgot Password?
            </button>
            <button
              onClick={() => setShowNeedHelp(true)}
              className="text-indigo-600 hover:text-indigo-700 font-medium transition flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              Need Help?
            </button>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {!resetSuccess ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  Send Reset Link
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-gray-600">
                  We've sent a password reset link to <strong>{resetEmail}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showNeedHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowNeedHelp(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <HelpCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h2>
              <p className="text-gray-600">
                We're here to support you with any questions or issues.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Email Support</p>
                    <a href="mailto:support@neurolearn.edu" className="text-indigo-600 hover:text-indigo-700 text-sm">
                      support@neurolearn.edu
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Help Center</p>
                    <p className="text-gray-600 text-sm">
                      Visit our help center for FAQs and troubleshooting guides
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Technical Support</p>
                    <p className="text-gray-600 text-sm mb-2">
                      For Muse 2 device setup and EEG recording issues
                    </p>
                    <a href="mailto:tech@neurolearn.edu" className="text-indigo-600 hover:text-indigo-700 text-sm">
                      tech@neurolearn.edu
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Response Time:</strong> We typically respond within 24 hours
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNeedHelp(false)}
              className="w-full mt-6 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}