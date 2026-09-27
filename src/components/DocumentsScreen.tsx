import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  Sparkles,
  Trash2,
  Edit,
  ArrowRight,
  Database,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Check,
  ArrowUpRight,
  ChevronRight,
  Layers,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import {
  BillingDocument,
  DocumentType,
  CompanyInfo,
  ProductServiceItem,
  TrashBundle,
} from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateAndDownloadDocumentPDF } from '../utils/documentPdfGenerator';

interface DocumentsScreenProps {
  documents: BillingDocument[];
  companyInfo: CompanyInfo;
  products: ProductServiceItem[];
  currency: string;
  trashBundles?: TrashBundle[];
  isCloudConnected?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
  onSyncFromCloud?: () => Promise<void>;
  onPushToCloud?: () => Promise<void>;
  onCreateDocument: (type: DocumentType) => void;
  onViewDocument: (doc: BillingDocument) => void;
  onEditDocument: (doc: BillingDocument) => void;
  onDeleteDocument: (id: string) => void;
  onRecordPayment: (doc: BillingDocument) => void;
  onConvertToInvoice: (doc: BillingDocument) => void;
  onConvertToReceipt: (doc: BillingDocument) => void;
  onApproveQuotation?: (doc: BillingDocument) => void;
  onOpenTrashBin?: () => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({
  documents = [],
  companyInfo,
  currency,
  trashBundles = [],
  isCloudConnected = true,
  isSyncing = false,
  lastSyncTime = null,
  onSyncFromCloud,
  onPushToCloud,
  onCreateDocument,
  onViewDocument,
  onEditDocument,
  onDeleteDocument,
  onRecordPayment,
  onConvertToInvoice,
  onConvertToReceipt,
  onApproveQuotation,
  onOpenTrashBin,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'quotation' | 'invoice' | 'receipt'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSyncMessage, setLocalSyncMessage] = useState<string | null>(null);

  // Manual Trigger for Cloud Sync
  const handleManualSync = async () => {
    if (onSyncFromCloud) {
      setLocalSyncMessage('Syncing documents from Firestore...');
      try {
        await onSyncFromCloud();
        setLocalSyncMessage('Documents and Invoices synchronized with database!');
        setTimeout(() => setLocalSyncMessage(null), 3500);
      } catch (err: any) {
        setLocalSyncMessage(`Sync note: ${err?.message || 'Updated from cloud'}`);
        setTimeout(() => setLocalSyncMessage(null), 4000);
      }
    }
  };

  const handleManualPush = async () => {
    if (onPushToCloud) {
      setLocalSyncMessage('Backing up all documents to Firestore...');
      try {
        await onPushToCloud();
        setLocalSyncMessage(`Successfully backed up ${documents.length} documents to database!`);
        setTimeout(() => setLocalSyncMessage(null), 3500);
      } catch (err: any) {
        setLocalSyncMessage(`Backup note: ${err?.message || 'Updated to cloud'}`);
        setTimeout(() => setLocalSyncMessage(null), 4000);
      }
    }
  };

  // Metrics calculations
  const metrics = useMemo(() => {
    const invoices = documents.filter((d) => d.type === 'invoice');
    const quotations = documents.filter((d) => d.type === 'quotation');
    const receipts = documents.filter((d) => d.type === 'receipt');

    const totalInvoiced = invoices.reduce((sum, d) => sum + (d.total ?? 0), 0);
    const totalCollected =
      invoices.reduce((sum, d) => sum + (d.amountPaid ?? 0), 0) +
      receipts.reduce((sum, d) => sum + (d.total ?? 0), 0);
    const outstandingReceivables = invoices.reduce((sum, d) => sum + (d.balanceDue ?? 0), 0);
    const quotationsPipeline = quotations.reduce((sum, d) => sum + (d.total ?? 0), 0);

    const pendingQuotesCount = quotations.filter((q) => q.status !== 'accepted' && q.status !== 'declined').length;
    const approvedQuotesCount = quotations.filter((q) => q.status === 'accepted').length;

    return {
      invoicesCount: invoices.length,
      totalInvoiced,
      totalCollected,
      outstandingReceivables,
      unpaidInvoicesCount: invoices.filter((d) => (d.balanceDue ?? 0) > 0).length,
      paidInvoicesCount: invoices.filter((d) => (d.balanceDue ?? 0) <= 0.01 && d.amountPaid > 0).length,
      quotationsPipeline,
      quotationsCount: quotations.length,
      pendingQuotesCount,
      approvedQuotesCount,
      receiptsCount: receipts.length,
    };
  }, [documents]);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Tab filter
      if (activeTab !== 'all' && doc.type !== activeTab) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = (doc.documentNumber || '').toLowerCase().includes(q);
        const matchesClient = (doc.customerName || '').toLowerCase().includes(q);
        const matchesTitle = (doc.title || '').toLowerCase().includes(q);
        const matchesItems = (doc.items || []).some((it) => (it.name || '').toLowerCase().includes(q));
        const matchesRef = (doc.paymentReference || '').toLowerCase().includes(q);
        const matchesLinkedQuote = (doc.linkedQuotationId || '').toLowerCase().includes(q);
        const matchesLinkedInv = (doc.linkedInvoiceId || '').toLowerCase().includes(q);
        return matchesNumber || matchesClient || matchesTitle || matchesItems || matchesRef || matchesLinkedQuote || matchesLinkedInv;
      }

      return true;
    });
  }, [documents, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#c4c5d5] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#00288e] flex items-center justify-center text-white font-bold shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-sans text-[#191c1e] tracking-tight">
                  Billing, Invoices & Quotations
                </h1>
                {isCloudConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Firestore Synced
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#64748b]">
                Automated Workflow: Quotation ➔ Customer Approval ➔ Payment Invoice ➔ Payment Received ➔ Automatic Receipt
              </p>
            </div>
          </div>
        </div>

        {/* 3 Creation Buttons + Trash Bin Recovery Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onCreateDocument('quotation')}
            id="btn-create-quotation"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1e40af] border border-blue-200 font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </button>

          <button
            onClick={() => onCreateDocument('invoice')}
            id="btn-create-invoice"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tax Invoice (Manual)</span>
          </button>

          <button
            onClick={() => onRecordPayment(null as any)}
            id="btn-record-invoice-payment"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#006d30] hover:bg-[#005224] text-white font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Record payment against an active invoice and generate an official receipt"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment & Issue Receipt</span>
          </button>

          {onOpenTrashBin && (
            <button
              onClick={onOpenTrashBin}
              id="btn-open-trash-bin-header"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-2xs active:scale-95"
              title="View and restore deleted documents & linked records"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Trash Bin ({trashBundles.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Step Automated Billing Lifecycle Pipeline Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-4 shadow-md border border-indigo-800/50">
        <div className="flex items-center justify-between pb-3 border-b border-indigo-800/60 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider text-indigo-100">
              Automated Document Lifecycle Pipeline
            </span>
          </div>
          <span className="text-[11px] font-mono text-indigo-300">
            Real-time automatic transitions & cloud persistence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Quotation */}
          <div
            onClick={() => setActiveTab('quotation')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'quotation'
                ? 'bg-white/15 border-blue-400 shadow-inner'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] uppercase font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">
                Stage 1: Quotation
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {metrics.quotationsCount} quotes ({formatCurrency(metrics.quotationsPipeline, currency)})
              </span>
            </div>
            <p className="text-xs font-sans text-slate-200">
              Draft & send price quotes. When customer approves, 1-click moves to Payment Invoice.
            </p>
            <div className="mt-2 flex items-center text-[10px] font-mono text-blue-200">
              <span>Customer Approval</span>
              <ChevronRight className="w-3.5 h-3.5 mx-1" />
              <span className="text-amber-300 font-bold">Generates Invoice</span>
            </div>
          </div>

          {/* Step 2: Payment Invoice */}
          <div
            onClick={() => setActiveTab('invoice')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-white/15 border-indigo-400 shadow-inner'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] uppercase font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">
                Stage 2: Payment Invoice
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {metrics.unpaidInvoicesCount} pending • {metrics.paidInvoicesCount} paid
              </span>
            </div>
            <p className="text-xs font-sans text-slate-200">
              Generated from quote or entered manually. Send to client with KRA tax & bank/M-Pesa details.
            </p>
            <div className="mt-2 flex items-center text-[10px] font-mono text-indigo-200">
              <span>Payment Received</span>
              <ChevronRight className="w-3.5 h-3.5 mx-1" />
              <span className="text-emerald-300 font-bold">Auto-Generates Receipt</span>
            </div>
          </div>

          {/* Step 3: Payment Receipt */}
          <div
            onClick={() => setActiveTab('receipt')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'receipt'
                ? 'bg-white/15 border-emerald-400 shadow-inner'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                Stage 3: Official Receipt
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {metrics.receiptsCount} issued ({formatCurrency(metrics.totalCollected, currency)})
              </span>
            </div>
            <p className="text-xs font-sans text-slate-200">
              Automatically generated upon payment. Linked to invoice & synced to Cashbook sales ledger.
            </p>
            <div className="mt-2 flex items-center text-[10px] font-mono text-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Auto-Saved & Synced to Ledger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Database Synchronization Bar */}
      <div className="bg-slate-50 border border-[#cbd5e1] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00288e]/10 flex items-center justify-center text-[#00288e] shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800">
                Database Sync: <code className="text-[#00288e] bg-blue-50 px-1.5 py-0.5 rounded">billing_documents</code>
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold">
                Real-Time
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-500">
              {documents.length} billing document{documents.length === 1 ? '' : 's'} mirrored in Google Firestore
              {lastSyncTime ? ` • Last active: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onSyncFromCloud && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              id="btn-sync-docs-cloud"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Pull latest document and invoice changes from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#00288e]' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync from Cloud'}</span>
            </button>
          )}

          {onPushToCloud && (
            <button
              onClick={handleManualPush}
              disabled={isSyncing}
              id="btn-backup-docs-cloud"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Push all documents to Firestore database"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Backup to DB</span>
            </button>
          )}
        </div>
      </div>

      {localSyncMessage && (
        <div className="bg-blue-50 border border-blue-200 text-[#1e40af] px-3.5 py-2 rounded-lg font-mono text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{localSyncMessage}</span>
        </div>
      )}

      {/* KPI Metrics Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white p-4 rounded-xl border border-[#c4c5d5] shadow-xs">
          <div className="flex items-center justify-between text-[#64748b] font-mono text-xs mb-1 uppercase font-semibold">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-[#00288e]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#00288e]">
            {formatCurrency(metrics.totalInvoiced, currency)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {metrics.invoicesCount} total tax invoices
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 rounded-xl border border-[#c4c5d5] shadow-xs">
          <div className="flex items-center justify-between text-[#64748b] font-mono text-xs mb-1 uppercase font-semibold">
            <span>Unpaid Receivables</span>
            <Clock className="w-4 h-4 text-[#ba1a1a]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#ba1a1a]">
            {formatCurrency(metrics.outstandingReceivables, currency)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {metrics.unpaidInvoicesCount} invoices pending payment
          </div>
        </div>

        {/* Total Collected / Receipts */}
        <div className="bg-white p-4 rounded-xl border border-[#c4c5d5] shadow-xs">
          <div className="flex items-center justify-between text-[#64748b] font-mono text-xs mb-1 uppercase font-semibold">
            <span>Total Collected</span>
            <CheckCircle2 className="w-4 h-4 text-[#006d30]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#006d30]">
            {formatCurrency(metrics.totalCollected, currency)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {metrics.receiptsCount} official receipts issued
          </div>
        </div>

        {/* Quotations Pipeline */}
        <div className="bg-white p-4 rounded-xl border border-[#c4c5d5] shadow-xs">
          <div className="flex items-center justify-between text-[#64748b] font-mono text-xs mb-1 uppercase font-semibold">
            <span>Quotes Pipeline</span>
            <Sparkles className="w-4 h-4 text-[#1e40af]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#1e40af]">
            {formatCurrency(metrics.quotationsPipeline, currency)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {metrics.quotationsCount} active quotations ({metrics.approvedQuotesCount} approved)
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#c4c5d5] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0] overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-[#00288e] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#191c1e]'
              }`}
            >
              All Documents ({documents.length})
            </button>

            <button
              onClick={() => setActiveTab('quotation')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'quotation'
                  ? 'bg-white text-[#1e40af] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#191c1e]'
              }`}
            >
              1. Quotations ({documents.filter((d) => d.type === 'quotation').length})
            </button>

            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'invoice'
                  ? 'bg-white text-[#00288e] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#191c1e]'
              }`}
            >
              2. Tax Invoices ({documents.filter((d) => d.type === 'invoice').length})
            </button>

            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'receipt'
                  ? 'bg-white text-[#006d30] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#191c1e]'
              }`}
            >
              3. Payment Receipts ({documents.filter((d) => d.type === 'receipt').length})
            </button>

            {onOpenTrashBin && (
              <button
                onClick={onOpenTrashBin}
                id="tab-btn-trash-bin"
                className="px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap text-red-700 hover:bg-red-50 flex items-center gap-1.5 border border-transparent hover:border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Trash Bin ({trashBundles.length})</span>
              </button>
            )}
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search client, #, ref, quote..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-[#cbd5e1] rounded-lg font-sans text-xs text-[#191c1e] focus:bg-white focus:outline-none focus:border-[#00288e]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-[#cbd5e1] rounded-lg font-mono text-xs text-[#191c1e]"
            >
              <option value="all">All Statuses</option>
              <option value="accepted">Approved / Accepted</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="sent">Sent</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Documents Table List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 space-y-3">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-sans text-sm font-bold text-slate-800">No billing documents found</h3>
            <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
              Create a Quotation to send to customers (which converts to a Tax Invoice upon approval), or create a Tax Invoice directly. Payment receipts are automatically issued upon payment.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => onCreateDocument('quotation')}
                className="px-3.5 py-1.5 bg-blue-50 text-[#1e40af] border border-blue-200 rounded font-mono text-xs font-bold uppercase cursor-pointer"
              >
                Create Quotation
              </button>
              <button
                onClick={() => onCreateDocument('invoice')}
                className="px-3.5 py-1.5 bg-[#00288e] text-white rounded font-mono text-xs font-bold uppercase cursor-pointer"
              >
                Create Manual Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-mono text-[11px] uppercase border-b border-slate-200">
                  <th className="py-3 px-3">Type & Doc #</th>
                  <th className="py-3 px-3">Client / Payer</th>
                  <th className="py-3 px-3">Date / Due</th>
                  <th className="py-3 px-3">Workflow Lifecycle</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-right">Paid / Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans text-xs">
                {filteredDocuments.map((doc) => {
                  const isReceipt = doc.type === 'receipt';
                  const isQuotation = doc.type === 'quotation';
                  const isInvoice = doc.type === 'invoice';
                  const isApprovedQuote = isQuotation && doc.status === 'accepted';
                  const isUnpaidInvoice = isInvoice && (doc.balanceDue ?? 0) > 0;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Type & Doc # */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              isReceipt
                                ? 'bg-emerald-100 text-[#006d30]'
                                : isQuotation
                                ? 'bg-blue-100 text-[#1e40af]'
                                : 'bg-indigo-100 text-[#00288e]'
                            }`}
                          >
                            {doc.type}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {doc.documentNumber}
                          </span>
                        </div>
                        {doc.title && (
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {doc.title}
                          </p>
                        )}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{doc.customerName}</div>
                        {doc.customerTaxId && (
                          <div className="font-mono text-[10px] text-slate-500">
                            PIN: {doc.customerTaxId}
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="text-slate-800">{doc.date}</div>
                        {doc.dueDate && (
                          <div className="text-slate-500 text-[10px]">
                            {isQuotation ? 'Exp: ' : 'Due: '}
                            <span className={isInvoice && (doc.balanceDue ?? 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                              {doc.dueDate}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Workflow Lifecycle Origin / Link */}
                      <td className="py-3 px-3">
                        {isQuotation && (
                          <div className="space-y-1">
                            {isApprovedQuote ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Customer Approved ➔ Invoice Created
                              </span>
                            ) : (
                              <button
                                onClick={() => onConvertToInvoice(doc)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#1e40af] border border-blue-300 rounded font-mono text-[10px] font-bold uppercase transition-all cursor-pointer"
                                title="Approve quote and generate Payment Invoice"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Approve & Move to Invoice</span>
                                <ArrowRight className="w-3 h-3 text-[#1e40af]" />
                              </button>
                            )}
                          </div>
                        )}

                        {isInvoice && (
                          <div className="space-y-1">
                            {doc.linkedQuotationId ? (
                              <div className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">
                                Origin: Quote #{doc.linkedQuotationId}
                              </div>
                            ) : (
                              <div className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                Manual Entry
                              </div>
                            )}

                            {/* Quick Pay / Auto Receipt Action */}
                            {isUnpaidInvoice && (
                              <div>
                                <button
                                  onClick={() => onConvertToReceipt(doc)}
                                  className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-bold cursor-pointer transition-all"
                                  title="Mark as paid and automatically generate official receipt"
                                >
                                  <FileCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Mark Paid (Auto-Receipt)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {isReceipt && (
                          <div>
                            {doc.linkedInvoiceId ? (
                              <div className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                For Invoice: #{doc.linkedInvoiceId}
                              </div>
                            ) : (
                              <div className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                Direct Receipt
                              </div>
                            )}
                            {doc.paymentReference && (
                              <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                                Ref: {doc.paymentReference}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 font-mono text-xs font-bold text-right text-slate-900">
                        {formatCurrency(doc.total ?? 0, currency)}
                      </td>

                      {/* Paid / Balance */}
                      <td className="py-3 px-3 font-mono text-xs text-right">
                        {isQuotation ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <>
                            <div className="text-emerald-700 font-semibold">
                              {formatCurrency(doc.amountPaid ?? 0, currency)}
                            </div>
                            {(doc.balanceDue ?? 0) > 0 ? (
                              <div className="text-red-700 font-bold text-[11px]">
                                Bal: {formatCurrency(doc.balanceDue ?? 0, currency)}
                              </div>
                            ) : (
                              <div className="text-emerald-600 text-[10px] font-bold">PAID IN FULL</div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            doc.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : doc.status === 'accepted'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : doc.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : doc.status === 'unpaid' || doc.status === 'overdue'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {doc.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Preview */}
                          <button
                            onClick={() => onViewDocument(doc)}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Download PDF */}
                          <button
                            onClick={() =>
                              generateAndDownloadDocumentPDF({
                                document: doc,
                                companyInfo,
                                currency,
                              })
                            }
                            className="p-1.5 rounded hover:bg-blue-100 text-[#00288e] cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Record Payment (if invoice with balance) */}
                          {isInvoice && (doc.balanceDue ?? 0) > 0 && (
                            <button
                              onClick={() => onRecordPayment(doc)}
                              className="p-1.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                              title="Record Payment & Auto-Generate Receipt"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* Convert Quotation to Invoice */}
                          {isQuotation && (
                            <button
                              onClick={() => onConvertToInvoice(doc)}
                              className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 cursor-pointer"
                              title="Approve & Convert to Tax Invoice"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}

                          {/* Convert Invoice to Receipt (if paid/record) */}
                          {isInvoice && (
                            <button
                              onClick={() => onConvertToReceipt(doc)}
                              className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                              title="Generate Official Payment Receipt"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Document */}
                          <button
                            onClick={() => onEditDocument(doc)}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                            title="Edit Document"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Document */}
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="p-1.5 rounded hover:bg-red-100 text-red-700 cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

