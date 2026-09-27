import React, { useState, useEffect } from 'react';
import {
  Building2,
  Database,
  Cloud,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Globe2,
  Mail,
  Phone,
  MapPin,
  Coins,
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  Radio,
  Server,
  ArrowRight,
  BarChart3,
  ExternalLink,
  Package,
  Receipt,
  Tag,
  Trash2,
  CreditCard,
  Smartphone,
  Landmark,
  Users,
  Clock,
} from 'lucide-react';
import {
  Transaction,
  CompanyInfo,
  TabType,
  ProductServiceItem,
  ExpenseCategoryItem,
  BillingDocument,
  PaymentOptions,
  SystemUser,
  Customer,
  SystemLicenseConfig,
} from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
import { ProductCatalogManager } from './ProductCatalogManager';
import { ExpenseCategoriesManager } from './ExpenseCategoriesManager';
import { UserManagementManager } from './UserManagementManager';
import { CustomerManager } from './CustomerManager';
import { SuperAdminDocumentation } from './SuperAdminDocumentation';
import { LicenseManagerCard } from './LicenseManagerCard';
import { DEFAULT_SYSTEM_LICENSE } from '../utils/licenseUtils';
import {
  saveCompanyProfileToCloud,
  getCompanyProfileFromCloud,
  uploadAllTransactionsToCloud,
  fetchAllTransactionsFromCloud,
} from '../services/firebaseService';

interface SettingsScreenProps {
  currency: string;
  onCurrencyChange: (c: string) => void;
  transactions: Transaction[];
  documents?: BillingDocument[];
  onResetData: () => void;
  onCleanAllData?: () => Promise<void> | void;
  onImportData: (data: Transaction[]) => void;
  onNavigateTab?: (tab: TabType) => void;
  companyInfo: CompanyInfo;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
  isCloudConnected: boolean;
  onSyncAllToCloud: () => Promise<void>;
  onPullAllFromCloud: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  products?: ProductServiceItem[];
  onSaveProduct?: (item: ProductServiceItem) => Promise<void> | void;
  onDeleteProduct?: (id: string) => Promise<void> | void;
  onResetProducts?: () => Promise<void> | void;
  expenseCategories?: ExpenseCategoryItem[];
  onSaveExpenseCategory?: (item: ExpenseCategoryItem) => Promise<void> | void;
  onDeleteExpenseCategory?: (id: string) => Promise<void> | void;
  onResetExpenseCategories?: () => Promise<void> | void;
  onQuickLogExpense?: (categoryName: string) => void;
  isAdminMode?: boolean;
  users?: SystemUser[];
  currentUser?: SystemUser | null;
  onSaveUser?: (user: SystemUser) => Promise<boolean | void>;
  onDeleteUser?: (userId: string) => Promise<boolean | void>;
  onOpenSignInModal?: () => void;
  customers?: Customer[];
  onSaveCustomer?: (customer: Customer) => Promise<void> | void;
  onDeleteCustomer?: (id: string) => Promise<void> | void;
  licenseConfig?: SystemLicenseConfig;
  onUpdateLicenseConfig?: (config: SystemLicenseConfig) => Promise<boolean | void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currency,
  onCurrencyChange,
  transactions,
  documents = [],
  onResetData,
  onCleanAllData,
  onImportData,
  onNavigateTab,
  companyInfo,
  onUpdateCompanyInfo,
  isCloudConnected,
  onSyncAllToCloud,
  onPullAllFromCloud,
  isSyncing,
  lastSyncTime,
  products = [],
  onSaveProduct = (_item: ProductServiceItem) => {},
  onDeleteProduct = (_id: string) => {},
  onResetProducts = () => {},
  expenseCategories = [],
  onSaveExpenseCategory = (_item: ExpenseCategoryItem) => {},
  onDeleteExpenseCategory = (_id: string) => {},
  onResetExpenseCategories = () => {},
  onQuickLogExpense,
  isAdminMode = true,
  users = [],
  currentUser = null,
  onSaveUser = async () => {},
  onDeleteUser = async () => {},
  onOpenSignInModal = () => {},
  customers = [],
  onSaveCustomer,
  onDeleteCustomer,
  licenseConfig,
  onUpdateLicenseConfig,
}) => {
  // Active sub-section tab
  const [activeSubTab, setActiveSubTab] = useState<
    'company' | 'license' | 'products' | 'customers' | 'expenses_config' | 'firebase' | 'exports' | 'admin' | 'superadmin_docs'
  >(!isAdminMode ? 'customers' : 'company');

  // Enforce role-based tab restriction: staff can access customers or system license countdown
  useEffect(() => {
    if (!isAdminMode && activeSubTab !== 'customers' && activeSubTab !== 'license') {
      setActiveSubTab('customers');
    }
  }, [isAdminMode, activeSubTab]);

  // Form State initialized from companyInfo with payment options defaults
  const [formData, setFormData] = useState<CompanyInfo>({
    ...companyInfo,
    paymentOptions: companyInfo.paymentOptions || {
      bankName: 'NCBA Bank Kenya',
      bankAccountName: companyInfo.businessName || 'Executive Ledger Ltd',
      bankAccountNumber: '1004829101',
      bankBranch: 'Industrial Area Branch',
      bankSwiftCode: 'NCBAKENX',
      mobileMoneyProvider: 'M-PESA',
      mobileMoneyType: 'paybill',
      paybillNumber: '522522',
      accountNumber: '1289410984',
      tillNumber: '892301',
      mobileMoneyName: (companyInfo.businessName || 'EXECUTIVE LEDGER').toUpperCase(),
      paymentInstructions: 'Please quote Document/Invoice Number on all remittance notices. Send MPESA/Bank receipt confirmations to accounts@executiveledger.co.ke.',
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isWipingData, setIsWipingData] = useState(false);
  const [confirmCleanData, setConfirmCleanData] = useState(false);

  const handleCleanAllDataConfirm = async () => {
    setIsWipingData(true);
    setConfirmCleanData(false);
    try {
      if (onCleanAllData) {
        await onCleanAllData();
      } else {
        onResetData();
      }
      setSyncStatusMsg('All data in Firebase Firestore has been cleaned and reset.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (e) {
      console.error('Clean data error:', e);
      setSyncStatusMsg('Failed to clean cloud database.');
    } finally {
      setIsWipingData(false);
    }
  };

  // Keep form in sync if companyInfo changes externally
  useEffect(() => {
    setFormData(companyInfo);
  }, [companyInfo]);

  const handleInputChange = (field: keyof CompanyInfo, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentOptionChange = (field: keyof PaymentOptions, value: any) => {
    setFormData((prev) => ({
      ...prev,
      paymentOptions: {
        ...(prev.paymentOptions || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveCompanyProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update local application state
      onUpdateCompanyInfo(formData);

      // 2. If currency changed in the form, also trigger currency callback
      if (formData.currency !== currency) {
        onCurrencyChange(formData.currency);
      }

      // 3. Save to Firebase Firestore cloud database
      await saveCompanyProfileToCloud(formData);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save company profile to cloud:', err);
      // Still updated locally
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Cloud Actions
  const handlePushToFirestore = async () => {
    try {
      setSyncStatusMsg('Uploading transactions to Firestore...');
      await onSyncAllToCloud();
      setSyncStatusMsg(`Successfully synchronized ${transactions.length} records to Cloud!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg(`Sync error: ${err.message || 'Check network connection'}`);
    }
  };

  const handlePullFromFirestore = async () => {
    try {
      setSyncStatusMsg('Fetching live ledger records from Firestore...');
      await onPullAllFromCloud();
      setSyncStatusMsg('Live cloud data loaded into Executive Ledger!');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg(`Fetch error: ${err.message || 'Failed to pull'}`);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'Title', 'Type', 'Category', 'Amount', 'Payment Method', 'Customer/Vendor', 'Reference', 'Notes'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.time,
      `"${t.title.replace(/"/g, '""')}"`,
      t.type,
      `"${t.category}"`,
      t.amount,
      t.paymentMethod,
      `"${t.customerOrVendor || ''}"`,
      t.referenceNo || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${formData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFullPDF = () => {
    const totalSales = transactions.filter((t) => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const salesCount = transactions.filter((t) => t.type === 'sale').length;
    const expenseCount = transactions.filter((t) => t.type === 'expense').length;
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    const salesCategoriesMap: Record<string, number> = {};
    const expenseCategoriesMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'sale') {
        salesCategoriesMap[tx.category] = (salesCategoriesMap[tx.category] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        expenseCategoriesMap[tx.category] = (expenseCategoriesMap[tx.category] || 0) + tx.amount;
      }
    });

    const sortedSalesCategories = Object.entries(salesCategoriesMap)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percent: totalSales > 0 ? (amount / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedExpenseCategories = Object.entries(expenseCategoriesMap)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    generateAndDownloadPDF({
      businessName: formData.businessName,
      taxId: formData.taxId,
      periodTitle: 'Complete Cumulative Financial Statement',
      periodType: 'yearly',
      currency,
      stats: {
        totalSales,
        totalExpenses,
        netProfit,
        profitMargin,
        totalTransactions: transactions.length,
        salesCount,
        expenseCount,
        avgSale: salesCount > 0 ? totalSales / salesCount : 0,
        avgExpense: expenseCount > 0 ? totalExpenses / expenseCount : 0,
        sortedSalesCategories,
        sortedExpenseCategories,
      },
      transactions,
    });
  };

  const handleExportJSON = () => {
    const backupData = {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      companyProfile: formData,
      products,
      expenseCategories,
      customers,
      transactions,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${formData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportData(parsed);
            alert('Ledger restored successfully!');
          } else if (parsed && Array.isArray(parsed.transactions)) {
            onImportData(parsed.transactions);
            if (parsed.companyProfile) {
              onUpdateCompanyInfo(parsed.companyProfile);
            }
            if (Array.isArray(parsed.products)) {
              parsed.products.forEach((p: ProductServiceItem) => onSaveProduct(p));
            }
            if (Array.isArray(parsed.expenseCategories)) {
              parsed.expenseCategories.forEach((ec: ExpenseCategoryItem) => onSaveExpenseCategory(ec));
            }
            if (Array.isArray(parsed.customers) && onSaveCustomer) {
              parsed.customers.forEach((c: Customer) => onSaveCustomer(c));
            }
            alert('Ledger, Products, Customers, Expense Types & Company Profile restored successfully!');
          }
        } catch (err) {
          alert('Invalid JSON file format.');
        }
      };
    }
  };

  return (
    <div id="settings-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 md:p-6 kpi-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !isAdminMode ? 'bg-purple-700' : 'bg-[#00288e]'
              }`}
            />
            <span
              className={`font-mono text-xs uppercase font-bold tracking-widest ${
                !isAdminMode ? 'text-purple-700' : 'text-[#00288e]'
              }`}
            >
              {!isAdminMode ? 'Customer & Client Registry' : 'Executive System Settings'}
            </span>
          </div>
          <h2 className="font-sans text-2xl font-bold text-[#191c1e] tracking-tight mt-1">
            {!isAdminMode
              ? 'Customer & Client Directory'
              : 'Organization Profile & Cloud Database Sync'}
          </h2>
          <p className="font-mono text-xs text-[#475569] mt-0.5">
            {!isAdminMode
              ? 'Add, search, and manage customer records, phone numbers, addresses, and Tax PINs for sales and invoices'
              : 'Configure company legal metadata, products & services catalog, expense accounts & types, and Firestore cloud sync'}
          </p>
        </div>

        {/* Live Cloud Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f1f5f9] border border-[#cbd5e1] rounded-lg">
          <div className={`w-2.5 h-2.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div className="text-left">
            <div className="font-mono text-[10px] uppercase font-bold text-[#191c1e]">
              {isCloudConnected ? 'Firebase Firestore: Active' : 'Offline Mode'}
            </div>
            <div className="font-mono text-[10px] text-[#64748b]">
              {lastSyncTime ? `Synced ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Database Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: For Staff, Customers and System License tabs are accessible */}
      {!isAdminMode ? (
        <div className="flex border-b border-[#cbd5e1] gap-2 pb-px">
          <button
            onClick={() => setActiveSubTab('customers')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'customers'
                ? 'border-purple-700 text-purple-800 bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Users className="w-4 h-4 text-purple-700" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('license')}
            id="staff-tab-license-config"
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'license'
                ? 'border-[#00288e] text-[#00288e] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Clock className="w-4 h-4 text-[#00288e]" />
            <span>System License</span>
          </button>
        </div>
      ) : (
        <div className="flex border-b border-[#cbd5e1] gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveSubTab('company')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'company'
                ? 'border-[#00288e] text-[#00288e] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Profile</span>
          </button>

          <button
            onClick={() => setActiveSubTab('license')}
            id="tab-license-config"
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'license'
                ? 'border-[#00288e] text-[#00288e] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Clock className="w-4 h-4 text-[#00288e]" />
            <span>System License</span>
          </button>

          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'products'
                ? 'border-[#00288e] text-[#00288e] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products & Services ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('customers')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'customers'
                ? 'border-purple-700 text-purple-800 bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Users className="w-4 h-4 text-purple-700" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('expenses_config')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'expenses_config'
                ? 'border-[#ba1a1a] text-[#ba1a1a] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Receipt className="w-4 h-4 text-[#ba1a1a]" />
            <span>Expense Categories ({expenseCategories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('firebase')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'firebase'
                ? 'border-[#00288e] text-[#00288e] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Firebase & Database Sync</span>
          </button>

          <button
            onClick={() => setActiveSubTab('exports')}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'exports'
                ? 'border-[#00288e] text-[#00288e] bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exports & Backups</span>
          </button>

          <button
            onClick={() => setActiveSubTab('admin')}
            id="tab-admin-permissions"
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'admin'
                ? 'border-amber-600 text-amber-800 bg-white shadow-xs rounded-t-md'
                : 'border-transparent text-[#64748b] hover:text-[#191c1e] hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-700" />
            <span>Users & Roles ({users.length})</span>
          </button>

          {currentUser?.role === 'super_admin' && (
            <button
              onClick={() => setActiveSubTab('superadmin_docs')}
              id="tab-superadmin-permissions-docs"
              className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'superadmin_docs'
                  ? 'border-amber-600 text-amber-900 bg-amber-50 shadow-xs rounded-t-md font-bold'
                  : 'border-transparent text-amber-800 hover:text-amber-950 hover:bg-amber-50/60 rounded-t-md'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Super Admin Manual</span>
            </button>
          )}
        </div>
      )}

      {/* If not in admin mode (staff role), strictly render ONLY Customer Directory */}
      {!isAdminMode ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          <CustomerManager
            customers={customers}
            onSaveCustomer={onSaveCustomer || (async () => {})}
            onDeleteCustomer={onDeleteCustomer || (async () => {})}
            isAdmin={isAdminMode}
          />
        </div>
      ) : (
        <>
          {/* SUB-TAB: TEAM, ROLES & ADMIN PERMISSIONS */}
          {activeSubTab === 'admin' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* User Management & Role Assignment */}
          <UserManagementManager
            users={users}
            currentUser={currentUser}
            isAdmin={isAdminMode}
            onSaveUser={onSaveUser}
            onDeleteUser={onDeleteUser}
            onOpenSignInModal={onOpenSignInModal}
          />

          <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg text-[#191c1e]">
                    Administrator Authorization & Record Deletion
                  </h3>
                  <p className="font-mono text-xs text-[#64748b] mt-0.5">
                    Control who can delete records and manage cascading deletion rules.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  id="settings-admin-status-badge"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs uppercase font-bold border ${
                    isAdminMode
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{isAdminMode ? 'Administrator Access' : 'Staff Member Access'}</span>
                </span>
              </div>
            </div>

            {/* Permission explanation & cascading rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Current Security Role: {isAdminMode ? 'Administrator' : 'Standard Staff'}
                </span>
                <p className="font-sans text-xs text-slate-600 leading-relaxed">
                  {isAdminMode
                    ? 'You currently have Full Administrator Privileges. You can delete sales, receipts, invoices, quotations, and expense transactions with automated cascading safety.'
                    : 'Standard Staff Mode is active. Deleting confirmed sales and financial records is restricted to prevent accidental loss or unauthorized modifications.'}
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" /> Cascading Record Deletion
                </span>
                <p className="font-sans text-xs text-amber-950 leading-relaxed">
                  If an admin deletes a confirmed sale, the system automatically detects and deletes all associated records—including payment receipts, billing invoices, and quotation estimates. All items are bundled into the Trash Bin so you can review or restore them at any time.
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="border-t border-[#e2e8f0] pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#64748b]">
              <div>
                <span>Active Transactions: </span>
                <strong className="text-slate-900">{transactions.length}</strong>
                <span className="mx-2">•</span>
                <span>Active Documents: </span>
                <strong className="text-slate-900">{documents.length}</strong>
              </div>
              <div className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audited Transaction Integrity Engine Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: EXPENSE CATEGORIES MANAGER */}
      {activeSubTab === 'expenses_config' && (
        <ExpenseCategoriesManager
          categories={expenseCategories}
          onSaveCategory={onSaveExpenseCategory}
          onDeleteCategory={onDeleteExpenseCategory}
          onResetToDefaults={onResetExpenseCategories}
          onQuickLogExpense={onQuickLogExpense}
        />
      )}

      {/* SUB-TAB: PRODUCTS & SERVICES CATALOG */}
      {activeSubTab === 'products' && (
        <ProductCatalogManager
          products={products}
          currency={currency}
          onSaveProduct={onSaveProduct}
          onDeleteProduct={onDeleteProduct}
          onResetToDefaults={onResetProducts}
        />
      )}

      {/* SUB-TAB: CUSTOMERS DIRECTORY */}
      {activeSubTab === 'customers' && (
        <CustomerManager
          customers={customers}
          onSaveCustomer={onSaveCustomer || (async () => {})}
          onDeleteCustomer={onDeleteCustomer || (async () => {})}
          isAdmin={isAdminMode}
        />
      )}

      {/* SUB-TAB 1: COMPANY PROFILE FORM */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-6">
          <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 md:p-6 kpi-shadow space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#e2e8f0] pb-3">
              <div>
                <h3 className="font-sans font-bold text-lg text-[#191c1e]">
                  Organization & Entity Details
                </h3>
                <p className="font-mono text-xs text-[#64748b] mt-0.5">
                  These details automatically populate all PDF reports, invoices, headers, and official tax statements.
                </p>
              </div>
              <span className="font-mono text-[11px] bg-blue-50 text-[#00288e] border border-blue-200 px-2.5 py-1 rounded-md self-start sm:self-auto font-semibold">
                Reflects Across All Tabs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Business Name */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Trading / Brand Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="e.g. Executive Ledger Kenya Ltd"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
                <p className="font-mono text-[10px] text-[#64748b] mt-1">
                  Shown at the top of reports, invoices, and executive dashboards.
                </p>
              </div>

              {/* Legal Registered Entity Name */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Legal Registered Entity Name</span>
                </label>
                <input
                  type="text"
                  value={formData.legalEntityName}
                  onChange={(e) => handleInputChange('legalEntityName', e.target.value)}
                  placeholder="e.g. Executive Ledger Enterprises Holdings Ltd"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
                <p className="font-mono text-[10px] text-[#64748b] mt-1">
                  Appears in formal audited statements and regulatory filings.
                </p>
              </div>

              {/* Tax / KRA PIN Registration */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Tax Identification / KRA PIN *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  placeholder="e.g. KRA PIN P051239841K"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
                <p className="font-mono text-[10px] text-[#64748b] mt-1">
                  Printed on generated statements, tax audit exports, and receipts.
                </p>
              </div>

              {/* Base Currency */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Default Operating Currency *</span>
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    handleInputChange('currency', e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                >
                  <option value="KES">KES (KSh) — Kenyan Shilling</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="NGN">NGN (₦) — Nigerian Naira</option>
                  <option value="ZAR">ZAR (R) — South African Rand</option>
                  <option value="CAD">CAD (CA$) — Canadian Dollar</option>
                  <option value="AUD">AUD (AU$) — Australian Dollar</option>
                  <option value="JPY">JPY (¥) — Japanese Yen</option>
                </select>
                <p className="font-mono text-[10px] text-[#64748b] mt-1">
                  System-wide formatting applied across Sales, Expenses, Cashbook & Reports.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Finance / Billing Email</span>
                </label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                  placeholder="accounts@executiveledger.co.ke"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Support / Business Telephone</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+254 700 123 456"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
              </div>

              {/* Physical Office Address */}
              <div className="md:col-span-2">
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Physical Address / Head Office</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. Floor 12, Delta Corner Tower, Westlands, Nairobi, Kenya"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
              </div>

              {/* Website & Online Portal */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Company Website / Online Portal</span>
                </label>
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="e.g. https://www.executiveledger.co.ke"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
              </div>

              {/* Business Tagline / Slogan */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
                  <span>Business Tagline / Motto</span>
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="e.g. Precision Financial Management & Enterprise Solvency"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#94a3b8] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                />
              </div>

              {/* PAYMENT OPTIONS & REMITTANCE CHANNELS */}
              <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-200 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-base text-[#191c1e]">
                      Company Payment Options & Remittance Information
                    </h4>
                    <p className="font-mono text-xs text-[#64748b]">
                      Configured banking and mobile money channels automatically print on all Quotations, Invoices, and Receipts.
                    </p>
                  </div>
                </div>

                {/* Sub-grid: Bank Details */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-mono text-xs uppercase font-bold">
                    <Landmark className="w-4 h-4 text-[#00288e]" />
                    <span>Bank Account Details</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.bankName || ''}
                        onChange={(e) => handlePaymentOptionChange('bankName', e.target.value)}
                        placeholder="e.g. NCBA Bank Kenya"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Account Holder / Beneficiary Name
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.bankAccountName || ''}
                        onChange={(e) => handlePaymentOptionChange('bankAccountName', e.target.value)}
                        placeholder="e.g. Executive Ledger Kenya Ltd"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.bankAccountNumber || ''}
                        onChange={(e) => handlePaymentOptionChange('bankAccountNumber', e.target.value)}
                        placeholder="e.g. 1004829101"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Bank Branch
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.bankBranch || ''}
                        onChange={(e) => handlePaymentOptionChange('bankBranch', e.target.value)}
                        placeholder="e.g. Industrial Area Branch, Nairobi"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        SWIFT / BIC Code
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.bankSwiftCode || ''}
                        onChange={(e) => handlePaymentOptionChange('bankSwiftCode', e.target.value)}
                        placeholder="e.g. NCBAKENX"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-grid: Mobile Money / M-PESA */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-mono text-xs uppercase font-bold">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Mobile Money & M-PESA Remittance</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Mobile Money Provider
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.mobileMoneyProvider || 'M-PESA'}
                        onChange={(e) => handlePaymentOptionChange('mobileMoneyProvider', e.target.value)}
                        placeholder="e.g. M-PESA / Airtel Money"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        M-PESA Paybill Number
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.paybillNumber || ''}
                        onChange={(e) => handlePaymentOptionChange('paybillNumber', e.target.value)}
                        placeholder="e.g. 522522"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Account Reference / Number
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.accountNumber || ''}
                        onChange={(e) => handlePaymentOptionChange('accountNumber', e.target.value)}
                        placeholder="e.g. 1289410984 or 'Invoice Number'"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Buy Goods & Services (Till Number)
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.tillNumber || ''}
                        onChange={(e) => handlePaymentOptionChange('tillNumber', e.target.value)}
                        placeholder="e.g. 892301"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                        Registered Business Name on M-PESA
                      </label>
                      <input
                        type="text"
                        value={formData.paymentOptions?.mobileMoneyName || ''}
                        onChange={(e) => handlePaymentOptionChange('mobileMoneyName', e.target.value)}
                        placeholder="e.g. EXECUTIVE LEDGER LTD"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                      />
                    </div>
                  </div>
                </div>

                {/* Remittance Instructions & Live Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                      Payment Remittance Notes & Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={formData.paymentOptions?.paymentInstructions || ''}
                      onChange={(e) => handlePaymentOptionChange('paymentInstructions', e.target.value)}
                      placeholder="e.g. Please quote Document/Invoice Number on all remittance notices. Send MPESA/Bank receipt confirmations to accounts@executiveledger.co.ke."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                    />
                    <p className="font-mono text-[10px] text-slate-500 mt-1">
                      Printed on all client quotations, billing invoices, and payment receipts.
                    </p>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                      Default Terms & Conditions (Quotations & Invoices)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.termsAndConditions || ''}
                      onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                      placeholder="e.g. 1. Quotation valid for 30 calendar days. 2. Payments strictly due within 14 days of invoice. 3. Goods remain the property of the company until payment settles in full."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-sans text-xs text-slate-800 focus:outline-none focus:border-[#00288e]"
                    />
                    <p className="font-mono text-[10px] text-slate-500 mt-1">
                      Loaded automatically into new invoices & quotations, but fully editable per document.
                    </p>
                  </div>
                </div>

                {/* Live Document Preview Box */}
                <div className="bg-white border-2 border-indigo-200/80 rounded-xl p-3.5 space-y-1.5 shadow-2xs font-mono text-xs">
                  <span className="font-bold text-[#00288e] uppercase text-[10px] tracking-wider block">
                    Live Preview: How Clients See Your Payment Options & Banking Details
                  </span>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <p className="font-bold text-slate-900">
                      • {formData.paymentOptions?.mobileMoneyProvider || 'M-PESA'} Paybill:{' '}
                      <span className="text-[#00288e]">{formData.paymentOptions?.paybillNumber || '522522'}</span> | A/C:{' '}
                      <span>{formData.paymentOptions?.accountNumber || 'INV-2026-001'}</span>
                    </p>
                    {formData.paymentOptions?.tillNumber && (
                      <p className="text-slate-700">
                        • Till No: <span className="font-bold">{formData.paymentOptions.tillNumber}</span>
                        {formData.paymentOptions.mobileMoneyName && ` (${formData.paymentOptions.mobileMoneyName})`}
                      </p>
                    )}
                    <p className="text-slate-700">
                      • {formData.paymentOptions?.bankName || 'NCBA Bank Kenya'} | A/C:{' '}
                      <span className="font-bold">{formData.paymentOptions?.bankAccountNumber || '1004829101'}</span>
                      {formData.paymentOptions?.bankBranch && ` (${formData.paymentOptions.bankBranch})`}
                    </p>
                    {formData.paymentOptions?.paymentInstructions && (
                      <p className="text-[10px] text-slate-600 pt-0.5">
                        <span className="font-bold">Instructions:</span> {formData.paymentOptions.paymentInstructions}
                      </p>
                    )}
                    {formData.termsAndConditions && (
                      <p className="text-[10px] text-slate-500 italic pt-0.5 border-t border-slate-200/60">
                        <span className="font-bold">Default Terms:</span> {formData.termsAndConditions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0]">
              <div className="font-mono text-xs text-[#64748b]">
                {saveSuccess ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Company profile saved & synchronized to Cloud!
                  </span>
                ) : (
                  <span>Updates immediately apply to all screens and PDF generators</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white px-6 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Saving Profile...' : 'Save & Sync Profile'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: FIREBASE CLOUD DATABASE & SYNC */}
      {activeSubTab === 'firebase' && (
        <div className="space-y-6">
          {/* Cloud Connection Summary Box */}
          <div className="bg-linear-to-r from-[#00288e] to-[#1e40af] rounded-lg p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans font-bold text-lg text-white">
                      Google Firebase Cloud Database
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                      Connected
                    </span>
                  </div>
                  <p className="font-mono text-xs text-blue-100 mt-1">
                    Firestore database: <code className="bg-black/20 px-1.5 py-0.5 rounded text-white font-semibold">ai-studio-executiveledger-1a4d5f05-5766-48a6-be86-cb011fc1f548</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePushToFirestore}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-white text-[#00288e] hover:bg-blue-50 px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Push All to Cloud</span>
                </button>
                <button
                  onClick={handlePullFromFirestore}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-md font-mono text-xs uppercase font-semibold transition-all cursor-pointer disabled:opacity-60"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Pull Latest</span>
                </button>
              </div>
            </div>

            {syncStatusMsg && (
              <div className="mt-4 p-3 bg-black/25 rounded-md font-mono text-xs text-blue-100 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}
          </div>

          {/* Database Specs & Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64748b] uppercase font-bold">Cloud Records</span>
                <Server className="w-4 h-4 text-[#00288e]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#191c1e] mt-2">
                {transactions.length + documents.length + products.length + expenseCategories.length}
              </div>
              <p className="font-mono text-[11px] text-[#64748b] mt-1">
                {transactions.length} txs • {documents.length} invoices & docs • {products.length} items
              </p>
            </div>

            <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64748b] uppercase font-bold">Sync Status</span>
                <RefreshCw className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-mono text-xl font-bold text-emerald-700 mt-2">
                Real-Time Auto-Sync
              </div>
              <p className="font-mono text-[11px] text-[#64748b] mt-1">
                Changes stream instantly to Firestore
              </p>
            </div>

            <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64748b] uppercase font-bold">Firestore Project</span>
                <Globe2 className="w-4 h-4 text-[#00288e]" />
              </div>
              <div className="font-mono text-sm font-bold text-[#191c1e] mt-2 truncate">
                animated-catalyst-t1ttq
              </div>
              <p className="font-mono text-[11px] text-[#64748b] mt-1">
                Region: europe-west2
              </p>
            </div>
          </div>

          {/* Sync Operations Card */}
          <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 md:p-6 kpi-shadow space-y-4">
            <h3 className="font-sans font-bold text-base text-[#191c1e]">
              Database Operations & Cloud Storage Synchronization
            </h3>
            <p className="font-mono text-xs text-[#64748b]">
              Your sales invoices, expense receipts, cashbook balances, and company profile are safely mirrored in Firestore.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-[#e2e8f0] rounded-lg p-4 bg-[#f8fafc] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-[#00288e] font-bold text-sm">
                    <UploadCloud className="w-4 h-4" />
                    <span>Push Local Dataset to Cloud</span>
                  </div>
                  <p className="font-mono text-xs text-[#64748b] mt-1">
                    Uploads all current transactions and company profile to Firestore to overwrite or seed the cloud database.
                  </p>
                </div>
                <button
                  onClick={handlePushToFirestore}
                  disabled={isSyncing || isWipingData}
                  className="w-full flex items-center justify-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white py-2 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer disabled:opacity-60"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Sync All Records to Cloud</span>
                </button>
              </div>

              <div className="border border-[#e2e8f0] rounded-lg p-4 bg-[#f8fafc] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-[#006d30] font-bold text-sm">
                    <DownloadCloud className="w-4 h-4" />
                    <span>Pull Database into Ledger</span>
                  </div>
                  <p className="font-mono text-xs text-[#64748b] mt-1">
                    Downloads all stored documents from Firestore into your local view, restoring the entire business ledger.
                  </p>
                </div>
                <button
                  onClick={handlePullFromFirestore}
                  disabled={isSyncing || isWipingData}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-2 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer disabled:opacity-60"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Fetch & Merge from Firestore</span>
                </button>
              </div>
            </div>

            {/* Danger Zone: Clean & Purge Firestore Database */}
            <div className="border border-red-200 bg-red-50/50 rounded-lg p-4 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  <span>Clean & Purge Database (Cloud & Local)</span>
                </div>
                <p className="font-mono text-xs text-red-600/80 mt-1">
                  Permanently deletes all transactions, billing documents, products, and categories in Firebase Firestore and starts with a completely clean database.
                </p>
              </div>
              {confirmCleanData ? (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={handleCleanAllDataConfirm}
                    disabled={isWipingData}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
                  >
                    {isWipingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Confirm Wipe Database</span>
                  </button>
                  <button
                    onClick={() => setConfirmCleanData(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCleanData(true)}
                  disabled={isWipingData || isSyncing}
                  className="shrink-0 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Clean All Cloud Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: EXPORTS, REPORTS & BACKUPS */}
      {activeSubTab === 'exports' && (
        <div className="space-y-6">
          {/* Direct Report Generator Launcher */}
          <div className="bg-linear-to-r from-[#00288e] to-[#1e40af] rounded-lg p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-base md:text-lg text-white">
                  Financial Statement Generator
                </h3>
                <p className="font-mono text-xs text-blue-100 mt-0.5">
                  Daily, Weekly, Monthly, and Annual P&L reporting with category breakdowns, print-ready sheets & CSV exports
                </p>
              </div>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('reports')}
                className="flex items-center gap-2 bg-white text-[#00288e] hover:bg-blue-50 px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <span>Launch Reports</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Financial Reports Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-[#191c1e]">
                    Export Financial Statements
                  </h3>
                  <p className="font-mono text-xs text-[#475569] mt-0.5">
                    Download official PDF audit reports or CSV spreadsheets for Excel & QuickBooks with {formData.businessName} branding.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleExportFullPDF}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Full PDF Statement</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] py-2.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#00288e]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#006d30] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-[#191c1e]">
                    Backup & Restore (.JSON)
                  </h3>
                  <p className="font-mono text-xs text-[#475569] mt-0.5">
                    Download complete snapshot of company metadata & transactions or restore existing ledger backups.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportJSON}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] py-2.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] py-2.5 rounded-md font-mono text-xs uppercase font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Reset & Clean Database */}
          <div className="bg-white border border-red-200 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="font-sans font-bold text-sm text-[#ba1a1a]">
                Clean All Firebase Data & Reset Ledger
              </h4>
              <p className="font-mono text-xs text-[#64748b] mt-0.5">
                Clears all cloud records in Firestore and resets the application to a 100% clean state.
              </p>
            </div>
            {confirmCleanData ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCleanAllDataConfirm}
                  disabled={isWipingData}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
                >
                  {isWipingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Confirm Wipe</span>
                </button>
                <button
                  onClick={() => setConfirmCleanData(false)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCleanData(true)}
                disabled={isWipingData}
                className="flex items-center gap-1.5 bg-red-50 text-[#ba1a1a] hover:bg-red-100 border border-red-200 px-4 py-2 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clean All Data</span>
              </button>
            )}
          </div>
        </div>
      )}

          {/* SUB-TAB: SYSTEM LICENSE & COUNTDOWN */}
          {activeSubTab === 'license' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <LicenseManagerCard
                licenseConfig={licenseConfig || DEFAULT_SYSTEM_LICENSE}
                currentUser={currentUser}
                onSaveLicense={onUpdateLicenseConfig}
                onUpdateLicense={onUpdateLicenseConfig}
              />
            </div>
          )}

          {/* SUB-TAB: SUPER ADMIN DOCUMENTATION */}
          {activeSubTab === 'superadmin_docs' && currentUser?.role === 'super_admin' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <SuperAdminDocumentation currentUser={currentUser} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
