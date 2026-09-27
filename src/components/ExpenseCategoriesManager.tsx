import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldCheck,
  RotateCcw,
  Zap,
  Filter,
  Layers,
} from 'lucide-react';
import { ExpenseCategoryItem } from '../types';

interface ExpenseCategoriesManagerProps {
  categories: ExpenseCategoryItem[];
  onSaveCategory: (item: ExpenseCategoryItem) => Promise<void> | void;
  onDeleteCategory: (id: string) => Promise<void> | void;
  onResetToDefaults: () => Promise<void> | void;
  onQuickLogExpense?: (categoryName: string) => void;
}

export const ExpenseCategoriesManager: React.FC<ExpenseCategoriesManagerProps> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
  onResetToDefaults,
  onQuickLogExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState('');
  const [group, setGroup] = useState('General & Administrative');
  const [description, setDescription] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Open Create
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setGroup('General & Administrative');
    setDescription('');
    setDefaultAmount('');
    setTaxDeductible(true);
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (item: ExpenseCategoryItem) => {
    setEditingCategory(item);
    setName(item.name);
    setGroup(item.group || 'General & Administrative');
    setDescription(item.description || '');
    setDefaultAmount(item.defaultAmount ? item.defaultAmount.toString() : '');
    setTaxDeductible(item.taxDeductible !== false);
    setIsActive(item.isActive !== false);
    setIsModalOpen(true);
  };

  // Save / Update
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide an expense category name.');
      return;
    }

    setIsSaving(true);
    const itemToSave: ExpenseCategoryItem = {
      id: editingCategory ? editingCategory.id : `exp-cat-${Date.now()}`,
      name: name.trim(),
      group: group.trim() || 'General & Administrative',
      description: description.trim() || undefined,
      defaultAmount: defaultAmount.trim() ? parseFloat(defaultAmount) : undefined,
      taxDeductible,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveCategory(itemToSave);
      setIsModalOpen(false);
      setFeedbackMsg(`Expense category "${itemToSave.name}" saved successfully.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(`Error saving expense category: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string, catName: string) => {
    try {
      await onDeleteCategory(id);
      setConfirmDeleteId(null);
      setFeedbackMsg(`Removed "${catName}" from expense categories.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Error deleting expense category:', err);
    }
  };

  // Groups list
  const uniqueGroups = Array.from(new Set(categories.map((c) => c.group).filter(Boolean)));

  // Filtered categories
  const filteredCategories = categories.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.group && item.group.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGroup = selectedGroup === 'all' || item.group === selectedGroup;
    return matchSearch && matchGroup;
  });

  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const taxDeductibleCount = categories.filter((c) => c.taxDeductible !== false).length;

  return (
    <div id="expense-categories-manager" className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-[#006d30] px-4 py-3 rounded-lg flex items-center gap-2 font-mono text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 md:p-6 kpi-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
            <span className="font-mono text-xs text-[#ba1a1a] uppercase font-bold tracking-widest">
              Expense Accounts & Types Master List
            </span>
          </div>
          <h3 className="font-sans text-xl font-bold text-[#191c1e] tracking-tight mt-1">
            Standard Operating & Production Expense Categories
          </h3>
          <p className="font-mono text-xs text-[#475569] mt-0.5">
            Pre-configure expense categories (e.g. Lunch, KRA payment, Accountant, Electricity, Airtime, Powder coating, Internet). These instantly appear in the Expenses tab.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 bg-[#ba1a1a] hover:bg-[#991b1b] text-white px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense Category</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Configured Categories</span>
          <p className="font-sans text-2xl font-bold text-[#191c1e] mt-1">
            {categories.length} <span className="text-xs font-mono text-[#64748b] font-normal">Accounts</span>
          </p>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Active in Expense Entry</span>
          <p className="font-sans text-2xl font-bold text-[#006d30] mt-1">
            {activeCount} <span className="text-xs font-mono text-[#64748b] font-normal">Available</span>
          </p>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Tax Deductibles</span>
          <p className="font-sans text-2xl font-bold text-[#00288e] mt-1">
            {taxDeductibleCount} <span className="text-xs font-mono text-[#64748b] font-normal">Compliant</span>
          </p>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Account Groups</span>
          <p className="font-sans text-2xl font-bold text-[#191c1e] mt-1">
            {uniqueGroups.length} <span className="text-xs font-mono text-[#64748b] font-normal">Cost Centers</span>
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search category, group, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#ba1a1a]"
          />
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              selectedGroup === 'all'
                ? 'bg-[#ba1a1a] text-white'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
            }`}
          >
            All Groups ({categories.length})
          </button>
          {uniqueGroups.map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                selectedGroup === grp
                  ? 'bg-[#ba1a1a] text-white'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg overflow-hidden kpi-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#cbd5e1] font-mono text-[11px] text-[#475569] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Expense Category & Name</th>
                <th className="py-3 px-4">Cost Center Group</th>
                <th className="py-3 px-4">Operational Scope / Purpose</th>
                <th className="py-3 px-4 text-center">Tax Compliant</th>
                <th className="py-3 px-4 text-center">Active in Expenses</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#64748b] font-mono">
                    No expense categories found matching your query.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#191c1e] text-sm flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#ba1a1a] flex-shrink-0" />
                        <span className="text-[#191c1e]">{item.name}</span>
                      </div>
                    </td>

                    {/* Group */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-rose-50 text-[#ba1a1a] border border-rose-200">
                        {item.group || 'General'}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 font-mono text-[#475569] text-[11px] max-w-sm">
                      {item.description || 'General expense entry for operations.'}
                    </td>

                    {/* Tax Deductible */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          item.taxDeductible !== false
                            ? 'bg-emerald-50 text-[#006d30] border border-emerald-200'
                            : 'bg-slate-100 text-[#64748b]'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {item.taxDeductible !== false ? 'Deductible' : 'Non-Deductible'}
                      </span>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          item.isActive !== false ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'
                        }`}
                        title={item.isActive !== false ? 'Active for expense entry' : 'Inactive'}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onQuickLogExpense && (
                          <button
                            type="button"
                            onClick={() => onQuickLogExpense(item.name)}
                            className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-[#ba1a1a] hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                            title="Log expense with this category"
                          >
                            + Log
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-[#00288e] hover:bg-blue-100/60 rounded-md transition-colors cursor-pointer"
                          title="Edit expense category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                            >
                              Delete?
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-mono cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 text-[#ba1a1a] hover:bg-red-100/60 rounded-md transition-colors cursor-pointer"
                            title="Delete expense category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Reset Action */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#cbd5e1] flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="font-mono text-xs text-[#64748b]">
            Showing {filteredCategories.length} of {categories.length} configured expense types
          </span>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-red-600 font-bold">Reset to 15 standard presets?</span>
              <button
                type="button"
                onClick={async () => {
                  await onResetToDefaults();
                  setConfirmReset(false);
                  setFeedbackMsg('Expense categories restored to standard presets.');
                  setTimeout(() => setFeedbackMsg(null), 3000);
                }}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-mono font-bold cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 text-xs font-mono text-[#64748b] hover:text-[#ba1a1a] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Standard Preset Expenses (15 items)</span>
            </button>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#ba1a1a]" />
                <h3 className="font-sans text-lg font-bold text-[#191c1e]">
                  {editingCategory ? 'Edit Expense Category' : 'Create Expense Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 font-sans text-xs">
              {/* Category Name */}
              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                  Expense Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch, KRA payment, Airtime, Electricity, Powder coating..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/20 font-medium"
                />
              </div>

              {/* Group / Cost Center */}
              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                  Cost Center / Group *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Staff & Welfare, Utilities, Taxes & Compliance, Production & Finishing..."
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#ba1a1a]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                  Operational Purpose & Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what this expense covers (e.g. team meals, utility bills, tax returns)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#ba1a1a]"
                />
              </div>

              {/* Tax Deductible & Status Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxDeductible}
                    onChange={(e) => setTaxDeductible(e.target.checked)}
                    className="rounded text-[#006d30] focus:ring-[#006d30] w-4 h-4"
                  />
                  <span className="font-mono text-xs text-[#191c1e] font-semibold">
                    Tax Deductible
                  </span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#00288e] focus:ring-[#00288e] w-4 h-4"
                  />
                  <span className="font-mono text-xs text-[#191c1e] font-semibold">
                    Active in Entry Dropdown
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#cbd5e1] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs uppercase font-semibold text-[#64748b] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-mono uppercase font-bold text-white bg-[#ba1a1a] hover:bg-[#991b1b] active:scale-95 rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Expense Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
