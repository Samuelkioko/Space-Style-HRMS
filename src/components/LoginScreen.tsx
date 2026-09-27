import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  LogIn,
  AlertTriangle,
  User,
  Mail,
  ArrowRight,
  RefreshCw,
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { SystemUser, UserRole, SystemLicenseConfig } from '../types';
import {
  signInWithGoogleAuth,
  signOutAuth,
  BOOTSTRAP_ADMIN_EMAIL,
  verifyPassword,
  DEFAULT_ROOT_ADMIN_PASSWORD,
  saveUserToCloud,
  hashPassword,
  findUserByIdentifier,
} from '../services/firebaseService';
import { computeLicenseCountdown, formatLicenseDate } from '../utils/licenseUtils';

interface LoginScreenProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser) => void;
  errorBanner: string | null;
  onClearError: () => void;
  isInitialLoading?: boolean;
  licenseConfig?: SystemLicenseConfig;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLoginSuccess,
  errorBanner,
  onClearError,
  isInitialLoading = false,
  licenseConfig,
}) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeErrorMessage = localError || errorBanner;

  // License Countdown & Validity check
  const countdown = computeLicenseCountdown(licenseConfig);

  // Primary Google Authentication Flow
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setLocalError(null);
    onClearError();

    try {
      const fbUser = await signInWithGoogleAuth();
      if (!fbUser) return;

      const userEmail = (fbUser.email || '').trim().toLowerCase();
      const isRootAdmin = userEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      // Check against central database in Firebase
      const existingUser = users.find(
        (u) => u.email.trim().toLowerCase() === userEmail
      );

      // Strict enforcement: Do NOT create account if it does not exist
      if (!existingUser && !isRootAdmin) {
        await signOutAuth();
        setLocalError(
          `User not found. The account "${userEmail}" is not registered in the system. Accounts can only be created by an Administrator. Please contact your system Administrator to create your account.`
        );
        return;
      }

      // Check role assignment
      const assignedRole: UserRole | undefined = isRootAdmin ? 'super_admin' : existingUser?.role;
      if (!assignedRole) {
        await signOutAuth();
        setLocalError(
          `Access Denied: Account "${userEmail}" has no assigned role. Please contact an Administrator to assign your role before logging in.`
        );
        return;
      }

      // LICENSE EXPIRY & DEACTIVATION ENFORCEMENT:
      // Once expired or deactivated, disable all user logins including admins; ONLY Super Admin can login
      const isSuperAdminUser = isRootAdmin || assignedRole === 'super_admin';
      if ((countdown.isExpired || countdown.isDeactivated) && !isSuperAdminUser) {
        await signOutAuth();
        const lockoutMsg = countdown.isDeactivated
          ? `System License Deactivated: The organization license has been manually deactivated${
              countdown.deactivationFormatted ? ` on ${countdown.deactivationFormatted}` : ''
            }. Access for all standard users, staff, and administrators has been locked. Only the Super Administrator can sign in to reactivate it.`
          : `System License Expired: The organization license expired on ${countdown.expiryFormatted} (0 days remaining). In accordance with system security policy, all access for standard users, staff, and administrators has been disabled. Only the Super Administrator can log in to update activation and renew access.`;
        setLocalError(lockoutMsg);
        return;
      }

      // Inactive account check
      if (existingUser && existingUser.isActive === false) {
        await signOutAuth();
        const reasonMsg =
          existingUser.disabledMessage ||
          (existingUser.disabledReason === 'license_expired'
            ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
            : `Access Denied: Account "${userEmail}" has been deactivated. Contact an Administrator to reactivate your access.`);
        setLocalError(reasonMsg);
        return;
      }

      const isRoot = userEmail.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const finalRole: UserRole = isRoot ? 'super_admin' : (assignedRole || 'staff');

      const userObj: SystemUser = {
        id: existingUser ? existingUser.id : fbUser.uid,
        email: userEmail,
        displayName: existingUser?.displayName || fbUser.displayName || userEmail.split('@')[0],
        username: existingUser?.username || userEmail.split('@')[0],
        role: finalRole,
        password: existingUser?.password,
        photoURL: fbUser.photoURL || undefined,
        phone: existingUser?.phone,
        department: existingUser?.department || (isRoot ? 'Executive Administration' : finalRole === 'admin' ? 'Administration' : 'Operations Staff'),
        isActive: true,
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      onLoginSuccess(userObj);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setLocalError('Sign-in popup window was closed before completion.');
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        console.warn('Google Sign-In popup was blocked by browser or preview frame.');
        setLocalError(
          'The Google sign-in popup was blocked by your browser or preview frame. Please enter your registered username or email and password below to sign in.'
        );
      } else {
        console.warn('Google Sign-In note:', err?.message || err);
        setLocalError(
          err?.message ||
            'Could not complete Google authentication. Please sign in with your email or username and password below.'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Email or Username & Password Sign-in Verification Flow
  const handleCredentialSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    const cleanIdentifier = loginIdentifier.trim();
    const enteredPassword = passwordInput.trim();

    if (!cleanIdentifier) {
      setLocalError('Please enter your registered email address or username.');
      return;
    }

    if (!enteredPassword) {
      setLocalError('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);

    const { user: matchedUser, isRootAdmin } = findUserByIdentifier(cleanIdentifier, users);

    // LICENSE EXPIRY & DEACTIVATION ENFORCEMENT:
    // Once expired or deactivated, disable all user logins including admins; ONLY Super Admin can login
    const isSuperAdminUser =
      isRootAdmin ||
      matchedUser?.role === 'super_admin' ||
      matchedUser?.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    if ((countdown.isExpired || countdown.isDeactivated) && !isSuperAdminUser) {
      setIsSubmitting(false);
      const lockoutMsg = countdown.isDeactivated
        ? `System License Deactivated: The organization license has been manually deactivated${
            countdown.deactivationFormatted ? ` on ${countdown.deactivationFormatted}` : ''
          }. Access for all standard users, staff, and administrators has been locked. Only the Super Administrator can sign in to reactivate it.`
        : `System License Expired: The organization license expired on ${countdown.expiryFormatted} (0 days remaining). All logins for Standard Users, Staff, and Administrators are locked out. Only the Super Administrator can sign in to renew the activation date.`;
      setLocalError(lockoutMsg);
      return;
    }

    // Strict enforcement: Do NOT create account if it does not exist
    if (!matchedUser) {
      if (isRootAdmin) {
        // Root administrator fallback authentication
        const isDefaultPassword = enteredPassword === DEFAULT_ROOT_ADMIN_PASSWORD;
        if (!isDefaultPassword) {
          setIsSubmitting(false);
          setLocalError('Authentication failed: Invalid administrator password. Please try again.');
          return;
        }

        const rootAdmin: SystemUser = {
          id: 'admin-root',
          email: BOOTSTRAP_ADMIN_EMAIL,
          displayName: 'Sammuel Kioko',
          username: 'sammuelkioko99',
          role: 'super_admin',
          department: 'Executive Administration',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setIsSubmitting(false);
        onLoginSuccess(rootAdmin);
        return;
      }

      setIsSubmitting(false);
      setLocalError(
        `User account not found. Neither email nor username "${cleanIdentifier}" is registered in the system. Accounts must be registered by an Administrator in Settings.`
      );
      return;
    }

    if (matchedUser.isActive === false) {
      setIsSubmitting(false);
      const disableAlert =
        matchedUser.disabledMessage ||
        (matchedUser.disabledReason === 'license_expired'
          ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
          : matchedUser.disabledReason === 'account_suspended'
          ? 'Account Suspended: Access for this account has been revoked by system administration.'
          : `Access Denied: Account "${matchedUser.displayName}" (${matchedUser.username ? `@${matchedUser.username}` : matchedUser.email}) is currently disabled. Inactive accounts cannot access the ledger.`);
      setLocalError(disableAlert);
      return;
    }

    if (!matchedUser.role) {
      setIsSubmitting(false);
      setLocalError(
        `Access Denied: Account "${matchedUser.displayName}" has no assigned role. An Administrator must assign a role before access is permitted.`
      );
      return;
    }

    // Password Verification
    let passwordMatches = false;

    if (matchedUser.password) {
      // Compare with stored hashed password
      passwordMatches = await verifyPassword(enteredPassword, matchedUser.password);
    } else if (isRootAdmin || matchedUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      // Default root admin password fallback
      passwordMatches = enteredPassword === DEFAULT_ROOT_ADMIN_PASSWORD;
    } else {
      // Account exists without a password yet: first-time setup
      const hashedPassword = await hashPassword(enteredPassword);
      matchedUser.password = hashedPassword;
      saveUserToCloud(matchedUser).catch((e) => console.warn('Saved user password error:', e));
      passwordMatches = true;
    }

    if (!passwordMatches) {
      setIsSubmitting(false);
      setLocalError('Authentication failed: Incorrect password. Please verify your password and try again.');
      return;
    }

    const isRoot = isRootAdmin || matchedUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const finalRole: UserRole = isRoot ? 'super_admin' : (matchedUser.role || 'staff');

    // Record login timestamp
    const updatedUser: SystemUser = {
      ...matchedUser,
      role: finalRole,
      lastLoginAt: new Date().toISOString(),
    };
    saveUserToCloud(updatedUser).catch((e) => console.warn('Update last login note:', e));

    setIsSubmitting(false);
    onLoginSuccess(updatedUser);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#c4c5d5]/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-[#00288e] text-white p-8 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-sans text-xl font-bold tracking-tight text-white uppercase">
              MGATOR INDUSTRIES LTD
            </h1>
            <p className="font-mono text-xs text-blue-100 tracking-wider uppercase mt-1">
              Executive Ledger & Management Portal
            </p>
          </div>
        </div>

        {/* License Expired / Deactivated Global Lockout Banner */}
        {(countdown.isExpired || countdown.isDeactivated) && (
          <div className="p-4 bg-red-700 text-white flex items-start gap-3 animate-in fade-in duration-200">
            <ShieldAlert className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed font-sans flex-1">
              <div className="font-bold text-white uppercase tracking-wider font-mono">
                {countdown.isDeactivated
                  ? '⛔ System License Manually Deactivated (Logins Locked)'
                  : '⛔ System License Expired (0 Days Remaining)'}
              </div>
              <p className="mt-1 text-red-100">
                {countdown.isDeactivated ? (
                  <>
                    The enterprise license was manually deactivated on{' '}
                    <strong>
                      {countdown.deactivationFormatted || formatLicenseDate(new Date().toISOString().split('T')[0])}
                    </strong>
                    . All Standard User, Staff, and Administrator logins are suspended. Only the Super
                    Administrator can sign in to reactivate the system.
                  </>
                ) : (
                  <>
                    The enterprise license expired on <strong>{countdown.expiryFormatted}</strong>.
                    All Standard User, Staff, and Administrator logins are suspended. Only the Super
                    Administrator can sign in to renew activation.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Security / Error Banner */}
        {activeErrorMessage && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3 animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-sans flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Authentication Notice</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    onClearError();
                  }}
                  className="text-amber-800 hover:text-amber-950 font-mono text-[11px] underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p>{activeErrorMessage}</p>

              {activeErrorMessage.includes('popup') && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-lg font-mono text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in New Browser Window</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Sign-In Controls: Google and Email + Password */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Method 1: Sign In with Google */}
          <div className="space-y-3">
            <label className="block font-mono text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Google Workspace / Gmail Sign-In
            </label>

            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isInitialLoading}
              id="login-google-btn"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl font-sans font-semibold text-sm shadow-xs transition-all hover:border-slate-400 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00288e]" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            <p className="font-sans text-[11px] text-slate-500 text-center leading-normal">
              Sign in with your authorized enterprise Google Workspace or Gmail account.
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider absolute">
              Or Sign In with Password
            </span>
          </div>

          {/* Method 2: Email or Username & Password Sign-In Form */}
          <form onSubmit={handleCredentialSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier-input"
                className="block font-mono text-[11px] font-bold uppercase text-slate-600 mb-1"
              >
                Registered Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="login-identifier-input"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. johndoe@gmail.com or username"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="login-password-input"
                  className="block font-mono text-[11px] font-bold uppercase text-slate-600"
                >
                  Account Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="font-sans text-[11px] text-slate-400 mt-1">
                Password assigned by your system Administrator.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !loginIdentifier.trim() || !passwordInput.trim()}
              id="login-submit-btn"
              className="w-full py-3 px-4 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-xl font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* System License Countdown Tracker */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-[11px] font-mono ${
              countdown.isExpired
                ? 'bg-red-50 border-red-200 text-red-900'
                : countdown.isExpiringSoon
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className={`w-3.5 h-3.5 ${countdown.isExpired ? 'text-red-600' : 'text-[#00288e]'}`} />
              <span>License Status:</span>
            </div>
            <span className="font-bold">
              {countdown.isExpired
                ? `EXPIRED (0 Days Left)`
                : `${countdown.daysRemaining} Days Left`}
            </span>
          </div>

          {/* Security Notice Footer */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Password Authenticated • Central Cloud Database</span>
            </div>
            <p className="font-sans text-[11px] text-slate-400">
              Accounts and passwords are administered in Settings. Contact an Administrator if you forgot your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

