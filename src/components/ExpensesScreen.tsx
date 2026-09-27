import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  ArrowDownRight,
  PieChart,
  Calendar,
  AlertTriangle,
  Tag,
  Lock,
} from 'lucide-react';
import { Transaction, ExpenseCategoryItem, TabType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ExpensesScreenProps {
  transactions: Transaction[];
  currency: string;
  onOpenAddModal: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  expenseCategories?: ExpenseCategoryItem[];
  onNavigateTab?: (tab: TabType) => void;
  isAdminMode?: boolean;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  transactions,
  currency,
  onOpenAddModal,
  onSelectTransaction,
  expenseCategories = [],
  onNavigateTab,
  isAdminMode = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const expenseList = useMemo(() => {
    return transactions.filter((t) => t.type === 'expense');
  }, [transactions]);

  const filteredExpenses = useMemo(() => {
    return expenseList.filter((exp) => {
      const matchSearch =
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.customerOrVendor && exp.customerOrVendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.referenceNo && exp.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || exp.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [expenseList, searchTerm, selectedCategory]);

  const totalExpenses = useMemo(
    () => expenseList.reduce((sum, e) => sum + e.amount, 0),
    [expenseList]
  );

  // Merge configured expense categories with categories found in recorded transactions
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    if (expenseCategories && expenseCategories.length > 0) {
      expenseCategories
        .filter((c) => c.isActive !== false)
        .forEach((c) => set.add(c.name));
    }
    expenseList.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [expenseCategories, expenseList]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenseList.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseList, totalExpenses]);

  return (
    <div id="expenses-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Expense Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
            <span className="font-mono text-xs text-[#ba1a1a] uppercase font-bold tracking-widest">
              Expenses & Outflows
            </span>
          </div>
          <h2 className="font-sans text-xl md:text-2xl font-bold text-[#191c1e] tracking-tight mt-0.5">
            Operating Expenses & Disbursals
          </h2>
          <p className="font-mono text-xs text-[#475569] mt-0.5">
            Tracking overheads, KRA taxes, utilities, payroll, workshop consumables, and operational disbursements
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {isAdminMode ? (
            <button
              id="btn-add-expense"
              onClick={onOpenAddModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#ba1a1a] hover:bg-[#991b1b] text-white px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Expense</span>
            </button>
          ) : (
            <div
              id="staff-expense-restricted-notice"
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-md font-mono text-xs text-slate-600"
              title="Staff roles cannot create new expenses. Expense recording is restricted to Administrators."
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Read-Only (Admin Restricted)</span>
            </div>
          )}
        </div>
      </div>

      {/* Expense Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col justify-between">
          <span className="font-mono text-xs uppercase text-[#475569]">Total Outflows</span>
          <p className="font-sans text-2xl md:text-3xl font-bold text-[#ba1a1a] mt-2">
            -{formatCurrency(totalExpenses, currency)}
          </p>
          <span className="font-mono text-[11px] text-[#64748b] mt-1">
            {expenseList.length} receipts recorded
          </span>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col justify-between">
          <span className="font-mono text-xs uppercase text-[#475569]">Top Expense Category</span>
          <p className="font-sans text-xl md:text-2xl font-bold text-[#191c1e] mt-2 truncate">
            {categoryBreakdown[0]?.category || 'None yet'}
          </p>
          <span className="font-mono text-[11px] text-[#ba1a1a] mt-1 font-semibold">
            {categoryBreakdown[0]?.percent ? `${categoryBreakdown[0].percent.toFixed(0)}% of total burn` : '0% total burn'}
          </span>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow col-span-2 md:col-span-1 flex flex-col justify-between">
          <span className="font-mono text-xs uppercase text-[#475569]">Expense Types Available</span>
          <p className="font-sans text-xl md:text-2xl font-bold text-[#00288e] mt-2">
            {allAvailableCategories.length} <span className="text-xs font-mono text-[#64748b] font-normal">Active</span>
          </p>
          <span className="font-mono text-[11px] text-[#64748b] mt-1">
            System Configured
          </span>
        </div>
      </div>

      {/* Category Progress Breakdown */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow">
        <h3 className="font-sans text-sm font-bold text-[#191c1e] uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Cost Allocation by Category</span>
          <span className="font-mono text-xs font-normal text-[#64748b]">Real-time apportionment</span>
        </h3>
        <div className="space-y-3">
          {categoryBreakdown.slice(0, 5).map((item) => (
            <div key={item.category} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-medium text-[#191c1e]">{item.category}</span>
                <span className="text-[#475569]">
                  {formatCurrency(item.amount, currency)} ({item.percent.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ba1a1a] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.percent, 4)}%` }}
                />
              </div>
            </div>
          ))}

          {categoryBreakdown.length === 0 && (
            <div className="py-6 text-center text-[#64748b] font-mono text-xs">
              No expenses recorded yet. Use "Record New Expense" or quick categories below.
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              id="search-expenses-input"
              type="text"
              placeholder="Search expenses by vendor, title, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#ba1a1a] focus:bg-white transition-all"
            />
          </div>

          {/* Categories Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#ba1a1a] text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
              }`}
            >
              All Categories ({expenseList.length})
            </button>
            {allAvailableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#ba1a1a] text-white shadow-xs'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        <div className="divide-y divide-[#e2e8f0]">
          {filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              onClick={() => onSelectTransaction(exp)}
              className="flex justify-between items-center py-3.5 px-2 hover:bg-[#f8fafc] rounded cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-sans font-semibold text-sm md:text-base text-[#191c1e]">
                      {exp.title}
                    </p>
                    {exp.referenceNo && (
                      <span className="font-mono text-[10px] bg-slate-100 text-[#475569] px-1.5 py-0.5 rounded">
                        {exp.referenceNo}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-[#475569] mt-0.5">
                    {exp.customerOrVendor ? `${exp.customerOrVendor} • ` : ''}
                    <span className="font-semibold text-[#ba1a1a]">{exp.category}</span> • {exp.date} ({exp.time})
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-mono text-base font-bold text-[#ba1a1a]">
                  -{formatCurrency(exp.amount, currency)}
                </p>
                <span className="font-mono text-[10px] text-[#64748b] uppercase">
                  {exp.paymentMethod.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}

          {filteredExpenses.length === 0 && (
            <div className="py-12 text-center text-[#64748b] font-mono text-xs">
              {selectedCategory !== 'all' ? (
                <span>No expense entries logged under "{selectedCategory}". Click "Record New Expense" to add one.</span>
              ) : (
                <span>No expenses found matching "{searchTerm}".</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
