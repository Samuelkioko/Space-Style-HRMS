import React from 'react';
import {
  Menu,
  Bell,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  ShieldCheck,
  User,
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react';
import { TabType, NotificationItem, SystemUser, SystemLicenseConfig } from '../types';
import { computeLicenseCountdown } from '../utils/licenseUtils';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  businessName?: string;
  isCloudConnected?: boolean;
  currentUser?: SystemUser | null;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  licenseConfig?: SystemLicenseConfig;
  onOpenLicenseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenMenu,
  onOpenNotifications,
  unreadCount,
  businessName = 'Executive Ledger',
  isCloudConnected = true,
  currentUser,
  onOpenSignIn,
  onSignOut,
  licenseConfig,
  onOpenLicenseModal,
}) => {
  const countdown = computeLicenseCountdown(licenseConfig);
  const isAdminOrSuperAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  return (
    <>
      {/* Desktop Header */}
      <header
        id="desktop-header"
        className="fixed top-0 w-full z-40 bg-[#f7f9fb]/90 backdrop-blur-md border-b border-[#c4c5d5]/60 shadow-xs hidden md:flex justify-between items-center px-10 h-16"
      >
        <div className="flex items-center gap-4">
          <button
            id="desktop-menu-btn"
            onClick={onOpenMenu}
            className="p-2 rounded-lg text-[#00288e] hover:bg-slate-200/60 transition-colors focus:outline-none cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div>
              <h1 className="font-sans text-xl font-bold text-[#00288e] tracking-tight leading-none">
                {businessName || 'MGATOR INDUSTRIES LTD'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#64748b] font-semibold">
                  Firestore Connected
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest bg-[#00288e]/10 text-[#00288e] px-2 py-0.5 rounded font-semibold ml-1">
              Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <button
              id="desktop-nav-dashboard"
              onClick={() => onTabChange('dashboard')}
              className={`font-mono text-xs uppercase tracking-wider py-1 border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-[#00288e] border-[#00288e] font-semibold'
                  : 'text-[#475569] border-transparent hover:text-[#00288e]'
              }`}
            >
              Dashboard
            </button>
            <button
              id="desktop-nav-sales"
              onClick={() => onTabChange('sales')}
              className={`font-mono text-xs uppercase tracking-wider py-1 border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'sales' || activeTab === 'documents'
                  ? 'text-[#00288e] border-[#00288e] font-semibold'
                  : 'text-[#475569] border-transparent hover:text-[#00288e]'
              }`}
            >
              Sales
            </button>
            <button
              id="desktop-nav-expenses"
              onClick={() => onTabChange('expenses')}
              className={`font-mono text-xs uppercase tracking-wider py-1 border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'expenses'
                  ? 'text-[#00288e] border-[#00288e] font-semibold'
                  : 'text-[#475569] border-transparent hover:text-[#00288e]'
              }`}
            >
              Expenses
            </button>
            <button
              id="desktop-nav-cashbook"
              onClick={() => onTabChange('cashbook')}
              className={`font-mono text-xs uppercase tracking-wider py-1 border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'cashbook'
                  ? 'text-[#00288e] border-[#00288e] font-semibold'
                  : 'text-[#475569] border-transparent hover:text-[#00288e]'
              }`}
            >
              Cashbook
            </button>
            <button
              id="desktop-nav-reports"
              onClick={() => onTabChange('reports')}
              className={`font-mono text-xs uppercase tracking-wider py-1 border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'text-[#00288e] border-[#00288e] font-semibold'
                  : 'text-[#475569] border-transparent hover:text-[#00288e]'
              }`}
            >
              Reports
            </button>
            <button
              id="desktop-nav-more"
              onClick={() => onTabChange('more')}
              className={`font-mono text-xs uppercase tracking-wider py-1 border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'more'
                  ? 'text-[#00288e] border-[#00288e] font-semibold'
                  : 'text-[#475569] border-transparent hover:text-[#00288e]'
              }`}
            >
              {currentUser?.role === 'staff' ? 'Customers' : 'Settings'}
            </button>
            {currentUser?.role === 'super_admin' && (
              <button
                id="desktop-nav-superadmin-docs"
                onClick={() => onTabChange('superadmin_docs')}
                className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider py-1 px-2.5 rounded-md border transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  activeTab === 'superadmin_docs'
                    ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Super Admin Docs</span>
              </button>
            )}
          </nav>

          {/* License Countdown Badge for All Users */}
          {onOpenLicenseModal && (
            <button
              onClick={onOpenLicenseModal}
              id="header-license-countdown-btn"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                countdown.isDeactivated
                  ? 'bg-red-900 text-white border-red-950 animate-pulse'
                  : countdown.isExpired
                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                  : countdown.isExpiringSoon
                  ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100'
              }`}
              title={`Annual System License: ${
                countdown.isDeactivated
                  ? 'DEACTIVATED! All logins are locked.'
                  : countdown.isExpired
                  ? 'EXPIRED! All non-SA accounts are disabled.'
                  : `${countdown.daysRemaining} days remaining (Expires ${countdown.expiryFormatted})`
              }. Click to view countdown details.`}
            >
              <Clock
                className={`w-3.5 h-3.5 ${
                  countdown.isDeactivated || countdown.isExpired
                    ? 'text-white'
                    : countdown.isExpiringSoon
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              />
              <span>
                {countdown.isDeactivated
                  ? 'Deactivated'
                  : countdown.isExpired
                  ? 'License Expired'
                  : `${countdown.daysRemaining}d left`}
              </span>
            </button>
          )}

          {/* User Sign In / Profile Switcher Button */}
          {currentUser ? (
            <button
              onClick={onOpenSignIn}
              id="header-user-profile-btn"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              title={`Logged in as ${currentUser.displayName} (${currentUser.role}). Click to switch user or sign in.`}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-6 h-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                    currentUser.role === 'super_admin'
                      ? 'bg-amber-600'
                      : currentUser.role === 'admin'
                      ? 'bg-[#00288e]'
                      : 'bg-slate-600'
                  }`}
                >
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {currentUser.displayName}
                </div>
                <div className="text-[10px] font-mono text-slate-500 uppercase leading-none">
                  {currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role}
                </div>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                  currentUser.role === 'super_admin'
                    ? 'bg-amber-100 text-amber-950 border border-amber-400'
                    : currentUser.role === 'admin'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {currentUser.role === 'super_admin'
                  ? 'Super Admin'
                  : currentUser.role === 'admin'
                  ? 'Admin'
                  : 'Staff'}
              </span>
            </button>
          ) : (
            onOpenSignIn && (
              <button
                onClick={onOpenSignIn}
                id="header-signin-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-mono text-xs uppercase font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )
          )}

          {/* Sign Out Button (when logged in) */}
          {currentUser && onSignOut && (
            <button
              onClick={onSignOut}
              id="header-signout-btn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 transition-all font-mono text-xs uppercase font-bold cursor-pointer shadow-2xs"
              title="Sign Out of Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sign Out</span>
            </button>
          )}

          <button
            id="desktop-notifications-btn"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-[#00288e] hover:bg-slate-200/60 transition-colors focus:outline-none cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header
        id="mobile-header"
        className="fixed top-0 w-full z-40 bg-[#f7f9fb]/95 backdrop-blur-md border-b border-[#c4c5d5]/70 shadow-xs flex justify-between items-center px-4 h-16 md:hidden"
      >
        <button
          id="mobile-menu-btn"
          onClick={onOpenMenu}
          className="p-2 -ml-2 text-[#00288e] hover:bg-slate-200/50 rounded-lg active:scale-95 transition-transform cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center px-1">
          <h1
            onClick={() => onTabChange('dashboard')}
            className="font-sans text-sm sm:text-base font-bold text-[#00288e] tracking-tight cursor-pointer truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none"
          >
            {businessName || 'MGATOR INDUSTRIES'}
          </h1>
          {currentUser ? (
            <button
              onClick={onOpenSignIn}
              id="mobile-user-profile-btn"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-bold uppercase border bg-white border-slate-200 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500'
                    : currentUser.role === 'super_admin'
                    ? 'bg-purple-600'
                    : 'bg-blue-500'
                }`}
              />
              <span className="truncate max-w-[45px] xs:max-w-[65px]">{currentUser.displayName.split(' ')[0]}</span>
              <span className="text-[8px] text-slate-500">
                ({currentUser.role === 'super_admin' ? 'SA' : currentUser.role === 'admin' ? 'Adm' : 'Stf'})
              </span>
            </button>
          ) : (
            onOpenSignIn && (
              <button
                onClick={onOpenSignIn}
                id="mobile-signin-btn"
                className="px-2 py-0.5 rounded bg-[#00288e] text-white font-mono text-[10px] uppercase font-bold cursor-pointer shrink-0 whitespace-nowrap"
              >
                Sign In
              </button>
            )
          )}

          {/* Mobile License Countdown for All Users */}
          {onOpenLicenseModal && (
            <button
              onClick={onOpenLicenseModal}
              id="mobile-license-countdown-btn"
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border cursor-pointer shrink-0 whitespace-nowrap ${
                countdown.isDeactivated
                  ? 'bg-red-900 text-white border-red-950 font-black'
                  : countdown.isExpired
                  ? 'bg-red-600 text-white border-red-700'
                  : countdown.isExpiringSoon
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {countdown.isDeactivated ? 'Deact.' : countdown.isExpired ? 'Expired' : `${countdown.daysRemaining}d`}
            </button>
          )}
        </div>

        <button
          id="mobile-notifications-btn"
          onClick={onOpenNotifications}
          className="relative p-2 -mr-2 text-[#00288e] hover:bg-slate-200/50 rounded-lg active:scale-95 transition-transform cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-white" />
          )}
        </button>
      </header>
    </>
  );
};
