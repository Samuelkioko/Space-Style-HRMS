import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  FileText,
  FileCheck,
  CreditCard,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  CheckCircle,
  ChevronRight,
  Package,
  ShoppingBag,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Transaction,
  BillingDocument,
  DocumentType,
  CompanyInfo,
  ProductServiceItem,
  TrashBundle,
  TabType,
  Customer,
} from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { generateAndDownloadDocumentPDF } from '../utils/documentPdfGenerator';
import { CustomerManager } from './CustomerManager';

interface SalesScreenProps {
  transactions?: Transaction[];
  documents?: BillingDocument[];
  companyInfo?: CompanyInfo;
  products?: ProductServiceItem[];
  currency: string;
  trashBundles?: TrashBundle[];
  isCloudConnected?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
  isAdminMode?: boolean;
  onOpenAddModal: () => void;
  onCreateDocument?: (type: DocumentType) => void;
  onViewDocument?: (doc: BillingDocument) => void;
  onEditDocument?: (doc: BillingDocument) => void;
  onDeleteDocument?: (id: string) => void;
  onDeleteSale?: (id: string) => void;
  onRecordPayment?: (doc: BillingDocument) => void;
  onConvertToInvoice?: (doc: BillingDocument) => void;
  onConvertToReceipt?: (doc: BillingDocument) => void;
  onApproveQuotation?: (doc: BillingDocument) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenTrashBin?: () => void;
  onNavigateTab?: (tab: TabType) => void;
  customers?: Customer[];
  onSaveCustomer?: (customer: Customer) => Promise<void> | void;
  onDeleteCustomer?: (id: string) => Promise<void> | void;
}

export type SalesViewMode = 'pipeline' | 'quotations' | 'invoices' | 'receipts' | 'ledger' | 'customers';

export const SalesScreen: React.FC<SalesScreenProps> = ({
  transactions = [],
  documents = [],
  companyInfo,
  products = [],
  currency,
  trashBundles = [],
  isCloudConnected = true,
  isSyncing = false,
  lastSyncTime = null,
  isAdminMode = true,
  onOpenAddModal,
  onCreateDocument,
  onViewDocument,
  onEditDocument,
  onDeleteDocument,
  onDeleteSale,
  onRecordPayment,
  onConvertToInvoice,
  onConvertToReceipt,
  onApproveQuotation,
  onSelectTransaction,
  onOpenTrashBin,
  onNavigateTab,
  customers = [],
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [viewMode, setViewMode] = useState<SalesViewMode>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const activeProducts = products.filter((p) => p.isActive !== false);

  // Split documents by stage
  const quotations = useMemo(() => documents.filter((d) => d.type === 'quotation'), [documents]);
  const invoices = useMemo(() => documents.filter((d) => d.type === 'invoice'), [documents]);
  const receipts = useMemo(() => documents.filter((d) => d.type === 'receipt'), [documents]);
  const confirmedSales = useMemo(() => transactions.filter((t) => t.type === 'sale'), [transactions]);

  // Comprehensive Metrics across the Quotation -> Invoice -> Receipt -> Sale Pipeline
  // User mandate: Total collected or income will come from receipts, not invoices!
  const metrics = useMemo(() => {
    // 1. Quotations Pipeline
    const quotesTotalValue = quotations.reduce((sum, q) => sum + (q.total || 0), 0);
    const openQuotesCount = quotations.filter((q) => q.status !== 'accepted' && q.status !== 'declined').length;
    const acceptedQuotesCount = quotations.filter((q) => q.status === 'accepted').length;

    // 2. Invoices & Receivables (Invoices represent claims billed, not settled income)
    const invoicesTotalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const invoicesCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const outstandingReceivables = invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const unpaidInvoicesCount = invoices.filter((inv) => (inv.balanceDue || 0) > 0.01).length;
    const paidInvoicesCount = invoices.filter((inv) => (inv.balanceDue || 0) <= 0.01 && inv.amountPaid > 0).length;

    // 3. Receipts Issued & Verified Income: Total collected or income comes strictly from receipts!
    const receiptsTotalCollected = receipts.reduce((sum, r) => sum + (r.amountPaid || r.total || 0), 0);
    const receiptsCount = receipts.length;

    // 4. Confirmed Cashbook Sales
    const totalConfirmedSales = confirmedSales.reduce((sum, s) => sum + s.amount, 0);
    const avgTicket = confirmedSales.length > 0 ? totalConfirmedSales / confirmedSales.length : 0;

    // Conversion rate: quotes converted to invoices/sales
    const conversionRate = quotations.length > 0 ? (acceptedQuotesCount / quotations.length) * 100 : 100;

    return {
      quotesTotalValue,
      openQuotesCount,
      acceptedQuotesCount,
      invoicesTotalBilled,
      invoicesCollected,
      outstandingReceivables,
      unpaidInvoicesCount,
      paidInvoicesCount,
      receiptsTotalCollected,
      receiptsCount,
      totalConfirmedSales,
      avgTicket,
      conversionRate,
    };
  }, [quotations, invoices, receipts, confirmedSales]);

  // Categories for ledger filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    confirmedSales.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [confirmedSales]);

  // Filtered lists based on search and status
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch =
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.paymentReference && inv.paymentReference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchSearch =
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.paymentReference && r.paymentReference.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [receipts, searchTerm]);

  const filteredConfirmedSales = useMemo(() => {
    return confirmedSales.filter((sale) => {
      const matchSearch =
        sale.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerOrVendor && sale.customerOrVendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.referenceNo && sale.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || sale.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [confirmedSales, searchTerm, selectedCategory]);

  const handleDownloadPDF = (doc: BillingDocument) => {
    if (!companyInfo) return;
    generateAndDownloadDocumentPDF({
      document: doc,
      companyInfo: companyInfo,
      currency: currency,
    });
  };

  return (
    <div id="sales-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Quick Action Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-[#c4c5d5]/70 rounded-xl p-4 sm:p-5 md:p-6 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#00288e] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-sans text-xl sm:text-2xl font-bold text-[#191c1e] tracking-tight">
                Sales
              </h2>
              <p className="font-mono text-[10px] sm:text-xs text-[#64748b] truncate max-w-full">
                Quotes • Invoices • Receipts • Confirmed
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onCreateDocument && (
            <>
              <button
                id="btn-create-quotation"
                onClick={() => onCreateDocument('quotation')}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>New Quote</span>
              </button>

              <button
                id="btn-create-invoice"
                onClick={() => onCreateDocument('invoice')}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#00288e] border border-blue-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00288e] shrink-0" />
                <span>Invoice</span>
              </button>
            </>
          )}

          <button
            id="btn-quick-sale-pos"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-[#006d30] hover:bg-[#005224] text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>POS Sale</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-5">
        {/* 1. Total Collected Income */}
        <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] sm:text-xs uppercase text-[#475569] font-medium truncate">Total Collected</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="font-sans text-lg sm:text-2xl md:text-3xl font-bold text-[#006d30] mt-1.5 sm:mt-2 truncate">
            +{formatCurrency(metrics.receiptsTotalCollected, currency)}
          </p>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#64748b] mt-1 truncate block">
            {metrics.receiptsCount} cleared receipts
          </span>
        </div>

        {/* 2. Outstanding Receivables */}
        <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] sm:text-xs uppercase text-[#475569] font-medium truncate">Unpaid Invoices</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="font-sans text-lg sm:text-2xl md:text-3xl font-bold text-amber-700 mt-1.5 sm:mt-2 truncate">
            {formatCurrency(metrics.outstandingReceivables, currency)}
          </p>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#64748b] mt-1 truncate block">
            {metrics.unpaidInvoicesCount} invoices pending
          </span>
        </div>

        {/* 3. Quotation Pipeline Value */}
        <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] sm:text-xs uppercase text-[#475569] font-medium truncate">Quotes Pipeline</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="font-sans text-lg sm:text-2xl md:text-3xl font-bold text-indigo-900 mt-1.5 sm:mt-2 truncate">
            {formatCurrency(metrics.quotesTotalValue, currency)}
          </p>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#64748b] mt-1 truncate block">
            {metrics.openQuotesCount} active estimates
          </span>
        </div>

        {/* 4. Average Ticket & Conversion */}
        <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] sm:text-xs uppercase text-[#475569] font-medium truncate">Avg Order Value</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="font-sans text-lg sm:text-2xl md:text-3xl font-bold text-[#191c1e] mt-1.5 sm:mt-2 truncate">
            {formatCurrency(metrics.avgTicket, currency)}
          </p>
          <span className="font-mono text-[10px] sm:text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold truncate">
            <CheckCircle className="w-3 h-3 shrink-0" /> {metrics.conversionRate.toFixed(0)}% conversion
          </span>
        </div>
      </div>

      {/* Visual 4-Stage Interactive Pipeline Progression Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#00288e] to-slate-900 rounded-xl p-4 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-sans text-sm md:text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Sales Lifecycle Journey</span>
            </h3>
            <p className="font-mono text-[11px] text-slate-300">
              Every sale flows seamlessly through formal quotation, billing invoice, proof of payment, and verified ledger recording.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full text-slate-200 border border-white/20">
            Automated Cashbook Sync
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-2 border-t border-white/15">
          {/* Stage 1 */}
          <button
            onClick={() => setViewMode('quotations')}
            className={`p-2.5 sm:p-3 rounded-lg text-left transition-all border cursor-pointer min-w-0 ${
              viewMode === 'quotations'
                ? 'bg-white/20 border-white/40 shadow-inner ring-2 ring-emerald-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[10px] uppercase font-bold text-indigo-200 truncate">1. Quote</span>
              <span className="font-mono text-[10px] bg-indigo-500/40 text-indigo-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                {quotations.length}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm font-bold text-white mt-1 truncate">
              {formatCurrency(metrics.quotesTotalValue, currency)}
            </p>
            <p className="font-mono text-[10px] text-slate-300 mt-0.5 flex items-center gap-1 truncate">
              <span>Estimate</span> <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            </p>
          </button>

          {/* Stage 2 */}
          <button
            onClick={() => setViewMode('invoices')}
            className={`p-2.5 sm:p-3 rounded-lg text-left transition-all border cursor-pointer min-w-0 ${
              viewMode === 'invoices'
                ? 'bg-white/20 border-white/40 shadow-inner ring-2 ring-emerald-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[10px] uppercase font-bold text-blue-200 truncate">2. Invoice</span>
              <span className="font-mono text-[10px] bg-blue-500/40 text-blue-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                {invoices.length}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm font-bold text-white mt-1 truncate">
              {formatCurrency(metrics.invoicesTotalBilled, currency)}
            </p>
            <p className="font-mono text-[10px] text-slate-300 mt-0.5 flex items-center gap-1 truncate">
              <span>{formatCurrency(metrics.outstandingReceivables, currency)} Due</span>{' '}
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            </p>
          </button>

          {/* Stage 3 */}
          <button
            onClick={() => setViewMode('receipts')}
            className={`p-2.5 sm:p-3 rounded-lg text-left transition-all border cursor-pointer min-w-0 ${
              viewMode === 'receipts'
                ? 'bg-white/20 border-white/40 shadow-inner ring-2 ring-emerald-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-200 truncate">3. Receipt</span>
              <span className="font-mono text-[10px] bg-emerald-500/40 text-emerald-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                {receipts.length}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm font-bold text-white mt-1 truncate">
              {formatCurrency(metrics.receiptsTotalCollected, currency)}
            </p>
            <p className="font-mono text-[10px] text-slate-300 mt-0.5 flex items-center gap-1 truncate">
              <span>Paid Proof</span> <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            </p>
          </button>

          {/* Stage 4 */}
          <button
            onClick={() => setViewMode('ledger')}
            className={`p-2.5 sm:p-3 rounded-lg text-left transition-all border cursor-pointer min-w-0 ${
              viewMode === 'ledger'
                ? 'bg-white/20 border-white/40 shadow-inner ring-2 ring-emerald-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[10px] uppercase font-bold text-amber-200 truncate">4. Confirmed</span>
              <span className="font-mono text-[10px] bg-amber-500/40 text-amber-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                {confirmedSales.length}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm font-bold text-emerald-300 mt-1 truncate">
              +{formatCurrency(metrics.totalConfirmedSales, currency)}
            </p>
            <p className="font-mono text-[10px] text-slate-300 mt-0.5 flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Cashbook</span>
            </p>
          </button>
        </div>
      </div>

      {/* Navigation View Mode Tabs & Search / Filter Controls */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Tab Switches */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none min-w-0">
            <button
              onClick={() => {
                setViewMode('pipeline');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[11px] sm:text-xs uppercase font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'pipeline'
                  ? 'bg-[#00288e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>

            <button
              onClick={() => {
                setViewMode('quotations');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[11px] sm:text-xs uppercase font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'quotations'
                  ? 'bg-indigo-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Quotes ({quotations.length})</span>
            </button>

            <button
              onClick={() => {
                setViewMode('invoices');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[11px] sm:text-xs uppercase font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'invoices'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Invoices ({invoices.length})</span>
            </button>

            <button
              onClick={() => {
                setViewMode('receipts');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[11px] sm:text-xs uppercase font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'receipts'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Receipts ({receipts.length})</span>
            </button>

            <button
              onClick={() => {
                setViewMode('ledger');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[11px] sm:text-xs uppercase font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'ledger'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Sales ({confirmedSales.length})</span>
            </button>

            <button
              onClick={() => {
                setViewMode('customers');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[11px] sm:text-xs uppercase font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'customers'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers ({customers.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client, doc #, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-sans text-xs text-slate-900 focus:outline-none focus:border-[#00288e] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: PIPELINE FUNNEL BOARD VIEW                            */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'pipeline' && (
          <div className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Column 1: Quotations */}
              <div className="bg-slate-50 border border-indigo-200 rounded-xl p-3.5 flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h4 className="font-sans text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      1. Quotations ({quotations.length})
                    </h4>
                  </div>
                  {onCreateDocument && (
                    <button
                      onClick={() => onCreateDocument('quotation')}
                      className="text-[10px] font-mono text-indigo-700 hover:text-indigo-950 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Quote
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                  {quotations.slice(0, 8).map((quote) => (
                    <div
                      key={quote.id}
                      className="bg-white border border-indigo-100 rounded-lg p-3 shadow-xs hover:border-indigo-300 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-sans font-bold text-xs text-slate-900">{quote.customerName}</p>
                          <span className="font-mono text-[10px] text-slate-500">#{quote.documentNumber}</span>
                        </div>
                        <span
                          className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            quote.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : quote.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatCurrency(quote.total, currency)}
                        </span>
                        <div className="flex items-center gap-1">
                          {onViewDocument && (
                            <button
                              onClick={() => onViewDocument(quote)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              title="View Quotation"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onConvertToInvoice && (
                            <button
                              onClick={() => onConvertToInvoice(quote)}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
                              title="Customer approved - Convert to Tax Invoice"
                            >
                              <span>Convert</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {quotations.length === 0 && (
                    <div className="py-8 text-center text-slate-400 font-mono text-xs">
                      No active quotations. Click "+ New Quotation" above.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Tax Invoices */}
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-3.5 flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h4 className="font-sans text-xs font-bold text-blue-950 uppercase tracking-wider">
                      2. Tax Invoices ({invoices.length})
                    </h4>
                  </div>
                  {onCreateDocument && (
                    <button
                      onClick={() => onCreateDocument('invoice')}
                      className="text-[10px] font-mono text-blue-700 hover:text-blue-950 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Invoice
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                  {invoices.slice(0, 8).map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white border border-blue-100 rounded-lg p-3 shadow-xs hover:border-blue-300 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-sans font-bold text-xs text-slate-900">{inv.customerName}</p>
                          <span className="font-mono text-[10px] text-slate-500">#{inv.documentNumber}</span>
                        </div>
                        <span
                          className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Total: {formatCurrency(inv.total, currency)}</span>
                        {inv.balanceDue > 0 ? (
                          <span className="text-red-700 font-bold">Due: {formatCurrency(inv.balanceDue, currency)}</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Paid</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="font-mono text-[10px] text-slate-400">Due: {inv.dueDate || inv.date}</span>
                        <div className="flex items-center gap-1">
                          {onViewDocument && (
                            <button
                              onClick={() => onViewDocument(inv)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              title="View Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {inv.balanceDue > 0 && onRecordPayment && (
                            <button
                              onClick={() => onRecordPayment(inv)}
                              className="px-2 py-0.5 bg-[#006d30] hover:bg-[#005224] text-white font-mono text-[10px] font-bold rounded flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Record Payment & Generate Official Receipt"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {invoices.length === 0 && (
                    <div className="py-8 text-center text-slate-400 font-mono text-xs">
                      No invoices created yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Payment Receipts */}
              <div className="bg-slate-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h4 className="font-sans text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      3. Payment Receipts ({receipts.length})
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-700 font-bold">Proof of Payment</span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                  {receipts.slice(0, 8).map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white border border-emerald-100 rounded-lg p-3 shadow-xs hover:border-emerald-300 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-sans font-bold text-xs text-slate-900">{rec.customerName}</p>
                          <span className="font-mono text-[10px] text-slate-500">#{rec.documentNumber}</span>
                        </div>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                          Cleared
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <div>
                          <span className="font-mono text-xs font-bold text-emerald-800">
                            {formatCurrency(rec.amountPaid || rec.total, currency)}
                          </span>
                          {rec.paymentReference && (
                            <p className="font-mono text-[9px] text-slate-500 truncate max-w-[120px]">
                              Ref: {rec.paymentReference}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {onViewDocument && (
                            <button
                              onClick={() => onViewDocument(rec)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              title="View / Print Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(rec)}
                            className="p-1 text-emerald-700 hover:text-emerald-950 rounded hover:bg-emerald-50 cursor-pointer"
                            title="Download PDF Receipt"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {receipts.length === 0 && (
                    <div className="py-8 text-center text-slate-400 font-mono text-xs">
                      No receipts issued yet. Receipts generate automatically upon invoice payment.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 4: Confirmed Sales in Cashbook */}
              <div className="bg-slate-50 border border-amber-200 rounded-xl p-3.5 flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <h4 className="font-sans text-xs font-bold text-amber-950 uppercase tracking-wider">
                      4. Confirmed Sales ({confirmedSales.length})
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] text-amber-800 font-bold">Ledger Synced</span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                  {confirmedSales.slice(0, 8).map((sale) => (
                    <div
                      key={sale.id}
                      onClick={() => onSelectTransaction(sale)}
                      className="bg-white border border-amber-100 rounded-lg p-3 shadow-xs hover:border-amber-300 transition-all space-y-1.5 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-sans font-bold text-xs text-slate-900 truncate max-w-[140px]">
                          {sale.title}
                        </p>
                        <span className="font-mono text-xs font-bold text-[#006d30]">
                          +{formatCurrency(sale.amount, currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                        <span>{sale.customerOrVendor || sale.category}</span>
                        <span className="uppercase text-slate-400">{sale.paymentMethod.replace('_', ' ')}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px] font-mono">
                        <span className="text-slate-400">{sale.date}</span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      </div>
                    </div>
                  ))}

                  {confirmedSales.length === 0 && (
                    <div className="py-8 text-center text-slate-400 font-mono text-xs">
                      No sales confirmed in cashbook.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: QUOTATIONS LIST                                       */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'quotations' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-sans text-base font-bold text-slate-900">Quotations & Price Proposals</h3>
              {onCreateDocument && (
                <button
                  onClick={() => onCreateDocument('quotation')}
                  className="px-3 py-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Quotation</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-200">
              {filteredQuotations.map((quote) => (
                <div
                  key={quote.id}
                  className="py-3.5 px-2 hover:bg-slate-50 rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-sm text-slate-900">{quote.customerName}</h4>
                        <span className="font-mono text-xs text-slate-500">#{quote.documentNumber}</span>
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                            quote.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : quote.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        {quote.items.length} line items • Date: {quote.date}{' '}
                        {quote.dueDate ? `• Valid until: ${quote.dueDate}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="text-right">
                      <p className="font-mono text-base font-bold text-slate-900">
                        {formatCurrency(quote.total, currency)}
                      </p>
                      <span className="font-mono text-[10px] text-slate-500">Quotation Total</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onConvertToInvoice && (
                        <button
                          onClick={() => onConvertToInvoice(quote)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-md font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          title="Customer Approved - Convert directly to Tax Invoice"
                        >
                          <span>Convert to Invoice</span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                        </button>
                      )}

                      {onViewDocument && (
                        <button
                          onClick={() => onViewDocument(quote)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          title="View / Print PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadPDF(quote)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {onEditDocument && (
                        <button
                          onClick={() => onEditDocument(quote)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          title="Edit Quotation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {onDeleteDocument && (
                        <button
                          onClick={() => onDeleteDocument(quote.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredQuotations.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No quotations match your criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: INVOICES LIST                                         */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'invoices' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-sans text-base font-bold text-slate-900">Tax Invoices & Billing Records</h3>
              {onCreateDocument && (
                <button
                  onClick={() => onCreateDocument('invoice')}
                  className="px-3 py-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Direct Invoice</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-200">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="py-3.5 px-2 hover:bg-slate-50 rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#00288e] flex items-center justify-center font-bold flex-shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-sm text-slate-900">{inv.customerName}</h4>
                        <span className="font-mono text-xs text-slate-500">#{inv.documentNumber}</span>
                        {inv.linkedQuotationId && (
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            From #{inv.linkedQuotationId}
                          </span>
                        )}
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        Issued: {inv.date} {inv.dueDate ? `• Due: ${inv.dueDate}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="text-right">
                      <p className="font-mono text-base font-bold text-slate-900">
                        {formatCurrency(inv.total, currency)}
                      </p>
                      {inv.balanceDue > 0 ? (
                        <p className="font-mono text-[11px] text-red-700 font-bold">
                          Balance Due: {formatCurrency(inv.balanceDue, currency)}
                        </p>
                      ) : (
                        <p className="font-mono text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Fully Paid
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {inv.balanceDue > 0 && onRecordPayment && (
                        <button
                          onClick={() => onRecordPayment(inv)}
                          className="px-3 py-1.5 bg-[#006d30] hover:bg-[#005224] text-white rounded-md font-mono text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                          title="Record Payment & Issue Official Receipt"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      )}

                      {inv.balanceDue > 0 && onConvertToReceipt && (
                        <button
                          onClick={() => onConvertToReceipt(inv)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md font-mono text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Mark Paid in Full & Issue Receipt"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Mark Paid</span>
                        </button>
                      )}

                      {onViewDocument && (
                        <button
                          onClick={() => onViewDocument(inv)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          title="View / Print PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {onEditDocument && (
                        <button
                          onClick={() => onEditDocument(inv)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {onDeleteDocument && (
                        <button
                          onClick={() => onDeleteDocument(inv.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredInvoices.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No invoices match your search.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: PAYMENT RECEIPTS LIST                                 */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'receipts' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-sans text-base font-bold text-slate-900">Payment Receipts (Settled Deals)</h3>
                <p className="font-mono text-xs text-slate-500">
                  Official generated receipts confirming full or partial invoice settlement.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredReceipts.map((rec) => (
                <div
                  key={rec.id}
                  className="py-3.5 px-2 hover:bg-slate-50 rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-sm text-slate-900">{rec.customerName}</h4>
                        <span className="font-mono text-xs text-slate-500">#{rec.documentNumber}</span>
                        {rec.linkedInvoiceId && (
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            Invoice #{rec.linkedInvoiceId}
                          </span>
                        )}
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          Cleared
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        Date: {rec.date} • Method: {rec.paymentMethod?.replace('_', ' ') || 'Mobile Money'}{' '}
                        {rec.paymentReference ? `• Ref: ${rec.paymentReference}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="text-right">
                      <p className="font-mono text-base font-bold text-emerald-700">
                        {formatCurrency(rec.amountPaid || rec.total, currency)}
                      </p>
                      <span className="font-mono text-[10px] text-slate-500">Amount Paid</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onViewDocument && (
                        <button
                          onClick={() => onViewDocument(rec)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-mono text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadPDF(rec)}
                        className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 rounded-md cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {onDeleteDocument && (
                        <button
                          onClick={() => onDeleteDocument(rec.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          title="Delete Receipt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredReceipts.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No payment receipts recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 5: CONFIRMED CASHBOOK SALES LEDGER                       */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-sans text-base font-bold text-slate-900">
                  Confirmed Sales & Revenue Ledger (Cashbook)
                </h3>
                <p className="font-mono text-xs text-slate-500">
                  Verified cashbook income entries directly feeding your profit & loss statements.
                </p>
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#00288e] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Channels
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#00288e] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredConfirmedSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => onSelectTransaction(sale)}
                  className="flex justify-between items-center py-3.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-sans font-semibold text-sm md:text-base text-slate-900">
                          {sale.title}
                        </p>
                        {sale.quantity && sale.unitPrice && (
                          <span className="font-mono text-[10px] bg-blue-50 text-[#00288e] border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                            {sale.quantity} {sale.unitType || 'units'}
                          </span>
                        )}
                        {sale.referenceNo && (
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {sale.referenceNo}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        {sale.customerOrVendor ? `${sale.customerOrVendor} • ` : ''}
                        {sale.category} • {sale.date} ({sale.time})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-base font-bold text-[#006d30]">
                        +{formatCurrency(sale.amount, currency)}
                      </p>
                      <span className="font-mono text-[10px] text-slate-500 uppercase">
                        {sale.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>

                    {onDeleteSale && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSale(sale.id);
                        }}
                        id={`btn-admin-delete-sale-${sale.id}`}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Sale & Cascade to All Associated Receipts, Invoices, Quotations"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredConfirmedSales.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No confirmed sales found matching "{searchTerm}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 5: CUSTOMER DIRECTORY (Firestore Synced)                */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'customers' && (
          <div className="pt-2">
            <CustomerManager
              customers={customers}
              onSaveCustomer={onSaveCustomer || (async () => {})}
              onDeleteCustomer={onDeleteCustomer || (async () => {})}
              isAdmin={isAdminMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};
