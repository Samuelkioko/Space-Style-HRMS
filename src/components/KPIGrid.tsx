import React from 'react';
import {
  Banknote,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { KPISummary, TabType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface KPIGridProps {
  kpi: KPISummary;
  currency: string;
  onNavigateTab?: (tab: TabType) => void;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ kpi, currency, onNavigateTab }) => {
  const salesChange = kpi.todaySalesChange ?? 0;
  const expensesChange = kpi.todayExpensesChange ?? 0;
  const profit = kpi.todayProfit ?? (kpi.todaySales - kpi.todayExpenses);
  const profitChange = kpi.todayProfitChange ?? 0;
  const cashChange = kpi.cashBalanceChange ?? 0;

  return (
    <section id="kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      {/* Today's Sales */}
      <div
        id="kpi-card-sales"
        onClick={() => onNavigateTab && onNavigateTab('sales')}
        className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col justify-between h-[126px] cursor-pointer hover:border-[#00288e]/40 transition-all card-hover"
      >
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs md:text-sm tracking-wide text-[#475569] uppercase font-medium">
            Today's Sales
          </h2>
          <div className="w-6 h-6 rounded flex items-center justify-center text-[#00288e]">
            <Banknote className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
        <div>
          <p className="font-sans text-2xl md:text-3xl font-bold text-[#191c1e] tracking-tight">
            {formatCurrency(kpi.todaySales ?? 0, currency)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[#006d30]">
            {salesChange >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 stroke-[2.5] text-[#ba1a1a]" />
            )}
            <span className={`font-mono text-xs font-semibold ${salesChange < 0 ? 'text-[#ba1a1a]' : 'text-[#006d30]'}`}>
              {salesChange >= 0 ? `+${salesChange.toFixed(1)}%` : `${salesChange.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Expenses */}
      <div
        id="kpi-card-expenses"
        onClick={() => onNavigateTab && onNavigateTab('expenses')}
        className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col justify-between h-[126px] cursor-pointer hover:border-[#ba1a1a]/40 transition-all card-hover"
      >
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs md:text-sm tracking-wide text-[#475569] uppercase font-medium">
            Today's Expenses
          </h2>
          <div className="w-6 h-6 rounded flex items-center justify-center text-[#ba1a1a]">
            <Receipt className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
        <div>
          <p className="font-sans text-2xl md:text-3xl font-bold text-[#191c1e] tracking-tight">
            {formatCurrency(kpi.todayExpenses ?? 0, currency)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[#ba1a1a]">
            {expensesChange <= 0 ? (
              <TrendingDown className="w-3.5 h-3.5 stroke-[2.5] text-[#006d30]" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5] text-[#ba1a1a]" />
            )}
            <span className={`font-mono text-xs font-semibold ${expensesChange <= 0 ? 'text-[#006d30]' : 'text-[#ba1a1a]'}`}>
              {expensesChange <= 0 ? `${expensesChange.toFixed(1)}%` : `+${expensesChange.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Profit */}
      <div
        id="kpi-card-profit"
        onClick={() => onNavigateTab && onNavigateTab('cashbook')}
        className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col justify-between h-[126px] cursor-pointer hover:border-[#006d30]/40 transition-all card-hover"
      >
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs md:text-sm tracking-wide text-[#475569] uppercase font-medium">
            Today's Profit
          </h2>
          <div className="w-6 h-6 rounded flex items-center justify-center text-[#006d30]">
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
        <div>
          <p className={`font-sans text-2xl md:text-3xl font-bold tracking-tight ${profit < 0 ? 'text-[#ba1a1a]' : 'text-[#191c1e]'}`}>
            {formatCurrency(profit, currency)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {profitChange >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5] text-[#006d30]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 stroke-[2.5] text-[#ba1a1a]" />
            )}
            <span className={`font-mono text-xs font-semibold ${profitChange >= 0 ? 'text-[#006d30]' : 'text-[#ba1a1a]'}`}>
              {profitChange >= 0 ? `+${profitChange.toFixed(1)}%` : `${profitChange.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Balance */}
      <div
        id="kpi-card-cash-balance"
        onClick={() => onNavigateTab && onNavigateTab('cashbook')}
        className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col justify-between h-[126px] cursor-pointer hover:border-[#00288e]/40 transition-all card-hover"
      >
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs md:text-sm tracking-wide text-[#475569] uppercase font-medium">
            Cash Balance
          </h2>
          <div className="w-6 h-6 rounded flex items-center justify-center text-[#00288e]">
            <Wallet className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
        <div>
          <p className={`font-sans text-2xl md:text-3xl font-bold tracking-tight ${kpi.cashBalance < 0 ? 'text-[#ba1a1a]' : 'text-[#191c1e]'}`}>
            {formatCurrency(kpi.cashBalance ?? 0, currency)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[#475569]">
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="font-mono text-xs font-semibold">
              {cashChange >= 0 ? `+${cashChange.toFixed(1)}%` : `${cashChange.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
