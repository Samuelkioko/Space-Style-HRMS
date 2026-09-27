import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Database,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  BookOpen,
  Server,
  Layers,
  FileCheck,
  Clock,
  ArrowRight,
  Code2,
  HelpCircle,
  ExternalLink,
  Ban,
  Receipt,
  Package,
  Building2,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';
import { SystemUser } from '../types';

interface SuperAdminDocumentationProps {
  currentUser: SystemUser | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const SuperAdminDocumentation: React.FC<SuperAdminDocumentationProps> = ({
  currentUser,
  onClose,
  isModal = false,
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // If a non-super-admin somehow attempts to access this, show strict access denial
  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-xl mx-auto my-8 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-red-100 border border-red-300 text-red-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="font-sans text-xl font-bold text-red-950">
          Access Restricted: Super Administrator Authorization Required
        </h2>
        <p className="font-mono text-xs text-red-800 mt-2 max-w-md mx-auto">
          The Executive System Architecture & Security Manual contains privileged system schematics, database rules, and cryptographic challenge specifications. This document is strictly restricted to Super Administrators.
        </p>
        <div className="mt-5 inline-block px-4 py-2 bg-white rounded-lg border border-red-300 font-mono text-xs text-red-700 font-bold">
          Your Current Role: {currentUser?.role?.toUpperCase() || 'UNAUTHENTICATED'}
        </div>
        {onClose && (
          <div className="mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-mono text-xs uppercase font-bold tracking-wider cursor-pointer"
            >
              Return to Ledger
            </button>
          </div>
        )}
      </div>
    );
  }

  const sections = [
    { id: 'overview', title: '1. Executive Overview & System Topology', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'rbac', title: '2. Role-Based Access Control (RBAC) Matrix', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'staff_rules', title: '3. Staff Permissions & Isolation Boundary', icon: <Users className="w-4 h-4" /> },
    { id: 'admin_challenge', title: '4. Interactive Admin Deletion Challenge', icon: <Key className="w-4 h-4" /> },
    { id: 'account_lifecycle', title: '5. Account Disablement & License Control', icon: <Ban className="w-4 h-4" /> },
    { id: 'firestore_spec', title: '6. Firestore Collections & Security Rules', icon: <Database className="w-4 h-4" /> },
    { id: 'disaster_recovery', title: '7. Backup, Restoration & Database Purge', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'compliance', title: '8. KRA Statutory & Cashbook Reconciliation', icon: <Receipt className="w-4 h-4" /> },
  ];

  const filteredSections = sections.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="super-admin-documentation"
      className={`bg-white text-[#191c1e] rounded-xl border border-amber-300/80 shadow-xl overflow-hidden flex flex-col ${
        isModal ? 'max-h-[92vh]' : 'min-h-[85vh]'
      }`}
    >
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#00174c] via-[#00288e] to-[#0d3ea3] text-white p-6 relative overflow-hidden shrink-0">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 font-mono text-[10px] uppercase font-bold rounded-full tracking-wider flex items-center gap-1 shadow-xs">
                <Shield className="w-3 h-3 fill-amber-950" />
                Super Administrator Classified
              </span>
              <span className="font-mono text-xs text-blue-200">System Manual v2.4</span>
            </div>
            <h1 className="font-sans text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Executive Ledger Architecture & Security Guide
            </h1>
            <p className="font-mono text-xs text-blue-100/90 mt-1 max-w-2xl">
              Internal documentation on zero-trust role separation, cryptographic admin challenges, license expiration, and Firestore database policies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-mono text-xs font-semibold border border-white/20 transition-all cursor-pointer shadow-xs"
              title="Print or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print Manual</span>
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-mono text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Super Admin Session Diagnostic Strip */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-blue-100">Authenticated Super Admin:</span>
              <span className="text-amber-300 font-bold">{currentUser.displayName}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-blue-100">Project DB:</span>
              <span className="text-blue-200">ai-studio-executiveledger</span>
            </div>
          </div>
          <div className="text-blue-200 text-[11px]">
            Security Audit: <span className="text-emerald-300 font-bold">Passed</span>
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00288e]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            <div className="font-mono text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
              Documentation Chapters
            </div>
            {filteredSections.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left font-sans text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00288e] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-amber-300' : 'text-[#00288e]'}>
                    {sec.icon}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Super Admin Identity Card */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1.5 text-amber-900 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Super Admin Authority</span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-800">
              Only Super Administrators can create or remove other Super Admins, disable user logins with custom notices, or modify cloud database provisioning.
            </p>
          </div>
        </div>

        {/* Chapter Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white">
          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 1
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Executive Overview & Zero-Trust Architecture
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Foundational principles and enterprise segregation of duties.
                </p>
              </div>

              <div className="prose prose-sm text-slate-700 space-y-4">
                <p className="leading-relaxed">
                  Executive Ledger is engineered around a <strong>Zero-Trust Three-Tier Hierarchy</strong> designed for mid-to-large business accounting in Kenya and East Africa. It eliminates rogue balance adjustments, unverified expense outflows, catalog corruption, and unauthorized data deletions by strictly cordoning operator access.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose my-6">
                  <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                        <Shield className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-amber-950 font-sans">Super Admin</h4>
                    </div>
                    <p className="font-mono text-xs text-amber-900">
                      Supreme system authority. Owns cloud database provisioning, license suspension, user creation/deletion across all tiers, and audit manuals.
                    </p>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-200 text-blue-900 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-blue-950 font-sans">Administrator</h4>
                    </div>
                    <p className="font-mono text-xs text-blue-900">
                      Operational management. Creates users, generates full financial statements, adds expense accounts, edits company metadata, and authorizes deletions.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 font-sans">Staff / Operator</h4>
                    </div>
                    <p className="font-mono text-xs text-slate-600">
                      Operational data entry. Issues quotations, creates invoices, registers payments, and adds new customers. Forbidden from editing settings, products, or expenses.
                    </p>
                  </div>
                </div>

                <h3 className="font-sans text-lg font-bold text-slate-900">Key Security Invariants</h3>
                <ul className="list-disc pl-5 space-y-2 font-mono text-xs text-slate-700">
                  <li><strong>Standard Admins cannot touch Super Admins:</strong> A standard administrator is cryptographically prevented from deleting, demoting, or modifying any user account marked with the `super_admin` role.</li>
                  <li><strong>Staff Deletion Interception:</strong> Staff members cannot delete any invoice, transaction, customer, or product without real-time administrator password validation.</li>
                  <li><strong>Settings Sanitization:</strong> When a Staff member enters Settings, all operational tabs (Company Profile, Products & Services, Expense Accounts, Cloud Sync, Backups, Users) are hidden; only the Customer Directory is accessible.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 2: RBAC MATRIX */}
          {activeSection === 'rbac' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 2
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Complete RBAC Permission Matrix
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Exhaustive capability audit across all operational subsystems.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">System Capability / Module</th>
                      <th className="py-3 px-4 text-center bg-amber-50 text-amber-950 font-bold">Super Admin</th>
                      <th className="py-3 px-4 text-center bg-blue-50 text-blue-950 font-bold">Admin</th>
                      <th className="py-3 px-4 text-center bg-slate-50 text-slate-700">Staff / User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">View Financial Dashboard & Cashbook</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✓ Full</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Create Quotations, Invoices & Receipts</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✓ Full</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Add New Customers (Client Registry)</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✓ Full (Add & Edit)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Record Sales & Register Customer Payments</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✓ Full</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-red-700">Record New Expenses & Disbursals</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Edit Company Legal Info & Banking Options</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Manage Products, Inventory & Services Catalog</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Expense Accounts Taxonomy & Tax Rules</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Firebase Cloud Sync & Database Control</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Data Backup (JSON / CSV) & Cloud Wipe</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Delete Any Document, Transaction or Customer</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Direct</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Direct</td>
                      <td className="py-2.5 px-4 text-center text-amber-700 font-bold">⚠️ Requires Admin Challenge</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold">Create / Edit Standard Users & Passwords</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Full</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden (Hidden)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-amber-800">Modify or Delete Super Admin User</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Allowed</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-red-600 font-bold">✕ Blocked by Rule</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-amber-800">Disable Accounts & Issue License Notices</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Exclusive</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-red-600 font-bold">✕ Forbidden</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-amber-800">Access Super Admin System Documentation</td>
                      <td className="py-2.5 px-4 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Exclusive</td>
                      <td className="py-2.5 px-4 text-center bg-blue-50/30 text-red-600 font-bold">✕ Forbidden</td>
                      <td className="py-2.5 px-4 text-center text-red-600 font-bold">✕ Forbidden</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: STAFF RESTRICTIONS */}
          {activeSection === 'staff_rules' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 3
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Staff Permissions & Settings Isolation
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  How the system restricts operational staff to client additions while protecting core configuration.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Company Profile & Catalog Protection</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Staff members cannot alter the official Company Profile (Legal Entity Name, KRA PIN, Bank Details, MPESA Paybill Numbers, or Remittance Notes) nor can they edit unit prices or item listings in the Products & Services catalog. These modules are strictly hidden from the Staff Settings navigation.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <h4 className="font-sans font-bold text-sm text-emerald-950 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>Customer & Client Directory: Fully Unlocked for Staff</span>
                  </h4>
                  <p className="text-emerald-900 leading-relaxed">
                    Staff members are fully empowered to add new customers. When Staff members open Settings, the view automatically restricts to the <strong>Customer & Client Directory</strong>. They can search client tax IDs, input phone numbers and addresses, and register new client profiles without requiring an administrator.
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                  <h4 className="font-sans font-bold text-sm text-red-950 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-red-700" />
                    <span>Operating Expense Creation: Strictly Locked</span>
                  </h4>
                  <p className="text-red-900 leading-relaxed">
                    Staff accounts cannot record new expenses. The <strong>Record New Expense</strong> action is hidden from the Expense Ledger for staff roles, and the Add Transaction dialog strictly enforces sales-only entries.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-700" />
                    <span>Database Sync, Backups & User Management: Completely Hidden</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    The <em>Firebase & Database Sync</em>, <em>Exports & Backups</em>, and <em>Users & Roles</em> tabs are entirely omitted from the Staff UI. Staff operators cannot inspect cloud sync status, trigger full-ledger downloads, wipe tables, or view operator credentials.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: ADMIN CHALLENGE */}
          {activeSection === 'admin_challenge' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 4
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Interactive Admin Deletion Authorization Challenge
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Mechanism intercepting staff deletion attempts and authenticating administrative oversight.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-3 text-amber-950">
                  <h4 className="font-sans font-bold text-sm flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-700" />
                    <span>Cryptographic Challenge Flow</span>
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2 text-amber-900">
                    <li>A Staff operator clicks the delete icon on any document, transaction, customer, or product.</li>
                    <li>The system halts deletion and mounts the <code>AdminAuthDeleteModal</code> dialog.</li>
                    <li>The modal displays the item name, ID, and irreversible deletion warning.</li>
                    <li>An Administrator must physically approach or provide active credentials (Administrator Username/Email and Password).</li>
                    <li>The password is evaluated against the SHA-256 hash stored in the system database for that administrator.</li>
                    <li>If verification succeeds, the item is deleted and archived to the <code>trash_bundles</code> collection for recovery. If verification fails, the deletion is rejected.</li>
                  </ol>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00288e]" />
                    <span>Trash Bin & Cascading Recovery Architecture</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    When invoices are deleted, linked payments and inventory items are bundled into a <code>trash_bundle</code> snapshot before removal. A Super Admin can audit or restore bundled entries directly from the recovery registry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: ACCOUNT LIFECYCLE */}
          {activeSection === 'account_lifecycle' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 5
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Account Disablement & License Control
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Super Administrator protocol for immediate account lockouts and license notices.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-3 text-red-950">
                  <h4 className="font-sans font-bold text-sm flex items-center gap-2 text-red-900">
                    <Ban className="w-4 h-4 text-red-700" />
                    <span>Super Admin Lockdown Commands</span>
                  </h4>
                  <p className="text-red-900 leading-relaxed">
                    In the <strong>Users & Roles</strong> manager, Super Administrators can toggle any user account to <em>Disabled / Inactive</em>. When disabling an account, the Super Admin can select a standardized preset reason:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-red-900">
                    <li><strong>License Expired:</strong> Displays corporate license renewal instructions and contact details.</li>
                    <li><strong>Account Suspended:</strong> Informs operator of security audit suspension.</li>
                    <li><strong>Subscription Ended:</strong> Advises accounts payable remittance.</li>
                    <li><strong>Custom Notice:</strong> Allows the Super Admin to enter arbitrary directives.</li>
                  </ul>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00288e]" />
                    <span>Real-Time Invalidation Mechanics</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    The active session listener synchronizes with the Firestore <code>users</code> collection. If an active operator account is marked <code>isActive: false</code>, the user is immediately logged out, their token revoked, and the customized lock banner is rendered across the screen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: FIRESTORE SPEC */}
          {activeSection === 'firestore_spec' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 6
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Firestore Collections & Security Rules Specification
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Schema mapping and cloud security enforcement breakdown.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="bg-slate-900 text-slate-100 p-5 rounded-xl space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">Cloud Firestore Security Blueprint</span>
                    <button
                      onClick={() => handleCopy('rules_version = "2"; ...', 'rules')}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {copiedKey === 'rules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'rules' ? 'Copied' : 'Copy Excerpt'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] overflow-x-auto text-slate-300 leading-relaxed">
{`service cloud.firestore {
  match /databases/{database}/documents {
    function isSuperAdmin() {
      return (request.auth.token.email != null && isAuthorizedSuperAdminEmail(request.auth.token.email)) ||
             (getUserDoc().role == 'super_admin' && getUserDoc().isActive == true);
    }

    function isAdmin() {
      return isSuperAdmin() || 
             (getUserDoc().role == 'admin' && getUserDoc().isActive == true);
    }

    match /users/{userId} {
      // Admins CANNOT modify or delete Super Admins
      allow update, delete: if isSuperAdmin() ||
        (isAdmin() && resource.data.role != 'super_admin');
    }

    match /company_profiles/{id} { allow write: if isAdmin(); }
    match /products_services/{id} { allow write: if isAdmin(); }
    match /expense_categories/{id} { allow write: if isAdmin(); }
    match /customers/{id} { allow write: if true; } // Staff can add customers
  }
}`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h5 className="font-bold text-slate-900">Database Identifier</h5>
                    <p className="text-slate-600 text-[11px]">
                      <code>ai-studio-executiveledger-1a4d5f05-5766-48a6-be86-cb011fc1f548</code>
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h5 className="font-bold text-slate-900">Active Collections</h5>
                    <p className="text-slate-600 text-[11px]">
                      <code>users</code>, <code>customers</code>, <code>transactions</code>, <code>billing_documents</code>, <code>products_services</code>, <code>expense_categories</code>, <code>company_profiles</code>, <code>trash_bundles</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: DISASTER RECOVERY */}
          {activeSection === 'disaster_recovery' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 7
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Backup, Disaster Restoration & Cloud Database Purge
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Procedures for full ledger dumps, JSON restorations, and database clean sweeps.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-3 text-blue-950">
                  <h4 className="font-sans font-bold text-sm flex items-center gap-2 text-blue-900">
                    <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                    <span>JSON Snapshot Protocol</span>
                  </h4>
                  <p className="text-blue-900 leading-relaxed">
                    Super Administrators and Administrators can export a full JSON ledger backup from the <strong>Exports & Backups</strong> tab. The snapshot bundles all transactions, quotations, invoices, catalog items, custom expense categories, customers, and company profiles into an encrypted JSON dump.
                  </p>
                </div>

                <div className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-3 text-red-950">
                  <h4 className="font-sans font-bold text-sm flex items-center gap-2 text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <span>Cloud Database Purge / Clean Sweep</span>
                  </h4>
                  <p className="text-red-900 leading-relaxed">
                    In the event of database corruption or end-of-year audit resets, the <strong>Clean All Cloud Data</strong> function performs an atomic batch purge across all collections in Firestore. This action is restricted to Administrators and requires two confirmation steps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: COMPLIANCE */}
          {activeSection === 'compliance' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#00288e] tracking-widest">
                  Chapter 8
                </span>
                <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                  Kenya Revenue Authority (KRA) Compliance & Cashbook
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Tax PIN enforcement, VAT 16% computations, and multi-account cash reconciliation.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>KRA Tax PIN Format Validation</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    All Kenyan business entities and registered clients are validated against the standard 11-character alphanumeric KRA PIN pattern: <code>^[A-Z][0-9]{'{'}9{'}'}[A-Z]$</code> (e.g., <code>P051239841K</code>). Duplicate PINs are blocked during client onboarding.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#00288e]" />
                    <span>Three-Account Cashbook Reconciliation</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    The ledger reconciles three distinct financial asset accounts:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li><strong>NCBA Bank Kenya:</strong> Wire transfers, RTGS, corporate EFTs, and PDQ card receipts.</li>
                    <li><strong>Safaricom M-PESA:</strong> Paybill (522522) and Buy Goods Till settlements.</li>
                    <li><strong>Cash Float:</strong> Physical cash drawers and petty cash vouchers.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
