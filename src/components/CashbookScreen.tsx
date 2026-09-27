import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Smartphone,
  Coins,
  CheckCircle2,
  Download,
  Filter,
} from 'lucide-react';
import { Transaction, FinancialAccountType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CashbookScreenProps {
  transactions: Transaction[];
  currency: string;
  cashBalance: number;
  onOpenAddModal: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

// Helper to determine the account for any transaction (with backwards compatibility)
export const resolveTransactionAccount = (t: Transaction): FinancialAccountType => {
  if (t.financialAccount) return t.financialAccount;
  if (t.paymentMethod === 'mobile_money') return 'mpesa';
  if (t.paymentMethod === 'cash') return 'cash';
  return 'bank';
};

export const CashbookScreen: React.FC<CashbookScreenProps> = ({
  transactions,
  currency,
  cashBalance,
  onOpenAddModal,
  onSelectTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'expense'>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | FinancialAccountType>('all');

  // Compute total inflow (credits) and outflow (debits)
  const totalInflow = useMemo(
    () => transactions.filter((t) => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );
  const totalOutflow = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  // Dynamic real-time balances for each financial account
  const accountStats = useMemo(() => {
    const stats: Record<FinancialAccountType, { inflow: number; outflow: number; balance: number; count: number }> = {
      bank: { inflow: 0, outflow: 0, balance: 0, count: 0 },
      mpesa: { inflow: 0, outflow: 0, balance: 0, count: 0 },
      cash: { inflow: 0, outflow: 0, balance: 0, count: 0 },
    };

    transactions.forEach((tx) => {
      const acct = resolveTransactionAccount(tx);
      if (stats[acct]) {
        stats[acct].count += 1;
        if (tx.type === 'sale') {
          stats[acct].inflow += tx.amount;
          stats[acct].balance += tx.amount;
        } else {
          stats[acct].outflow += tx.amount;
          stats[acct].balance -= tx.amount;
        }
      }
    });

    return stats;
  }, [transactions]);

  // Compute running balance chronologically per filtered view
  const runningLedger = useMemo(() => {
    // Sort transactions oldest to newest for chronological balance math
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let current = 0;
    const withBalance = sorted.map((t) => {
      const acct = resolveTransactionAccount(t);
      if (t.type === 'sale') {
        current += t.amount;
      } else {
        current -= t.amount;
      }
      return { ...t, resolvedAccount: acct, runningBalance: current };
    });

    // Return reversed for newest-first display
    return withBalance.reverse();
  }, [transactions]);

  const filteredLedger = useMemo(() => {
    return runningLedger.filter((t) => {
      const matchType = filterType === 'all' || t.type === filterType;
      const matchAccount = accountFilter === 'all' || t.resolvedAccount === accountFilter;
      return matchType && matchAccount;
    });
  }, [runningLedger, filterType, accountFilter]);

  return (
    <div id="cashbook-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Cashbook Header */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-sans text-xl md:text-2xl font-bold text-[#191c1e] tracking-tight">
            Cashbook & Multi-Account Ledger
          </h2>
          <p className="font-mono text-xs text-[#475569] mt-1">
            Real-time reconciliation of Bank accounts, Safaricom M-Pesa, and Cash float
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="bg-[#00288e] hover:bg-[#1e40af] text-white px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            + Record Transaction
          </button>
        </div>
      </div>

      {/* Dynamic Financial Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {/* 1. BANK ACCOUNT */}
        <div
          onClick={() => setAccountFilter(accountFilter === 'bank' ? 'all' : 'bank')}
          className={`bg-white border rounded-lg p-4.5 kpi-shadow transition-all cursor-pointer ${
            accountFilter === 'bank'
              ? 'border-[#00288e] ring-2 ring-[#00288e]/20 bg-blue-50/20'
              : 'border-[#c4c5d5]/70 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#00288e] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-xs text-[#475569] uppercase font-semibold">
                  Bank Account
                </p>
                <p className={`font-sans text-xl font-bold ${accountStats.bank.balance >= 0 ? 'text-[#191c1e]' : 'text-red-700'}`}>
                  {formatCurrency(accountStats.bank.balance, currency)}
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-[#00288e] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              EFT / Cards / Wire
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#006d30] flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-[#006d30]" />
              +{formatCurrency(accountStats.bank.inflow, currency)}
            </span>
            <span className="text-red-700 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3 text-red-600" />
              -{formatCurrency(accountStats.bank.outflow, currency)}
            </span>
            <span className="text-slate-400">
              {accountStats.bank.count} txs
            </span>
          </div>
        </div>

        {/* 2. SAFARICOM M-PESA */}
        <div
          onClick={() => setAccountFilter(accountFilter === 'mpesa' ? 'all' : 'mpesa')}
          className={`bg-white border rounded-lg p-4.5 kpi-shadow transition-all cursor-pointer ${
            accountFilter === 'mpesa'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/20'
              : 'border-[#c4c5d5]/70 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-xs text-[#475569] uppercase font-semibold">
                  Safaricom M-Pesa
                </p>
                <p className={`font-sans text-xl font-bold ${accountStats.mpesa.balance >= 0 ? 'text-[#191c1e]' : 'text-red-700'}`}>
                  {formatCurrency(accountStats.mpesa.balance, currency)}
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Till & Paybill
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#006d30] flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-[#006d30]" />
              +{formatCurrency(accountStats.mpesa.inflow, currency)}
            </span>
            <span className="text-red-700 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3 text-red-600" />
              -{formatCurrency(accountStats.mpesa.outflow, currency)}
            </span>
            <span className="text-slate-400">
              {accountStats.mpesa.count} txs
            </span>
          </div>
        </div>

        {/* 3. CASH DRAWER / CASH IN HAND */}
        <div
          onClick={() => setAccountFilter(accountFilter === 'cash' ? 'all' : 'cash')}
          className={`bg-white border rounded-lg p-4.5 kpi-shadow transition-all cursor-pointer ${
            accountFilter === 'cash'
              ? 'border-amber-600 ring-2 ring-amber-600/20 bg-amber-50/20'
              : 'border-[#c4c5d5]/70 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-xs text-[#475569] uppercase font-semibold">
                  Cash Drawer / Float
                </p>
                <p className={`font-sans text-xl font-bold ${accountStats.cash.balance >= 0 ? 'text-[#191c1e]' : 'text-red-700'}`}>
                  {formatCurrency(accountStats.cash.balance, currency)}
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Cash on Hand
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#006d30] flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 text-[#006d30]" />
              +{formatCurrency(accountStats.cash.inflow, currency)}
            </span>
            <span className="text-red-700 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3 text-red-600" />
              -{formatCurrency(accountStats.cash.outflow, currency)}
            </span>
            <span className="text-slate-400">
              {accountStats.cash.count} txs
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Table Section */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#e2e8f0] pb-3">
          <div>
            <h3 className="font-sans text-lg font-bold text-[#191c1e]">
              General Cashbook Journal
            </h3>
            <p className="font-mono text-xs text-[#475569]">
              Total Inflows (Credits): <span className="text-[#006d30] font-bold">+{formatCurrency(totalInflow, currency)}</span> • Outflows (Debits): <span className="text-[#ba1a1a] font-bold">-{formatCurrency(totalOutflow, currency)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Account Filter Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
              <button
                onClick={() => setAccountFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold ${
                  accountFilter === 'all'
                    ? 'bg-white text-[#191c1e] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Accounts
              </button>
              <button
                onClick={() => setAccountFilter('bank')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold flex items-center gap-1 ${
                  accountFilter === 'bank'
                    ? 'bg-blue-50 text-[#00288e] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3" />
                Bank
              </button>
              <button
                onClick={() => setAccountFilter('mpesa')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold flex items-center gap-1 ${
                  accountFilter === 'mpesa'
                    ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                M-Pesa
              </button>
              <button
                onClick={() => setAccountFilter('cash')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold flex items-center gap-1 ${
                  accountFilter === 'cash'
                    ? 'bg-amber-50 text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3 h-3" />
                Cash
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#00288e] text-white'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
                }`}
              >
                All Entries
              </button>
              <button
                onClick={() => setFilterType('sale')}
                className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer ${
                  filterType === 'sale'
                    ? 'bg-[#006d30] text-white'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
                }`}
              >
                Credits (In)
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer ${
                  filterType === 'expense'
                    ? 'bg-[#ba1a1a] text-white'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
                }`}
              >
                Debits (Out)
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Ledger List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cbd5e1] font-mono text-xs text-[#475569] uppercase bg-[#f8fafc]">
                <th className="py-2.5 px-3">Date & Ref</th>
                <th className="py-2.5 px-3">Description & Category</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3 text-right">Credit / Inflow (+)</th>
                <th className="py-2.5 px-3 text-right">Debit / Outflow (-)</th>
                <th className="py-2.5 px-3 text-right">Running Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] font-sans text-sm">
              {filteredLedger.map((row) => {
                const acct = row.resolvedAccount;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectTransaction(row)}
                    className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3">
                      <p className="font-mono text-xs font-semibold text-[#191c1e]">{row.date}</p>
                      <span className="font-mono text-[10px] text-[#64748b]">{row.referenceNo || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-[#191c1e]">{row.title}</p>
                      <p className="font-mono text-xs text-[#475569]">{row.category}</p>
                    </td>
                    <td className="py-3 px-3">
                      {acct === 'bank' && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#00288e] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          <Building2 className="w-3 h-3" />
                          Bank A/C
                        </span>
                      )}
                      {acct === 'mpesa' && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <Smartphone className="w-3 h-3" />
                          M-Pesa
                        </span>
                      )}
                      {acct === 'cash' && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          <Coins className="w-3 h-3" />
                          Cash Drawer
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#006d30]">
                      {row.type === 'sale' ? `+${formatCurrency(row.amount, currency)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#ba1a1a]">
                      {row.type === 'expense' ? `-${formatCurrency(row.amount, currency)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#00288e]">
                      {formatCurrency(row.runningBalance, currency)}
                    </td>
                  </tr>
                );
              })}

              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748b] font-mono text-xs">
                    No cashbook journal entries found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
