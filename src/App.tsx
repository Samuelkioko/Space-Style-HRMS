import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AlertCircle, X, Clock } from 'lucide-react';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { KPIGrid } from './components/KPIGrid';
import { RevenueExpenseChart } from './components/RevenueExpenseChart';
import { RecentTransactions } from './components/RecentTransactions';
import { FloatingActionButton } from './components/FloatingActionButton';
import { AddTransactionModal } from './components/AddTransactionModal';
import { ViewAllTransactionsModal } from './components/ViewAllTransactionsModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { SalesScreen } from './components/SalesScreen';
import { ExpensesScreen } from './components/ExpensesScreen';
import { CashbookScreen } from './components/CashbookScreen';
import { CreateDocumentModal } from './components/CreateDocumentModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SignInModal } from './components/SignInModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminAuthDeleteModal } from './components/AdminAuthDeleteModal';
import { SuperAdminDocumentation } from './components/SuperAdminDocumentation';
import { LicenseCountdownModal } from './components/LicenseCountdownModal';
import { LicenseExpiredLockout } from './components/LicenseExpiredLockout';
import { computeLicenseCountdown, saveLocalLicenseConfig } from './utils/licenseUtils';
import { onAuthStateChanged } from 'firebase/auth';
import {
  calculateCascadeDeletePreview,
  calculateCascadeDeletePreviewForTransaction,
  createTrashBundleFromCascade,
} from './utils/cascadeDeleteHelper';

import {
  INITIAL_NOTIFICATIONS,
  getClean7DaysData,
  getClean30DaysData,
} from './data/mockData';
import {
  Transaction,
  TabType,
  KPISummary,
  NotificationItem,
  DayData,
  CompanyInfo,
  ProductServiceItem,
  ExpenseCategoryItem,
  BillingDocument,
  DocumentLineItem,
  DocumentType,
  PaymentMethod,
  TrashBundle,
  CascadeDeletePreview,
  SystemUser,
  UserRole,
  Customer,
  SystemLicenseConfig,
} from './types';
import { formatCurrency } from './utils/formatters';
import {
  db,
  getCompanyProfileFromCloud,
  saveCompanyProfileToCloud,
  subscribeToCompanyProfile,
  subscribeToTransactions,
  syncTransactionToCloud,
  deleteTransactionFromCloud,
  uploadAllTransactionsToCloud,
  fetchAllTransactionsFromCloud,
  fetchProductsFromCloud,
  saveProductToCloud,
  deleteProductFromCloud,
  uploadAllProductsToCloud,
  subscribeToProducts,
  fetchExpenseCategoriesFromCloud,
  saveExpenseCategoryToCloud,
  deleteExpenseCategoryFromCloud,
  uploadAllExpenseCategoriesToCloud,
  subscribeToExpenseCategories,
  fetchDocumentsFromCloud,
  saveDocumentToCloud,
  deleteDocumentFromCloud,
  uploadAllDocumentsToCloud,
  subscribeToDocuments,
  clearAllDataFromCloud,
  saveTrashBundleToCloud,
  fetchTrashBundlesFromCloud,
  deleteTrashBundleFromCloud,
  clearAllTrashFromCloud,
  subscribeToTrashBundles,
  fetchAllUsersFromCloud,
  saveUserToCloud,
  deleteUserFromCloud,
  subscribeToUsers,
  fetchAllCustomersFromCloud,
  saveCustomerToCloud,
  deleteCustomerFromCloud,
  subscribeToCustomers,
  executeCascadeDeletionInCloud,
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  signOutAuth,
  isSuperAdminRole,
  isAdminRole,
  DEFAULT_SYSTEM_LICENSE,
  getSystemLicenseFromCloud,
  saveSystemLicenseToCloud,
  subscribeToSystemLicense,
  checkRedirectResult,
} from './services/firebaseService';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<string>('KES');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    businessName: '',
    email: '',
    currency: 'KES',
  });
  const [products, setProducts] = useState<ProductServiceItem[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>([]);
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [trashBundles, setTrashBundles] = useState<TrashBundle[]>([]);

  // System License & Activation Countdown State
  const [systemLicense, setSystemLicense] = useState<SystemLicenseConfig>(DEFAULT_SYSTEM_LICENSE);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);

  const licenseCountdown = useMemo(() => {
    return computeLicenseCountdown(systemLicense);
  }, [systemLicense]);

  const handleUpdateSystemLicense = async (updatedConfig: SystemLicenseConfig) => {
    try {
      await saveSystemLicenseToCloud(updatedConfig);
      setSystemLicense(updatedConfig);
      saveLocalLicenseConfig(updatedConfig);
      return true;
    } catch (err) {
      console.error('Failed to update system license:', err);
      setSystemLicense(updatedConfig);
      saveLocalLicenseConfig(updatedConfig);
      return true;
    }
  };

  // Cascading Deletion & Trash Bin state
  const [deletePreview, setDeletePreview] = useState<CascadeDeletePreview | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTrashBinOpen, setIsTrashBinOpen] = useState<boolean>(false);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState<boolean>(false);

  // User Authentication & Role-Based Access Control (Super Admin > Admin > Staff)
  // Central database is the sole source of truth for users
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [authErrorBanner, setAuthErrorBanner] = useState<string | null>(null);

  // RBAC Privileges:
  // Super Admin: modify whole system, delete anyone, disable logins
  // Admin: add users, generate reports, change passwords; cannot change or delete Super Admin
  // Staff / User: data entry only (quotes, invoices, expenses); cannot delete without Admin credentials
  const isSuperAdminMode = isSuperAdminRole(currentUser) && currentUser?.isActive !== false;
  const isAdminMode = isAdminRole(currentUser) && currentUser?.isActive !== false;

  // Admin Auth Deletion Challenge State (for Staff / Users)
  const [adminAuthChallenge, setAdminAuthChallenge] = useState<{
    isOpen: boolean;
    targetTitle: string;
    itemType: string;
    description?: string;
    onAuthorized: () => void | Promise<void>;
  }>({
    isOpen: false,
    targetTitle: '',
    itemType: 'Record',
    onAuthorized: () => {},
  });

  /**
   * Enforces role-based deletion protection:
   * If an active Admin or Super Admin performs the deletion, it proceeds directly.
   * If a Staff member attempts deletion, they MUST authenticate with an Admin account.
   */
  const executeProtectedDeletion = (
    itemType: string,
    targetTitle: string,
    action: () => void | Promise<void>,
    customDescription?: string
  ) => {
    if (isAdminMode) {
      // Authenticated Admin / Super Admin
      action();
    } else {
      // Staff / User role: challenge for administrator credentials
      setAdminAuthChallenge({
        isOpen: true,
        targetTitle,
        itemType,
        description:
          customDescription ||
          `Staff / User accounts cannot delete ${itemType.toLowerCase()} records without administrator credentials. Enter an active Administrator's username or email and password to authorize this deletion.`,
        onAuthorized: action,
      });
    }
  };

  // Cloud Sync states
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(new Date().toISOString());

  // Prevent initial load cycle overwrites
  const isInitialMount = useRef(true);

  // Modals and Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Document Modals
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState<boolean>(false);
  const [docTypeToCreate, setDocTypeToCreate] = useState<DocumentType>('invoice');
  const [editingDoc, setEditingDoc] = useState<BillingDocument | null>(null);
  const [selectedDocForViewer, setSelectedDocForViewer] = useState<BillingDocument | null>(null);
  const [invoiceForPayment, setInvoiceForPayment] = useState<BillingDocument | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);

  // 1. Initial Load & Firebase Listeners
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeTxs: (() => void) | undefined;
    let unsubscribeProds: (() => void) | undefined;
    let unsubscribeExpCats: (() => void) | undefined;
    let unsubscribeDocs: (() => void) | undefined;
    let unsubscribeCustomers: (() => void) | undefined;
    let unsubscribeTrash: (() => void) | undefined;
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeLicense: (() => void) | undefined;

    async function bootstrapFromCloud() {
      try {
        // Fetch company info from cloud
        const cloudCompany = await getCompanyProfileFromCloud();
        if (cloudCompany && cloudCompany.businessName) {
          setCompanyInfo(cloudCompany);
          if (cloudCompany.currency) {
            setCurrency(cloudCompany.currency);
          }
        }

        // Fetch cloud system license config
        const cloudLicense = await getSystemLicenseFromCloud();
        if (cloudLicense && cloudLicense.activationDate) {
          setSystemLicense(cloudLicense);
        }

        // Fetch cloud transactions directly from Firestore
        const cloudTxs = await fetchAllTransactionsFromCloud();
        setTransactions(cloudTxs || []);

        // Fetch cloud products & services directly from Firestore (no code defaults)
        const cloudProds = await fetchProductsFromCloud();
        setProducts(cloudProds || []);

        // Fetch cloud expense categories directly from Firestore
        const cloudExpCats = await fetchExpenseCategoriesFromCloud();
        setExpenseCategories(cloudExpCats || []);

        // Fetch cloud billing documents directly from Firestore
        const cloudDocs = await fetchDocumentsFromCloud();
        setDocuments(cloudDocs || []);

        // Fetch cloud customers directly from Firestore
        const cloudCustomers = await fetchAllCustomersFromCloud();
        setCustomers(cloudCustomers || []);

        // Fetch cloud trash bundles directly from Firestore
        const cloudTrash = await fetchTrashBundlesFromCloud();
        setTrashBundles(cloudTrash || []);

        // Fetch cloud system users directly from Firestore
        const cloudUsers = await fetchAllUsersFromCloud();
        setUsers(cloudUsers || []);

        setIsCloudConnected(true);
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        console.warn('Initial cloud hydration note:', err);
      } finally {
        isInitialMount.current = false;
        setIsAuthChecking(false);
      }
    }

    bootstrapFromCloud();

    // Subscribe to live Firestore changes
    try {
      unsubscribeProfile = subscribeToCompanyProfile((updatedProfile) => {
        if (updatedProfile) {
          setCompanyInfo(updatedProfile);
          if (updatedProfile.currency) {
            setCurrency(updatedProfile.currency);
          }
          setLastSyncTime(new Date().toISOString());
        }
      });

      unsubscribeTxs = subscribeToTransactions((liveTxs) => {
        setTransactions(liveTxs);
        setLastSyncTime(new Date().toISOString());
      });

      unsubscribeProds = subscribeToProducts((liveProds) => {
        setProducts(liveProds);
        setLastSyncTime(new Date().toISOString());
      });

      unsubscribeExpCats = subscribeToExpenseCategories((liveExpCats) => {
        setExpenseCategories(liveExpCats);
        setLastSyncTime(new Date().toISOString());
      });

      unsubscribeDocs = subscribeToDocuments((liveDocs) => {
        setDocuments(liveDocs);
        setLastSyncTime(new Date().toISOString());
      });

      unsubscribeCustomers = subscribeToCustomers((liveCustomers) => {
        setCustomers(liveCustomers);
      });

      unsubscribeTrash = subscribeToTrashBundles((liveTrash) => {
        setTrashBundles(liveTrash);
      });

      unsubscribeUsers = subscribeToUsers((liveUsers) => {
        setUsers(liveUsers);

        // Real-time security guard: If currently logged in user is deactivated or deleted by an Admin, terminate session immediately
        setCurrentUser((prevUser) => {
          if (!prevUser) return null;
          const isRoot = prevUser.email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
          const updated = liveUsers.find(
            (u) =>
              u.id === prevUser.id ||
              (u.email && prevUser.email && u.email.trim().toLowerCase() === prevUser.email.trim().toLowerCase())
          );

          // If user record was deleted in central database, terminate session across all clients
          if (!updated && !isRoot) {
            signOutAuth().catch(() => {});
            setAuthErrorBanner(
              `Session Terminated: Your account (${prevUser.email}) was deleted from the central database by an Administrator.`
            );
            return null;
          }

          // If user was marked inactive, terminate session immediately
          if (updated && updated.isActive === false) {
            signOutAuth().catch(() => {});
            const disabledMsg =
              updated.disabledMessage ||
              (updated.disabledReason === 'license_expired'
                ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
                : updated.disabledReason === 'account_suspended'
                ? 'Account Suspended: Access for this account has been revoked by system administration.'
                : `Access Revoked: Account "${updated.displayName}" (${updated.email}) has been deactivated.`);
            setAuthErrorBanner(disabledMsg);
            return null;
          }

          return updated ? { ...prevUser, ...updated } : prevUser;
        });
      });

      unsubscribeLicense = subscribeToSystemLicense((liveLicense) => {
        if (liveLicense && liveLicense.activationDate) {
          setSystemLicense(liveLicense);
        }
      });
    } catch (e) {
      console.warn('Live subscription warning:', e);
    }

    // Check for any completed Google redirect auth result
    checkRedirectResult().catch((err) => {
      console.warn('Redirect auth result check:', err?.message || err);
    });

    // Subscribe to Firebase Auth state
    // MANDATE: Accounts can ONLY be created by the Admin in Settings.
    // Users can sign in with Gmail but CANNOT create accounts!
    // If no role is assigned, or account is inactive, they CANNOT log in!
    let unsubscribeAuth: (() => void) | undefined;
    try {
      unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
        try {
          if (fbUser) {
            const userEmail = (fbUser.email || '').trim().toLowerCase();
            const isRoot = userEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

            // Check registered users from cloud/memory
            let registeredUsers: SystemUser[] = [];
            try {
              registeredUsers = await fetchAllUsersFromCloud();
            } catch {
              registeredUsers = users;
            }

            const match = registeredUsers.find(
              (u) => u.email.trim().toLowerCase() === userEmail
            );

            // 1. RULE: Accounts can ONLY be created by the Admin in Settings.
            if (!match && !isRoot) {
              console.warn(`Unauthorized login attempt by ${userEmail}. Accounts must be created by Admin in Settings.`);
              await signOutAuth().catch(() => {});
              setCurrentUser(null);
              setAuthErrorBanner(
                `User not found. The account "${userEmail}" does not exist in the system. Accounts can only be created by an Administrator in Settings.`
              );
              setNotifications((prev) => [
                {
                  id: `notif-${Date.now()}`,
                  type: 'warning',
                  message: `Login blocked for ${userEmail}: User not found. Only Administrators can create accounts in Settings.`,
                  timestamp: new Date().toISOString(),
                  read: false,
                },
                ...prev,
              ]);
              return;
            }

            // 2. RULE: If no role is assigned, they cannot login!
            const assignedRole: UserRole | undefined = isRoot ? 'super_admin' : match?.role;
            if (!assignedRole) {
              console.warn(`Login blocked for ${userEmail}: No role assigned.`);
              await signOutAuth().catch(() => {});
              setCurrentUser(null);
              setAuthErrorBanner(
                `Access Denied: Account "${userEmail}" has no assigned role. An Administrator must assign you an active role in Settings before you can log in.`
              );
              return;
            }

            // 3. RULE: If account is inactive, it CANNOT log in!
            if (match && match.isActive === false) {
              console.warn(`Login blocked for ${userEmail}: Account marked inactive.`);
              await signOutAuth().catch(() => {});
              setCurrentUser(null);
              const disabledMsg =
                match.disabledMessage ||
                (match.disabledReason === 'license_expired'
                  ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
                  : match.disabledReason === 'account_suspended'
                  ? 'Account Suspended: Access for this account has been revoked by system administration.'
                  : `Access Denied: Account "${userEmail}" is marked INACTIVE. Inactive accounts cannot log in. Please contact your system Administrator to reactivate your account.`);
              setAuthErrorBanner(disabledMsg);
              setNotifications((prev) => [
                {
                  id: `notif-${Date.now()}`,
                  type: 'warning',
                  message: `Login blocked for ${userEmail}: ${disabledMsg}`,
                  timestamp: new Date().toISOString(),
                  read: false,
                },
                ...prev,
              ]);
              return;
            }

            // 4. RULE: System License Expiration & Manual Deactivation Lockout
            // Once expired or deactivated, disable all user logins including admins; only Super Admin can still log in!
            const isSuperAdminUser = isRoot || assignedRole === 'super_admin';
            let activeLicenseCheck = systemLicense;
            try {
              const liveLicense = await getSystemLicenseFromCloud();
              if (liveLicense && liveLicense.activationDate) {
                activeLicenseCheck = liveLicense;
              }
            } catch {
              // fallback to memory
            }
            const countdownCheck = computeLicenseCountdown(activeLicenseCheck);
            if ((countdownCheck.isExpired || countdownCheck.isDeactivated) && !isSuperAdminUser) {
              console.warn(`Login blocked for ${userEmail}: System License Expired or Deactivated.`);
              await signOutAuth().catch(() => {});
              setCurrentUser(null);
              const lockoutReason = countdownCheck.isDeactivated
                ? `System License Deactivated: The organization license was manually deactivated${
                    countdownCheck.deactivationFormatted ? ` on ${countdownCheck.deactivationFormatted}` : ''
                  }. Access for all standard users, staff, and administrators has been locked. Only the Super Administrator can log in to reactivate it.`
                : `System License Expired: The organization license expired on ${countdownCheck.expiryFormatted} (0 days remaining). Access for all standard users, staff, and administrators has been locked. Only the Super Administrator can log in to renew activation.`;
              setAuthErrorBanner(lockoutReason);
              setNotifications((prev) => [
                {
                  id: `notif-${Date.now()}`,
                  type: 'warning',
                  message: `Login blocked for ${userEmail}: ${lockoutReason}`,
                  timestamp: new Date().toISOString(),
                  read: false,
                },
                ...prev,
              ]);
              return;
            }

            // Valid user with assigned role & active status: allow login
            setAuthErrorBanner(null);
            const userObj: SystemUser = {
              id: match ? match.id : fbUser.uid,
              email: userEmail,
              displayName: match?.displayName || fbUser.displayName || userEmail.split('@')[0],
              role: assignedRole,
              photoURL: fbUser.photoURL || undefined,
              phone: match?.phone,
              department: match?.department || (assignedRole === 'admin' ? 'Executive Management' : 'Staff'),
              isActive: true,
              createdAt: match?.createdAt || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };

            setCurrentUser(userObj);
            saveUserToCloud(userObj).catch(() => {});
          } else {
            setCurrentUser(null);
          }
        } finally {
          setIsAuthChecking(false);
        }
      });
    } catch (authErr) {
      console.warn('Auth state listener note:', authErr);
      setIsAuthChecking(false);
    }

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeTxs) unsubscribeTxs();
      if (unsubscribeProds) unsubscribeProds();
      if (unsubscribeExpCats) unsubscribeExpCats();
      if (unsubscribeDocs) unsubscribeDocs();
      if (unsubscribeCustomers) unsubscribeCustomers();
      if (unsubscribeTrash) unsubscribeTrash();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeLicense) unsubscribeLicense();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // System User management handlers (Super Admin, Admin & Staff)
  const handleSaveUser = async (userToSave: SystemUser) => {
    // Permission check: only Super Admin can assign or modify Super Admin role
    if (userToSave.role === 'super_admin' && !isSuperAdminMode) {
      alert('Authorization Failed: Only a Super Administrator can assign or modify a Super Admin account.');
      return false;
    }

    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === userToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = userToSave;
        return next;
      }
      return [...prev, userToSave];
    });

    if (currentUser && currentUser.id === userToSave.id) {
      if (userToSave.isActive === false) {
        signOutAuth().catch(() => {});
        setCurrentUser(null);
        const disabledMsg =
          userToSave.disabledMessage ||
          (userToSave.disabledReason === 'license_expired'
            ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
            : userToSave.disabledReason === 'account_suspended'
            ? 'Account Suspended: Access for this account has been revoked by system administration.'
            : `Account Deactivated: Your account (${userToSave.email}) has been marked Inactive. Inactive accounts cannot log in.`);
        setAuthErrorBanner(disabledMsg);
      } else {
        setCurrentUser(userToSave);
      }
    }

    try {
      await saveUserToCloud(userToSave);
      setLastSyncTime(new Date().toISOString());
      return true;
    } catch (err) {
      console.error('Error saving user to Firestore:', err);
      return false;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    // Constraint: Standard admin cannot delete Super Admin
    if (isSuperAdminRole(targetUser) && !isSuperAdminMode) {
      alert('Authorization Failed: Standard Administrators cannot delete the Super Administrator account.');
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser?.id === userId) {
      await signOutAuth().catch(() => {});
      setCurrentUser(null);
      setAuthErrorBanner('Your user account was deleted from the central database.');
    }
    try {
      await deleteUserFromCloud(userId, targetUser?.email);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error deleting user from Firestore:', err);
    }
  };

  const handleSelectUser = (user: SystemUser) => {
    const isSuperAdminUser =
      user.role === 'super_admin' ||
      user.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    if ((licenseCountdown.isExpired || licenseCountdown.isDeactivated) && !isSuperAdminUser) {
      const lockoutMsg = licenseCountdown.isDeactivated
        ? `System License Deactivated: The organization license is manually deactivated. All standard user and administrator logins are locked. Only the Super Administrator can log in.`
        : `System License Expired: The organization license expired on ${licenseCountdown.expiryFormatted} (0 days remaining). Standard user and administrator logins are locked. Only the Super Administrator can log in.`;
      setAuthErrorBanner(lockoutMsg);
      return;
    }

    if (user.isActive === false) {
      const disabledMsg =
        user.disabledMessage ||
        (user.disabledReason === 'license_expired'
          ? 'License Expired: Your system license or organization subscription has expired. Please contact system administration to renew your license.'
          : user.disabledReason === 'account_suspended'
          ? 'Account Suspended: Access for this account has been revoked by system administration.'
          : `Access Denied: Account "${user.displayName}" (${user.email}) is marked Inactive. Inactive accounts cannot log in.`);
      setAuthErrorBanner(disabledMsg);
      return;
    }
    if (!user.role) {
      setAuthErrorBanner(
        `Access Denied: Account "${user.displayName}" has no assigned role. An Administrator must assign an active role in Settings.`
      );
      return;
    }
    setCurrentUser(user);
    setIsSignInModalOpen(false);
  };

  const handleSignOut = async () => {
    await signOutAuth().catch(() => {});
    setCurrentUser(null);
    setAuthErrorBanner(null);
    setIsSignInModalOpen(false);
  };

  // Customer Management handlers (Synced to Firestore)
  const handleSaveCustomer = async (cust: Customer) => {
    const sanitizedCustomer: Customer = {
      ...cust,
      name: (cust.name || '').trim(),
      phone: (cust.phone || '').trim() || undefined,
      email: (cust.email || '').trim().toLowerCase() || undefined,
      taxId: (cust.taxId || cust.kraPin || cust.pin || '').trim().toUpperCase() || undefined,
      kraPin: (cust.kraPin || cust.taxId || cust.pin || '').trim().toUpperCase() || undefined,
      pin: (cust.pin || cust.taxId || cust.kraPin || '').trim().toUpperCase() || undefined,
      address: (cust.address || cust.billingAddress || '').trim() || undefined,
      billingAddress: (cust.billingAddress || cust.address || '').trim() || undefined,
      notes: (cust.notes || '').trim() || undefined,
      createdAt: cust.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const normPhone = (sanitizedCustomer.phone || '').replace(/[\s\-\(\)\+]/g, '');
    const normTax = sanitizedCustomer.taxId || '';
    const normEmail = sanitizedCustomer.email || '';
    const normName = sanitizedCustomer.name.toLowerCase();

    let targetId = sanitizedCustomer.id;

    setCustomers((prev) => {
      // Find matching customer by ID, Name, PIN/Tax ID, Email, or Phone to prevent duplicates
      const idx = prev.findIndex((c) => {
        if (c.id === sanitizedCustomer.id) return true;
        if (c.name.trim().toLowerCase() === normName) return true;
        if (normTax && (c.taxId || c.kraPin || '').toUpperCase() === normTax) return true;
        if (normEmail && c.email && c.email.trim().toLowerCase() === normEmail) return true;
        if (normPhone && c.phone && c.phone.trim().replace(/[\s\-\(\)\+]/g, '') === normPhone) return true;
        return false;
      });

      if (idx >= 0) {
        targetId = prev[idx].id;
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          ...sanitizedCustomer,
          id: prev[idx].id,
          createdAt: copy[idx].createdAt || sanitizedCustomer.createdAt,
          updatedAt: new Date().toISOString(),
        };
        return copy;
      }
      return [sanitizedCustomer, ...prev];
    });

    try {
      await saveCustomerToCloud({
        ...sanitizedCustomer,
        id: targetId,
      });
      setLastSyncTime(new Date().toISOString());
    } catch (e) {
      console.error('Error saving customer to cloud:', e);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    const targetName = cust ? cust.name : 'Customer Record';
    executeProtectedDeletion('Customer', targetName, async () => {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      try {
        await deleteCustomerFromCloud(id);
        setLastSyncTime(new Date().toISOString());
      } catch (e) {
        console.error('Error deleting customer from cloud:', e);
      }
    });
  };

  // Update company info handler
  const handleUpdateCompanyInfo = async (newInfo: CompanyInfo) => {
    setCompanyInfo(newInfo);
    if (newInfo.currency) {
      setCurrency(newInfo.currency);
    }
    try {
      await saveCompanyProfileToCloud(newInfo);
      setLastSyncTime(new Date().toISOString());
    } catch (e) {
      console.error('Error updating company info to cloud:', e);
    }
  };

  // Product management handlers
  const handleSaveProduct = async (product: ProductServiceItem) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });

    try {
      await saveProductToCloud(product);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error saving product to cloud:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const prod = products.find((p) => p.id === id);
    const targetName = prod ? prod.name : 'Product Item';
    executeProtectedDeletion('Product', targetName, async () => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      try {
        await deleteProductFromCloud(id);
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        console.error('Error deleting product from cloud:', err);
      }
    });
  };

  const handleResetProducts = async () => {
    setProducts([]);
    try {
      await uploadAllProductsToCloud([]);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error resetting products in cloud:', err);
    }
  };

  // Expense categories handlers
  const handleSaveExpenseCategory = async (cat: ExpenseCategoryItem) => {
    setExpenseCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [cat, ...prev];
    });

    try {
      await saveExpenseCategoryToCloud(cat);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error saving expense category to cloud:', err);
    }
  };

  const handleDeleteExpenseCategory = async (id: string) => {
    const cat = expenseCategories.find((c) => c.id === id);
    const targetName = cat ? cat.name : 'Expense Category';
    executeProtectedDeletion('Expense Category', targetName, async () => {
      setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
      try {
        await deleteExpenseCategoryFromCloud(id);
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        console.error('Error deleting expense category from cloud:', err);
      }
    });
  };

  const handleResetExpenseCategories = async () => {
    setExpenseCategories([]);
    try {
      await uploadAllExpenseCategoriesToCloud([]);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error resetting expense categories in cloud:', err);
    }
  };

  const handleQuickLogExpense = (_categoryName: string) => {
    setActiveTab('expenses');
    setIsAddModalOpen(true);
  };

  // Document Management Handlers
  const handleOpenCreateDocument = (type: DocumentType) => {
    setDocTypeToCreate(type);
    setEditingDoc(null);
    setIsCreateDocModalOpen(true);
  };

  // Save / Update Billing Document (Quotations, Invoices, Receipts)
  const handleSaveBillingDocument = async (docData: BillingDocument) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === docData.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = docData;
        return next;
      }
      return [docData, ...prev];
    });

    try {
      await saveDocumentToCloud(docData);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error saving billing document to cloud:', err);
    }

    // If an invoice is created manually with immediate full or partial payment, auto-generate linked receipt & ledger sale
    if (docData.type === 'invoice' && docData.amountPaid > 0 && !editingDoc) {
      // Prevent duplicate receipt generation if one already exists for this invoice
      const receiptExists = documents.some(
        (d) => d.type === 'receipt' && d.linkedInvoiceId === docData.documentNumber
      );

      if (!receiptExists) {
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `REC-${year}-${randomSuffix}`;
        const pMethod = docData.paymentMethod || 'mobile_money';
        const acct = docData.financialAccount || (pMethod === 'mobile_money' ? 'mpesa' : pMethod === 'cash' ? 'cash' : 'bank');

        const autoReceipt: BillingDocument = {
          id: `doc-${Date.now() + 1}`,
          type: 'receipt',
          documentNumber: receiptNumber,
          title: `Payment Receipt for Invoice #${docData.documentNumber}`,
          date: docData.date,
          customerName: docData.customerName,
          customerEmail: docData.customerEmail,
          customerPhone: docData.customerPhone,
          customerAddress: docData.customerAddress,
          customerTaxId: docData.customerTaxId,
          items: docData.items,
          subtotal: docData.subtotal,
          discountTotal: docData.discountTotal,
          taxRate: docData.taxRate,
          taxTotal: docData.taxTotal,
          total: docData.total,
          amountPaid: docData.amountPaid,
          balanceDue: docData.balanceDue,
          paymentMethod: pMethod,
          financialAccount: acct,
          paymentReference: docData.paymentReference || `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
          status: 'paid',
          linkedInvoiceId: docData.documentNumber,
          notes: `Payment of ${formatCurrency(docData.amountPaid, companyInfo.currency || 'KES')} received at invoicing. Thank you for your business!`,
          termsAndConditions: docData.termsAndConditions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Also create ledger sale transaction
        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          title: `Payment for Invoice #${docData.documentNumber} - ${docData.customerName}`,
          amount: docData.amountPaid,
          type: 'sale',
          category: 'Sales',
          date: docData.date,
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          paymentMethod: pMethod,
          financialAccount: acct,
          customerOrVendor: docData.customerName,
          referenceNo: docData.paymentReference || docData.documentNumber,
          notes: `Auto-generated from Invoice #${docData.documentNumber}.`,
          status: 'completed',
        };

        setDocuments((prev) => [autoReceipt, ...prev]);
        setTransactions((prev) => [newTx, ...prev]);
        saveDocumentToCloud(autoReceipt).catch((e) => console.error('Error saving auto receipt:', e));
        syncTransactionToCloud(newTx).catch((e) => console.error('Error syncing auto sale tx:', e));

        // Open the auto-generated receipt in viewer
        setSelectedDocForViewer(autoReceipt);
        return;
      }
    }

    // Auto-open viewer for immediate printing / downloading
    setSelectedDocForViewer(docData);
  };

  // -------------------------------------------------------------
  // CASCADING DELETIONS, TRASH BIN & RESTORATION
  // -------------------------------------------------------------

  /**
   * Triggers the safety confirmation modal with full cascading impact analysis.
   * If a Staff member initiates deletion, challenges for Admin credentials.
   */
  const handleInitiateDeleteBillingDocument = (id: string) => {
    const docToDelete = documents.find((d) => d.id === id);
    if (!docToDelete) return;

    const docTypeLabel =
      docToDelete.type === 'invoice'
        ? 'Invoice'
        : docToDelete.type === 'quotation'
        ? 'Quotation'
        : 'Receipt';
    const docTitle = `${docTypeLabel} #${docToDelete.documentNumber} (${docToDelete.customerName})`;

    executeProtectedDeletion(docTypeLabel, docTitle, () => {
      const preview = calculateCascadeDeletePreview(docToDelete, documents, transactions);
      setDeletePreview(preview);
      setIsDeleteModalOpen(true);
    });
  };

  /**
   * Triggers cascading deletion confirmation for a sale or transaction.
   * If a Staff member initiates deletion, challenges for Admin credentials.
   */
  const handleInitiateDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const txTypeLabel = txToDelete.type === 'income' ? 'Sale Record' : 'Expense Record';
    const txTitle = `${txToDelete.title || txToDelete.category} (${currency} ${txToDelete.amount.toLocaleString()})`;

    executeProtectedDeletion(txTypeLabel, txTitle, () => {
      const preview = calculateCascadeDeletePreviewForTransaction(txToDelete, documents, transactions);
      setDeletePreview(preview);
      setIsDeleteModalOpen(true);
    });
  };

  /**
   * Confirms the cascading deletion:
   * Permanently purges target document or sale + all linked invoices/receipts/quotations/transactions
   * directly from Cloud Firestore and active state (No Trash Bin).
   */
  const handleConfirmDeleteCascade = async () => {
    if (!deletePreview) return;
    setIsDeleteProcessing(true);

    try {
      const bundle = createTrashBundleFromCascade(deletePreview);
      const docIdsToDelete = new Set(bundle.documents.map((d) => d.id));
      const txIdsToDelete = new Set(bundle.transactions.map((t) => t.id));

      // 1. Remove immediately from local state
      setDocuments((prev) => prev.filter((d) => !docIdsToDelete.has(d.id)));
      setTransactions((prev) => prev.filter((t) => !txIdsToDelete.has(t.id)));

      if (selectedDocForViewer && docIdsToDelete.has(selectedDocForViewer.id)) {
        setSelectedDocForViewer(null);
      }
      if (selectedTxForDetail && txIdsToDelete.has(selectedTxForDetail.id)) {
        setSelectedTxForDetail(null);
      }

      // 2. Permanently delete from Cloud Firestore in atomic batch
      await executeCascadeDeletionInCloud({
        documentIds: Array.from(docIdsToDelete),
        transactionIds: Array.from(txIdsToDelete),
      });

      // 3. Log notification
      const totalDocs = docIdsToDelete.size;
      const totalTxs = txIdsToDelete.size;
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Deleted: ${deletePreview.targetTitle}`,
        message: `Permanently purged ${totalDocs} document(s) and ${totalTxs} linked transaction(s) from system database.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'info',
      };
      setNotifications((prev) => [notif, ...prev]);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error performing permanent cascading deletion:', err);
    } finally {
      setIsDeleteProcessing(false);
      setIsDeleteModalOpen(false);
      setDeletePreview(null);
    }
  };

  /**
   * Restores a deleted bundle and all its linked documents & transactions back to active state
   */
  const handleRestoreTrashBundle = async (bundle: TrashBundle) => {
    try {
      // 1. Add back documents and transactions to local state
      setDocuments((prev) => {
        const existingDocIds = new Set(prev.map((d) => d.id));
        const toAdd = bundle.documents.filter((d) => !existingDocIds.has(d.id));
        return [...toAdd, ...prev];
      });

      setTransactions((prev) => {
        const existingTxIds = new Set(prev.map((t) => t.id));
        const toAdd = bundle.transactions.filter((t) => !existingTxIds.has(t.id));
        return [...toAdd, ...prev];
      });

      // 2. Remove bundle from local trash list
      setTrashBundles((prev) => prev.filter((b) => b.id !== bundle.id));

      // 3. Save restored documents & transactions to Cloud Firestore
      for (const doc of bundle.documents) {
        await saveDocumentToCloud(doc);
      }
      for (const tx of bundle.transactions) {
        await syncTransactionToCloud(tx);
      }

      // 4. Delete the trash bundle record from Firestore
      await deleteTrashBundleFromCloud(bundle.id);

      // 5. Success Notification
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Restored: ${bundle.primaryItemTitle}`,
        message: `Successfully restored ${bundle.documents.length} document(s) and ${bundle.transactions.length} linked transaction(s) to active records.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'success',
      };
      setNotifications((prev) => [notif, ...prev]);
      setLastSyncTime(new Date().toISOString());
    } catch (err) {
      console.error('Error restoring bundle from trash:', err);
    }
  };

  /**
   * Permanently purges a single bundle from the Trash Bin in Firestore
   */
  const handlePermanentlyDeleteTrashBundle = async (bundleId: string) => {
    const bundle = trashBundles.find((b) => b.id === bundleId);
    const bundleTitle = bundle ? bundle.primaryItemTitle : 'Trash Item';
    executeProtectedDeletion('Trash Bundle', bundleTitle, async () => {
      setTrashBundles((prev) => prev.filter((b) => b.id !== bundleId));
      try {
        await deleteTrashBundleFromCloud(bundleId);
      } catch (err) {
        console.error('Error permanently deleting bundle from trash:', err);
      }
    });
  };

  /**
   * Permanently purges ALL bundles in the Trash Bin in Firestore
   */
  const handleEmptyAllTrash = async () => {
    executeProtectedDeletion(
      'All Trash',
      'Purge Entire Trash Bin',
      async () => {
        setTrashBundles([]);
        try {
          await clearAllTrashFromCloud();
        } catch (err) {
          console.error('Error emptying all trash:', err);
        }
      },
      'Staff members cannot empty the trash bin without administrator credentials. Enter an active Administrator login to authorize permanent purging.'
    );
  };

  const handleEditBillingDocument = (docData: BillingDocument) => {
    setDocTypeToCreate(docData.type);
    setEditingDoc(docData);
    setIsCreateDocModalOpen(true);
  };

  // Convert Quotation -> Invoice (When Customer Approves Quote)
  const handleConvertToInvoice = async (quote: BillingDocument) => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${year}-${randomSuffix}`;
    const today = new Date().toISOString().split('T')[0];
    const fourteenDaysLater = new Date();
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);

    // Update Quotation Status to 'accepted' (Approved by Customer)
    const updatedQuote: BillingDocument = {
      ...quote,
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    };

    // Generate New Payment Invoice
    const newInvoice: BillingDocument = {
      ...quote,
      id: `doc-${Date.now()}`,
      type: 'invoice',
      documentNumber: invoiceNumber,
      title: `Tax Invoice for ${quote.customerName}`,
      date: today,
      dueDate: fourteenDaysLater.toISOString().split('T')[0],
      status: 'unpaid',
      amountPaid: 0,
      balanceDue: quote.total,
      linkedQuotationId: quote.documentNumber,
      notes: `Generated upon approval of Quotation #${quote.documentNumber}. Payment terms: 14 days net.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update local state
    setDocuments((prev) => {
      const filtered = prev.map((d) => (d.id === quote.id ? updatedQuote : d));
      return [newInvoice, ...filtered];
    });

    // Save both to Cloud Firestore
    try {
      await saveDocumentToCloud(updatedQuote);
      await saveDocumentToCloud(newInvoice);
      setLastSyncTime(new Date().toISOString());
    } catch (e) {
      console.error('Error saving converted invoice & quote to cloud:', e);
    }

    // Open the new Payment Invoice for user to view/print/share
    setSelectedDocForViewer(newInvoice);
  };

  // Explicitly Approve Quotation
  const handleApproveQuotation = async (quote: BillingDocument) => {
    const updatedQuote: BillingDocument = {
      ...quote,
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => prev.map((d) => (d.id === quote.id ? updatedQuote : d)));

    try {
      await saveDocumentToCloud(updatedQuote);
      setLastSyncTime(new Date().toISOString());
    } catch (e) {
      console.error('Error approving quotation:', e);
    }
  };

  // Convert Invoice -> Receipt (Full Paid / Mark Paid)
  const handleConvertToReceipt = async (inv: BillingDocument) => {
    // User mandate: If I click generate receipt for already paid invoices, it should not create a duplicate receipt.
    // If a receipt has been generated it can't be generated twice; if it already exists, prevent duplicate creation.
    const existingReceipt = documents.find(
      (d) => d.type === 'receipt' && (d.linkedInvoiceId === inv.documentNumber || d.id === inv.id)
    );

    if (existingReceipt) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Receipt Already Issued',
        message: `Official Receipt #${existingReceipt.documentNumber} has already been generated for Invoice #${inv.documentNumber}. Duplicate receipt creation was prevented.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'info',
      };
      setNotifications((prev) => [notif, ...prev]);
      setSelectedDocForViewer(existingReceipt);
      return;
    }

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${year}-${randomSuffix}`;
    const today = new Date().toISOString().split('T')[0];
    const paymentRef = inv.paymentReference || `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    const pMethod = inv.paymentMethod || 'mobile_money';
    const acct = inv.financialAccount || (pMethod === 'mobile_money' ? 'mpesa' : pMethod === 'cash' ? 'cash' : 'bank');

    // 1. Mark Invoice as fully paid
    const updatedInvoice: BillingDocument = {
      ...inv,
      status: 'paid',
      amountPaid: inv.total,
      balanceDue: 0,
      paymentMethod: pMethod,
      financialAccount: acct,
      paymentReference: paymentRef,
      updatedAt: new Date().toISOString(),
    };

    // 2. Automatically generate Official Payment Receipt
    const newReceipt: BillingDocument = {
      ...inv,
      id: `doc-${Date.now()}`,
      type: 'receipt',
      documentNumber: receiptNumber,
      title: `Official Payment Receipt - ${inv.customerName}`,
      date: today,
      dueDate: undefined,
      status: 'paid',
      amountPaid: inv.total,
      balanceDue: 0,
      linkedInvoiceId: inv.documentNumber,
      paymentMethod: pMethod,
      financialAccount: acct,
      paymentReference: paymentRef,
      notes: `Payment confirmed in full for Invoice #${inv.documentNumber}. Thank you for your business!`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Automatically record Sale in ledger / cashbook
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: `Payment for Invoice #${inv.documentNumber} - ${inv.customerName}`,
      amount: inv.total,
      type: 'sale',
      category: 'Sales',
      date: today,
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      paymentMethod: pMethod,
      financialAccount: acct,
      customerOrVendor: inv.customerName,
      referenceNo: paymentRef,
      notes: `Official payment confirmed for Invoice #${inv.documentNumber}.`,
      status: 'completed',
    };

    // Update state
    setDocuments((prev) => {
      const filtered = prev.map((d) => (d.id === inv.id ? updatedInvoice : d));
      return [newReceipt, ...filtered];
    });
    setTransactions((prev) => [newTx, ...prev]);

    // Sync to Firestore
    try {
      await saveDocumentToCloud(updatedInvoice);
      await saveDocumentToCloud(newReceipt);
      await syncTransactionToCloud(newTx);
      setLastSyncTime(new Date().toISOString());
    } catch (e) {
      console.error('Error saving updated invoice, receipt & transaction to cloud:', e);
    }

    // Open generated receipt in viewer
    setSelectedDocForViewer(newReceipt);
  };

  // Record Payment on Invoice (Full or Partial)
  const handleOpenRecordPayment = (invoice: BillingDocument) => {
    setInvoiceForPayment(invoice);
    setIsRecordPaymentModalOpen(true);
  };

  const handleConfirmRecordPayment = async (params: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    date: string;
    generateReceipt: boolean;
    syncToLedger: boolean;
  }) => {
    const targetInvoice = documents.find((d) => d.id === params.invoiceId);
    if (!targetInvoice) return;

    const newAmountPaid = (targetInvoice.amountPaid || 0) + params.amount;
    const newBalanceDue = Math.max(0, targetInvoice.total - newAmountPaid);
    const newStatus = newBalanceDue <= 0.01 ? 'paid' : 'partially_paid';

    const updatedInvoice: BillingDocument = {
      ...targetInvoice,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference || targetInvoice.paymentReference,
      updatedAt: new Date().toISOString(),
    };

    // Update Invoice in local & cloud
    setDocuments((prev) => prev.map((d) => (d.id === updatedInvoice.id ? updatedInvoice : d)));
    saveDocumentToCloud(updatedInvoice).catch((e) => console.error('Error saving updated invoice:', e));

    // Auto-generate official payment receipt (default: true)
    const acct = targetInvoice.financialAccount || (params.paymentMethod === 'mobile_money' ? 'mpesa' : params.paymentMethod === 'cash' ? 'cash' : 'bank');

    if (params.generateReceipt) {
      // User mandate: If I click generate receipt for already paid invoices, it should not create a duplicate receipt.
      // If a receipt has been generated it can't be generated twice, if it still exists in the system prevent duplication creation.
      const existingReceipt = documents.find(
        (d) => d.type === 'receipt' && d.linkedInvoiceId === targetInvoice.documentNumber
      );

      if (existingReceipt && newBalanceDue <= 0.01) {
        const notif: NotificationItem = {
          id: `notif-${Date.now()}`,
          title: 'Receipt Already Issued',
          message: `Official Receipt #${existingReceipt.documentNumber} already exists for Invoice #${targetInvoice.documentNumber}. Duplicate receipt creation was prevented.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'info',
        };
        setNotifications((prev) => [notif, ...prev]);
        setSelectedDocForViewer(existingReceipt);
      } else {
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `REC-${year}-${randomSuffix}`;

        const receiptDoc: BillingDocument = {
          id: `doc-${Date.now()}`,
          type: 'receipt',
          documentNumber: receiptNumber,
          title: `Payment Receipt for Invoice #${targetInvoice.documentNumber}`,
          date: params.date,
          customerName: targetInvoice.customerName,
          customerEmail: targetInvoice.customerEmail,
          customerPhone: targetInvoice.customerPhone,
          customerAddress: targetInvoice.customerAddress,
          customerTaxId: targetInvoice.customerTaxId,
          items: targetInvoice.items,
          subtotal: targetInvoice.subtotal,
          discountTotal: targetInvoice.discountTotal,
          taxRate: targetInvoice.taxRate,
          taxTotal: targetInvoice.taxTotal,
          total: targetInvoice.total,
          amountPaid: params.amount,
          balanceDue: newBalanceDue,
          paymentMethod: params.paymentMethod,
          financialAccount: acct,
          paymentReference: params.paymentReference || `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
          status: 'paid',
          linkedInvoiceId: targetInvoice.documentNumber,
          notes: `Payment of ${formatCurrency(params.amount, companyInfo.currency || 'KES')} received towards Invoice #${targetInvoice.documentNumber}. Remaining balance: ${formatCurrency(newBalanceDue, companyInfo.currency || 'KES')}.`,
          termsAndConditions: targetInvoice.termsAndConditions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setDocuments((prev) => [receiptDoc, ...prev]);
        saveDocumentToCloud(receiptDoc).catch((e) => console.error('Error saving generated receipt:', e));
        setSelectedDocForViewer(receiptDoc);
      }
    } else {
      setSelectedDocForViewer(updatedInvoice);
    }

    // Sync payment to Cashbook / Transactions ledger
    if (params.syncToLedger) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: `Payment for Invoice #${targetInvoice.documentNumber} - ${targetInvoice.customerName}`,
        amount: params.amount,
        type: 'sale',
        category: 'Sales',
        date: params.date,
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        paymentMethod: params.paymentMethod,
        financialAccount: acct,
        customerOrVendor: targetInvoice.customerName,
        referenceNo: params.paymentReference || targetInvoice.documentNumber,
        notes: `Payment logged against Invoice #${targetInvoice.documentNumber}.`,
        status: 'completed',
      };

      setTransactions((prev) => [newTx, ...prev]);
      syncTransactionToCloud(newTx).catch((e) => console.error('Error syncing payment transaction to cloud:', e));
    }
  };

  /**
   * Safe Print/View Receipt for Transaction:
   * User mandate: Clicking print receipt or invoice in any section should not generate
   * another invoice or receipt into the system, but rather just print/view the current one.
   */
  const handlePrintReceiptForTransaction = (tx: Transaction) => {
    // 1. Check if a receipt already exists for this transaction
    const existingReceipt = documents.find(
      (d) =>
        d.type === 'receipt' &&
        (d.linkedTransactionId === tx.id ||
          (tx.referenceNo &&
            (d.paymentReference === tx.referenceNo || d.documentNumber === tx.referenceNo)) ||
          tx.title.includes(d.documentNumber))
    );

    if (existingReceipt) {
      // Just open the existing receipt for printing/exporting. NO duplicate created!
      setSelectedDocForViewer(existingReceipt);
      return;
    }

    // 2. If no receipt exists yet (e.g., legacy transaction), generate the official receipt ONCE
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${year}-${randomSuffix}`;
    const acct = tx.financialAccount || (tx.paymentMethod === 'mobile_money' ? 'mpesa' : tx.paymentMethod === 'cash' ? 'cash' : 'bank');

    const receiptDoc: BillingDocument = {
      id: `doc-${Date.now()}`,
      type: 'receipt',
      documentNumber: receiptNumber,
      title: `Official Receipt for ${tx.title}`,
      date: tx.date,
      customerName: tx.customerOrVendor || 'Walk-in Client',
      items:
        tx.items && tx.items.length > 0
          ? tx.items
          : [
              {
                id: `item-${Date.now()}`,
                productId: tx.productId,
                name: tx.productName || tx.title,
                quantity: tx.quantity || 1,
                unitPrice: tx.unitPrice || tx.amount,
                unitType: tx.unitType || 'units',
                amount: tx.amount,
              },
            ],
      subtotal: tx.amount,
      discountTotal: 0,
      taxRate: 0,
      taxTotal: 0,
      total: tx.amount,
      amountPaid: tx.amount,
      balanceDue: 0,
      paymentMethod: tx.paymentMethod,
      financialAccount: acct,
      paymentReference: tx.referenceNo || `TX-${tx.id.substring(0, 8)}`,
      status: 'paid',
      linkedTransactionId: tx.id,
      notes: `Official payment receipt for sale record #${tx.id}.`,
      termsAndConditions: 'All goods and services rendered in satisfactory order.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    handleSaveBillingDocument(receiptDoc);
    setSelectedDocForViewer(receiptDoc);
  };

  // Full Push to Cloud
  const handleSyncAllToCloud = async () => {
    setIsSyncing(true);
    try {
      await saveCompanyProfileToCloud(companyInfo);
      await uploadAllTransactionsToCloud(transactions);
      await uploadAllProductsToCloud(products);
      await uploadAllExpenseCategoriesToCloud(expenseCategories);
      await uploadAllDocumentsToCloud(documents);
      setLastSyncTime(new Date().toISOString());
    } finally {
      setIsSyncing(false);
    }
  };

  // Full Pull from Cloud
  const handlePullAllFromCloud = async () => {
    setIsSyncing(true);
    try {
      const [cloudCompany, cloudTxs, cloudProds, cloudExpCats, cloudDocs] = await Promise.all([
        getCompanyProfileFromCloud(),
        fetchAllTransactionsFromCloud(),
        fetchProductsFromCloud(),
        fetchExpenseCategoriesFromCloud(),
        fetchDocumentsFromCloud(),
      ]);
      if (cloudCompany) {
        setCompanyInfo(cloudCompany);
        if (cloudCompany.currency) setCurrency(cloudCompany.currency);
      }
      if (cloudTxs && cloudTxs.length > 0) {
        setTransactions(cloudTxs);
      }
      if (cloudProds && cloudProds.length > 0) {
        setProducts(cloudProds);
      }
      if (cloudExpCats && cloudExpCats.length > 0) {
        setExpenseCategories(cloudExpCats);
      }
      if (cloudDocs && cloudDocs.length > 0) {
        setDocuments(cloudDocs);
      }
      setLastSyncTime(new Date().toISOString());
    } finally {
      setIsSyncing(false);
    }
  };

  // Dynamically compute 7-day trend series directly from transactions
  const data7Days: DayData[] = useMemo(() => {
    const base = getClean7DaysData();
    transactions.forEach((tx) => {
      const match = base.find((d) => d.date === tx.date);
      if (match) {
        if (tx.type === 'sale') {
          match.revenue += tx.amount;
        } else if (tx.type === 'expense') {
          match.expenses += tx.amount;
        }
        match.profit = match.revenue - match.expenses;
      }
    });
    return base;
  }, [transactions]);

  // Dynamically compute 30-day trend series directly from transactions
  const data30Days: DayData[] = useMemo(() => {
    const base = getClean30DaysData();
    transactions.forEach((tx) => {
      const match = base.find((d) => d.date === tx.date);
      if (match) {
        if (tx.type === 'sale') {
          match.revenue += tx.amount;
        } else if (tx.type === 'expense') {
          match.expenses += tx.amount;
        }
        match.profit = match.revenue - match.expenses;
      } else {
        const lastBucket = base[base.length - 1];
        if (lastBucket) {
          if (tx.type === 'sale') {
            lastBucket.revenue += tx.amount;
          } else if (tx.type === 'expense') {
            lastBucket.expenses += tx.amount;
          }
          lastBucket.profit = lastBucket.revenue - lastBucket.expenses;
        }
      }
    });
    return base;
  }, [transactions]);

  // Dynamic KPI calculation from ledger
  const kpiData: KPISummary = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const todayTxs = transactions.filter((t) => t.date === todayStr);
    const yesterdayTxs = transactions.filter((t) => t.date === yesterdayStr);

    const todaySales = todayTxs
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const yesterdaySales = yesterdayTxs
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const todaySalesChange = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
      : (todaySales > 0 ? 100 : 0);

    const todayExpenses = todayTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const yesterdayExpenses = yesterdayTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpensesChange = yesterdayExpenses > 0 
      ? ((todayExpenses - yesterdayExpenses) / yesterdayExpenses) * 100 
      : (todayExpenses > 0 ? 100 : 0);

    const todayProfit = todaySales - todayExpenses;
    const yesterdayProfit = yesterdaySales - yesterdayExpenses;
    const todayProfitChange = yesterdayProfit !== 0 
      ? ((todayProfit - yesterdayProfit) / Math.abs(yesterdayProfit)) * 100 
      : (todayProfit > 0 ? 100 : 0);

    const totalRevenue = transactions
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const cashBalance = totalRevenue - totalExpenses;
    const cashBalanceChange = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    return {
      todaySales,
      todaySalesChange,
      todayExpenses,
      todayExpensesChange,
      todayProfit,
      todayProfitChange,
      cashBalance,
      cashBalanceChange,
      todaySalesCount: todayTxs.filter((t) => t.type === 'sale').length,
      todayExpensesCount: todayTxs.filter((t) => t.type === 'expense').length,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      totalSalesAllTime: totalRevenue,
      totalExpensesAllTime: totalExpenses,
    };
  }, [transactions]);

  // Handle adding a new ledger transaction (with automated receipt generation for POS sales)
  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Automatically generate official receipt for quick POS sales and move it to Receipts section
    let autoReceipt: BillingDocument | null = null;
    if (newTx.type === 'sale') {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const receiptDocNumber = `REC-${year}-${randomSuffix}`;

      const receiptItems: DocumentLineItem[] =
        newTx.items && newTx.items.length > 0
          ? newTx.items
          : [
              {
                id: `item-${Date.now()}`,
                productId: newTx.productId,
                name: newTx.productName || newTx.title,
                quantity: newTx.quantity || 1,
                unitPrice: newTx.unitPrice || newTx.amount,
                unitType: newTx.unitType || 'units',
                amount: newTx.amount,
              },
            ];

      autoReceipt = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'receipt',
        documentNumber: receiptDocNumber,
        title: `Receipt - ${newTx.title}`,
        date: newTx.date,
        customerName: newTx.customerOrVendor || 'Walk-in Customer',
        items: receiptItems,
        subtotal: newTx.amount,
        discountTotal: 0,
        taxRate: 0,
        taxTotal: 0,
        total: newTx.amount,
        amountPaid: newTx.amount,
        balanceDue: 0,
        paymentMethod: newTx.paymentMethod,
        paymentReference: newTx.referenceNo || `POS-${newTx.id.substring(3, 11)}`,
        status: 'paid',
        linkedTransactionId: newTx.id,
        notes: `Automated official receipt for quick POS sale: ${newTx.title}`,
        termsAndConditions: 'Thank you for your business.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDocuments((prev) => [autoReceipt!, ...prev]);
    }

    // Add in-app notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: autoReceipt ? 'New POS Sale & Receipt Generated' : `New ${newTx.type === 'sale' ? 'Sale' : 'Expense'} Recorded`,
      message: autoReceipt
        ? `${newTx.title}: ${formatCurrency(newTx.amount, currency)} recorded. Official Receipt #${autoReceipt.documentNumber} automatically generated in Receipts.`
        : `${newTx.title}: ${formatCurrency(newTx.amount, currency)} recorded under ${newTx.category}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: newTx.type === 'sale' ? 'success' : 'warning',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Push to Firestore in background
    try {
      await syncTransactionToCloud(newTx);
      if (autoReceipt) {
        await saveDocumentToCloud(autoReceipt);
      }
    } catch (e) {
      console.error('Error syncing new transaction/receipt to cloud:', e);
    }
  };

  // Handle deleting a transaction
  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransactionFromCloud(id);
    } catch (e) {
      console.error('Error deleting transaction from cloud:', e);
    }
  };

  // Clean all data across both cloud and local state
  const handleCleanAllCloudData = async () => {
    setIsSyncing(true);
    try {
      await clearAllDataFromCloud();
      setTransactions([]);
      setDocuments([]);
      setProducts([]);
      setExpenseCategories([]);
      setCustomers([]);
      setNotifications([]);
      setLastSyncTime(new Date().toISOString());
    } catch (e) {
      console.error('Error cleaning cloud database:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset to initial clean state
  const handleResetData = () => {
    setTransactions([]);
    setNotifications([]);
  };

  // Import custom backup
  const handleImportData = (imported: Transaction[]) => {
    setTransactions(imported);
    uploadAllTransactionsToCloud(imported).catch((e) => console.error('Cloud import sync error:', e));
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // Site load auth gate
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-slate-600 font-bold uppercase tracking-wider">
            Loading Central Management Ledger...
          </p>
        </div>
      </div>
    );
  }

  // Mandatory login on site load
  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setAuthErrorBanner(null);
        }}
        errorBanner={authErrorBanner}
        onClearError={() => setAuthErrorBanner(null)}
        licenseConfig={systemLicense}
      />
    );
  }

  // System License Expiration & Manual Deactivation Lockout:
  // Once expired or deactivated, disable all user logins including admins; only Super Admin can still log in!
  if (currentUser && currentUser.role !== 'super_admin' && (licenseCountdown.isExpired || licenseCountdown.isDeactivated)) {
    return (
      <LicenseExpiredLockout
        licenseConfig={systemLicense}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSwitchToSuperAdmin={() => {
          handleSignOut();
          setIsSignInModalOpen(true);
        }}
        onSuperAdminLogin={() => {
          handleSignOut();
          setIsSignInModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans antialiased flex flex-col selection:bg-[#00288e]/10 selection:text-[#00288e]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenNotifications={() => setIsNotifOpen(true)}
        unreadCount={unreadNotifsCount}
        businessName={companyInfo.businessName}
        isCloudConnected={isCloudConnected}
        currentUser={currentUser}
        onOpenSignIn={() => setIsSignInModalOpen(true)}
        onSignOut={handleSignOut}
        licenseConfig={systemLicense}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 space-y-6 max-w-7xl mx-auto w-full pt-20 md:pt-24 pb-24 md:pb-12">
        {authErrorBanner && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-sm text-amber-900 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Authentication Notice</p>
                <p className="text-amber-900 text-xs mt-0.5">{authErrorBanner}</p>
              </div>
            </div>
            <button
              onClick={() => setAuthErrorBanner(null)}
              className="text-amber-700 hover:text-amber-950 p-1 rounded-md hover:bg-amber-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Super Admin Notice: System License Expired / Deactivated Lockout Active */}
        {(licenseCountdown.isExpired || licenseCountdown.isDeactivated) && currentUser.role === 'super_admin' && (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl flex items-start justify-between gap-3 text-sm text-red-950 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-red-950 font-sans">
                    {licenseCountdown.isDeactivated
                      ? 'ORGANIZATION SYSTEM LICENSE DEACTIVATED (Logins Locked)'
                      : 'ORGANIZATION SYSTEM LICENSE EXPIRED (0 Days Remaining)'}
                  </p>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                    All Non-SA Logins Locked
                  </span>
                </div>
                <p className="text-red-900 text-xs mt-1">
                  {licenseCountdown.isDeactivated
                    ? `The system license is manually deactivated. Standard users, staff, and administrators are currently blocked from logging in. As Super Administrator, you can reactivate it or set an activation date to restore team access.`
                    : `The system license expired on ${licenseCountdown.expiryFormatted}. Standard users, staff, and administrators are currently blocked from logging in. As Super Administrator, you can update the activation date to begin a new 1-year cycle and restore team access.`}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setIsLicenseModalOpen(true)}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-mono text-xs font-bold uppercase transition-all shadow-xs cursor-pointer"
                  >
                    {licenseCountdown.isDeactivated ? 'Reactivate License' : 'Set New Activation Date'}
                  </button>
                  <button
                    onClick={() => setActiveTab('more')}
                    className="px-3 py-1.5 bg-white border border-red-300 text-red-900 hover:bg-red-100 rounded-lg font-mono text-xs font-semibold uppercase transition-all cursor-pointer"
                  >
                    Open License Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* License Expiring Soon Warning for All Users */}
        {licenseCountdown.isExpiringSoon && !licenseCountdown.isExpired && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-sm text-amber-950 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">
                  License Expiration Warning: {licenseCountdown.daysRemaining} Days Remaining
                </p>
                <p className="text-amber-900 text-xs mt-0.5">
                  The enterprise system license will expire on {licenseCountdown.expiryFormatted}. Once expired, all logins (except Super Admin) will be automatically disabled.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLicenseModalOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer"
            >
              View Countdown
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Grid */}
            <KPIGrid
              kpi={kpiData}
              currency={currency}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />

            {/* Mini Line Chart Section */}
            <RevenueExpenseChart
              data7Days={data7Days}
              data30Days={data30Days}
              currency={currency}
            />

            {/* Recent Transactions List */}
            <RecentTransactions
              transactions={transactions}
              currency={currency}
              onViewAll={() => setIsViewAllOpen(true)}
              onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
            />
          </div>
        )}

        {/* TAB 2: UNIFIED SALES (Consolidated Pipeline & Documents) */}
        {(activeTab === 'sales' || activeTab === 'documents') && (
          <SalesScreen
            transactions={transactions}
            documents={documents}
            companyInfo={companyInfo}
            products={products}
            currency={currency}
            isCloudConnected={isCloudConnected}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            isAdminMode={isAdminMode}
            onDeleteSale={handleInitiateDeleteTransaction}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onCreateDocument={handleOpenCreateDocument}
            onViewDocument={(doc) => setSelectedDocForViewer(doc)}
            onEditDocument={handleEditBillingDocument}
            onDeleteDocument={handleInitiateDeleteBillingDocument}
            onRecordPayment={handleOpenRecordPayment}
            onConvertToInvoice={handleConvertToInvoice}
            onConvertToReceipt={handleConvertToReceipt}
            onApproveQuotation={handleApproveQuotation}
            onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
            onNavigateTab={setActiveTab}
            customers={customers}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}

        {/* TAB 3: EXPENSES */}
        {activeTab === 'expenses' && (
          <ExpensesScreen
            transactions={transactions}
            currency={currency}
            expenseCategories={expenseCategories}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
            onNavigateTab={setActiveTab}
            isAdminMode={isAdminMode}
          />
        )}

        {/* TAB 4: CASHBOOK */}
        {activeTab === 'cashbook' && (
          <CashbookScreen
            transactions={transactions}
            currency={currency}
            cashBalance={kpiData.cashBalance}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
          />
        )}

        {/* TAB 5: REPORTS (Daily, Weekly, Monthly, Yearly) */}
        {activeTab === 'reports' && (
          <ReportsScreen
            transactions={transactions}
            currency={currency}
            businessName={companyInfo.businessName}
            taxId={companyInfo.taxId}
            onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
          />
        )}

        {/* TAB 7: SETTINGS / MORE (Company Profile, Firebase Sync, Exports) */}
        {activeTab === 'more' && (
          <SettingsScreen
            currency={currency}
            onCurrencyChange={(newCurr) => {
              setCurrency(newCurr);
              handleUpdateCompanyInfo({ ...companyInfo, currency: newCurr });
            }}
            transactions={transactions}
            documents={documents}
            onResetData={handleResetData}
            onCleanAllData={handleCleanAllCloudData}
            onImportData={handleImportData}
            onNavigateTab={setActiveTab}
            companyInfo={companyInfo}
            onUpdateCompanyInfo={handleUpdateCompanyInfo}
            isCloudConnected={isCloudConnected}
            onSyncAllToCloud={handleSyncAllToCloud}
            onPullAllFromCloud={handlePullAllFromCloud}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            isAdminMode={isAdminMode}
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onResetProducts={handleResetProducts}
            expenseCategories={expenseCategories}
            onSaveExpenseCategory={handleSaveExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
            onResetExpenseCategories={handleResetExpenseCategories}
            onQuickLogExpense={handleQuickLogExpense}
            users={users}
            currentUser={currentUser}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onOpenSignInModal={() => setIsSignInModalOpen(true)}
            customers={customers}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            licenseConfig={systemLicense}
            onUpdateLicenseConfig={handleUpdateSystemLicense}
          />
        )}

        {/* TAB 8: SUPER ADMIN DOCUMENTATION */}
        {activeTab === 'superadmin_docs' && currentUser?.role === 'super_admin' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('more')}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                ← Back to Settings
              </button>
              <span className="font-mono text-xs text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Confidential Super Administrator Documentation
              </span>
            </div>
            <SuperAdminDocumentation currentUser={currentUser} />
          </div>
        )}
      </main>

      {/* Floating Action Button (+) */}
      <FloatingActionButton onClick={() => setIsAddModalOpen(true)} />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdminMode}
        currentUserRole={currentUser?.role}
      />

      {/* Transaction Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        currency={currency}
        defaultType={activeTab === 'expenses' ? 'expense' : 'sale'}
        activeTab={activeTab}
        products={products}
        expenseCategories={expenseCategories}
        customers={customers}
        onSaveCustomer={handleSaveCustomer}
        onNavigateTab={setActiveTab}
        isAdminMode={isAdminMode}
      />

      <ViewAllTransactionsModal
        isOpen={isViewAllOpen}
        onClose={() => setIsViewAllOpen(false)}
        transactions={transactions}
        currency={currency}
        isAdmin={isAdminMode}
        onDeleteTransaction={handleInitiateDeleteTransaction}
        onSelectTransaction={(tx) => {
          setSelectedTxForDetail(tx);
          setIsViewAllOpen(false);
        }}
      />

      <TransactionDetailModal
        transaction={selectedTxForDetail}
        currency={currency}
        onClose={() => setSelectedTxForDetail(null)}
        onDelete={handleInitiateDeleteTransaction}
        onPrintReceipt={handlePrintReceiptForTransaction}
        isAdmin={isAdminMode}
        linkedReceipt={
          selectedTxForDetail
            ? documents.find(
                (d) =>
                  d.type === 'receipt' &&
                  (d.linkedTransactionId === selectedTxForDetail.id ||
                    (selectedTxForDetail.referenceNo &&
                      (d.paymentReference === selectedTxForDetail.referenceNo ||
                        d.documentNumber === selectedTxForDetail.referenceNo)) ||
                    selectedTxForDetail.title.includes(d.documentNumber))
              ) || null
            : null
        }
      />

      {/* Billing Document Modals */}
      <CreateDocumentModal
        isOpen={isCreateDocModalOpen}
        onClose={() => {
          setIsCreateDocModalOpen(false);
          setEditingDoc(null);
        }}
        onSaveDocument={handleSaveBillingDocument}
        products={products}
        companyInfo={companyInfo}
        currency={currency}
        initialType={docTypeToCreate}
        editingDocument={editingDoc}
        quotations={documents.filter((d) => d.type === 'quotation')}
        customers={customers}
        onSaveCustomer={handleSaveCustomer}
      />

      <DocumentViewerModal
        document={selectedDocForViewer}
        companyInfo={companyInfo}
        currency={currency}
        isOpen={selectedDocForViewer !== null}
        onClose={() => setSelectedDocForViewer(null)}
        onConvertToInvoice={handleConvertToInvoice}
        onConvertToReceipt={handleConvertToReceipt}
        onRecordPayment={handleOpenRecordPayment}
        onDeleteDocument={handleInitiateDeleteBillingDocument}
      />

      <RecordPaymentModal
        invoice={invoiceForPayment}
        activeInvoices={documents.filter((d) => d.type === 'invoice' && (d.balanceDue ?? 0) > 0.01 && d.status !== 'paid')}
        currency={currency}
        isOpen={isRecordPaymentModalOpen}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setInvoiceForPayment(null);
        }}
        onConfirmPayment={handleConfirmRecordPayment}
      />

      {/* Cascading Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePreview(null);
        }}
        preview={deletePreview}
        onConfirm={handleConfirmDeleteCascade}
        currency={currency}
        isProcessing={isDeleteProcessing}
      />

      {/* Admin Authorization Modal for Protected Deletions by Staff */}
      <AdminAuthDeleteModal
        isOpen={adminAuthChallenge.isOpen}
        targetTitle={adminAuthChallenge.targetTitle}
        itemType={adminAuthChallenge.itemType}
        description={adminAuthChallenge.description}
        onClose={() => setAdminAuthChallenge((prev) => ({ ...prev, isOpen: false }))}
        onAuthorized={adminAuthChallenge.onAuthorized}
      />

      {/* User Authentication & Switcher Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        onSignOut={handleSignOut}
      />

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
      />

      <SidebarDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        businessName={companyInfo.businessName}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        licenseConfig={systemLicense}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* System License Countdown & Activation Modal */}
      <LicenseCountdownModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        licenseConfig={systemLicense}
        currentUser={currentUser}
        onSaveLicense={handleUpdateSystemLicense}
        onUpdateLicense={handleUpdateSystemLicense}
      />
    </div>
  );
}
