import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  LogOut,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { SystemUser, UserRole } from '../types';
import {
  signInWithGoogleAuth,
  signOutAuth,
  BOOTSTRAP_ADMIN_EMAIL,
  verifyPassword,
  DEFAULT_ROOT_ADMIN_PASSWORD,
  hashPassword,
  saveUserToCloud,
  findUserByIdentifier,
} from '../services/firebaseService';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser | null;
  users: SystemUser[];
  onSelectUser: (user: SystemUser) => void;
  onSignOut: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onSelectUser,
  onSignOut,
}) => {
  const [loading, setLoading] = useState(false);
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const fbUser = await signInWithGoogleAuth();
      if (fbUser) {
        const userEmail = (fbUser.email || '').trim().toLowerCase();
        const isRootAdmin = userEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

        // Find if this account was pre-registered by an Admin
        const existingUser = users.find(
          (u) => u.email.trim().toLowerCase() === userEmail
        );

        // Strict enforcement: Do NOT create account if it does not exist
        if (!existingUser && !isRootAdmin) {
          await signOutAuth();
          setErrorMessage(
            `User not found. The Google account "${userEmail}" is not registered. User accounts can only be created by an Administrator in Settings.`
          );
          return;
        }

        // Check role assignment
        const assignedRole: UserRole | undefined = isRootAdmin ? 'admin' : existingUser?.role;
        if (!assignedRole) {
          await signOutAuth();
          setErrorMessage(
            `Access Denied: Account "${userEmail}" has no assigned role. An Administrator must assign you a role in Settings before you can log in.`
          );
          return;
        }

        if (existingUser && existingUser.isActive === false) {
          await signOutAuth();
          const reasonMsg =
            existingUser.disabledMessage ||
            (existingUser.disabledReason === 'license_expired'
              ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
              : `Access Denied: Account "${userEmail}" has been deactivated. Inactive accounts cannot access the ledger.`);
          setErrorMessage(reasonMsg);
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

        onSelectUser(userObj);
        onClose();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Sign-in window was closed.');
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        console.warn('Google Sign-In popup was blocked by browser or preview frame.');
        setErrorMessage(
          'Sign-in popup was blocked by your browser. Please enter your registered username or email and password below.'
        );
      } else {
        console.warn('Google Sign-In notice:', err?.message || err);
        setErrorMessage(
          err?.message ||
            'Could not complete Google Sign-In. Please sign in using your account password below.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = identifierInput.trim();
    const enteredPassword = passwordInput.trim();

    if (!cleanInput) {
      setErrorMessage('Please enter your registered email address or username.');
      return;
    }

    if (!enteredPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);

    const { user: matchedUser, isRootAdmin } = findUserByIdentifier(cleanInput, users);

    // Strict enforcement: Do NOT create account if it does not exist
    if (!matchedUser) {
      if (isRootAdmin) {
        const isDefaultPassword = enteredPassword === DEFAULT_ROOT_ADMIN_PASSWORD;
        if (!isDefaultPassword) {
          setIsSubmitting(false);
          setErrorMessage('Authentication failed: Invalid administrator password.');
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
        onSelectUser(rootAdmin);
        onClose();
        return;
      }

      setIsSubmitting(false);
      setErrorMessage(
        `User not found. Neither email nor username "${cleanInput}" exists in the system. Accounts can only be created by an Administrator in Settings.`
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
      setErrorMessage(disableAlert);
      return;
    }

    if (!matchedUser.role) {
      setIsSubmitting(false);
      setErrorMessage(
        `Access Denied: Account "${matchedUser.displayName}" has no assigned role. An Administrator must assign a role before access is permitted.`
      );
      return;
    }

    // Password Verification
    let passwordMatches = false;
    if (matchedUser.password) {
      passwordMatches = await verifyPassword(enteredPassword, matchedUser.password);
    } else if (isRootAdmin || matchedUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      passwordMatches = enteredPassword === DEFAULT_ROOT_ADMIN_PASSWORD;
    } else {
      // First-time password setup for existing user
      const hashed = await hashPassword(enteredPassword);
      matchedUser.password = hashed;
      saveUserToCloud(matchedUser).catch((err) => console.warn('Save initial password warning:', err));
      passwordMatches = true;
    }

    if (!passwordMatches) {
      setIsSubmitting(false);
      setErrorMessage('Authentication failed: Incorrect password. Please try again.');
      return;
    }

    const isRoot = isRootAdmin || matchedUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const resolvedRole: UserRole = isRoot ? 'super_admin' : (matchedUser.role || 'staff');

    const updatedUser: SystemUser = {
      ...matchedUser,
      role: resolvedRole,
      lastLoginAt: new Date().toISOString(),
    };
    saveUserToCloud(updatedUser).catch((err) => console.warn('Update login time note:', err));

    setIsSubmitting(false);
    onSelectUser(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-[#191c1e]">
                User Sign In & Authentication
              </h3>
              <p className="font-mono text-xs text-[#64748b]">
                Sign in to access system roles: Administrator or Staff
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Current Session Banner */}
          {currentUser ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold text-slate-500">
                  Currently Signed In
                </span>
                <span
                  className={`font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-blue-100 text-blue-900 border-blue-300'
                  }`}
                >
                  {currentUser.role.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-base">
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-bold text-slate-900 truncate">
                    {currentUser.displayName}
                  </p>
                  <p className="font-mono text-xs text-slate-500 truncate">
                    {currentUser.role === 'super_admin' ? 'Root Super Administrator' : currentUser.email}
                  </p>
                  {currentUser.department && (
                    <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                      {currentUser.department}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    signOutAuth();
                    onSignOut();
                  }}
                  className="flex items-center gap-1 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">No User Currently Signed In</p>
                <p className="text-amber-800">
                  Sign in with your registered account to authenticate your role.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Primary Action: Google Sign In */}
          <div className="space-y-2">
            <label className="block font-mono text-xs font-bold uppercase text-slate-500">
              Sign In with Google Account
            </label>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 hover:border-[#00288e] rounded-xl shadow-xs text-slate-800 font-sans font-semibold text-sm transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Connecting with Google...' : 'Continue with Google Account'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 font-mono text-[10px] text-slate-400 uppercase tracking-wider absolute">
              or sign in with email or username
            </span>
          </div>

          {/* Email or Username & Password Sign In Form */}
          <form onSubmit={handleCredentialSignIn} className="space-y-3">
            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-slate-600 mb-1">
                Registered Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="e.g. admin or username"
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-sans text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-slate-600 mb-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter account password"
                  required
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg font-sans text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !identifierInput.trim() || !passwordInput.trim()}
              className="w-full py-2.5 px-4 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Role changes and user creation managed in Settings → Admin</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
