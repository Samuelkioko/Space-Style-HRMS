import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import { SystemUser } from '../types';
import { verifyAdminCredentials } from '../services/firebaseService';

interface AdminAuthDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: () => void | Promise<void>;
  users: SystemUser[];
  targetTitle?: string;
  itemType?: string;
  description?: string;
}

export const AdminAuthDeleteModal: React.FC<AdminAuthDeleteModalProps> = ({
  isOpen,
  onClose,
  onAuthorized,
  users,
  targetTitle = 'Selected Record',
  itemType = 'Record',
  description,
}) => {
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setAdminIdentifier('');
    setAdminPassword('');
    setAuthError(null);
    setIsVerifying(false);
    onClose();
  };

  const handleAuthorizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanId = adminIdentifier.trim();
    const cleanPass = adminPassword.trim();

    if (!cleanId) {
      setAuthError('Please enter an Administrator or Super Admin email or username.');
      return;
    }

    if (!cleanPass) {
      setAuthError('Please enter the Administrator password.');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyAdminCredentials(cleanId, cleanPass, users);

      if (!result.success) {
        setIsVerifying(false);
        setAuthError(result.error || 'Authentication failed: Invalid administrator credentials. Deletion denied.');
        return;
      }

      // Successful authorization
      setIsVerifying(false);
      handleClose();
      await onAuthorized();
    } catch (err: any) {
      setIsVerifying(false);
      setAuthError(err?.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="admin-auth-delete-modal"
        className="bg-white border border-red-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-red-50/90 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-red-950">
                Admin Authorization Required
              </h3>
              <p className="font-mono text-[11px] text-red-700">
                Security Policy: Restricted Deletion
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
            aria-label="Cancel deletion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Target Item Warning Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-slate-800">
                Target: {targetTitle}
              </div>
              <p className="text-slate-500 mt-0.5">
                {description ||
                  `Standard User/Staff accounts cannot delete ${itemType.toLowerCase()} records. An active Administrator or Super Admin must provide credentials to authorize this action.`}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in duration-100">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold font-mono uppercase text-[10px] tracking-wide text-red-900 block">
                  Deletion Denied
                </span>
                <p>{authError}</p>
              </div>
            </div>
          )}

          {/* Authorization Form */}
          <form onSubmit={handleAuthorizeSubmit} className="space-y-3.5">
            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-slate-700 mb-1">
                Admin Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="e.g. admin or username"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-slate-700 mb-1">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="font-mono text-[10px] text-slate-400 mt-1">
                Must be an active Administrator or Super Admin account.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isVerifying}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isVerifying || !adminIdentifier.trim() || !adminPassword.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize & Delete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
