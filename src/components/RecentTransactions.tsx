import React from 'react';
import {
  Coffee,
  Package,
  Briefcase,
  Layers,
  FileText,
  CreditCard,
  Truck,
  Server,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';

interface RecentTransactionsProps {
  transactions: Transaction[];
  currency: string;
  onViewAll: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  currency,
  onViewAll,
  onSelectTransaction,
}) => {
  // Show top 4-5 recent transactions on dashboard
  const displayList = transactions.slice(0, 4);

  const renderIcon = (tx: Transaction) => {
    const isSale = tx.type === 'sale';
    const cat = (tx.category + ' ' + tx.title).toLowerCase();

    if (cat.includes('coffee') || cat.includes('food') || cat.includes('bistro') || cat.includes('meal')) {
      return <Coffee className="w-5 h-5" />;
    }
    if (cat.includes('office') || cat.includes('supplies') || cat.includes('inventory') || cat.includes('equipment')) {
      return <Package className="w-5 h-5" />;
    }
    if (cat.includes('consulting') || cat.includes('service') || cat.includes('design') || cat.includes('retainer')) {
      return <Briefcase className="w-5 h-5" />;
    }
    if (cat.includes('cloud') || cat.includes('tech') || cat.includes('software') || cat.includes('saas')) {
      return <Server className="w-5 h-5" />;
    }
    if (cat.includes('logistics') || cat.includes('delivery') || cat.includes('fedex') || cat.includes('shipping')) {
      return <Truck className="w-5 h-5" />;
    }

    return isSale ? <ArrowUpRight className="w-5 h-5" /> : <Receipt className="w-5 h-5" />;
  };

  return (
    <section
      id="recent-transactions-section"
      className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow"
    >
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#e0e3e5]">
        <h2 className="font-sans text-lg md:text-xl font-bold text-[#191c1e] tracking-tight">
          Recent Transactions
        </h2>
        <button
          id="view-all-transactions-btn"
          onClick={onViewAll}
          className="font-mono text-xs uppercase text-[#00288e] font-bold tracking-wider hover:text-[#1e40af] hover:underline px-2 py-1 rounded transition-colors"
        >
          View All
        </button>
      </div>

      <div className="divide-y divide-[#e0e3e5]/60">
        {displayList.map((tx) => {
          const isSale = tx.type === 'sale';
          return (
            <div
              key={tx.id}
              id={`transaction-row-${tx.id}`}
              onClick={() => onSelectTransaction(tx)}
              className="flex justify-between items-center py-3 px-2 -mx-2 rounded hover:bg-[#f1f5f9] transition-colors cursor-pointer group"
            >
              {/* Left Column: Icon + Description + Metadata */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    isSale
                      ? 'bg-[#00288e]/10 text-[#00288e]'
                      : 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                  }`}
                >
                  {renderIcon(tx)}
                </div>

                <div className="truncate">
                  <p className="font-sans text-sm md:text-base font-semibold text-[#191c1e] truncate group-hover:text-[#00288e] transition-colors">
                    {tx.title}
                  </p>
                  <p className="font-mono text-xs text-[#475569] flex items-center gap-1.5 mt-0.5">
                    <span className="capitalize font-medium">
                      {tx.type === 'sale' ? 'Sale' : 'Expense'}
                    </span>
                    <span>•</span>
                    <span>{tx.time}</span>
                  </p>
                </div>
              </div>

              {/* Right Column: Amount */}
              <div className="text-right shrink-0 pl-3">
                <p
                  className={`font-mono text-sm md:text-base font-bold ${
                    isSale ? 'text-[#006d30]' : 'text-[#ba1a1a]'
                  }`}
                >
                  {isSale ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                </p>
                {tx.paymentMethod && (
                  <span className="font-mono text-[10px] text-[#64748b] uppercase tracking-wider">
                    {tx.paymentMethod.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {displayList.length === 0 && (
          <div className="py-8 text-center text-[#64748b] font-mono text-xs">
            No transactions found. Click + to add your first transaction.
          </div>
        )}
      </div>
    </section>
  );
};
