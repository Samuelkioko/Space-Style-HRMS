import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  Calculator,
  Calendar,
  User,
  CreditCard,
  FileText,
  Percent,
  Check,
  Building,
  Sparkles,
  AlertCircle,
  HelpCircle,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Building2,
  Smartphone,
  Coins,
  RefreshCw,
} from 'lucide-react';
import {
  BillingDocument,
  DocumentType,
  DocumentLineItem,
  ProductServiceItem,
  CompanyInfo,
  PaymentMethod,
  FinancialAccountType,
  UnitType,
  Customer,
} from '../types';
import { getCurrencySymbol, formatCurrency } from '../utils/formatters';
import { CustomerAutocomplete } from './CustomerAutocomplete';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDocument: (doc: BillingDocument, sourceQuoteToAccept?: BillingDocument) => void;
  products: ProductServiceItem[];
  companyInfo: CompanyInfo;
  currency: string;
  initialType?: DocumentType;
  editingDocument?: BillingDocument | null;
  quotations?: BillingDocument[];
  customers?: Customer[];
  onSaveCustomer?: (customer: Customer) => Promise<void> | void;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  onSaveDocument,
  products = [],
  companyInfo,
  currency,
  initialType = 'invoice',
  editingDocument = null,
  quotations = [],
  customers = [],
  onSaveCustomer,
}) => {
  const activeProducts = products.filter((p) => p.isActive !== false);

  // Restrict standalone creations to quotation or invoice (receipts are made for active invoices)
  const effectiveInitialType = initialType === 'receipt' ? 'invoice' : initialType;

  const [docType, setDocType] = useState<DocumentType>(effectiveInitialType);
  const [invoiceCreationMode, setInvoiceCreationMode] = useState<'manual' | 'from_quote'>('manual');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [linkedQuotationId, setLinkedQuotationId] = useState<string>('');

  const [docNumber, setDocNumber] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');

  // Customer Info
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerTaxId, setCustomerTaxId] = useState<string>('');

  // Line Items
  const [items, setItems] = useState<DocumentLineItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(16); // Default 16% Kenya VAT
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [financialAccount, setFinancialAccount] = useState<FinancialAccountType>('mpesa');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const handlePaymentMethodChange = (pm: PaymentMethod) => {
    setPaymentMethod(pm);
    if (pm === 'mobile_money') {
      setFinancialAccount('mpesa');
    } else if (pm === 'cash') {
      setFinancialAccount('cash');
    } else {
      setFinancialAccount('bank');
    }
  };

  // Helper to generate next sequential document number
  const generateDocNumber = (type: string): string => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    if (type === 'quotation') return `QT-${year}-${randomSuffix}`;
    return `INV-${year}-${randomSuffix}`;
  };

  const createEmptyItem = (): DocumentLineItem => ({
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    unitType: 'units',
    discountPercent: 0,
    amount: 0,
  });

  // Generate formatted terms, conditions, and banking details directly from Settings Profile
  const getTermsFromSettings = (): string => {
    const po = companyInfo.paymentOptions;
    const lines: string[] = [];

    // Bank Account Details from Settings
    const bankDetails: string[] = [];
    if (po?.bankName) bankDetails.push(`Bank: ${po.bankName}`);
    if (po?.bankAccountNumber) bankDetails.push(`A/C No: ${po.bankAccountNumber}`);
    if (po?.bankAccountName) bankDetails.push(`Name: ${po.bankAccountName}`);
    if (po?.bankBranch) bankDetails.push(`Branch: ${po.bankBranch}`);
    if (po?.bankSwiftCode) bankDetails.push(`SWIFT: ${po.bankSwiftCode}`);
    if (bankDetails.length > 0) {
      lines.push(bankDetails.join(' | '));
    }

    // Mobile Money / M-PESA from Settings
    const mpesaDetails: string[] = [];
    if (po?.paybillNumber) {
      mpesaDetails.push(`${po.mobileMoneyProvider || 'M-PESA'} Paybill: ${po.paybillNumber}`);
      if (po.accountNumber) mpesaDetails.push(`A/C: ${po.accountNumber}`);
    }
    if (po?.tillNumber) {
      mpesaDetails.push(`Till No: ${po.tillNumber}${po.mobileMoneyName ? ` (${po.mobileMoneyName})` : ''}`);
    }
    if (mpesaDetails.length > 0) {
      lines.push(mpesaDetails.join(' | '));
    }

    // Remittance Instructions from Settings
    if (po?.paymentInstructions) {
      lines.push(`Remittance: ${po.paymentInstructions}`);
    }

    // Default Terms and Conditions from Settings
    if (companyInfo.termsAndConditions) {
      lines.push(companyInfo.termsAndConditions);
    }

    if (lines.length > 0) {
      return lines.join('\n');
    }

    return `Bank: NCBA Bank | Account No: 1004829101 | Paybill: 522522, Acc: ${companyInfo.businessName || 'Invoice'}`;
  };

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      setFormError('');
      if (editingDocument) {
        setDocType(editingDocument.type === 'receipt' ? 'invoice' : editingDocument.type);
        setDocNumber(editingDocument.documentNumber);
        setDocTitle(editingDocument.title);
        setDate(editingDocument.date);
        setDueDate(editingDocument.dueDate || '');
        setCustomerName(editingDocument.customerName);
        setCustomerEmail(editingDocument.customerEmail || '');
        setCustomerPhone(editingDocument.customerPhone || '');
        setCustomerAddress(editingDocument.customerAddress || '');
        setCustomerTaxId(editingDocument.customerTaxId || '');
        setItems(editingDocument.items.length > 0 ? editingDocument.items : [createEmptyItem()]);
        setTaxRate(editingDocument.taxRate !== undefined ? editingDocument.taxRate : 16);
        setAmountPaid(editingDocument.amountPaid.toString());
        setPaymentMethod(editingDocument.paymentMethod || 'mobile_money');
        setPaymentReference(editingDocument.paymentReference || '');
        setNotes(editingDocument.notes || '');
        setTerms(editingDocument.termsAndConditions || getTermsFromSettings());
        setLinkedQuotationId(editingDocument.linkedQuotationId || '');
        setInvoiceCreationMode('manual');
      } else {
        const type = effectiveInitialType;
        setDocType(type);
        setDocNumber(generateDocNumber(type));
        setDate(new Date().toISOString().split('T')[0]);

        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        setDueDate(thirtyDaysLater.toISOString().split('T')[0]);

        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerTaxId('');
        setItems([createEmptyItem()]);
        setTaxRate(16);
        setAmountPaid('0');
        setPaymentMethod('mobile_money');
        setPaymentReference('');
        setNotes(
          type === 'quotation'
            ? 'This quotation is valid for 30 calendar days.'
            : 'Payment is due within 14 days of invoice issue.'
        );
        setTerms(getTermsFromSettings());
        setDocTitle(type === 'quotation' ? 'Quotation' : 'Invoice');
        setInvoiceCreationMode('manual');
        setSelectedQuoteId('');
        setLinkedQuotationId('');
      }
    }
  }, [isOpen, editingDocument, initialType]);

  // Populate from approved or existing quotation
  const handleSelectSourceQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    const sourceQuote = quotations.find((q) => q.id === quoteId);
    if (!sourceQuote) return;

    setCustomerName(sourceQuote.customerName);
    setCustomerEmail(sourceQuote.customerEmail || '');
    setCustomerPhone(sourceQuote.customerPhone || '');
    setCustomerAddress(sourceQuote.customerAddress || '');
    setCustomerTaxId(sourceQuote.customerTaxId || '');
    setItems(sourceQuote.items.map((it) => ({ ...it, id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })));
    setTaxRate(sourceQuote.taxRate !== undefined ? sourceQuote.taxRate : 16);
    setNotes(sourceQuote.notes || `Generated upon approval of Quotation #${sourceQuote.documentNumber}.`);
    setTerms(sourceQuote.termsAndConditions || terms);
    setLinkedQuotationId(sourceQuote.documentNumber);
    setDocTitle(`Invoice for ${sourceQuote.customerName} (Ref: ${sourceQuote.documentNumber})`);
  };

  // Customer Autocomplete handler
  const handleSelectCustomer = (cust: Customer) => {
    setCustomerName(cust.name);
    if (cust.email) setCustomerEmail(cust.email);
    if (cust.phone) setCustomerPhone(cust.phone);
    if (cust.address) setCustomerAddress(cust.address);
    if (cust.taxId) setCustomerTaxId(cust.taxId);
  };

  // Line Item Handlers
  const handleItemChange = (index: number, field: keyof DocumentLineItem, value: any) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent') {
      const q = field === 'quantity' ? parseFloat(value) || 0 : target.quantity;
      const p = field === 'unitPrice' ? parseFloat(value) || 0 : target.unitPrice;
      const d = field === 'discountPercent' ? parseFloat(value) || 0 : target.discountPercent || 0;
      const gross = q * p;
      const discount = gross * (d / 100);
      target.amount = Math.max(0, gross - discount);
    }

    updated[index] = target;
    setItems(updated);
  };

  const handleSelectProductForItem = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const updated = [...items];
    const q = updated[index].quantity || 1;
    const p = prod.unitPrice || 0;
    const d = updated[index].discountPercent || 0;
    const gross = q * p;
    const discount = gross * (d / 100);

    updated[index] = {
      ...updated[index],
      productId: prod.id,
      name: prod.name,
      description: prod.description || '',
      unitPrice: prod.unitPrice,
      unitType: prod.unitType || 'units',
      amount: Math.max(0, gross - discount),
    };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([createEmptyItem()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const gross = (item.quantity || 0) * (item.unitPrice || 0);
    return sum + gross;
  }, 0);

  const totalItemDiscounts = items.reduce((sum, item) => {
    const gross = (item.quantity || 0) * (item.unitPrice || 0);
    const d = item.discountPercent || 0;
    return sum + gross * (d / 100);
  }, 0);

  const discountedSubtotal = Math.max(0, subtotal - totalItemDiscounts);
  const taxTotal = discountedSubtotal * ((taxRate || 0) / 100);
  const grandTotal = discountedSubtotal + taxTotal;

  const numAmountPaid = parseFloat(amountPaid) || 0;
  const balanceDue = Math.max(0, grandTotal - numAmountPaid);

  // Helper to determine inventory stock info for each line item
  const getStockInfoForItem = (item: DocumentLineItem) => {
    const prod = activeProducts.find(
      (p) =>
        (item.productId && p.id === item.productId) ||
        (item.name.trim() && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    if (prod && prod.type === 'product' && prod.inStock !== undefined) {
      const isExceeded = (item.quantity || 0) > prod.inStock;
      return {
        product: prod,
        inStock: prod.inStock,
        unitType: prod.unitType,
        isExceeded,
      };
    }
    return null;
  };

  // Find all items that exceed available inventory
  const exceededStockItems = items
    .map((it) => ({ item: it, stock: getStockInfoForItem(it) }))
    .filter((x) => x.stock && x.stock.isExceeded);
  const hasStockExceeded = exceededStockItems.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError('Please enter client or customer name.');
      return;
    }

    if (items.length === 0 || items.some((it) => !it.name.trim() || it.quantity <= 0)) {
      setFormError('Please ensure all items have a valid name, quantity, and unit rate.');
      return;
    }

    // Stock validation: If quantity is more than available stock, quotation or invoice will not be valid and cannot proceed
    if (hasStockExceeded) {
      const details = exceededStockItems
        .map(
          (x) =>
            `• "${x.stock!.product.name}": Requested ${x.item.quantity} ${x.stock!.unitType}, but only ${x.stock!.inStock} ${x.stock!.unitType} available in stock`
        )
        .join('\n');
      setFormError(
        `Stock Validation Error: ${docType === 'quotation' ? 'Quotation' : 'Invoice'} cannot proceed because requested quantity exceeds available inventory:\n${details}\nPlease adjust quantities to match or stay below available stock.`
      );
      return;
    }

    let status: any = 'draft';
    if (docType === 'quotation') {
      status = 'sent';
    } else {
      // invoice
      if (numAmountPaid >= grandTotal - 0.01 && grandTotal > 0) {
        status = 'paid';
      } else if (numAmountPaid > 0) {
        status = 'partially_paid';
      } else {
        status = 'unpaid';
      }
    }

    const sourceQuote = selectedQuoteId ? quotations.find((q) => q.id === selectedQuoteId) : undefined;

    const newDoc: BillingDocument = {
      id: editingDocument ? editingDocument.id : `doc-${Date.now()}`,
      type: docType,
      documentNumber: docNumber.trim() || generateDocNumber(docType),
      title: docTitle.trim() || `${docType === 'quotation' ? 'Quotation' : 'Invoice'} - ${customerName.trim()}`,
      date,
      dueDate: dueDate || undefined,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerTaxId: customerTaxId.trim() || undefined,
      items,
      subtotal,
      discountTotal: totalItemDiscounts,
      taxRate,
      taxTotal,
      total: grandTotal,
      amountPaid: numAmountPaid,
      balanceDue: balanceDue,
      paymentMethod: numAmountPaid > 0 ? paymentMethod : undefined,
      financialAccount: numAmountPaid > 0 ? financialAccount : undefined,
      paymentReference: paymentReference.trim() || undefined,
      status,
      linkedQuotationId: linkedQuotationId || (sourceQuote ? sourceQuote.documentNumber : undefined),
      notes: notes.trim() || undefined,
      termsAndConditions: terms.trim() || undefined,
      createdAt: editingDocument?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Automatically save or update customer entry in database
    if (customerName.trim() && onSaveCustomer) {
      onSaveCustomer({
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: customerName.trim(),
        email: customerEmail.trim() || undefined,
        phone: customerPhone.trim() || undefined,
        address: customerAddress.trim() || undefined,
        taxId: customerTaxId.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    onSaveDocument(newDoc, sourceQuote);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="create-document-modal"
        className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold ${
                docType === 'quotation' ? 'bg-[#1e40af]' : 'bg-[#00288e]'
              }`}
            >
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans text-lg font-bold text-[#191c1e]">
                {editingDocument
                  ? `Edit ${docType === 'quotation' ? 'Quotation' : 'Invoice'}`
                  : `Create New ${docType === 'quotation' ? 'Quotation' : 'Invoice'}`}
              </h3>
              <p className="font-mono text-xs text-[#64748b]">
                {companyInfo.businessName || 'Executive Ledger'} • Reference #{docNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* If Invoice: Option to create Manually OR Generate from Approved Quotation */}
          {docType === 'invoice' && !editingDocument && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#00288e] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Invoice Creation Method
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {quotations.length} available quotation{quotations.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceCreationMode('manual');
                    setSelectedQuoteId('');
                    setLinkedQuotationId('');
                  }}
                  className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                    invoiceCreationMode === 'manual'
                      ? 'bg-white border-[#00288e] shadow-xs ring-1 ring-[#00288e]'
                      : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 mb-0.5">1. Create Invoice Manually</div>
                  <div className="text-[11px] text-slate-500">Enter line items, unit rates, and client details directly</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceCreationMode('from_quote')}
                  className={`p-3 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                    invoiceCreationMode === 'from_quote'
                      ? 'bg-white border-[#00288e] shadow-xs ring-1 ring-[#00288e]'
                      : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 mb-0.5">2. Generate from Approved Quotation</div>
                  <div className="text-[11px] text-slate-500">Auto-fill all line items, pricing, VAT & client details from quote</div>
                </button>
              </div>

              {/* Quote Picker Dropdown */}
              {invoiceCreationMode === 'from_quote' && (
                <div className="pt-2 border-t border-blue-200/80 space-y-2">
                  <label className="block font-mono text-xs text-[#475569] uppercase font-semibold">
                    Select Approved Quotation to Convert *
                  </label>
                  {quotations.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-mono">
                      No quotations found in the pipeline yet. Switch to "Create Invoice Manually" or create a quotation first.
                    </div>
                  ) : (
                    <select
                      value={selectedQuoteId}
                      onChange={(e) => handleSelectSourceQuote(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-[#94a3b8] rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:border-[#00288e]"
                    >
                      <option value="">-- Choose Approved Quotation to Generate Invoice --</option>
                      {quotations.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.status === 'accepted' ? '✓ [APPROVED]' : `[${q.status.toUpperCase()}]`} #{q.documentNumber} - {q.customerName} ({formatCurrency(q.total, currency)})
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedQuoteId && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 font-mono text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Auto-populated from Quotation <strong>#{linkedQuotationId}</strong>. Quote status will automatically update to <strong>Approved / Invoiced</strong>.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document General Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Document Number *
              </label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs font-bold text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                {docType === 'quotation' ? 'Validity Date (Quote Expiry)' : 'Payment Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Document Subject / Project Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Price Quotation for Industrial Supplies & CNC Parts"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>
          </div>

          {/* Client / Buyer Information */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#00288e] uppercase">
              <User className="w-4 h-4" />
              <span>Client / Payer Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <CustomerAutocomplete
                  value={customerName}
                  onChange={setCustomerName}
                  onSelectCustomer={handleSelectCustomer}
                  customers={customers}
                  onSaveNewCustomer={onSaveCustomer}
                  required
                  id="create-doc-customer-name"
                  label="Customer / Organization Name *"
                  placeholder="Type customer or organization name (auto-searches saved customers or quick-creates)..."
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                  KRA PIN / Tax Identification Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. P051839201Z"
                  value={customerTaxId}
                  onChange={(e) => setCustomerTaxId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                  Customer Email Address
                </label>
                <input
                  type="email"
                  placeholder="procurement@apex.co.ke"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                  Customer Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+254 700 000 000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                  Physical / Billing Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Commercial Street, Industrial Area, Box 40291-00100 Nairobi"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#00288e] uppercase">
                <Package className="w-4 h-4" />
                <span>Line Items & Pricing</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-md font-mono text-xs font-semibold cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Line Items Table */}
            {hasStockExceeded && (
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-900 font-mono text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-700">Stock Validation Alert: </span>
                  <span>
                    One or more line items have quantities exceeding available stock. This {docType} cannot proceed until quantities are reduced.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {items.map((item, idx) => {
                const stockInfo = getStockInfoForItem(item);
                return (
                  <div
                    key={item.id || idx}
                    className={`p-3 bg-white border rounded-lg shadow-2xs space-y-2.5 transition-colors ${
                      stockInfo?.isExceeded ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                        {stockInfo && (
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold border ${
                              stockInfo.isExceeded
                                ? 'bg-rose-100 border-rose-300 text-rose-800'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            }`}
                          >
                            Stock: {stockInfo.inStock} {stockInfo.unitType}{' '}
                            {stockInfo.isExceeded ? '⚠️ EXCEEDED' : 'available'}
                          </span>
                        )}
                      </div>

                      {/* Quick Catalog Autofill Dropdown */}
                      {activeProducts.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] uppercase text-slate-400">Load from Catalog:</span>
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleSelectProductForItem(idx, e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-[#00288e]"
                          >
                            <option value="">-- Choose Product/Service --</option>
                            {activeProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatCurrency(p.unitPrice, currency)} / {p.unitType})
                                {p.type === 'product' && p.inStock !== undefined ? ` [Stock: ${p.inStock}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Item name / description *"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-sans text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#00288e]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className={`w-full px-2 py-1.5 rounded font-mono text-xs text-right focus:outline-none transition-colors ${
                              stockInfo?.isExceeded
                                ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold focus:border-rose-600'
                                : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#00288e]'
                            }`}
                          />
                          <select
                            value={item.unitType || 'units'}
                            onChange={(e) => handleItemChange(idx, 'unitType', e.target.value)}
                            className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-600"
                          >
                            <option value="units">units</option>
                            <option value="pcs">pcs</option>
                            <option value="kg">kg</option>
                            <option value="liters">L</option>
                            <option value="bags">bags</option>
                            <option value="boxes">boxes</option>
                            <option value="hours">hrs</option>
                            <option value="service">serv</option>
                            <option value="meters">m</option>
                          </select>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Unit Rate"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-900 text-right focus:bg-white focus:outline-none focus:border-[#00288e]"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="Disc %"
                          value={item.discountPercent || ''}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-900 text-right focus:bg-white focus:outline-none focus:border-[#00288e]"
                          title="Discount percentage"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center justify-end font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(item.amount || 0, currency)}
                      </div>
                    </div>

                    {stockInfo?.isExceeded && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-700 bg-rose-50/80 p-2 rounded border border-rose-200 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          Stock Exceeded: Requested {item.quantity} {stockInfo.unitType}, but only {stockInfo.inStock} {stockInfo.unitType} available in stock for &quot;{stockInfo.product.name}&quot;. Sale cannot proceed.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax, Payment & Summary Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            {/* Taxes & Settlement */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#00288e] uppercase">
                <Calculator className="w-4 h-4" />
                <span>Tax & Payment Details</span>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                  VAT Rate (%)
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e]"
                >
                  <option value="16">16% - Standard Rate (Kenya VAT)</option>
                  <option value="8">8% - Petroleum & Reduced Rate</option>
                  <option value="0">0% - Zero-Rated / Exempt</option>
                </select>
              </div>

              {docType === 'invoice' && (
                <>
                  <div>
                    <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                      Initial Payment Collected at Invoicing ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={grandTotal}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs font-bold text-[#006d30]"
                    />
                    <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                      Leave 0 for standard unpaid invoice. If paid, an official receipt will auto-generate.
                    </p>
                  </div>

                  {numAmountPaid > 0 && (
                    <>
                      <div>
                        <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                          Payment Method
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                          className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e]"
                        >
                          <option value="mobile_money">Safaricom M-PESA</option>
                          <option value="bank_transfer">Direct Bank Transfer</option>
                          <option value="card">Debit / Credit Card</option>
                          <option value="cash">Cash</option>
                          <option value="online">Cheque / Online</option>
                        </select>
                      </div>

                      {/* Financial Account Inflow Selection */}
                      <div className="space-y-1.5 p-2.5 bg-white border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <label className="block font-mono text-[11px] text-[#334155] uppercase font-semibold">
                            Deposit / Credit Account *
                          </label>
                          <span className="font-mono text-[9px] text-[#64748b]">Where money enters</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFinancialAccount('bank')}
                            className={`p-1.5 rounded-lg border text-left font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                              financialAccount === 'bank'
                                ? 'bg-blue-50 border-[#00288e] text-[#00288e] font-bold shadow-xs ring-1 ring-[#00288e]'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-[#00288e]" />
                            <div className="truncate">
                              <p className="text-[11px] font-bold leading-tight">Bank A/C</p>
                              <p className="text-[9px] text-slate-500 truncate">Bank Account</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFinancialAccount('mpesa')}
                            className={`p-1.5 rounded-lg border text-left font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                              financialAccount === 'mpesa'
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-xs ring-1 ring-emerald-600'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Smartphone className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <div className="truncate">
                              <p className="text-[11px] font-bold leading-tight">M-Pesa</p>
                              <p className="text-[9px] text-slate-500 truncate">Till / Paybill</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFinancialAccount('cash')}
                            className={`p-1.5 rounded-lg border text-left font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                              financialAccount === 'cash'
                                ? 'bg-amber-50 border-amber-600 text-amber-900 font-bold shadow-xs ring-1 ring-amber-600'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <div className="truncate">
                              <p className="text-[11px] font-bold leading-tight">Cash</p>
                              <p className="text-[9px] text-slate-500 truncate">Cash Drawer</p>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-[11px] text-[#475569] uppercase font-semibold mb-1">
                          Payment Reference / M-PESA Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. QHJ891K2LM or NCBA-190481"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e]"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white p-4 rounded-lg border border-slate-300 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between text-[#475569]">
                <span>Subtotal ({items.length} items):</span>
                <span className="font-semibold text-[#191c1e]">{formatCurrency(subtotal, currency)}</span>
              </div>

              {totalItemDiscounts > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Total Discount:</span>
                  <span>-{formatCurrency(totalItemDiscounts, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#475569]">
                <span>VAT ({taxRate}%):</span>
                <span className="font-semibold text-[#191c1e]">{formatCurrency(taxTotal, currency)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-[#00288e]">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal, currency)}</span>
              </div>

              {docType === 'invoice' && (
                <>
                  <div className="flex justify-between text-[#006d30] font-semibold">
                    <span>Amount Collected:</span>
                    <span>{formatCurrency(numAmountPaid, currency)}</span>
                  </div>

                  <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-xs">
                    <span className={balanceDue > 0 ? 'text-[#ba1a1a]' : 'text-[#006d30]'}>
                      Balance Due:
                    </span>
                    <span className={balanceDue > 0 ? 'text-[#ba1a1a]' : 'text-[#006d30]'}>
                      {balanceDue > 0 ? formatCurrency(balanceDue, currency) : 'KES 0.00 (PAID)'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Remarks & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Optional customer notes, delivery timetable or project references..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-mono text-xs text-[#475569] uppercase font-semibold">
                  Terms, Conditions & Banking Details
                </label>
                <button
                  type="button"
                  onClick={() => setTerms(getTermsFromSettings())}
                  className="text-[11px] font-mono text-[#00288e] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reload banking details and terms saved in Settings Profile"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload from Settings</span>
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Payment instructions, bank account details, and warranty terms..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
              <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                Automatically pre-filled from your Settings Profile (Banking details & Default terms). You can edit this directly for this document.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#e2e8f0] flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-mono uppercase font-semibold text-[#475569] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-billing-document"
              disabled={hasStockExceeded}
              title={hasStockExceeded ? 'Cannot proceed: One or more line items exceed available stock' : undefined}
              className={`px-6 py-2.5 text-xs font-mono uppercase font-bold text-white rounded-md shadow-xs transition-all flex items-center gap-2 ${
                hasStockExceeded
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : docType === 'quotation'
                  ? 'bg-[#1e40af] hover:bg-[#1e3a8a] cursor-pointer active:scale-95'
                  : 'bg-[#00288e] hover:bg-[#001f70] cursor-pointer active:scale-95'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Save & Generate {docType === 'quotation' ? 'Quotation' : 'Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
