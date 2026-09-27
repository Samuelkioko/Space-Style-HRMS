import React from 'react';
import {
  X,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  FileText,
  User,
  Tag,
  CheckCircle2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  Package,
  Scale,
  Receipt,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { Transaction, BillingDocument } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  currency: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onPrintReceipt?: (transaction: Transaction) => void;
  isAdmin?: boolean;
  linkedReceipt?: BillingDocument | null;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  currency,
  onClose,
  onDelete,
  onPrintReceipt,
  isAdmin = true,
  linkedReceipt,
}) => {
  if (!transaction) return null;

  const isSale = transaction.type === 'sale';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="transaction-detail-modal"
        className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
      >
        {/* Top Header Card */}
        <div className={`p-6 text-center relative ${isSale ? 'bg-emerald-50/70' : 'bg-red-50/70'} border-b border-[#e2e8f0]`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 ${
              isSale ? 'bg-[#006d30] text-white shadow-sm' : 'bg-[#ba1a1a] text-white shadow-sm'
            }`}
          >
            {isSale ? <ArrowUpRight className="w-7 h-7 stroke-[2.5]" /> : <ArrowDownRight className="w-7 h-7 stroke-[2.5]" />}
          </div>

          <h3 className="font-sans text-xl font-bold text-[#191c1e]">{transaction.title}</h3>
          <p
            className={`font-mono text-3xl font-bold mt-2 ${
              isSale ? 'text-[#006d30]' : 'text-[#ba1a1a]'
            }`}
          >
            {isSale ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
          </p>
          <span className="inline-block mt-2 font-mono text-xs uppercase px-2.5 py-0.5 rounded-full font-semibold bg-white border border-slate-200 text-[#475569]">
            {transaction.type} • {transaction.status}
          </span>
        </div>

        {/* Detailed Fields */}
        <div className="p-6 space-y-3.5 font-mono text-xs divide-y divide-[#f1f5f9]">
          {/* Product / Service Breakdown: Multiple Items or Single Item */}
          {transaction.items && transaction.items.length > 0 ? (
            <div className="pt-2 bg-blue-50/60 p-3 rounded-lg border border-blue-200/60 mb-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#00288e] flex items-center gap-1.5 font-bold">
                  <Package className="w-3.5 h-3.5" /> Itemized Sale ({transaction.items.length} {transaction.items.length === 1 ? 'item' : 'items'})
                </span>
                <span className="font-mono text-[11px] text-[#00288e] bg-blue-100 px-2 py-0.5 rounded font-semibold">
                  POS Cart
                </span>
              </div>
              <div className="divide-y divide-blue-200/50 pt-1">
                {transaction.items.map((item, idx) => (
                  <div key={item.id || idx} className="py-1.5 flex items-center justify-between text-[11px]">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-[#191c1e] truncate">{item.name}</p>
                      <p className="text-[#475569] text-[10px]">
                        {item.quantity} {item.unitType || 'units'} × {getCurrencySymbol(currency)}{item.unitPrice.toLocaleString()}
                      </p>
                    </div>
                    <span className="font-bold text-[#006d30] font-mono shrink-0">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (transaction.productName || (transaction.quantity && transaction.unitPrice)) && (
            <div className="pt-2 bg-blue-50/60 p-3 rounded-lg border border-blue-200/60 mb-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#00288e] flex items-center gap-1.5 font-bold">
                  <Package className="w-3.5 h-3.5" /> Product / Item
                </span>
                <span className="font-bold text-[#191c1e] text-sm">
                  {transaction.productName || transaction.title}
                </span>
              </div>

              {transaction.quantity && transaction.unitPrice && (
                <div className="flex items-center justify-between text-[11px] text-[#334155] pt-1 border-t border-blue-200/40">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3 h-3 text-[#00288e]" />
                    <span>{transaction.quantity} {transaction.unitType || 'units'} @ {getCurrencySymbol(currency)}{transaction.unitPrice.toLocaleString()}/{transaction.unitType || 'unit'}</span>
                  </span>
                  <span className="font-bold text-[#006d30]">
                    = {formatCurrency(transaction.amount, currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-[#64748b] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Category
            </span>
            <span className="font-semibold text-[#191c1e]">{transaction.category}</span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[#64748b] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date & Time
            </span>
            <span className="font-semibold text-[#191c1e]">
              {transaction.date} ({transaction.time})
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[#64748b] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment Method
            </span>
            <span className="font-semibold text-[#191c1e] uppercase">
              {transaction.paymentMethod.replace('_', ' ')}
            </span>
          </div>

          {transaction.customerOrVendor && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-[#64748b] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> {isSale ? 'Customer' : 'Vendor'}
              </span>
              <span className="font-semibold text-[#191c1e]">{transaction.customerOrVendor}</span>
            </div>
          )}

          {transaction.referenceNo && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-[#64748b] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Reference ID
              </span>
              <span className="font-semibold text-[#00288e] bg-slate-100 px-2 py-0.5 rounded">
                {transaction.referenceNo}
              </span>
            </div>
          )}

          {transaction.notes && (
            <div className="pt-2">
              <span className="text-[#64748b] block mb-1">Notes / Ledger Remarks:</span>
              <p className="font-sans text-xs text-[#191c1e] bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Document Actions for Sales: Only Print Receipt (No duplicate generation) */}
          {isSale && onPrintReceipt && (
            <div className="pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[#475569] font-bold uppercase text-[11px]">Official Receipt:</span>
                {linkedReceipt && (
                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                    Receipt #{linkedReceipt.documentNumber}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  onPrintReceipt(transaction);
                  onClose();
                }}
                id="btn-print-receipt-transaction"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#006d30] border border-emerald-300 font-mono text-xs font-bold uppercase cursor-pointer transition-colors"
                title="Print current payment receipt (does not create duplicates)"
              >
                <Receipt className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex justify-between items-center gap-3">
          <button
            onClick={() => {
              onDelete(transaction.id);
              onClose();
            }}
            id="btn-delete-transaction"
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-[#ba1a1a] border border-red-200 px-3.5 py-2 rounded-lg font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
            title="Permanently delete transaction and cascade to all linked documents"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Record</span>
          </button>

          <button
            onClick={onClose}
            className="bg-[#00288e] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

