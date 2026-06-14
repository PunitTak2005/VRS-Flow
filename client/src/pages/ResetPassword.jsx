import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';

// ---------------------------------------------------------------------------
// Password strength helper
// ---------------------------------------------------------------------------
const getPasswordStrength = (password) => {
  if (!password) return null;
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (len < 8) {
    return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', width: '33%' };
  }
  if (len >= 10 && hasUpper && hasDigit && hasSpecial) {
    return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400', width: '100%' };
  }
  return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400', width: '66%' };
};

// ---------------------------------------------------------------------------
// Countdown hook — counts down from `seconds` to 0, returns [remaining, reset]
// ---------------------------------------------------------------------------
const useCountdown = (seconds) => {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  const start = useCallback((from = seconds) => {
    setRemaining(from);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  useEffect(() => {
    start();
    return () => clearInterval(intervalRef.current);
  }, [start]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return { remaining, formatted: formatTime(remaining), restart: start };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useNotification();

  // Email prefilled from navigation state (passed by ForgotPassword page)
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // 10-minute countdown (600 seconds) — OTP validity window
  const { remaining, formatted, restart } = useCountdown(600);
  // 60-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(resendRef.current);
    };
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    clearInterval(resendRef.current);
    resendRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(resendRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and contain at least one number.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
        confirmPassword
      });
      showToast('Password reset successfully! Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    setError('');
    try {
      await api.post('/auth/resend-reset-otp', { email: email.trim() });
      showToast('A new OTP has been sent to your email.', 'success');
      setOtp('');
      restart(600); // reset the 10-min countdown
      startResendCooldown();
    } catch (err) {
      if (err.message && err.message.includes('429')) {
        setError('Too many resend attempts. Please wait before trying again.');
      } else {
        setError(err.message || 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4 sm:px-6">
      <div className="glass-card p-8 space-y-6">

        {/* Header */}
        <div className="space-y-2">
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
            Enter the 6-digit OTP sent to your email, then choose a new password.
          </p>
        </div>

        {/* OTP countdown timer */}
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold border ${
          remaining > 60
            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400'
            : remaining > 0
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-yellow-400 animate-pulse'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
        }`}>
          <span>
            {remaining > 0 ? `OTP expires in ${formatted}` : 'OTP has expired — request a new one'}
          </span>
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Email */}
          <div>
            <label
              htmlFor="reset-email"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider"
            >
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          {/* OTP input */}
          <div>
            <label
              htmlFor="reset-otp"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider"
            >
              6-Digit OTP
            </label>
            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-center text-2xl font-bold tracking-[0.5em]"
              placeholder="——————"
              autoComplete="one-time-code"
            />
          </div>

          {/* New password */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                placeholder="Min. 8 characters, 1 number"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength indicator */}
            {strength && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className={`text-2xs font-semibold ${strength.textColor}`}>
                  Strength: {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                placeholder="Repeat your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || remaining === 0}
            className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/10"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify & Reset Password'
            )}
          </button>
        </form>

        {/* Resend OTP */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Didn't receive the OTP or it expired?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline underline-offset-2 disabled:opacity-50 disabled:no-underline transition-opacity"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {resending
              ? 'Sending…'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend OTP'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
