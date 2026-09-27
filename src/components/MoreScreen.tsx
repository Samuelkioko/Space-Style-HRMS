import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Globe,
  Building,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Check,
  TrendingUp,
  FileText,
  BarChart3,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Transaction, TabType, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';

interface MoreScreenProps {
  currency: string;
  onCurrencyChange: (c: string) => void;
  transactions: Transaction[];
  onResetData: () => void;
  onImportData: (data: Transaction[]) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  currency,
  onCurrencyChange,
  transactions,
  onResetData,
  onImportData,
  onNavigateTab,
}) => {
  const [businessName, setBusinessName] = useState('Executive Ledger Kenya Ltd');
  const [taxId, setTaxId] = useState('KRA PIN P051239841K');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'Title', 'Type', 'Category', 'Amount', 'Payment Method', 'Customer/Vendor', 'Reference', 'Notes'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.time,
      `"${t.title.replace(/"/g, '""')}"`,
      t.type,
      `"${t.category}"`,
      t.amount,
      t.paymentMethod,
      `"${t.customerOrVendor || ''}"`,
      t.referenceNo || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `executive-ledger-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFullPDF = () => {
    const totalSales = transactions.filter((t) => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const salesCount = transactions.filter((t) => t.type === 'sale').length;
    const expenseCount = transactions.filter((t) => t.type === 'expense').length;
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    const salesCategoriesMap: Record<string, number> = {};
    const expenseCategoriesMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'sale') {
        salesCategoriesMap[tx.category] = (salesCategoriesMap[tx.category] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        expenseCategoriesMap[tx.category] = (expenseCategoriesMap[tx.category] || 0) + tx.amount;
      }
    });

    const sortedSalesCategories = Object.entries(salesCategoriesMap)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percent: totalSales > 0 ? (amount / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedExpenseCategories = Object.entries(expenseCategoriesMap)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    generateAndDownloadPDF({
      businessName,
      taxId,
      periodTitle: 'Complete Cumulative Financial Statement',
      periodType: 'yearly',
      currency,
      stats: {
        totalSales,
        totalExpenses,
        netProfit,
        profitMargin,
        totalTransactions: transactions.length,
        salesCount,
        expenseCount,
        avgSale: salesCount > 0 ? totalSales / salesCount : 0,
        avgExpense: expenseCount > 0 ? totalExpenses / expenseCount : 0,
        sortedSalesCategories,
        sortedExpenseCategories,
      },
      transactions,
    });
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `executive-ledger-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportData(parsed);
            alert('Ledger restored successfully!');
          }
        } catch (err) {
          alert('Invalid JSON file format.');
        }
      };
    }
  };

  const saveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div id="more-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow">
        <h2 className="font-sans text-xl md:text-2xl font-bold text-[#191c1e] tracking-tight">
          Executive Settings & Accounting Reports
        </h2>
        <p className="font-mono text-xs text-[#475569] mt-1">
          Export tax journals, configure global currency, business entity metadata, and audit backups
        </p>
      </div>

      {/* Direct Report Generator Launcher */}
      <div className="bg-linear-to-r from-[#00288e] to-[#1e40af] rounded-lg p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-base md:text-lg text-white">
              Financial Statement Generator
            </h3>
            <p className="font-mono text-xs text-blue-100 mt-0.5">
              Daily, Weekly, Monthly, and Annual P&L reporting with category breakdowns, print-ready sheets & CSV exports
            </p>
          </div>
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-2 bg-white text-[#00288e] hover:bg-blue-50 px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <span>Launch Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Financial Reports Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-[#191c1e]">
                Export Financial Statements
              </h3>
              <p className="font-mono text-xs text-[#475569] mt-0.5">
                Download printable PDF audit reports or CSV spreadsheets for Excel & QuickBooks.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExportFullPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Full PDF Statement</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] py-2.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#00288e]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#006d30] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-[#191c1e]">
                Backup & Restore (.JSON)
              </h3>
              <p className="font-mono text-xs text-[#475569] mt-0.5">
                Download a complete cryptographic snapshot of transactions or import existing records.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] py-2.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] py-2.5 rounded-md font-mono text-xs uppercase font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Preferences & Configuration */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow space-y-5">
        <h3 className="font-sans font-bold text-base text-[#191c1e] border-b border-[#e2e8f0] pb-2">
          Ledger Configuration & Entity Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
              Base Currency Symbol
            </label>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
            >
              <option value="KES">KES (KSh) - Kenyan Shilling</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="CAD">CAD (CA$) - Canadian Dollar</option>
              <option value="AUD">AUD (AU$) - Australian Dollar</option>
              <option value="JPY">JPY (¥) - Japanese Yen</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
              Legal Business Entity
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
              Tax ID / VAT Registration
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
              Accounting Basis
            </label>
            <input
              type="text"
              disabled
              value="Accrual & Cash Standard (US GAAP / IFRS)"
              className="w-full px-3 py-2 bg-[#f1f5f9] border border-[#cbd5e1] rounded-md font-mono text-xs text-[#64748b]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#e2e8f0]">
          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 text-[#ba1a1a] hover:bg-red-50 px-3 py-2 rounded font-mono text-xs uppercase font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Ledger</span>
          </button>

          <button
            onClick={saveSettings}
            className="flex items-center gap-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white px-5 py-2 rounded font-mono text-xs uppercase font-bold transition-all shadow-xs"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
            <span>{savedSuccess ? 'Settings Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
