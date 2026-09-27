import React from 'react';
import {
  AlertTriangle,
  FileText,
  Trash2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CascadeDeletePreview } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: CascadeDeletePreview | null;
  onConfirm: () => void;
  currency: string;
  isProcessing?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  preview,
  onConfirm,
  currency,
  isProcessing = false,
}) => {
  if (!isOpen || !preview) return null;

  const { targetDoc, targetTx, cascadedQuotes, cascadedInvoices, cascadedReceipts, cascadedTransactions, totalAffectedRecords } =
    preview;

  // Filter out primary target from child list
  const secondaryInvoices = targetDoc ? cascadedInvoices.filter((d) => d.id !== targetDoc.id) : cascadedInvoices;
  const secondaryReceipts = targetDoc ? cascadedReceipts.filter((d) => d.id !== targetDoc.id) : cascadedReceipts;
  const secondaryQuotes = targetDoc ? cascadedQuotes.filter((d) => d.id !== targetDoc.id) : cascadedQuotes;
  const secondaryTransactions = targetTx ? cascadedTransactions.filter((t) => t.id !== targetTx.id) : cascadedTransactions;

  const hasCascadedItems =
    secondaryInvoices.length > 0 ||
    secondaryReceipts.length > 0 ||
    secondaryQuotes.length > 0 ||
    secondaryTransactions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        id="delete-confirm-modal"
      >
        {/* Modal Header */}
        <div className="bg-red-50/90 border-b border-red-100 p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans text-red-950">
                {targetTx ? 'Confirm Sale Deletion' : 'Confirm Document Deletion'}
              </h2>
              <p className="text-xs font-mono text-red-700">
                {targetTx
                  ? 'Deleting this sale will permanently delete it and all associated receipts, invoices, and quotations'
                  : 'Permanently remove this document and any associated records from the database'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-red-100/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Target Card: Either Sale Transaction or Billing Document */}
          {targetTx ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-mono uppercase font-bold text-slate-500 mb-1">
                Primary Record to Delete (Confirmed Sale)
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    Sale Record
                  </span>
                  <span className="font-sans text-sm font-bold text-slate-900 truncate max-w-[280px]">
                    {targetTx.title}
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-[#006d30]">
                  +{formatCurrency(targetTx.amount, currency)}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                {targetTx.customerOrVendor && (
                  <span>
                    <strong>Customer:</strong> {targetTx.customerOrVendor}
                  </span>
                )}
                <span>
                  <strong>Date:</strong> {targetTx.date} ({targetTx.time})
                </span>
                {targetTx.paymentMethod && (
                  <span>
                    <strong>Method:</strong> {targetTx.paymentMethod.replace('_', ' ')}
                  </span>
                )}
                {targetTx.referenceNo && (
                  <span>
                    <strong>Ref:</strong> {targetTx.referenceNo}
                  </span>
                )}
              </div>
            </div>
          ) : targetDoc ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-mono uppercase font-bold text-slate-500 mb-1">
                Primary Document to Delete
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-xs font-bold uppercase px-2.5 py-0.5 rounded-md ${
                      targetDoc.type === 'quotation'
                        ? 'bg-blue-100 text-blue-800'
                        : targetDoc.type === 'invoice'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {targetDoc.type}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {targetDoc.documentNumber}
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(targetDoc.total, currency)}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong>Customer:</strong> {targetDoc.customerName}
                </span>
                <span>
                  <strong>Date:</strong> {targetDoc.date}
                </span>
                <span>
                  <strong>Status:</strong>{' '}
                  <span className="capitalize">{targetDoc.status.replace('_', ' ')}</span>
                </span>
              </div>
            </div>
          ) : null}

          {/* Cascading Impact Explanation & Breakdown */}
          {hasCascadedItems ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                <Layers className="w-4 h-4 text-red-600" />
                <span>All Associated Records Will Be Automatically Removed</span>
              </div>
              <p className="text-xs font-sans text-slate-600">
                {targetTx
                  ? `Because this sale is linked to associated billing documents, deleting it will also cascade and remove all ${totalAffectedRecords - 1} linked record(s) (receipts, invoices, and quotations):`
                  : `Because this ${targetDoc?.type} is linked to subsequent transactions, invoices, or payment receipts, deleting it will also cascade and remove the following ${totalAffectedRecords - 1} linked item(s):`}
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto border border-red-200/80 rounded-xl bg-red-50/30 p-3">
                {/* Secondary Quotations */}
                {secondaryQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-mono text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Quotation
                      </span>
                      <span className="font-mono font-bold text-slate-900">{q.documentNumber}</span>
                      <span className="text-slate-500 truncate max-w-[140px]">({q.customerName})</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(q.total, currency)}
                    </span>
                  </div>
                ))}

                {/* Secondary Invoices */}
                {secondaryInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-mono text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                        Invoice
                      </span>
                      <span className="font-mono font-bold text-slate-900">{inv.documentNumber}</span>
                      <span className="text-slate-500 truncate max-w-[140px]">({inv.customerName})</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(inv.total, currency)}
                    </span>
                  </div>
                ))}

                {/* Secondary Receipts */}
                {secondaryReceipts.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-mono text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Receipt
                      </span>
                      <span className="font-mono font-bold text-slate-900">{rec.documentNumber}</span>
                      {rec.paymentReference && (
                        <span className="font-mono text-[10px] text-slate-500">Ref: {rec.paymentReference}</span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatCurrency(rec.total, currency)}
                    </span>
                  </div>
                ))}

                {/* Cascaded Ledger Transactions */}
                {secondaryTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-mono text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        Ledger Tx
                      </span>
                      <span className="text-slate-800 font-medium truncate max-w-[200px]">{tx.title}</span>
                    </div>
                    <span className="font-mono font-semibold text-amber-800">
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                {targetTx
                  ? 'No associated receipts, invoices, or quotations were found linked to this sale.'
                  : 'No downstream invoices, receipts, or transactions are linked to this record.'}
              </span>
            </div>
          )}

          {/* Permanent Deletion Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5">
                <span>Permanent Database Purge</span>
              </div>
              <p className="mt-0.5 text-amber-800">
                This action will directly and permanently remove the selected record and all associated receipts, invoices, quotations, and ledger transactions from the database.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel (Keep Records)
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            id="btn-confirm-delete"
            className="px-5 py-2 rounded-lg font-mono text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-60 active:scale-95"
          >
            {isProcessing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>
              {isProcessing
                ? 'Deleting...'
                : totalAffectedRecords > 1
                ? `Delete All ${totalAffectedRecords} Records Permanently`
                : 'Delete Record Permanently'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
