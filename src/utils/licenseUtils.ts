import { SystemLicenseConfig, LicenseCountdownDetails } from '../types';

export const SYSTEM_LICENSE_STORAGE_KEY = 'executive_ledger_system_license';

// Default system activation date (current local anchor)
export const DEFAULT_ACTIVATION_DATE = '2026-09-19';

export const DEFAULT_SYSTEM_LICENSE: SystemLicenseConfig = {
  activationDate: DEFAULT_ACTIVATION_DATE,
  expiryDate: calculateOneYearExpiry(DEFAULT_ACTIVATION_DATE),
  durationYears: 1,
  isDeactivated: false,
  activatedBy: 'Super Administrator',
  notes: 'Annual Enterprise Commercial License',
  updatedAt: new Date().toISOString(),
};

/**
 * Calculates the exact expiry date 1 year from the given activation date (YYYY-MM-DD).
 * For example: 2026-09-19 -> 2027-09-19.
 */
export function calculateOneYearExpiry(activationDateStr: string): string {
  if (!activationDateStr) return '';
  const parts = activationDateStr.split('-');
  if (parts.length !== 3) return '';

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

  const nextYear = year + 1;
  // Handle February 29 leap year edge case
  let nextDay = day;
  if (month === 2 && day === 29) {
    const isLeapYear = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
    if (!isLeapYear) {
      nextDay = 28;
    }
  }

  return `${nextYear}-${String(month).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}

/**
 * Formats YYYY-MM-DD into readable date format e.g. "Sep 19, 2026"
 */
export function formatLicenseDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Computes full countdown metrics, days remaining, status, and expiry details.
 * Supports passing either an activation date string or a complete SystemLicenseConfig object.
 */
export function computeLicenseCountdown(
  licenseOrDate: string | SystemLicenseConfig | undefined | null,
  isExplicitlyDeactivated?: boolean
): LicenseCountdownDetails {
  let cleanActivation = DEFAULT_ACTIVATION_DATE;
  let isDeactivated = false;
  let deactivatedAt: string | undefined;
  let deactivatedBy: string | undefined;
  let deactivationReason: string | undefined;

  if (typeof licenseOrDate === 'object' && licenseOrDate !== null) {
    cleanActivation = (licenseOrDate.activationDate || DEFAULT_ACTIVATION_DATE).trim();
    isDeactivated = Boolean(licenseOrDate.isDeactivated || isExplicitlyDeactivated);
    deactivatedAt = licenseOrDate.deactivatedAt;
    deactivatedBy = licenseOrDate.deactivatedBy;
    deactivationReason = licenseOrDate.deactivationReason;
  } else if (typeof licenseOrDate === 'string') {
    cleanActivation = (licenseOrDate || DEFAULT_ACTIVATION_DATE).trim();
    isDeactivated = Boolean(isExplicitlyDeactivated);
  } else {
    isDeactivated = Boolean(isExplicitlyDeactivated);
  }

  const expiryDate = calculateOneYearExpiry(cleanActivation);

  // Set start of activation day
  const [ay, am, ad] = cleanActivation.split('-').map(Number);
  const startTimestamp = new Date(ay || 2026, (am || 9) - 1, ad || 19, 0, 0, 0).getTime();

  // Set end of expiry day (23:59:59.999)
  const [ey, em, ed] = expiryDate.split('-').map(Number);
  const expiryTimestamp = new Date(ey || 2027, (em || 9) - 1, ed || 19, 23, 59, 59, 999).getTime();

  const now = Date.now();
  const remainingMs = expiryTimestamp - now;
  const totalDurationMs = Math.max(1, expiryTimestamp - startTimestamp);

  // If manually deactivated, force expired/deactivated status
  if (isDeactivated) {
    return {
      activationDate: cleanActivation,
      expiryDate,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      percentRemaining: 0,
      isExpired: true,
      isExpiringSoon: false,
      isDeactivated: true,
      status: 'deactivated',
      activationFormatted: formatLicenseDate(cleanActivation),
      expiryFormatted: formatLicenseDate(expiryDate),
      deactivationFormatted: deactivatedAt ? formatLicenseDate(deactivatedAt.split('T')[0]) : undefined,
      deactivationReason: deactivationReason || 'Manually deactivated by Super Administrator',
    };
  }

  const isExpired = remainingMs <= 0;

  if (isExpired) {
    return {
      activationDate: cleanActivation,
      expiryDate,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      percentRemaining: 0,
      isExpired: true,
      isExpiringSoon: false,
      isDeactivated: false,
      status: 'expired',
      activationFormatted: formatLicenseDate(cleanActivation),
      expiryFormatted: formatLicenseDate(expiryDate),
    };
  }

  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((remainingMs / (1000 * 60 * 60)) % 24));
  const minutesRemaining = Math.max(0, Math.floor((remainingMs / (1000 * 60)) % 60));
  const secondsRemaining = Math.max(0, Math.floor((remainingMs / 1000) % 60));
  const percentRemaining = Math.max(0, Math.min(100, Math.round((remainingMs / totalDurationMs) * 100)));
  const isExpiringSoon = daysRemaining <= 30;

  return {
    activationDate: cleanActivation,
    expiryDate,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    percentRemaining,
    isExpired: false,
    isExpiringSoon,
    isDeactivated: false,
    status: isExpiringSoon ? 'expiring_soon' : 'active',
    activationFormatted: formatLicenseDate(cleanActivation),
    expiryFormatted: formatLicenseDate(expiryDate),
  };
}

/**
 * Loads cached system license from localStorage or falls back to default.
 */
export function getLocalLicenseConfig(): SystemLicenseConfig {
  try {
    const raw = localStorage.getItem(SYSTEM_LICENSE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SystemLicenseConfig;
      if (parsed && parsed.activationDate) {
        if (!parsed.expiryDate) {
          parsed.expiryDate = calculateOneYearExpiry(parsed.activationDate);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local license config:', e);
  }

  return {
    activationDate: DEFAULT_ACTIVATION_DATE,
    expiryDate: calculateOneYearExpiry(DEFAULT_ACTIVATION_DATE),
    durationYears: 1,
    isDeactivated: false,
    activatedBy: 'Super Administrator',
    notes: 'Annual Enterprise Commercial License',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Saves system license to localStorage.
 */
export function saveLocalLicenseConfig(config: SystemLicenseConfig): void {
  try {
    localStorage.setItem(SYSTEM_LICENSE_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving local license config:', e);
  }
}
