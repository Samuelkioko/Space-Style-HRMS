import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit,
  Download,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ViewAllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currency: string;
  onDeleteTransaction: (id: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  isAdmin?: boolean;
}

export const ViewAllTransactionsModal: React.FC<ViewAllTransactionsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currency,
  onDeleteTransaction,
  onSelectTransaction,
  isAdmin = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'expense'>('all');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.customerOrVendor && tx.customerOrVendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.referenceNo && tx.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchType = filterType === 'all' || tx.type === filterType;
    const matchCat = selectedCat === 'all' || tx.category === selectedCat;

    return matchSearch && matchType && matchCat;
  });

  const allCategories = Array.from(new Set(transactions.map((t) => t.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="view-all-modal"
        className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div>
            <h3 className="font-sans text-lg font-bold text-[#191c1e]">
              All Transaction Records ({filtered.length})
            </h3>
            <p className="font-mono text-xs text-[#475569]">
              Search, audit, inspect details, or remove ledger entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-white border-b border-[#e2e8f0] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search across title, reference code, client, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-[#f1f5f9] p-1 rounded-md">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded text-xs font-mono uppercase font-semibold transition-colors ${
                  filterType === 'all' ? 'bg-white text-[#00288e] shadow-2xs' : 'text-[#475569]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('sale')}
                className={`px-3 py-1 rounded text-xs font-mono uppercase font-semibold transition-colors ${
                  filterType === 'sale' ? 'bg-white text-[#006d30] shadow-2xs' : 'text-[#475569]'
                }`}
              >
                Sales
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1 rounded text-xs font-mono uppercase font-semibold transition-colors ${
                  filterType === 'expense' ? 'bg-white text-[#ba1a1a] shadow-2xs' : 'text-[#475569]'
                }`}
              >
                Expenses
              </button>
            </div>

            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono bg-[#f8fafc] border border-[#cbd5e1] rounded-md text-[#475569]"
            >
              <option value="all">Filter Category (All)</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e2e8f0] p-4">
          {filtered.map((tx) => {
            const isSale = tx.type === 'sale';
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-3 hover:bg-[#f8fafc] rounded-md group transition-colors"
              >
                <div
                  className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    onSelectTransaction(tx);
                  }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isSale ? 'bg-[#006d30]/10 text-[#006d30]' : 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                    }`}
                  >
                    {isSale ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>

                  <div className="truncate pr-2">
                    <p className="font-sans font-semibold text-sm text-[#191c1e] truncate">
                      {tx.title}
                    </p>
                    <p className="font-mono text-xs text-[#475569] truncate">
                      {tx.customerOrVendor ? `${tx.customerOrVendor} • ` : ''}
                      {tx.category} • {tx.date} ({tx.time})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p
                      className={`font-mono text-sm md:text-base font-bold ${
                        isSale ? 'text-[#006d30]' : 'text-[#ba1a1a]'
                      }`}
                    >
                      {isSale ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </p>
                    <span className="font-mono text-[10px] text-[#64748b] uppercase">
                      {tx.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>

                    {onDeleteTransaction && (
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 text-[#94a3b8] hover:text-[#ba1a1a] hover:bg-red-50 rounded transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                        title="Delete Record & Cascade Linked Items"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-[#64748b] font-mono text-xs">
              No matching records found in this criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
