import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
  PowerOff,
  Power,
  ShieldAlert,
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

interface LicenseCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseConfig: SystemLicenseConfig;
  onSaveLicense?: (newConfig: SystemLicenseConfig) => Promise<boolean | void> | boolean | void;
  onUpdateLicense?: (newConfig: SystemLicenseConfig) => Promise<boolean | void> | boolean | void;
  currentUser: SystemUser | null;
}

export const LicenseCountdownModal: React.FC<LicenseCountdownModalProps> = ({
  isOpen,
  onClose,
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

  // Deactivation confirmation modal state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Update countdown every second
  useEffect(() => {
    if (!isOpen) return;

    setCountdown(computeLicenseCountdown(licenseConfig));

    const interval = setInterval(() => {
      setCountdown(computeLicenseCountdown(licenseConfig));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, licenseConfig]);

  // Keep edit state in sync with prop
  useEffect(() => {
    setEditActivationDate(licenseConfig.activationDate || '2026-09-19');
    setEditNotes(licenseConfig.notes || '');
  }, [licenseConfig]);

  if (!isOpen) return null;

  // Preview expiry for Super Admin edit form
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
      setFeedbackMsg({ type: 'error', text: 'Please specify a valid activation date (YYYY-MM-DD).' });
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
        text: `License activated! Expiry set to ${formatLicenseDate(calculatedExpiry)} (1 Year). Countdown started.`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 border-b text-white flex items-center justify-between ${
            countdown.isDeactivated
              ? 'bg-slate-900 border-slate-950'
              : countdown.isExpired
              ? 'bg-red-700 border-red-800'
              : countdown.isExpiringSoon
              ? 'bg-amber-600 border-amber-700'
              : 'bg-[#00288e] border-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              {countdown.isDeactivated ? (
                <PowerOff className="w-5 h-5 text-red-400" />
              ) : (
                <Clock className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-white/80">
                  Enterprise Ledger
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider ${
                    countdown.isDeactivated
                      ? 'bg-red-950 text-red-200 border border-red-500'
                      : countdown.isExpired
                      ? 'bg-red-950 text-red-200 border border-red-400'
                      : countdown.isExpiringSoon
                      ? 'bg-amber-950 text-amber-200 border border-amber-400'
                      : 'bg-emerald-900 text-emerald-200 border border-emerald-400'
                  }`}
                >
                  {countdown.isDeactivated
                    ? 'DEACTIVATED'
                    : countdown.isExpired
                    ? 'EXPIRED'
                    : countdown.isExpiringSoon
                    ? 'EXPIRING SOON'
                    : 'ACTIVE LICENSE'}
                </span>
              </div>
              <h2 className="font-sans text-lg font-bold text-white tracking-tight">
                System License & Validity Countdown
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Notification / Feedback Banner */}
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

          {/* Large Digital Countdown Display */}
          <div
            className={`p-5 rounded-2xl border text-center relative overflow-hidden ${
              countdown.isDeactivated
                ? 'bg-slate-900 text-white border-slate-800'
                : countdown.isExpired
                ? 'bg-red-50/80 border-red-200'
                : countdown.isExpiringSoon
                ? 'bg-amber-50/80 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`text-[11px] font-mono uppercase tracking-widest font-bold mb-3 ${
              countdown.isDeactivated ? 'text-red-400' : 'text-slate-500'
            }`}>
              {countdown.isDeactivated
                ? 'MANUAL LOCKOUT ACTIVE'
                : countdown.isExpired
                ? 'License Has Expired'
                : 'Remaining License Duration'}
            </div>

            {countdown.isDeactivated ? (
              <div className="space-y-2 py-2">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-red-500 tracking-tight font-mono">
                  MANUALLY DEACTIVATED
                </div>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  The system license was manually deactivated on{' '}
                  <strong className="text-white">
                    {countdown.deactivationFormatted || formatLicenseDate(new Date().toISOString().split('T')[0])}
                  </strong>
                  {licenseConfig.deactivatedBy ? ` by ${licenseConfig.deactivatedBy.includes('@') ? 'Super Administrator' : licenseConfig.deactivatedBy}` : ''}.
                  Standard user and administrator logins are locked out.
                </p>
                {licenseConfig.deactivationReason && (
                  <div className="inline-block px-3 py-1 bg-red-950/80 border border-red-800/80 rounded-lg text-red-300 text-[11px] font-mono mt-1">
                    Reason: {licenseConfig.deactivationReason}
                  </div>
                )}
              </div>
            ) : countdown.isExpired ? (
              <div className="space-y-2 py-2">
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-red-700 tracking-tight font-mono">
                  0 DAYS REMAINING
                </div>
                <p className="text-xs text-red-800 max-w-md mx-auto leading-relaxed">
                  The system license expired on <strong>{countdown.expiryFormatted}</strong>.
                  All administrator and staff access is locked out until the Super Administrator
                  renews or updates the activation date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-md mx-auto">
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#00288e] font-mono tracking-tight">
                    {countdown.daysRemaining}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 font-bold mt-0.5">
                    Days
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 font-mono tracking-tight">
                    {String(countdown.hoursRemaining).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 font-bold mt-0.5">
                    Hours
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 font-mono tracking-tight">
                    {String(countdown.minutesRemaining).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 font-bold mt-0.5">
                    Mins
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-600 font-mono tracking-tight">
                    {String(countdown.secondsRemaining).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 font-bold mt-0.5">
                    Secs
                  </div>
                </div>
              </div>
            )}

            {/* Visual Duration Progress Bar */}
            {!countdown.isDeactivated && (
              <div className="mt-5 max-w-md mx-auto">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5 font-medium">
                  <span>1-Year Term Progress</span>
                  <span className="font-bold text-slate-700">
                    {countdown.percentRemaining}% Remaining
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
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

          {/* License Metadata Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono uppercase font-bold">
                <Calendar className="w-3.5 h-3.5 text-[#00288e]" />
                <span>Activation Date</span>
              </div>
              <div className="font-sans font-bold text-sm text-slate-900 mt-1">
                {countdown.activationFormatted}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {licenseConfig.activationDate || '2026-09-19'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono uppercase font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Calculated Expiration</span>
              </div>
              <div className="font-sans font-bold text-sm text-slate-900 mt-1">
                {countdown.expiryFormatted}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                +1 Year (365 Days Duration)
              </div>
            </div>
          </div>

          {/* Super Admin Activation & Deactivation Control Section */}
          {isSuperAdmin ? (
            <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-950">
                    Super Administrator Controls
                  </span>
                </div>

                {!isEditing && !showDeactivateConfirm && (
                  <div className="flex items-center gap-2">
                    {countdown.isDeactivated ? (
                      <button
                        onClick={handleReactivateClick}
                        id="modal-reactivate-license-btn"
                        className="px-3 py-1.5 bg-[#00288e] hover:bg-[#001f70] text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Reactivate License</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowDeactivateConfirm(true)}
                          id="modal-deactivate-license-btn"
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                          <span>Deactivate License</span>
                        </button>
                        <button
                          onClick={() => setIsEditing(true)}
                          id="modal-change-activation-btn"
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Change Date
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Deactivation Prompt */}
              {showDeactivateConfirm && (
                <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase font-mono">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Confirm Manual License Deactivation</span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Deactivating the system license will immediately lock access for all standard users,
                    operational staff, and administrators. Only the Super Administrator will be able to log in
                    to reactivate it.
                  </p>
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                      Deactivation Reason (Optional note)
                    </label>
                    <input
                      type="text"
                      value={deactivateReason}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                      placeholder="e.g. Contract hiatus / manual security suspension"
                      className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(false)}
                      disabled={isDeactivating}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-mono text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      disabled={isDeactivating}
                      id="modal-confirm-deactivate-btn"
                      className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {isDeactivating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Confirm Deactivation (Lock System)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Activation Form */}
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-amber-200">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">
                      Set Activation Date (Counts 1 full year from this date)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={editActivationDate}
                        onChange={(e) => setEditActivationDate(e.target.value)}
                        required
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#00288e] focus:border-transparent bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSetToday}
                        className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        title="Set activation date to today"
                      >
                        Set to Today
                      </button>
                    </div>
                  </div>

                  {/* Real-time Preview */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Calculated 1-Year Expiry:</span>
                      <strong className="text-slate-900 font-bold">
                        {formatLicenseDate(previewExpiryDate)} ({previewExpiryDate})
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Resulting Days Remaining:</span>
                      <strong
                        className={
                          previewCountdown.isExpired
                            ? 'text-red-600 font-bold'
                            : 'text-emerald-700 font-bold'
                        }
                      >
                        {previewCountdown.daysRemaining} Days ({previewCountdown.status.toUpperCase()})
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">
                      License Designation / Contract Notes
                    </label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="e.g. Annual Enterprise Production License - FY 2026/2027"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-sans focus:ring-2 focus:ring-[#00288e] focus:border-transparent bg-white"
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
                      id="modal-save-license-btn"
                      className="px-4 py-1.5 bg-[#00288e] hover:bg-[#001f70] text-white rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save & Begin 1-Year Countdown</span>
                    </button>
                  </div>
                </form>
              ) : !showDeactivateConfirm && (
                <p className="text-xs text-amber-900/80 leading-relaxed font-sans">
                  {countdown.isDeactivated ? (
                    <span className="text-red-800 font-semibold">
                      This license is currently deactivated. Click &quot;Reactivate License&quot; to pick an activation date and begin a new 1-year countdown.
                    </span>
                  ) : (
                    <>
                      As Super Administrator, setting the activation date initiates the 1-year countdown.
                      You also have the option to manually deactivate the license to suspend operations.
                      Once deactivated or expired, all user logins (including administrators) are
                      locked out until renewed.
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>System License Notice:</strong> The activation date, manual deactivation, and 1-year renewal term
                are exclusively managed by the Super Administrator.
                All staff, users, and administrators can monitor this live countdown. If the license expires or is deactivated,
                logins for non-super-admin accounts will be automatically locked out until renewed.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-500">
            Last Updated:{' '}
            {licenseConfig.updatedAt
              ? new Date(licenseConfig.updatedAt).toLocaleDateString()
              : 'Initial System Activation'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
