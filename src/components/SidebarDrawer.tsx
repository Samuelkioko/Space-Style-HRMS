import React from 'react';
import {
  X,
  LayoutGrid,
  Banknote,
  Receipt,
  Wallet,
  BarChart3,
  MoreHorizontal,
  Building,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  FileCheck,
  LogOut,
  User,
  Clock,
} from 'lucide-react';
import { TabType, SystemUser, SystemLicenseConfig } from '../types';
import { computeLicenseCountdown } from '../utils/licenseUtils';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  businessName?: string;
  currentUser?: SystemUser | null;
  onSignOut?: () => void;
  licenseConfig?: SystemLicenseConfig;
  onOpenLicenseModal?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  businessName,
  currentUser,
  onSignOut,
  licenseConfig,
  onOpenLicenseModal,
}) => {
  if (!isOpen) return null;

  const isStaff = currentUser?.role === 'staff';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdminOrSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const countdown = computeLicenseCountdown(licenseConfig);

  const links: { id: TabType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: <LayoutGrid className="w-5 h-5" />,
      desc: 'Real-time overview & KPIs',
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: <Banknote className="w-5 h-5" />,
      desc: 'Quotes, invoices, receipts & confirmed sales',
    },
    {
      id: 'expenses',
      label: 'Expense Ledger',
      icon: <Receipt className="w-5 h-5" />,
      desc: isStaff ? 'Expense records (View only for Staff)' : 'Overheads & operating burn',
    },
    {
      id: 'cashbook',
      label: 'Cashbook & Banking',
      icon: <Wallet className="w-5 h-5" />,
      desc: 'Liquid funds & balance sheet',
    },
    {
      id: 'reports',
      label: 'Financial Statements',
      icon: <BarChart3 className="w-5 h-5" />,
      desc: 'Daily, weekly, monthly & yearly reports',
    },
    {
      id: 'more',
      label: isStaff ? 'Customers & Clients' : 'Settings & Cloud Sync',
      icon: <MoreHorizontal className="w-5 h-5" />,
      desc: isStaff ? 'Add and view customers & Tax PINs' : 'Company profile, Firebase & backups',
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'superadmin_docs' as TabType,
            label: 'Super Admin Docs',
            icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
            desc: 'System architecture, RBAC & security guide',
          },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="sidebar-menu-drawer"
        className="bg-white w-full max-w-xs sm:max-w-sm h-full shadow-2xl flex flex-col border-r border-[#c4c5d5]"
      >
        {/* Brand Header */}
        <div className="px-6 py-5 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00288e] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              EL
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-[#00288e] tracking-tight truncate max-w-[200px]">
                {businessName || 'MGATOR INDUSTRIES LTD'}
              </h3>
              <p className="font-mono text-[10px] text-[#64748b] uppercase">Enterprise Edition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#94a3b8] px-3 py-2 font-semibold">
            Core Modules
          </p>

          {links.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  onTabChange(link.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-[#00288e] text-white shadow-xs'
                    : 'text-[#191c1e] hover:bg-[#f1f5f9]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={isActive ? 'text-white' : 'text-[#00288e]'}>
                    {link.icon}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-semibold leading-tight">{link.label}</p>
                    <p
                      className={`font-mono text-[11px] ${
                        isActive ? 'text-blue-100' : 'text-[#64748b]'
                      }`}
                    >
                      {link.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#94a3b8]'}`}
                />
              </button>
            );
          })}
        </div>

        {/* User Session & Sign Out */}
        {currentUser && (
          <div className="p-4 bg-slate-100/70 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
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
                <div className="overflow-hidden">
                  <p className="font-sans text-xs font-bold text-slate-800 truncate">
                    {currentUser.displayName}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500 uppercase">
                    {currentUser.role === 'super_admin'
                      ? 'Super Admin'
                      : currentUser.role === 'admin'
                      ? 'Admin'
                      : 'Staff'}{' '}
                    · {currentUser.department || 'Staff'}
                  </p>
                </div>
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 hover:border-red-200 font-mono text-xs uppercase font-bold transition-all shadow-2xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}

        {/* License Countdown Card for All Users */}
        {onOpenLicenseModal && (
          <div className="px-4 py-2 border-t border-[#e2e8f0]">
            <button
              onClick={() => {
                onClose();
                onOpenLicenseModal();
              }}
              id="sidebar-license-countdown-btn"
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                countdown.isDeactivated
                  ? 'bg-red-950/20 border-red-400 text-red-900 hover:bg-red-950/30'
                  : countdown.isExpired
                  ? 'bg-red-50 border-red-300 text-red-950 hover:bg-red-100'
                  : countdown.isExpiringSoon
                  ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                  : 'bg-[#00288e]/5 border-[#00288e]/20 text-[#00288e] hover:bg-[#00288e]/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-mono text-[10px] uppercase font-bold tracking-wider">
                    License Validity
                  </div>
                  <div className="font-sans text-xs font-semibold">
                    {countdown.isDeactivated
                      ? 'Deactivated (Locked)'
                      : countdown.isExpired
                      ? 'Expired (0d Left)'
                      : `${countdown.daysRemaining} Days Remaining`}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </button>
          </div>
        )}

        {/* Footer Business Entity Info */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#e2e8f0] font-mono text-[11px] text-[#64748b] space-y-1">
          <div className="flex justify-between">
            <span>Fiscal Year:</span>
            <span className="text-[#191c1e] font-semibold">2026-Q3</span>
          </div>
          <div className="flex justify-between">
            <span>Audit Status:</span>
            <span className="text-[#006d30] font-semibold">Central Database Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
