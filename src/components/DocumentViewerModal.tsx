import React from 'react';
import {
  X,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  Building,
  User,
  Calendar,
  CreditCard,
  FileText,
  Tag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { BillingDocument, CompanyInfo } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { generateAndDownloadDocumentPDF } from '../utils/documentPdfGenerator';

interface DocumentViewerModalProps {
  document: BillingDocument | null;
  companyInfo: CompanyInfo;
  currency: string;
  isOpen: boolean;
  onClose: () => void;
  onConvertToInvoice?: (doc: BillingDocument) => void;
  onConvertToReceipt?: (doc: BillingDocument) => void;
  onRecordPayment?: (doc: BillingDocument) => void;
  onDeleteDocument?: (id: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: docData,
  companyInfo,
  currency,
  isOpen,
  onClose,
  onConvertToInvoice,
  onConvertToReceipt,
  onRecordPayment,
  onDeleteDocument,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !docData) return null;

  const isReceipt = docData.type === 'receipt';
  const isInvoice = docData.type === 'invoice';
  const isQuotation = docData.type === 'quotation';

  const handleDownloadPDF = () => {
    generateAndDownloadDocumentPDF({
      document: docData,
      companyInfo,
      currency,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `*${companyInfo.businessName || 'MGATOR INDUSTRIES LTD'}*\n${docData.type.toUpperCase()}: ${docData.documentNumber}\nClient: ${docData.customerName}\nDate: ${docData.date}\nTotal: ${formatCurrency(docData.total, currency)}\nPaid: ${formatCurrency(docData.amountPaid, currency)}\nBalance: ${formatCurrency(docData.balanceDue, currency)}\nStatus: ${docData.status.toUpperCase()}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 print:p-0 print:bg-white">
      <div
        id="document-viewer-modal"
        className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none"
      >
        {/* Top Control Action Bar */}
        <div className="px-6 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs uppercase px-2.5 py-1 rounded font-bold ${
                isReceipt
                  ? 'bg-emerald-100 text-[#006d30]'
                  : isQuotation
                  ? 'bg-blue-100 text-[#1e40af]'
                  : 'bg-indigo-100 text-[#00288e]'
              }`}
            >
              {docData.type.toUpperCase()} #{docData.documentNumber}
            </span>
            <span className="font-mono text-xs text-[#64748b]">• Status: {docData.status.toUpperCase().replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-[#334155] cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-[#334155] cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1 text-xs font-mono font-bold px-3 py-1.5 rounded bg-[#00288e] hover:bg-[#1e40af] text-white cursor-pointer shadow-xs"
              title="Download Official PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {onDeleteDocument && (
              <button
                onClick={() => {
                  onDeleteDocument(docData.id);
                  onClose();
                }}
                className="flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1.5 rounded hover:bg-red-100 text-red-700 cursor-pointer"
                title="Delete Document & Move to Trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rendered Document Sheet (A4 Proportion Canvas) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white font-sans text-slate-800">
          {/* Automated Workflow Context Banner */}
          <div className="print:hidden">
            {isQuotation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1e40af]" />
                  <span className="font-mono text-[#1e40af] font-semibold">
                    {docData.status === 'accepted'
                      ? 'Approved by customer — Payment Tax Invoice generated'
                      : 'Quotation Stage — Once approved by customer, click below to move to Payment Invoice'}
                  </span>
                </div>
                {docData.status !== 'accepted' && onConvertToInvoice && (
                  <button
                    onClick={() => {
                      onConvertToInvoice(docData);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-[11px] font-bold uppercase rounded cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Move to Invoice</span>
                  </button>
                )}
              </div>
            )}

            {isInvoice && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00288e]" />
                  <span className="font-mono text-[#00288e] font-semibold">
                    {docData.linkedQuotationId
                      ? `Generated from approved Quotation #${docData.linkedQuotationId}`
                      : 'Tax Invoice (Manual Entry)'}
                    {docData.balanceDue > 0
                      ? ` • Balance: ${formatCurrency(docData.balanceDue, currency)}`
                      : ' • Paid in full'}
                  </span>
                </div>
                {docData.balanceDue > 0 && onRecordPayment && (
                  <button
                    onClick={() => {
                      onRecordPayment(docData);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#006d30] hover:bg-[#005224] text-white font-mono text-[11px] font-bold uppercase rounded cursor-pointer shrink-0 shadow-2xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment (Auto-Receipt)</span>
                  </button>
                )}
              </div>
            )}

            {isReceipt && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006d30]" />
                  <span className="font-mono text-[#006d30] font-semibold">
                    {docData.linkedInvoiceId
                      ? `Official Payment Receipt automatically generated for Invoice #${docData.linkedInvoiceId}`
                      : 'Official Payment Receipt'}
                    {' • Confirmed & Synced to Cashbook'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Header & Company Brand */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-[#00288e] tracking-tight">
                {companyInfo.businessName || 'MGATOR INDUSTRIES LTD'}
              </h2>
              {companyInfo.legalEntityName && (
                <p className="text-xs text-slate-500 font-medium">{companyInfo.legalEntityName}</p>
              )}
              {companyInfo.tagline && (
                <p className="text-[11px] text-slate-400 italic mt-0.5">{companyInfo.tagline}</p>
              )}
              <div className="mt-1.5 font-mono text-xs text-slate-600 space-y-0.5">
                <p>Tax PIN: <span className="font-semibold text-slate-900">{companyInfo.taxId || 'P052254755G'}</span></p>
                <p>Phone: {companyInfo.phone || '0728353883'} | Email: {companyInfo.businessEmail || 'mgatordoc@gmail.com'}</p>
                <p>Address: {companyInfo.address || 'Nairobi, Kenya'}</p>
                {companyInfo.website && (
                  <p>Web: <span className="text-[#00288e]">{companyInfo.website}</span></p>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <div
                className={`inline-block font-sans text-lg font-extrabold uppercase tracking-wider px-3 py-1 rounded ${
                  isReceipt
                    ? 'bg-emerald-50 text-[#006d30] border border-emerald-300'
                    : isQuotation
                    ? 'bg-blue-50 text-[#1e40af] border border-blue-300'
                    : 'bg-indigo-50 text-[#00288e] border border-indigo-300'
                }`}
              >
                {isReceipt ? 'Payment Receipt' : isInvoice ? 'Invoice' : 'Quotation'}
              </div>
              <p className="font-mono text-sm font-bold text-slate-900 mt-1">
                No: {docData.documentNumber}
              </p>
              <p className="font-mono text-xs text-slate-500">
                Date: <span className="text-slate-800 font-semibold">{docData.date}</span>
              </p>
              {docData.dueDate && (
                <p className="font-mono text-xs text-slate-500">
                  {isQuotation ? 'Valid Until: ' : 'Due Date: '}
                  <span className="text-red-700 font-bold">{docData.dueDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* Client & Metadata Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-mono text-[11px] uppercase font-bold text-[#00288e] mb-1">
                {isReceipt ? 'Received From (Payer):' : isInvoice ? 'Billed To:' : 'Quoted To:'}
              </p>
              <h4 className="font-sans font-bold text-base text-slate-900">
                {docData.customerName || 'Walk-in Customer'}
              </h4>
              {docData.customerTaxId && (
                <p className="font-mono text-xs text-slate-600 mt-0.5">
                  Tax PIN: <span className="font-semibold">{docData.customerTaxId}</span>
                </p>
              )}
              {(docData.customerPhone || docData.customerEmail) && (
                <p className="font-sans text-xs text-slate-600 mt-0.5">
                  {[docData.customerPhone, docData.customerEmail].filter(Boolean).join(' • ')}
                </p>
              )}
              {docData.customerAddress && (
                <p className="font-sans text-xs text-slate-600 mt-0.5">{docData.customerAddress}</p>
              )}
            </div>

            <div className="font-mono text-xs space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Document Status:</span>
                <span className="font-bold uppercase text-[#00288e]">{docData.status.replace('_', ' ')}</span>
              </div>
              {docData.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold text-slate-800 uppercase">{docData.paymentMethod.replace('_', ' ')}</span>
                </div>
              )}
              {docData.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference / Code:</span>
                  <span className="font-bold text-[#00288e]">{docData.paymentReference}</span>
                </div>
              )}
              {docData.linkedInvoiceId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Ref:</span>
                  <span className="font-semibold text-slate-800">{docData.linkedInvoiceId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Subject / Title */}
          {docData.title && (
            <div className="font-sans text-sm font-semibold text-slate-800 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <span className="text-[#00288e] font-mono text-xs uppercase mr-2 font-bold">Subject:</span>
              {docData.title}
            </div>
          )}

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-mono text-xs uppercase border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Rate ({getCurrencySymbol(currency).trim()})</th>
                  <th className="py-2.5 px-3 text-center">Disc</th>
                  <th className="py-2.5 px-3 text-right">Amount ({getCurrencySymbol(currency).trim()})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans text-xs">
                {docData.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-center text-slate-400">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500">{item.description}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-semibold">{item.quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-500">{item.unitType || 'units'}</td>
                    <td className="py-2.5 px-3 font-mono text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-center text-slate-500">
                      {item.discountPercent && item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                      {formatCurrency(item.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Instructions / Stamp (Left) + Totals (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Left Box: Stamp or Banking */}
            <div>
              {isReceipt || docData.status === 'paid' ? (
                <div className="space-y-3">
                  <div className="p-4 border-2 border-emerald-600 rounded-xl bg-emerald-50/50 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-lg font-mono tracking-wider">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>OFFICIAL PAID RECEIPT</span>
                    </div>
                    <p className="font-mono text-xs text-emerald-800 font-bold">
                      Amount Received: {formatCurrency(docData.amountPaid || docData.total, currency)}
                    </p>
                    <p className="font-mono text-[11px] text-emerald-700">
                      Payment Mode: {(docData.paymentMethod || 'Mobile Money').toUpperCase().replace('_', ' ')}
                    </p>
                    {docData.paymentReference && (
                      <p className="font-mono text-[11px] text-emerald-900 font-bold">
                        Ref / Transaction Code: {docData.paymentReference}
                      </p>
                    )}
                  </div>

                  {companyInfo.paymentOptions && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                      <span className="font-bold text-slate-800 uppercase text-[10px] block">Verified Payee Accounts:</span>
                      {companyInfo.paymentOptions.mobileMoneyProvider && companyInfo.paymentOptions.paybillNumber && (
                        <p>• {companyInfo.paymentOptions.mobileMoneyProvider} Paybill: <span className="font-bold text-slate-800">{companyInfo.paymentOptions.paybillNumber}</span> {companyInfo.paymentOptions.accountNumber && `| A/C: ${companyInfo.paymentOptions.accountNumber}`}</p>
                      )}
                      {companyInfo.paymentOptions.bankName && companyInfo.paymentOptions.bankAccountNumber && (
                        <p>• {companyInfo.paymentOptions.bankName} | A/C: <span className="font-bold text-slate-800">{companyInfo.paymentOptions.bankAccountNumber}</span></p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
                  <p className="font-bold text-[#00288e] uppercase text-[11px] flex items-center justify-between">
                    <span>Payment Remittance Instructions</span>
                    <span className="text-[9px] text-slate-400 font-normal">Official Payee Info</span>
                  </p>

                  {/* Mobile Money / M-PESA */}
                  {companyInfo.paymentOptions?.paybillNumber || companyInfo.paymentOptions?.tillNumber ? (
                    <div className="space-y-0.5 text-slate-800">
                      {companyInfo.paymentOptions.paybillNumber && (
                        <p>
                          • <span className="font-semibold">{companyInfo.paymentOptions.mobileMoneyProvider || 'M-PESA'} Paybill:</span>{' '}
                          <span className="font-bold text-[#00288e]">{companyInfo.paymentOptions.paybillNumber}</span>{' '}
                          | A/C:{' '}
                          <span className="font-bold">{companyInfo.paymentOptions.accountNumber || docData.documentNumber}</span>
                        </p>
                      )}
                      {companyInfo.paymentOptions.tillNumber && (
                        <p>
                          • <span className="font-semibold">Buy Goods Till:</span>{' '}
                          <span className="font-bold text-[#00288e]">{companyInfo.paymentOptions.tillNumber}</span>
                          {companyInfo.paymentOptions.mobileMoneyName && (
                            <span className="text-slate-600"> ({companyInfo.paymentOptions.mobileMoneyName})</span>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-700">
                      • M-PESA Paybill: <span className="font-bold">522522</span> | A/C: <span className="font-bold">1289410984</span>
                    </p>
                  )}

                  {/* Bank Details */}
                  {companyInfo.paymentOptions?.bankName && companyInfo.paymentOptions?.bankAccountNumber ? (
                    <div className="space-y-0.5 text-slate-800">
                      <p>
                        • <span className="font-semibold">{companyInfo.paymentOptions.bankName}</span>
                        {companyInfo.paymentOptions.bankBranch && <span> | Branch: {companyInfo.paymentOptions.bankBranch}</span>}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        A/C: <span className="font-bold text-slate-900">{companyInfo.paymentOptions.bankAccountNumber}</span>
                        {companyInfo.paymentOptions.bankAccountName && (
                          <span> ({companyInfo.paymentOptions.bankAccountName})</span>
                        )}
                        {companyInfo.paymentOptions.bankSwiftCode && (
                          <span> | SWIFT: {companyInfo.paymentOptions.bankSwiftCode}</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-700">
                      • NCBA Bank Kenya | Branch: Industrial Area | A/C: 1004829101
                    </p>
                  )}

                  {/* Custom Payment Instructions / Ref note */}
                  <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                    {companyInfo.paymentOptions?.paymentInstructions ||
                      `Please quote ${isQuotation ? 'Quotation' : 'Invoice'} #${docData.documentNumber} on payment notification.`}
                  </p>
                </div>
              )}
            </div>

            {/* Right Box: Calculations */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(docData.subtotal, currency)}</span>
              </div>

              {docData.discountTotal && docData.discountTotal > 0 ? (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(docData.discountTotal, currency)}</span>
                </div>
              ) : null}

              {docData.taxTotal && docData.taxTotal > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>VAT ({docData.taxRate || 16}%):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(docData.taxTotal, currency)}</span>
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-[#00288e]">
                <span>Total Amount:</span>
                <span>{formatCurrency(docData.total, currency)}</span>
              </div>

              {!isQuotation && (
                <>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(docData.amountPaid, currency)}</span>
                  </div>

                  <div className="pt-1 border-t border-slate-200 flex justify-between font-bold">
                    <span className={docData.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'}>
                      Balance Due:
                    </span>
                    <span className={docData.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'}>
                      {docData.balanceDue > 0 ? formatCurrency(docData.balanceDue, currency) : 'KES 0.00 (PAID)'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes & Terms */}
          {(docData.notes || docData.termsAndConditions) && (
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {docData.notes && (
                <div>
                  <p className="font-mono font-bold uppercase text-[10px] text-slate-500 mb-1">Notes & Remarks:</p>
                  <p className="font-sans text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-line">
                    {docData.notes}
                  </p>
                </div>
              )}
              {docData.termsAndConditions && (
                <div>
                  <p className="font-mono font-bold uppercase text-[10px] text-slate-500 mb-1">Terms & Conditions:</p>
                  <p className="font-sans text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-line text-[11px]">
                    {docData.termsAndConditions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Signoff */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs font-mono text-slate-500">
            <div>
              <p>Generated by Executive Ledger ERP System</p>
            </div>
            <div className="text-right">
              <p className="border-b border-slate-300 w-48 mb-1 inline-block" />
              <p className="font-bold text-slate-700">Authorized Signature & Stamp</p>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            {onDeleteDocument && (
              <button
                onClick={() => {
                  onDeleteDocument(docData.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 text-red-700 hover:bg-red-50 px-3 py-2 rounded font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Convert Quote to Invoice */}
            {isQuotation && onConvertToInvoice && docData.status !== 'accepted' && (
              <button
                onClick={() => {
                  onConvertToInvoice(docData);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs font-bold uppercase rounded-md shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Move to Invoice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Record Payment on Invoice */}
            {isInvoice && docData.balanceDue > 0 && onRecordPayment && (
              <button
                onClick={() => {
                  onRecordPayment(docData);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#006d30] hover:bg-[#005224] text-white font-mono text-xs font-bold uppercase rounded-md shadow-xs transition-all cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment (Auto-Receipt)</span>
              </button>
            )}

            {/* Mark Invoice Paid & Generate Official Receipt */}
            {isInvoice && docData.balanceDue > 0 && onConvertToReceipt && (
              <button
                onClick={() => {
                  onConvertToReceipt(docData);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-bold uppercase rounded-md shadow-xs transition-all cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Mark Paid & Issue Receipt</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-mono text-xs font-bold uppercase rounded-md transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
