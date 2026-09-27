export type TransactionType = 'sale' | 'expense' | 'transfer';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'mobile_money';
export type FinancialAccountType = 'bank' | 'mpesa' | 'cash';
export type TabType = 'dashboard' | 'sales' | 'expenses' | 'cashbook' | 'reports' | 'documents' | 'more' | 'superadmin_docs';
export type UnitType = 'units' | 'kg' | 'g' | 'pcs' | 'bags' | 'boxes' | 'liters' | 'hours' | 'service' | 'meters';

export type DocumentType = 'quotation' | 'invoice' | 'receipt';
export type DocumentStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'issued';

export interface DocumentLineItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unitType?: UnitType;
  discountPercent?: number;
  amount: number;
}

export interface BillingDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  title: string;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD (or validity date)
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string; // e.g. Customer KRA PIN
  items: DocumentLineItem[];
  subtotal: number;
  taxRate?: number; // percentage (e.g. 16 for VAT)
  taxTotal?: number;
  discountTotal?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod?: PaymentMethod;
  financialAccount?: FinancialAccountType; // 'bank' | 'mpesa' | 'cash'
  paymentReference?: string; // e.g. M-PESA Code, Bank Ref
  status: DocumentStatus;
  notes?: string;
  termsAndConditions?: string;
  linkedQuotationId?: string;
  linkedInvoiceId?: string;
  linkedTransactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductServiceItem {
  id: string;
  name: string;
  type: 'product' | 'service';
  category: string;
  unitPrice: number;
  unitType: UnitType;
  description?: string;
  sku?: string;
  inStock?: number;
  isActive: boolean;
  updatedAt?: string;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  group: string;
  description?: string;
  defaultAmount?: number;
  taxDeductible?: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  billingAddress?: string; // Explicit Billing Address
  taxId?: string; // Customer Tax PIN (e.g. KRA PIN)
  kraPin?: string; // Explicit KRA PIN
  pin?: string; // Explicit PIN
  notes?: string;
  totalTransactionsCount?: number;
  totalSpent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:42 AM" or "09:15 AM"
  paymentMethod: PaymentMethod;
  financialAccount?: FinancialAccountType; // 'bank' | 'mpesa' | 'cash'
  notes?: string;
  customerOrVendor?: string;
  referenceNo?: string;
  status: 'completed' | 'pending';
  // Product / Service unit pricing fields
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  unitType?: UnitType;
  items?: DocumentLineItem[];
}

export interface PaymentOptions {
  // Bank Details
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  bankSwiftCode?: string;
  // Mobile Money / M-PESA Details
  mobileMoneyProvider?: string; // e.g. M-PESA, Airtel Money
  mobileMoneyType?: 'paybill' | 'till' | 'send_money';
  paybillNumber?: string;
  accountNumber?: string; // e.g. Business A/C or Customer Ref
  tillNumber?: string;
  mobileMoneyName?: string; // Business name as shown on MPESA
  // Payment Instructions & Remittance Terms
  paymentInstructions?: string; // e.g. "Please quote Invoice/Quotation Number on all payment slips."
}

export interface CompanyInfo {
  businessName: string;
  legalEntityName: string;
  taxId: string; // e.g. KRA PIN or VAT number
  businessEmail: string;
  phone: string;
  address: string;
  currency: string;
  website?: string;
  tagline?: string;
  fiscalYearStartMonth?: number; // 1 to 12
  paymentOptions?: PaymentOptions;
  termsAndConditions?: string; // Default terms & conditions and banking notes
  updatedAt?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'user';

export interface SystemUser {
  id: string; // uid or record id
  email: string;
  displayName: string;
  username?: string; // Username for login (e.g., 'sammuel', 'admin', 'john_doe')
  role: UserRole;
  password?: string; // Hashed password for email authentication
  phone?: string;
  department?: string;
  isActive: boolean;
  disabledReason?: 'license_expired' | 'account_suspended' | 'subscription_ended' | 'custom' | string;
  disabledMessage?: string; // Custom error message or license expiration notice shown when login is disabled
  createdAt: string;
  lastLoginAt?: string;
  photoURL?: string;
}

export interface SystemLicenseConfig {
  activationDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD (Calculated 1 year from activation)
  durationYears?: number; // 1
  activatedBy?: string;
  activatedAt?: string;
  notes?: string;
  updatedAt?: string;
  isDeactivated?: boolean; // When true, license is manually deactivated by Super Admin
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
}

export interface LicenseCountdownDetails {
  activationDate: string;
  expiryDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  percentRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isDeactivated: boolean;
  status: 'active' | 'expiring_soon' | 'expired' | 'deactivated';
  expiryFormatted: string;
  activationFormatted: string;
  deactivationFormatted?: string;
  deactivationReason?: string;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  dayLabel: string; // 'Mon', 'Tue', etc.
  revenue: number;
  expenses: number;
  profit: number;
}

export interface KPISummary {
  todaySales: number;
  todaySalesChange: number;
  todayExpenses: number;
  todayExpensesChange: number;
  todayProfit: number;
  todayProfitChange: number;
  cashBalance: number;
  cashBalanceChange: number;
}

export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  type: TransactionType;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
}

export interface TrashBundle {
  id: string;
  primaryItemType: 'quotation' | 'invoice' | 'receipt' | 'transaction' | 'sale';
  primaryItemTitle: string;
  primaryItemNumber?: string;
  primaryItemId: string;
  trashedAt: string;
  totalAmount?: number;
  customerName?: string;
  documents: BillingDocument[];
  transactions: Transaction[];
  description?: string;
}

export interface CascadeDeletePreview {
  targetDoc?: BillingDocument;
  targetTx?: Transaction;
  cascadedQuotes: BillingDocument[];
  cascadedInvoices: BillingDocument[];
  cascadedReceipts: BillingDocument[];
  cascadedTransactions: Transaction[];
  totalAffectedRecords: number;
}

