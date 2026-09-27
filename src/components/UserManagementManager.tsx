import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Save,
  LogIn,
  RefreshCw,
  Lock,
  Key,
  Ban,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { SystemUser, UserRole } from '../types';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  hashPassword,
  isSuperAdminRole,
  isAdminRole,
} from '../services/firebaseService';

interface UserManagementManagerProps {
  users: SystemUser[];
  currentUser: SystemUser | null;
  isAdmin: boolean;
  onSaveUser: (user: SystemUser) => Promise<boolean | void>;
  onDeleteUser: (userId: string) => Promise<boolean | void>;
  onOpenSignInModal: () => void;
}

export const UserManagementManager: React.FC<UserManagementManagerProps> = ({
  users,
  currentUser,
  isAdmin,
  onSaveUser,
  onDeleteUser,
  onOpenSignInModal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'staff'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [quickStatusModalUser, setQuickStatusModalUser] = useState<SystemUser | null>(null);

  const isCurrentUserSuperAdmin = isSuperAdminRole(currentUser);
  const isCurrentUserAdmin = isAdminRole(currentUser);

  // Form State
  const [formData, setFormData] = useState<{
    displayName: string;
    email: string;
    username?: string;
    role: UserRole;
    password?: string;
    phone: string;
    department: string;
    isActive: boolean;
    disabledReason?: 'license_expired' | 'account_suspended' | 'custom';
    disabledMessage?: string;
  }>({
    displayName: '',
    email: '',
    username: '',
    role: 'staff',
    password: '',
    phone: '',
    department: '',
    isActive: true,
    disabledReason: undefined,
    disabledMessage: '',
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setModalError(null);
    setFormData({
      displayName: '',
      email: '',
      username: '',
      role: 'staff',
      password: '',
      phone: '',
      department: '',
      isActive: true,
      disabledReason: undefined,
      disabledMessage: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: SystemUser) => {
    // Check if current user is permitted to edit this user
    const targetIsSuperAdmin = isSuperAdminRole(user);

    if (targetIsSuperAdmin && !isCurrentUserSuperAdmin) {
      alert('Access Denied: Standard Administrators cannot modify the Super Administrator account.');
      return;
    }

    setEditingUser(user);
    setModalError(null);
    setFormData({
      displayName: user.displayName,
      email: user.email,
      username: user.username || user.email.split('@')[0] || '',
      role: user.role,
      password: '',
      phone: user.phone || '',
      department: user.department || '',
      isActive: user.isActive !== false,
      disabledReason: user.disabledReason,
      disabledMessage: user.disabledMessage || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanName = formData.displayName.trim();
    const cleanUsername = (formData.username || '').trim().toLowerCase().replace(/\s+/g, '') || cleanEmail.split('@')[0];

    if (!cleanName || !cleanEmail) return;

    setModalError(null);

    // Permission Enforcement: Standard admin cannot assign or modify super_admin
    if (formData.role === 'super_admin' && !isCurrentUserSuperAdmin) {
      setModalError('Permission Denied: Only a Super Administrator can assign or create Super Admin accounts.');
      return;
    }

    if (editingUser && isSuperAdminRole(editingUser) && !isCurrentUserSuperAdmin) {
      setModalError('Permission Denied: Standard Administrators cannot edit or modify Super Administrator accounts.');
      return;
    }

    // Duplicate Email Check
    const duplicate = users.find((u) => {
      if (editingUser && u.id === editingUser.id) return false;
      return u.email.trim().toLowerCase() === cleanEmail;
    });

    if (duplicate) {
      setModalError(`A user account is already registered with email "${cleanEmail}" (${duplicate.displayName}). Duplicate accounts are not permitted.`);
      return;
    }

    // Duplicate Username Check
    if (cleanUsername) {
      const duplicateUsername = users.find((u) => {
        if (editingUser && u.id === editingUser.id) return false;
        const existingU = (u.username || u.email.split('@')[0] || '').trim().toLowerCase();
        return existingU === cleanUsername;
      });

      if (duplicateUsername) {
        setModalError(`Username "${cleanUsername}" is already taken by ${duplicateUsername.displayName}. Please choose a different username.`);
        return;
      }
    }

    // Role is mandatory
    if (!formData.role) {
      setModalError('A user role must be selected.');
      return;
    }

    setIsSaving(true);
    try {
      const isRootAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      let finalPasswordHash = editingUser?.password;
      if (formData.password?.trim()) {
        finalPasswordHash = await hashPassword(formData.password.trim());
      }

      // Disabled message handling
      let finalDisabledReason = formData.disabledReason;
      let finalDisabledMsg = formData.disabledMessage?.trim();

      if (!formData.isActive) {
        if (!finalDisabledReason) {
          finalDisabledReason = 'custom';
        }
        if (!finalDisabledMsg) {
          if (finalDisabledReason === 'license_expired') {
            finalDisabledMsg = 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew.';
          } else if (finalDisabledReason === 'account_suspended') {
            finalDisabledMsg = 'Account Suspended: Access for this account has been suspended by system administration.';
          } else {
            finalDisabledMsg = 'Access Denied: This account has been deactivated by system administration.';
          }
        }
      } else {
        finalDisabledReason = undefined;
        finalDisabledMsg = undefined;
      }

      const assignedRole: UserRole = isRootAdmin ? 'super_admin' : formData.role;

      const userToSave: SystemUser = {
        id: editingUser ? editingUser.id : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        displayName: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        role: assignedRole,
        password: finalPasswordHash,
        phone: formData.phone.trim() || undefined,
        department: formData.department.trim() || undefined,
        isActive: isRootAdmin ? true : formData.isActive,
        disabledReason: isRootAdmin ? undefined : finalDisabledReason,
        disabledMessage: isRootAdmin ? undefined : finalDisabledMsg,
        createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
        lastLoginAt: editingUser?.lastLoginAt,
      };

      await onSaveUser(userToSave);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setModalError('Failed to save user record. Please verify your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (targetUser: SystemUser) => {
    const isTargetSuper = isSuperAdminRole(targetUser);

    if (isTargetSuper && !isCurrentUserSuperAdmin) {
      alert('Authorization Failed: Standard Administrators are strictly prohibited from deleting the Super Administrator.');
      return;
    }

    if (currentUser?.id === targetUser.id || currentUser?.email === targetUser.email) {
      const confirmSelf = window.confirm(
        'Warning: You are currently signed in as this account. Deleting yourself will terminate your session. Continue?'
      );
      if (!confirmSelf) return;
    }

    await onDeleteUser(targetUser.id);
    setConfirmDeleteId(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q));

    let matchesRole = true;
    if (roleFilter === 'super_admin') {
      matchesRole = isSuperAdminRole(u);
    } else if (roleFilter === 'admin') {
      matchesRole = u.role === 'admin' && !isSuperAdminRole(u);
    } else if (roleFilter === 'staff') {
      matchesRole = u.role === 'staff' || u.role === 'user';
    }

    return matchesSearch && matchesRole;
  });

  const superAdminCount = users.filter((u) => isSuperAdminRole(u)).length;
  const adminCount = users.filter((u) => u.role === 'admin' && !isSuperAdminRole(u)).length;
  const staffCount = users.filter((u) => u.role === 'staff' || u.role === 'user').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Current User Status & Auth Notice */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-6 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${
              isCurrentUserSuperAdmin
                ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                : isCurrentUserAdmin
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            {isCurrentUserSuperAdmin ? (
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            ) : isCurrentUserAdmin ? (
              <ShieldCheck className="w-6 h-6 text-blue-700" />
            ) : (
              <Users className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-lg text-[#191c1e]">
                Team & User Management
              </h3>
              <span
                className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  isCurrentUserSuperAdmin
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : isCurrentUserAdmin
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {isCurrentUserSuperAdmin
                  ? '🛡️ Super Admin (Full Control)'
                  : isCurrentUserAdmin
                  ? '⚡ Admin Rights Active'
                  : '👤 Staff View Only'}
              </span>
            </div>
            <p className="font-mono text-xs text-[#64748b] mt-0.5">
              {isCurrentUserSuperAdmin
                ? 'Super Administrator: Full system modification, user deletion, and login control (license expired/suspended).'
                : isCurrentUserAdmin
                ? 'Administrator: Create users, change user passwords, generate reports. Cannot modify or delete Super Admin.'
                : 'Staff: Can create quotes, invoices, and expenses. Deletions require administrator authentication.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onOpenSignInModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-mono text-xs font-semibold cursor-pointer transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{currentUser ? 'Switch User' : 'Sign In'}</span>
          </button>

          {isCurrentUserAdmin ? (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-xs transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          ) : (
            <div className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Sign in as an Admin to add users</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Breakdown 3-Card Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Super Admin Card */}
        <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4.5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-amber-950 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" /> Super Admin ({superAdminCount})
            </span>
            <span className="font-mono text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">
              Root Authority
            </span>
          </div>
          <p className="font-sans text-xs text-amber-900 leading-relaxed">
            Can modify the entire system, delete any user account, reset passwords, and disable user logins with custom error messages or license expired alerts.
          </p>
        </div>

        {/* Admin Card */}
        <div className="bg-blue-50/80 border border-blue-300 rounded-xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-blue-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" /> Administrator ({adminCount})
            </span>
            <span className="font-mono text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-bold uppercase">
              Operations Mgmt
            </span>
          </div>
          <p className="font-sans text-xs text-blue-900 leading-relaxed">
            Can add new users, generate all financial reports, delete and change user/staff passwords. <span className="font-semibold text-blue-950">Cannot change or delete the Super Admin.</span>
          </p>
        </div>

        {/* Staff/User Card */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-600" /> User / Staff ({staffCount})
            </span>
            <span className="font-mono text-[9px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">
              Data Entry
            </span>
          </div>
          <p className="font-sans text-xs text-slate-700 leading-relaxed">
            Data entry only: feeds in quotes, invoices, and expenses. <span className="font-semibold text-slate-900">Cannot delete any records without Admin password authentication challenge.</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, username..."
            className="w-full pl-3.5 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-800 focus:outline-none focus:border-[#00288e] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="font-mono text-xs text-slate-500 uppercase font-semibold">Filter:</span>
          {(['all', 'super_admin', 'admin', 'staff'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase font-bold cursor-pointer transition-all ${
                roleFilter === r
                  ? 'bg-[#00288e] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {r === 'all'
                ? `All (${users.length})`
                : r === 'super_admin'
                ? `Super Admin (${superAdminCount})`
                : r === 'admin'
                ? `Admin (${adminCount})`
                : `Staff (${staffCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] font-mono text-[#64748b] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-bold">User Account</th>
                <th className="py-3 px-4 font-bold">Role & Security Level</th>
                <th className="py-3 px-4 font-bold">Department</th>
                <th className="py-3 px-4 font-bold">Login Access Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-mono">
                    No user accounts match your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isTargetSuper = isSuperAdminRole(u);
                  const isTargetAdmin = u.role === 'admin' && !isTargetSuper;
                  const isCurrent = currentUser?.id === u.id || currentUser?.email === u.email;

                  // Admin protection constraint: standard admins cannot change or delete Super Admin
                  const isProtectedFromCurrent = isTargetSuper && !isCurrentUserSuperAdmin;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                              isTargetSuper
                                ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-2xs'
                                : isTargetAdmin
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-slate-100 text-slate-800 border border-slate-300'
                            }`}
                          >
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{u.displayName}</span>
                              {isCurrent && (
                                <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                              {isTargetSuper && (
                                <span
                                  className="font-mono text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded flex items-center gap-1"
                                  title="Super Administrator / System Owner"
                                >
                                  <ShieldAlert className="w-2.5 h-2.5 text-amber-700" />
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 mt-0.5 flex-wrap">
                              {isTargetSuper ? (
                                <span className="text-slate-500 italic font-sans text-xs">
                                  System Super Administrator • Root Authority
                                </span>
                              ) : (
                                <>
                                  <span>{u.email}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[#00288e] bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                    @{u.username || u.email.split('@')[0]}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                            isTargetSuper
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isTargetAdmin
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isTargetSuper ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                          ) : isTargetAdmin ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>
                            {isTargetSuper
                              ? 'Super Admin'
                              : isTargetAdmin
                              ? 'Admin'
                              : 'User / Staff'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-700">
                        {u.department ? <span>{u.department}</span> : <span className="text-slate-400 font-mono">—</span>}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {isCurrentUserSuperAdmin && !isTargetSuper ? (
                            <button
                              type="button"
                              onClick={() => setQuickStatusModalUser(u)}
                              className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                                u.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : u.disabledReason === 'license_expired'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                              }`}
                              title="Super Admin: Click to toggle or configure login disablement"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.isActive !== false
                                    ? 'bg-emerald-500'
                                    : u.disabledReason === 'license_expired'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                              />
                              <span>
                                {u.isActive !== false
                                  ? 'Active'
                                  : u.disabledReason === 'license_expired'
                                  ? 'License Expired'
                                  : 'Disabled'}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                                u.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : u.disabledReason === 'license_expired'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-red-50 text-red-800 border-red-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.isActive !== false
                                    ? 'bg-emerald-500'
                                    : u.disabledReason === 'license_expired'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                              />
                              <span>
                                {u.isActive !== false
                                  ? 'Active'
                                  : u.disabledReason === 'license_expired'
                                  ? 'License Expired'
                                  : 'Disabled'}
                              </span>
                            </span>
                          )}

                          {u.isActive === false && u.disabledMessage && (
                            <div className="font-mono text-[9px] text-red-700 truncate max-w-[200px]" title={u.disabledMessage}>
                              {u.disabledMessage}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isProtectedFromCurrent ? (
                            <span
                              className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-mono font-bold flex items-center gap-1"
                              title="Standard Administrators cannot modify or delete the Super Administrator"
                            >
                              <Lock className="w-3 h-3 text-amber-700" />
                              Protected
                            </span>
                          ) : isCurrentUserAdmin ? (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                                title="Edit User & Password"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Super Admin can delete anyone; Admin can delete regular staff */}
                              {(isCurrentUserSuperAdmin || (!isTargetSuper && !isTargetAdmin)) && (
                                confirmDeleteId === u.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteClick(u)}
                                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                                    >
                                      Delete?
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-mono cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(u.id)}
                                    className="p-1.5 rounded hover:bg-red-100 text-red-600 cursor-pointer transition-colors"
                                    title={isCurrentUserSuperAdmin ? 'Super Admin: Delete User' : 'Delete Staff Account'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )
                              )}
                            </>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-400">View Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK STATUS / LICENSE EXPIRED MODAL (FOR SUPER ADMIN) */}
      {quickStatusModalUser && isCurrentUserSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-[#191c1e]">
                    Super Admin: Login Access Control
                  </h3>
                  <p className="font-mono text-[10px] text-slate-500">
                    Target: {quickStatusModalUser.displayName} {quickStatusModalUser.role === 'super_admin' ? '(Super Admin)' : `(@${quickStatusModalUser.username || quickStatusModalUser.email})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickStatusModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="font-sans text-xs text-slate-600">
                Choose an action to immediately update this user&apos;s ability to log in:
              </p>

              <div className="space-y-2.5">
                {/* Option 1: Activate */}
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveUser({
                      ...quickStatusModalUser,
                      isActive: true,
                      disabledReason: undefined,
                      disabledMessage: undefined,
                    });
                    setQuickStatusModalUser(null);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-emerald-950">Active: Allow Login</div>
                    <div className="text-[11px] text-emerald-800">User can sign in normally according to assigned role.</div>
                  </div>
                </button>

                {/* Option 2: License Expired */}
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveUser({
                      ...quickStatusModalUser,
                      isActive: false,
                      disabledReason: 'license_expired',
                      disabledMessage:
                        'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.',
                    });
                    setQuickStatusModalUser(null);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-amber-950">Disable: License Expired</div>
                    <div className="text-[11px] text-amber-800">
                      User will see &quot;License Expired: Your system license or organization subscription has expired...&quot;
                    </div>
                  </div>
                </button>

                {/* Option 3: Account Suspended */}
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveUser({
                      ...quickStatusModalUser,
                      isActive: false,
                      disabledReason: 'account_suspended',
                      disabledMessage:
                        'Account Suspended: Access for this account has been revoked by system administration.',
                    });
                    setQuickStatusModalUser(null);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-red-300 bg-red-50/60 hover:bg-red-100/70 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-red-950">Disable: Account Suspended</div>
                    <div className="text-[11px] text-red-800">
                      User will see &quot;Account Suspended: Access for this account has been revoked...&quot;
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQuickStatusModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center font-bold">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <h3 className="font-sans font-bold text-base text-[#191c1e]">
                  {editingUser ? 'Edit User & Credentials' : 'Create New System User'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Error:</span>
                    <p className="font-sans text-xs">{modalError}</p>
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Grace Wanjiku"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#00288e]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editingUser?.role === 'super_admin' ? '••••••••••••••••' : formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="grace.wanjiku@company.co.ke"
                  disabled={editingUser?.role === 'super_admin' || editingUser?.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-800 focus:outline-none focus:border-[#00288e] disabled:bg-slate-100"
                />
              </div>

              {/* Username (Login Handle) */}
              <div>
                <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1">
                  Username (for dual login)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-mono text-xs text-slate-400 font-bold select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                      })
                    }
                    placeholder={formData.email ? formData.email.split('@')[0] : 'grace_w'}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-800 focus:outline-none focus:border-[#00288e]"
                  />
                </div>
                <p className="font-sans text-[11px] text-slate-500 mt-1">
                  User can sign in using either their email or this username.
                </p>
              </div>

              {/* Password Setting / Reset */}
              <div>
                <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1">
                  {editingUser ? 'Change / Reset User Password' : 'User Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={
                      editingUser
                        ? 'Enter new password to change, or leave blank to keep current'
                        : 'Set account password'
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00288e]"
                  />
                </div>
                <p className="font-sans text-[11px] text-slate-500 mt-1">
                  {editingUser
                    ? 'Admins can change or reset user passwords here.'
                    : 'User will authenticate using email or username with this password.'}
                </p>
              </div>

              {/* System Role Selection */}
              <div>
                <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1.5">
                  System Role Assignment *
                </label>
                <div className={`grid gap-2.5 ${isCurrentUserSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* Staff / User */}
                  <div
                    onClick={() => setFormData({ ...formData, role: 'staff' })}
                    className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.role === 'staff' || formData.role === 'user'
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-4 h-4 text-blue-700" />
                      <span className="font-bold text-xs uppercase text-slate-900">Staff</span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-600 leading-tight">
                      Data entry: quotes, invoices, expenses. No deletions without admin auth.
                    </p>
                  </div>

                  {/* Admin */}
                  <div
                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                    className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.role === 'admin'
                        ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      <span className="font-bold text-xs uppercase text-slate-900">Admin</span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-600 leading-tight">
                      Add users, change passwords, generate all reports. Cannot change Super Admin.
                    </p>
                  </div>

                  {/* Super Admin (Only visible & assignable by Super Admin) */}
                  {isCurrentUserSuperAdmin && (
                    <div
                      onClick={() => setFormData({ ...formData, role: 'super_admin' })}
                      className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.role === 'super_admin'
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        <span className="font-bold text-xs uppercase text-slate-900">Super Admin</span>
                      </div>
                      <p className="font-sans text-[10px] text-slate-600 leading-tight">
                        Modify entire system, delete anyone, disable logins with custom reason.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Department & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1">
                    Department / Title
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Sales Executive"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-slate-600 uppercase font-bold mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254 711 000 000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                  />
                </div>
              </div>

              {/* Account Status & Disablement Options (Super Admin & Admin) */}
              <div className="pt-3 pb-1 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-mono text-xs text-slate-800 font-bold uppercase">
                      Account Status: {formData.isActive ? 'Active (Allowed to Log In)' : 'Disabled / Inactive (Blocked)'}
                    </label>
                    <p className="font-sans text-[11px] text-slate-500 mt-0.5">
                      {formData.isActive
                        ? 'Account is active and permitted to log into the ledger.'
                        : 'Account login is blocked. The user will receive the configured error message.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    disabled={editingUser ? editingUser.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() : false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e] cursor-pointer disabled:opacity-50"
                  />
                </div>

                {/* Disablement Reason & Custom Error Message (for Super Admin & Admin) */}
                {!formData.isActive && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>Disablement Reason & Error Message</span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            disabledReason: 'license_expired',
                            disabledMessage:
                              'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.',
                          })
                        }
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer border ${
                          formData.disabledReason === 'license_expired'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        License Expired
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            disabledReason: 'account_suspended',
                            disabledMessage:
                              'Account Suspended: Access for this account has been revoked by system administration.',
                          })
                        }
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer border ${
                          formData.disabledReason === 'account_suspended'
                            ? 'bg-red-100 text-red-900 border-red-400 font-bold'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Account Suspended
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            disabledReason: 'custom',
                          })
                        }
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer border ${
                          formData.disabledReason === 'custom'
                            ? 'bg-slate-200 text-slate-900 border-slate-400 font-bold'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Custom Error
                      </button>
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] text-red-800 uppercase font-bold mb-1">
                        Message Shown To User on Login Attempt:
                      </label>
                      <textarea
                        rows={2}
                        value={formData.disabledMessage || ''}
                        onChange={(e) => setFormData({ ...formData, disabledMessage: e.target.value })}
                        placeholder="e.g. License Expired: Please contact administration to renew."
                        className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs text-red-950 focus:outline-none focus:ring-1 focus:ring-red-500 font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs uppercase font-bold tracking-wider cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving...' : editingUser ? 'Update User' : 'Save User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
