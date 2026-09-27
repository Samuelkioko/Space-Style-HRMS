import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
  ShieldAlert,
  PowerOff,
  Power,
} from 'lucide-react';
import { SystemLicenseConfig, SystemUser } from '../types';
import {
  computeLicenseCountdown,
  calculateOneYearExpiry,
  formatLicenseDate,
  saveLocalLicenseConfig,
} from '../utils/licenseUtils';
import {
  saveSystemLicenseToCloud,
  BOOTSTRAP_ADMIN_EMAIL,
} from '../services/firebaseService';

interface LicenseManagerCardProps {
  licenseConfig: SystemLicenseConfig;
  onSaveLicense?: (newConfig: SystemLicenseConfig) => Promise<boolean | void> | boolean | void;
  onUpdateLicense?: (newConfig: SystemLicenseConfig) => Promise<boolean | void> | boolean | void;
  currentUser: SystemUser | null;
}

export const LicenseManagerCard: React.FC<LicenseManagerCardProps> = ({
  licenseConfig,
  onSaveLicense,
  onUpdateLicense,
  currentUser,
}) => {
  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ||
    !currentUser;

  // Live real-time ticking details
  const [countdown, setCountdown] = useState(() =>
    computeLicenseCountdown(licenseConfig)
  );

  // Edit state for Super Admin
  const [isEditing, setIsEditing] = useState(false);
  const [editActivationDate, setEditActivationDate] = useState(licenseConfig.activationDate || '2026-09-19');
  const [editNotes, setEditNotes] = useState(licenseConfig.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Manual deactivation states
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Update countdown every second
  useEffect(() => {
    setCountdown(computeLicenseCountdown(licenseConfig));
    const interval = setInterval(() => {
      setCountdown(computeLicenseCountdown(licenseConfig));
    }, 1000);
    return () => clearInterval(interval);
  }, [licenseConfig]);

  useEffect(() => {
    setEditActivationDate(licenseConfig.activationDate || '2026-09-19');
    setEditNotes(licenseConfig.notes || '');
  }, [licenseConfig]);

  const previewExpiryDate = calculateOneYearExpiry(editActivationDate);
  const previewCountdown = computeLicenseCountdown(editActivationDate);

  const saveConfig = async (newConfig: SystemLicenseConfig) => {
    const saveFn = onSaveLicense || onUpdateLicense;
    if (typeof saveFn === 'function') {
      await saveFn(newConfig);
    } else {
      await saveSystemLicenseToCloud(newConfig);
    }
    saveLocalLicenseConfig(newConfig);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setFeedbackMsg({
        type: 'error',
        text: 'Access restricted. Only Super Administrator can activate system license.',
      });
      return;
    }

    if (!editActivationDate) {
      setFeedbackMsg({ type: 'error', text: 'Please specify a valid activation date.' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const calculatedExpiry = calculateOneYearExpiry(editActivationDate);
      const updated: SystemLicenseConfig = {
        ...licenseConfig,
        activationDate: editActivationDate,
        expiryDate: calculatedExpiry,
        durationYears: 1,
        isDeactivated: false,
        deactivatedAt: undefined,
        deactivatedBy: undefined,
        deactivationReason: undefined,
        activatedBy: currentUser?.displayName || 'Super Administrator',
        activatedAt: new Date().toISOString(),
        notes: editNotes.trim() || 'Annual Enterprise Commercial License',
        updatedAt: new Date().toISOString(),
      };

      await saveConfig(updated);

      setCountdown(computeLicenseCountdown(updated));
      setEditActivationDate(updated.activationDate);
      setEditNotes(updated.notes || '');
      setFeedbackMsg({
        type: 'success',
        text: `License activation set to ${formatLicenseDate(editActivationDate)}. 1-Year countdown active through ${formatLicenseDate(calculatedExpiry)}.`,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving license config:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to update system license in database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!isSuperAdmin) return;
    setIsDeactivating(true);
    setFeedbackMsg(null);

    try {
      const updated: SystemLicenseConfig = {
        ...licenseConfig,
        isDeactivated: true,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: currentUser?.displayName || 'Super Administrator',
        deactivationReason: deactivateReason.trim() || 'Manually deactivated by Super Administrator',
        updatedAt: new Date().toISOString(),
      };

      await saveConfig(updated);

      setCountdown(computeLicenseCountdown(updated));
      setFeedbackMsg({
        type: 'success',
        text: 'System license successfully deactivated. Standard user and administrator logins are locked.',
      });
      setShowDeactivateConfirm(false);
      setDeactivateReason('');
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error deactivating license:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to deactivate system license.',
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivateClick = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditActivationDate(today);
    setIsEditing(true);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditActivationDate(today);
  };

  return (
    <div className="bg-white border border-[#c4c5d5]/80 rounded-xl p-6 shadow-xs space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                countdown.isDeactivated
                  ? 'bg-red-600'
                  : countdown.isExpired
                  ? 'bg-red-600 animate-ping'
                  : countdown.isExpiringSoon
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-600'
              }`}
            />
            <span className="font-mono text-xs text-[#00288e] uppercase font-bold tracking-widest">
              Executive License & Validity Engine
            </span>
          </div>
          <h3 className="font-sans text-xl font-bold text-[#191c1e] tracking-tight mt-1">
            System Activation & 1-Year Countdown Tracker
          </h3>
          <p className="font-mono text-xs text-[#475569] mt-0.5">
            Super Administrator sets the activation date, the system automatically counts 1 full year,
            and displays a live countdown. When expired or deactivated, non-super-admin logins are locked out.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider border ${
              countdown.isDeactivated
                ? 'bg-red-100 text-red-900 border-red-400 font-black'
                : countdown.isExpired
                ? 'bg-red-100 text-red-800 border-red-300'
                : countdown.isExpiringSoon
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}
          >
            {countdown.isDeactivated
              ? '⛔ DEACTIVATED (LOGINS LOCKED)'
              : countdown.isExpired
              ? '⛔ EXPIRED (LOGINS LOCKED)'
              : countdown.isExpiringSoon
              ? '⚠️ EXPIRING SOON'
              : '✓ ACTIVE LICENSE'}
          </span>

          {isSuperAdmin && !isEditing && !showDeactivateConfirm && (
            <div className="flex items-center gap-2">
              {countdown.isDeactivated ? (
                <button
                  onClick={handleReactivateClick}
                  id="card-reactivate-license-btn"
                  className="px-3 py-1.5 bg-[#00288e] hover:bg-[#001f70] text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Reactivate License</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    id="card-deactivate-license-btn"
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Deactivate</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    id="card-set-activation-btn"
                    className="px-3 py-1.5 bg-[#00288e] hover:bg-[#001f70] text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Set Activation Date
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>{feedbackMsg.text}</div>
        </div>
      )}

      {/* Manual Deactivation Confirmation Panel */}
      {showDeactivateConfirm && (
        <div className="p-5 bg-red-50 border border-red-300 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-red-950 font-bold text-sm uppercase font-mono">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Confirm System License Deactivation</span>
          </div>
          <p className="text-xs text-red-900 leading-relaxed font-sans">
            Are you sure you want to deactivate the system license? This action will immediately lock access
            for all staff, standard users, and administrators. Only the Super Administrator
            can authenticate to reactivate it.
          </p>
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">
              Deactivation Note / Reason (Optional)
            </label>
            <input
              type="text"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="e.g. Contract hiatus / manual security suspension"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-600 focus:outline-none font-sans"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(false)}
              disabled={isDeactivating}
              className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-mono text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isDeactivating}
              id="card-confirm-deactivate-btn"
              className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isDeactivating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Deactivate System</span>
            </button>
          </div>
        </div>
      )}

      {/* Big Digital Countdown Display */}
      <div
        className={`p-6 rounded-2xl border text-center relative overflow-hidden ${
          countdown.isDeactivated
            ? 'bg-slate-900 border-slate-800 text-white'
            : countdown.isExpired
            ? 'bg-red-50/80 border-red-300'
            : countdown.isExpiringSoon
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        <div className={`text-xs font-mono uppercase tracking-widest font-bold mb-3 ${
          countdown.isDeactivated ? 'text-red-400' : 'text-slate-500'
        }`}>
          {countdown.isDeactivated
            ? 'Manual Deactivation State'
            : countdown.isExpired
            ? 'Access Revocation Notice'
            : 'Live Countdown Remaining for Annual License'}
        </div>

        {countdown.isDeactivated ? (
          <div className="space-y-3 py-2">
            <div className="text-2xl sm:text-3xl md:text-5xl font-black text-red-500 tracking-tight font-mono">
              MANUALLY DEACTIVATED
            </div>
            <div className="max-w-lg mx-auto p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 leading-relaxed font-sans">
              <strong>All user logins (including administrators) are disabled.</strong> The license was deactivated
              on {countdown.deactivationFormatted || formatLicenseDate(new Date().toISOString().split('T')[0])}
              {licenseConfig.deactivatedBy ? ` by ${licenseConfig.deactivatedBy.includes('@') ? 'Super Administrator' : licenseConfig.deactivatedBy}` : ''}.
              {licenseConfig.deactivationReason && (
                <div className="mt-1 font-mono text-[11px] text-red-300 font-semibold">
                  Reason: {licenseConfig.deactivationReason}
                </div>
              )}
            </div>
          </div>
        ) : countdown.isExpired ? (
          <div className="space-y-3 py-2">
            <div className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-red-700 tracking-tight font-mono">
              0 DAYS (EXPIRED)
            </div>
            <div className="max-w-lg mx-auto p-3 bg-red-100/90 border border-red-300 rounded-xl text-xs text-red-900 leading-relaxed font-sans">
              <strong>All user logins (including administrators) are disabled.</strong> Only the Super
              Administrator can authenticate to set a new
              activation date and restore organizational access.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-lg mx-auto">
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#00288e] font-mono tracking-tight">
                {countdown.daysRemaining}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-500 font-bold mt-1">
                Days Remaining
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 font-mono tracking-tight">
                {String(countdown.hoursRemaining).padStart(2, '0')}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-500 font-bold mt-1">
                Hours
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 font-mono tracking-tight">
                {String(countdown.minutesRemaining).padStart(2, '0')}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-500 font-bold mt-1">
                Minutes
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-600 font-mono tracking-tight">
                {String(countdown.secondsRemaining).padStart(2, '0')}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-500 font-bold mt-1">
                Seconds
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!countdown.isDeactivated && (
          <div className="mt-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1.5">
              <span>365-Day Term Cycle</span>
              <span className="font-bold text-slate-700">
                {countdown.percentRemaining}% Validity Left
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  countdown.isExpired
                    ? 'bg-red-600 w-0'
                    : countdown.isExpiringSoon
                    ? 'bg-amber-500'
                    : 'bg-[#00288e]'
                }`}
                style={{ width: `${countdown.percentRemaining}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-600 font-mono text-xs uppercase font-bold">
            <Calendar className="w-4 h-4 text-[#00288e]" />
            <span>Activation Date</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {countdown.activationFormatted}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">
            Configured by: {licenseConfig.activatedBy && !licenseConfig.activatedBy.includes('@') ? licenseConfig.activatedBy : 'Super Administrator'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-600 font-mono text-xs uppercase font-bold">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Calculated Expiration</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {countdown.expiryFormatted}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">
            Auto-calculated: 1 Year (365 Days)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-600 font-mono text-xs uppercase font-bold">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>Lockout Enforcement</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {countdown.isDeactivated ? 'Active (Manual Lockout)' : 'Strict RBAC Guard'}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">
            {countdown.isDeactivated
              ? 'Non-super-admin logins disabled'
              : 'Disables all users & admins upon 0 days'}
          </div>
        </div>
      </div>

      {/* Super Admin Edit Form */}
      {isSuperAdmin && isEditing && (
        <form
          onSubmit={handleSave}
          className="p-5 border border-amber-300 bg-amber-50/50 rounded-xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-950">
              Super Admin: Set Activation Date & Launch 1-Year Countdown
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">
                Activation Date (YYYY-MM-DD)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={editActivationDate}
                  onChange={(e) => setEditActivationDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#00288e] bg-white"
                />
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Today
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">
                Calculated Expiry (1 Year Later)
              </label>
              <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono bg-slate-100 text-slate-800 flex items-center justify-between">
                <span>{formatLicenseDate(previewExpiryDate)}</span>
                <span
                  className={`text-xs font-bold ${
                    previewCountdown.isExpired ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {previewCountdown.daysRemaining}d ({previewCountdown.status})
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">
              Contract / License Designation Notes
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Annual Enterprise Production License - Mgator Industries Ltd"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-sans focus:ring-2 focus:ring-[#00288e] bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditActivationDate(licenseConfig.activationDate || '2026-09-19');
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              id="card-save-license-btn"
              className="px-4 py-1.5 bg-[#00288e] hover:bg-[#001f70] text-white rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Begin 1-Year Countdown</span>
            </button>
          </div>
        </form>
      )}

      {/* Non-superadmin notice */}
      {!isSuperAdmin && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-950">
          <Info className="w-4 h-4 text-[#00288e] shrink-0 mt-0.5" />
          <div>
            <strong>Administrator Status:</strong> You can view the live countdown above. If the
            license runs down to 0 days or is deactivated, access for all standard users, staff, and administrators is
            automatically locked out until the Super Administrator renews or reactivates the license.
          </div>
        </div>
      )}
    </div>
  );
};
