import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Check,
  AlertCircle,
  Receipt,
  ArrowRight,
  DollarSign,
  Building,
  FileCheck,
  Calendar,
  Layers,
  FileText,
  Plus,
} from 'lucide-react';
import { BillingDocument, PaymentMethod } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

interface RecordPaymentModalProps {
  invoice: BillingDocument | null;
  activeInvoices?: BillingDocument[];
  currency: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (params: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    date: string;
    generateReceipt: boolean;
    syncToLedger: boolean;
  }) => void;
  onCreateInvoice?: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  activeInvoices = [],
  currency,
  isOpen,
  onClose,
  onConfirmPayment,
  onCreateInvoice,
}) => {
  // Filter all active invoices (unpaid or partially paid with balance > 0)
  const availableActiveInvoices = activeInvoices.filter(
    (inv) => inv.type === 'invoice' && (inv.balanceDue || 0) > 0.01 && inv.status !== 'paid'
  );

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [generateReceipt, setGenerateReceipt] = useState<boolean>(true);
  const [syncToLedger, setSyncToLedger] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Determine current active target invoice
  const currentInvoice =
    invoice ||
    availableActiveInvoices.find((inv) => inv.id === selectedInvoiceId) ||
    (availableActiveInvoices.length > 0 ? availableActiveInvoices[0] : null);

  // Sync state when modal opens or invoice prop changes
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (invoice) {
        setSelectedInvoiceId(invoice.id);
        setAmount(invoice.balanceDue.toString());
      } else if (availableActiveInvoices.length > 0) {
        setSelectedInvoiceId(availableActiveInvoices[0].id);
        setAmount(availableActiveInvoices[0].balanceDue.toString());
      } else {
        setSelectedInvoiceId('');
        setAmount('0');
      }
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentReference('');
      setPaymentMethod('mobile_money');
      setGenerateReceipt(true);
      setSyncToLedger(true);
    }
  }, [isOpen, invoice, activeInvoices.length]);

  // When changing invoice from dropdown
  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    const target = availableActiveInvoices.find((inv) => inv.id === id);
    if (target) {
      setAmount(target.balanceDue.toString());
      setError('');
    }
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentInvoice) {
      setError('Please select an active invoice with an outstanding balance.');
      return;
    }

    if (numAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (numAmount > currentInvoice.balanceDue + 0.01) {
      setError(
        `Payment amount (${formatCurrency(numAmount, currency)}) cannot exceed the remaining balance due (${formatCurrency(currentInvoice.balanceDue, currency)}).`
      );
      return;
    }

    onConfirmPayment({
      invoiceId: currentInvoice.id,
      amount: numAmount,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      date,
      generateReceipt,
      syncToLedger,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="record-payment-modal"
        className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#006d30] flex items-center justify-center text-white font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans text-base font-bold text-[#191c1e]">Record Payment & Issue Receipt</h3>
                <span className="font-mono text-[10px] uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Active Invoices Only
                </span>
              </div>
              <p className="font-mono text-xs text-[#64748b]">
                {currentInvoice
                  ? `Payment against Invoice #${currentInvoice.documentNumber}`
                  : 'Select an active unpaid invoice to settle'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body or Empty State */}
        {!currentInvoice && availableActiveInvoices.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-sans text-base font-bold text-slate-900">No Active Invoices Pending Payment</h4>
              <p className="font-mono text-xs text-slate-500 max-w-sm mx-auto">
                Payment receipts can only be generated for active invoices that have an outstanding balance due. All existing invoices are either fully paid or none have been created yet.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {onCreateInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateInvoice();
                  }}
                  className="px-4 py-2 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Invoice Selector (if multiple active invoices and not fixed) */}
            {!invoice && availableActiveInvoices.length > 1 && (
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                  Select Active Invoice to Pay *
                </label>
                <select
                  value={currentInvoice?.id || ''}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-slate-900 focus:outline-none focus:border-[#00288e]"
                >
                  {availableActiveInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.documentNumber} • {inv.customerName} (Due: {formatCurrency(inv.balanceDue, currency)} / Total: {formatCurrency(inv.total, currency)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Invoice Summary Card */}
            {currentInvoice && (
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200 rounded-xl font-mono text-xs space-y-2 shadow-2xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-blue-100">
                  <span className="font-bold text-[#00288e] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Invoice #{currentInvoice.documentNumber}
                  </span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                    {currentInvoice.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-900">{currentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Total:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(currentInvoice.total, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Settled:</span>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(currentInvoice.amountPaid, currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-blue-200/80 flex justify-between items-center">
                  <span className="font-bold text-red-700 uppercase tracking-wider text-[11px]">
                    Current Balance Due:
                  </span>
                  <span className="font-bold text-base text-red-700">
                    {formatCurrency(currentInvoice.balanceDue, currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Amount Input */}
            {currentInvoice && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-mono text-xs text-[#475569] uppercase font-semibold">
                    Amount Received ({currency}) *
                  </label>
                  <span className="font-mono text-[11px] text-slate-500">
                    Max: {formatCurrency(currentInvoice.balanceDue, currency)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={currentInvoice.balanceDue}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#94a3b8] rounded-lg font-mono text-base font-bold text-[#006d30] focus:outline-none focus:border-[#006d30]"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(currentInvoice.balanceDue.toString())}
                    className="absolute right-2 top-2 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-mono text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                  >
                    Pay Full Balance
                  </button>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-lg font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              >
                <option value="mobile_money">Safaricom M-PESA (Buy Goods / Paybill / Send Money)</option>
                <option value="bank_transfer">NCBA / Equity / Direct Bank Wire</option>
                <option value="card">Visa / Mastercard / Debit Card</option>
                <option value="cash">Cash in Hand</option>
                <option value="online">Cheque / Electronic Transfer</option>
              </select>
            </div>

            {/* Reference / M-PESA code */}
            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Payment Reference / M-PESA Transaction Code
              </label>
              <input
                type="text"
                placeholder="e.g. QHJ891K2LM or EFT-NCBA-98124"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-lg font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
              <p className="font-mono text-[10px] text-slate-400 mt-1">
                Will be printed prominently on the official payment receipt.
              </p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Payment Clearance Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-lg font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>

            {/* Automation Options */}
            <div className="space-y-2 pt-3 border-t border-slate-200 bg-slate-50 p-3 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateReceipt}
                  onChange={(e) => setGenerateReceipt(e.target.checked)}
                  className="rounded border-slate-300 text-[#006d30] focus:ring-[#006d30]"
                />
                <span className="font-mono text-xs text-slate-800 font-semibold">
                  Generate official Payment Receipt (REC-...) linked to Invoice
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToLedger}
                  onChange={(e) => setSyncToLedger(e.target.checked)}
                  className="rounded border-slate-300 text-[#006d30] focus:ring-[#006d30]"
                />
                <span className="font-mono text-xs text-slate-800 font-semibold">
                  Post verified revenue transaction into Cashbook Sales Ledger
                </span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="pt-3 flex justify-between items-center border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#475569] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-confirm-record-payment"
                className="px-5 py-2.5 text-xs font-mono uppercase font-bold text-white bg-[#006d30] hover:bg-[#005224] rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Issue Receipt</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
