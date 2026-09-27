import React from 'react';
import {
  ShieldAlert,
  PowerOff,
  Clock,
  KeyRound,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { SystemLicenseConfig, SystemUser } from '../types';
import { formatLicenseDate } from '../utils/licenseUtils';

interface LicenseExpiredLockoutProps {
  licenseConfig: SystemLicenseConfig;
  currentUser: SystemUser | null;
  onSuperAdminLogin?: () => void;
  onSwitchToSuperAdmin?: () => void;
  onSignOut?: () => void;
}

export const LicenseExpiredLockout: React.FC<LicenseExpiredLockoutProps> = ({
  licenseConfig,
  currentUser,
  onSuperAdminLogin,
  onSwitchToSuperAdmin,
  onSignOut,
}) => {
  const isDeactivated = Boolean(licenseConfig.isDeactivated);

  const handleSignInAdmin = () => {
    if (onSuperAdminLogin) {
      onSuperAdminLogin();
    } else if (onSwitchToSuperAdmin) {
      onSwitchToSuperAdmin();
    }
  };

  const handleLogout = () => {
    if (onSignOut) {
      onSignOut();
    } else if (onSuperAdminLogin) {
      onSuperAdminLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-3 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg bg-slate-950 border border-red-900/60 rounded-2xl shadow-2xl overflow-hidden text-center">
        {/* Banner */}
        <div className="bg-red-700 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-900/50 border border-red-400/40 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            {isDeactivated ? (
              <PowerOff className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-pulse" />
            ) : (
              <ShieldAlert className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-pulse" />
            )}
          </div>
          <span className="px-2.5 sm:px-3 py-1 bg-red-950/80 border border-red-400 text-red-100 rounded-full font-mono text-[10px] uppercase font-bold tracking-widest inline-block">
            Security Enforcement Protocol
          </span>
          <h1 className="font-sans text-xl sm:text-2xl font-black tracking-tight text-white uppercase mt-2">
            {isDeactivated ? 'System License Deactivated' : 'System License Expired'}
          </h1>
          <p className="font-mono text-[11px] sm:text-xs text-red-200 mt-1 uppercase tracking-wider">
            Standard & Administrator Accounts Locked
          </p>
        </div>

        {/* Details Card */}
        <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 text-slate-300">
          <div className="p-3.5 sm:p-4 bg-red-950/40 border border-red-800/40 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">License Activation:</span>
              <strong className="text-slate-200">
                {formatLicenseDate(licenseConfig.activationDate)}
              </strong>
            </div>

            {isDeactivated ? (
              <>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-red-400 font-bold">Deactivated On:</span>
                  <strong className="text-red-400 font-bold">
                    {licenseConfig.deactivatedAt
                      ? formatLicenseDate(licenseConfig.deactivatedAt.split('T')[0])
                      : 'Recently'}
                  </strong>
                </div>
                {licenseConfig.deactivationReason && (
                  <div className="text-[11px] font-mono text-red-300 bg-red-950/60 p-2 rounded border border-red-800/50 mt-1">
                    <span className="text-red-400 font-bold">Reason: </span>
                    {licenseConfig.deactivationReason}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-red-400 font-bold">Expired On:</span>
                <strong className="text-red-400 font-bold">
                  {formatLicenseDate(licenseConfig.expiryDate)} (0 Days Left)
                </strong>
              </div>
            )}

            {currentUser && (
              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-red-900/50">
                <span className="text-slate-400">Current Session:</span>
                <span className="text-amber-400 font-semibold truncate max-w-[180px]">
                  {currentUser.displayName} ({currentUser.role?.toUpperCase()})
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 leading-relaxed font-sans text-left space-y-2">
            <p>
              {isDeactivated
                ? 'The enterprise system license for this ledger instance has been manually deactivated. All standard users, staff, and administrators are locked out.'
                : 'In accordance with enterprise licensing controls, the 1-year operating period for this ledger instance has concluded. Access for standard users, operational staff, and administrators has been automatically suspended.'}
            </p>
            <p>
              Only the <strong>Super Administrator</strong> is authorized to sign in, configure a renewed
              activation date, or reactivate ledger operations.
            </p>
          </div>

          {/* Super Admin Authorization Box */}
          <div className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-left gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-200">Super Administrator</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  Reactivation & Security Key Authority Required
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400 uppercase font-bold shrink-0">
              Root Authority
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleSignInAdmin}
              id="lockout-superadmin-login-btn"
              className="w-full py-3 px-4 bg-[#00288e] hover:bg-[#001f70] text-white rounded-xl font-mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Sign In as Super Administrator</span>
            </button>

            {onSignOut && (
              <button
                onClick={handleLogout}
                id="lockout-signout-btn"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out of Current Session</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
