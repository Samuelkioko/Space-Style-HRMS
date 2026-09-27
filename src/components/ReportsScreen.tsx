import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  BarChart3,
  Download,
  Printer,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  Banknote,
  FileSpreadsheet,
  PieChart,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { generateAndDownloadPDF, openPrintableReportHTML, PDFExportOptions } from '../utils/pdfGenerator';

export type ReportPeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportsScreenProps {
  transactions: Transaction[];
  currency: string;
  onSelectTransaction?: (tx: Transaction) => void;
  businessName?: string;
  taxId?: string;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  transactions,
  currency,
  onSelectTransaction,
  businessName = 'Executive Ledger Kenya Ltd',
  taxId = 'KRA PIN P051239841K',
}) => {
  const [periodType, setPeriodType] = useState<ReportPeriodType>('monthly');

  // Selected date states
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr); // For daily
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(todayStr); // Any date within the selected week
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [copied, setCopied] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Month names
  const monthNames = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    []
  );

  // Helper to calculate week start (Monday) and week end (Sunday)
  const weekRange = useMemo(() => {
    const d = new Date(selectedWeekDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatYMD = (date: Date) => date.toISOString().split('T')[0];
    return {
      start: formatYMD(monday),
      end: formatYMD(sunday),
      startDate: monday,
      endDate: sunday,
    };
  }, [selectedWeekDate]);

  // Filter transactions based on active period type
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (periodType === 'daily') {
        return tx.date === selectedDate;
      }
      if (periodType === 'weekly') {
        return tx.date >= weekRange.start && tx.date <= weekRange.end;
      }
      if (periodType === 'monthly') {
        const txDate = new Date(tx.date);
        return (
          txDate.getFullYear() === selectedMonthYear &&
          txDate.getMonth() === selectedMonth
        );
      }
      if (periodType === 'yearly') {
        const txDate = new Date(tx.date);
        return txDate.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [transactions, periodType, selectedDate, weekRange, selectedMonth, selectedMonthYear, selectedYear]);

  // Period label title
  const periodTitle = useMemo(() => {
    if (periodType === 'daily') {
      const d = new Date(selectedDate);
      return `Daily Financial Report — ${d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;
    }
    if (periodType === 'weekly') {
      const startFormatted = weekRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFormatted = weekRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `Weekly Financial Report — (${startFormatted} – ${endFormatted})`;
    }
    if (periodType === 'monthly') {
      return `Monthly Financial Statement — ${monthNames[selectedMonth]} ${selectedMonthYear}`;
    }
    if (periodType === 'yearly') {
      return `Annual Financial Statement — Calendar Year ${selectedYear}`;
    }
    return 'Financial Report';
  }, [periodType, selectedDate, weekRange, selectedMonth, selectedMonthYear, selectedYear, monthNames]);

  // Core Financial Aggregations
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalExpenses = 0;
    let salesCount = 0;
    let expenseCount = 0;

    const paymentMethodsMap: Record<PaymentMethod, number> = {
      mobile_money: 0,
      bank_transfer: 0,
      card: 0,
      cash: 0,
      online: 0,
    };

    const salesCategoriesMap: Record<string, number> = {};
    const expenseCategoriesMap: Record<string, number> = {};

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'sale') {
        totalSales += tx.amount;
        salesCount += 1;
        salesCategoriesMap[tx.category] = (salesCategoriesMap[tx.category] || 0) + tx.amount;
        if (tx.paymentMethod) {
          paymentMethodsMap[tx.paymentMethod] = (paymentMethodsMap[tx.paymentMethod] || 0) + tx.amount;
        }
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
        expenseCount += 1;
        expenseCategoriesMap[tx.category] = (expenseCategoriesMap[tx.category] || 0) + tx.amount;
      }
    });

    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const totalTransactions = filteredTransactions.length;
    const avgSale = salesCount > 0 ? totalSales / salesCount : 0;
    const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

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

    return {
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      totalTransactions,
      salesCount,
      expenseCount,
      avgSale,
      avgExpense,
      paymentMethodsMap,
      sortedSalesCategories,
      sortedExpenseCategories,
    };
  }, [filteredTransactions]);

  // Weekly Sub-Days Breakdown
  const weeklyDayBreakdown = useMemo(() => {
    if (periodType !== 'weekly') return [];
    const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = [];
    const start = new Date(weekRange.startDate);

    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const dateStr = cur.toISOString().split('T')[0];

      const dayTxs = filteredTransactions.filter((t) => t.date === dateStr);
      const daySales = dayTxs.filter((t) => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const dayExpenses = dayTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const dayProfit = daySales - dayExpenses;

      days.push({
        dayName: dayNamesShort[i],
        dateStr,
        formatted: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: daySales,
        expenses: dayExpenses,
        profit: dayProfit,
        txCount: dayTxs.length,
      });
    }
    return days;
  }, [periodType, weekRange, filteredTransactions]);

  // Monthly Sub-Weeks Breakdown
  const monthlyWeekBreakdown = useMemo(() => {
    if (periodType !== 'monthly') return [];
    const weeks: { weekLabel: string; sales: number; expenses: number; profit: number; count: number }[] = [
      { weekLabel: 'Days 1 – 7', sales: 0, expenses: 0, profit: 0, count: 0 },
      { weekLabel: 'Days 8 – 14', sales: 0, expenses: 0, profit: 0, count: 0 },
      { weekLabel: 'Days 15 – 21', sales: 0, expenses: 0, profit: 0, count: 0 },
      { weekLabel: 'Days 22 – 28', sales: 0, expenses: 0, profit: 0, count: 0 },
      { weekLabel: 'Days 29 – 31', sales: 0, expenses: 0, profit: 0, count: 0 },
    ];

    filteredTransactions.forEach((tx) => {
      const dayNum = parseInt(tx.date.split('-')[2], 10);
      let idx = 0;
      if (dayNum <= 7) idx = 0;
      else if (dayNum <= 14) idx = 1;
      else if (dayNum <= 21) idx = 2;
      else if (dayNum <= 28) idx = 3;
      else idx = 4;

      if (tx.type === 'sale') weeks[idx].sales += tx.amount;
      else if (tx.type === 'expense') weeks[idx].expenses += tx.amount;
      weeks[idx].count += 1;
    });

    weeks.forEach((w) => {
      w.profit = w.sales - w.expenses;
    });

    return weeks;
  }, [periodType, filteredTransactions]);

  // Yearly 12-Month Breakdown
  const yearlyMonthBreakdown = useMemo(() => {
    if (periodType !== 'yearly') return [];
    return monthNames.map((name, idx) => {
      const mNum = (idx + 1).toString().padStart(2, '0');
      const prefix = `${selectedYear}-${mNum}`;
      const monthTxs = filteredTransactions.filter((t) => t.date.startsWith(prefix));

      const sales = monthTxs.filter((t) => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const profit = sales - expenses;
      const margin = sales > 0 ? (profit / sales) * 100 : 0;

      return {
        monthName: name,
        monthShort: name.substring(0, 3),
        sales,
        expenses,
        profit,
        margin,
        count: monthTxs.length,
      };
    });
  }, [periodType, selectedYear, filteredTransactions, monthNames]);

  // Helper to compile full PDF & Statement options
  const getExportOptions = (): PDFExportOptions => {
    let breakdownRows;
    let breakdownTitle;

    if (periodType === 'weekly') {
      breakdownTitle = '7-Day Breakdown for this Week';
      breakdownRows = weeklyDayBreakdown.map((d) => ({
        label: `${d.dayName} (${d.formatted})`,
        sales: d.sales,
        expenses: d.expenses,
        profit: d.profit,
        count: d.txCount,
      }));
    } else if (periodType === 'monthly') {
      breakdownTitle = `Weekly Tranches for ${monthNames[selectedMonth]} ${selectedMonthYear}`;
      breakdownRows = monthlyWeekBreakdown.map((w) => ({
        label: w.weekLabel,
        sales: w.sales,
        expenses: w.expenses,
        profit: w.profit,
        count: w.count,
      }));
    } else if (periodType === 'yearly') {
      breakdownTitle = `Annual 12-Month Statement for FY ${selectedYear}`;
      breakdownRows = yearlyMonthBreakdown.map((m) => ({
        label: m.monthName,
        sales: m.sales,
        expenses: m.expenses,
        profit: m.profit,
        count: m.count,
        margin: m.margin,
      }));
    }

    return {
      businessName,
      taxId,
      periodTitle,
      periodType,
      currency,
      stats,
      transactions: filteredTransactions,
      breakdownRows,
      breakdownTitle,
    };
  };

  // Actions
  const handleDownloadPDF = () => {
    try {
      setIsExportingPDF(true);
      const options = getExportOptions();
      generateAndDownloadPDF(options);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 800);
    }
  };

  const handlePrintableStatement = () => {
    try {
      const options = getExportOptions();
      openPrintableReportHTML(options);
    } catch (err) {
      console.error('Printable statement error, falling back to window.print:', err);
      window.print();
    }
  };

  const handleExportPeriodCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'Title', 'Type', 'Category', 'Amount (KES)', 'Payment Method', 'Customer/Vendor', 'Reference', 'Notes'];
    const rows = filteredTransactions.map((t) => [
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

    const periodFilename = `${periodType}-report-${new Date().toISOString().split('T')[0]}`;
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${periodFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const summaryText = `
${businessName} — ${periodTitle}
Tax PIN: ${taxId}
Generated on: ${new Date().toLocaleString()}
--------------------------------------------------
Total Revenue (Sales): ${formatCurrency(stats.totalSales, currency)}
Total Expenses: ${formatCurrency(stats.totalExpenses, currency)}
Net Profit / (Loss): ${formatCurrency(stats.netProfit, currency)}
Operating Margin: ${stats.profitMargin >= 0 ? '+' : ''}${stats.profitMargin.toFixed(1)}%
Total Transactions Recorded: ${stats.totalTransactions}
Avg Sale Ticket: ${formatCurrency(stats.avgSale, currency)}
--------------------------------------------------
`.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Date Navigation Helpers
  const shiftDay = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const shiftWeek = (weeks: number) => {
    const cur = new Date(selectedWeekDate);
    cur.setDate(cur.getDate() + weeks * 7);
    setSelectedWeekDate(cur.toISOString().split('T')[0]);
  };

  const shiftMonth = (months: number) => {
    let newM = selectedMonth + months;
    let newY = selectedMonthYear;
    if (newM > 11) {
      newM = 0;
      newY += 1;
    } else if (newM < 0) {
      newM = 11;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedMonthYear(newY);
  };

  const shiftYear = (years: number) => {
    setSelectedYear((prev) => prev + years);
  };

  return (
    <div id="reports-screen" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 md:p-6 kpi-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00288e]" />
            <h2 className="font-sans text-xl md:text-2xl font-bold text-[#191c1e] tracking-tight">
              Financial Reporting & Statements
            </h2>
          </div>
          <p className="font-mono text-xs text-[#475569] mt-1">
            Generate formal Daily, Weekly, Monthly, and Annual statements for tax filing & executive review
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            id="report-copy-btn"
            onClick={handleCopySummary}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
            title="Copy formatted summary to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-[#006d30]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            id="report-csv-btn"
            onClick={handleExportPeriodCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
            title="Download CSV for this period"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00288e]" />
            <span>Export CSV</span>
          </button>

          <button
            id="report-pdf-download-btn"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Generate and download official PDF report"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPDF ? 'Generating...' : 'Download PDF'}</span>
          </button>

          <button
            id="report-print-btn"
            onClick={handlePrintableStatement}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f1f5f9] hover:bg-slate-200 text-[#191c1e] rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
            title="Open printable document in new window"
          >
            <Printer className="w-4 h-4 text-[#00288e]" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Period Selection Controls (Daily, Weekly, Monthly, Yearly) */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-5 kpi-shadow space-y-4 no-print">
        {/* Period Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]">
          <button
            id="tab-period-daily"
            onClick={() => setPeriodType('daily')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
              periodType === 'daily'
                ? 'bg-white text-[#00288e] shadow-xs border border-blue-200'
                : 'text-[#475569] hover:text-[#191c1e]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily</span>
          </button>

          <button
            id="tab-period-weekly"
            onClick={() => setPeriodType('weekly')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
              periodType === 'weekly'
                ? 'bg-white text-[#00288e] shadow-xs border border-blue-200'
                : 'text-[#475569] hover:text-[#191c1e]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Weekly</span>
          </button>

          <button
            id="tab-period-monthly"
            onClick={() => setPeriodType('monthly')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
              periodType === 'monthly'
                ? 'bg-white text-[#00288e] shadow-xs border border-blue-200'
                : 'text-[#475569] hover:text-[#191c1e]'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Monthly</span>
          </button>

          <button
            id="tab-period-yearly"
            onClick={() => setPeriodType('yearly')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
              periodType === 'yearly'
                ? 'bg-white text-[#00288e] shadow-xs border border-blue-200'
                : 'text-[#475569] hover:text-[#191c1e]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Yearly</span>
          </button>
        </div>

        {/* Date Filter Adjuster Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e2e8f0]">
          {/* DAILY Controls */}
          {periodType === 'daily' && (
            <div className="flex flex-wrap items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftDay(-1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-[#94a3b8] rounded font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
                <button
                  onClick={() => shiftDay(1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#00288e] rounded font-mono text-xs uppercase font-bold border border-blue-200 cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setSelectedDate(y.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 bg-[#f1f5f9] hover:bg-slate-200 text-[#475569] rounded font-mono text-xs uppercase font-semibold cursor-pointer"
                >
                  Yesterday
                </button>
              </div>
            </div>
          )}

          {/* WEEKLY Controls */}
          {periodType === 'weekly' && (
            <div className="flex flex-wrap items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftWeek(-1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-sm font-bold text-[#191c1e] bg-slate-100 px-3 py-1.5 rounded border border-[#cbd5e1]">
                  {weekRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  onClick={() => shiftWeek(1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedWeekDate(todayStr)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#00288e] rounded font-mono text-xs uppercase font-bold border border-blue-200 cursor-pointer"
                >
                  Current Week
                </button>
              </div>
            </div>
          )}

          {/* MONTHLY Controls */}
          {periodType === 'monthly' && (
            <div className="flex flex-wrap items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 bg-white border border-[#94a3b8] rounded font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                >
                  {monthNames.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 bg-white border border-[#94a3b8] rounded font-mono text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth());
                    setSelectedMonthYear(now.getFullYear());
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#00288e] rounded font-mono text-xs uppercase font-bold border border-blue-200 cursor-pointer"
                >
                  This Month
                </button>
              </div>
            </div>
          )}

          {/* YEARLY Controls */}
          {periodType === 'yearly' && (
            <div className="flex flex-wrap items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftYear(-1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-4 py-1.5 bg-white border border-[#94a3b8] rounded font-mono text-base font-bold text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                >
                  {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y}>
                      Fiscal Year {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => shiftYear(1)}
                  className="p-2 bg-[#f1f5f9] hover:bg-slate-200 rounded border border-[#cbd5e1] text-[#191c1e] cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedYear(new Date().getFullYear())}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#00288e] rounded font-mono text-xs uppercase font-bold border border-blue-200 cursor-pointer"
                >
                  Current Year
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formal Statement Header (For Screen & Print) */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-6 kpi-shadow space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-[#e2e8f0] gap-2">
          <div>
            <span className="font-mono text-[11px] text-[#64748b] uppercase tracking-wider">
              {businessName}
            </span>
            <h3 className="font-sans text-lg md:text-xl font-bold text-[#00288e]">
              {periodTitle}
            </h3>
          </div>
          <div className="text-left sm:text-right font-mono text-xs text-[#64748b]">
            <p>Tax Registration: <span className="font-bold text-[#191c1e]">{taxId}</span></p>
            <p>Currency: <span className="font-bold text-[#191c1e]">{currency} ({getCurrencySymbol(currency).trim()})</span></p>
          </div>
        </div>

        {/* Top KPI Metrics Grid for the Period */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Revenue */}
          <div className="bg-[#f8fafc] border border-emerald-200/80 rounded-lg p-4">
            <span className="font-mono text-xs uppercase text-[#006d30] font-bold flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              Gross Revenue
            </span>
            <p className="font-sans text-xl md:text-2xl font-bold text-[#006d30] mt-1.5">
              {formatCurrency(stats.totalSales, currency)}
            </p>
            <span className="font-mono text-[11px] text-[#64748b] mt-1 block">
              {stats.salesCount} sales invoices
            </span>
          </div>

          {/* Expenses */}
          <div className="bg-[#f8fafc] border border-red-200/80 rounded-lg p-4">
            <span className="font-mono text-xs uppercase text-[#ba1a1a] font-bold flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" />
              Total Expenses
            </span>
            <p className="font-sans text-xl md:text-2xl font-bold text-[#ba1a1a] mt-1.5">
              {formatCurrency(stats.totalExpenses, currency)}
            </p>
            <span className="font-mono text-[11px] text-[#64748b] mt-1 block">
              {stats.expenseCount} disbursements
            </span>
          </div>

          {/* Net Profit */}
          <div
            className={`border rounded-lg p-4 ${
              stats.netProfit >= 0
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-red-50/50 border-red-300'
            }`}
          >
            <span
              className={`font-mono text-xs uppercase font-bold flex items-center gap-1.5 ${
                stats.netProfit >= 0 ? 'text-[#006d30]' : 'text-[#ba1a1a]'
              }`}
            >
              {stats.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Net Operating Profit
            </span>
            <p
              className={`font-sans text-xl md:text-2xl font-bold mt-1.5 ${
                stats.netProfit >= 0 ? 'text-[#006d30]' : 'text-[#ba1a1a]'
              }`}
            >
              {formatCurrency(stats.netProfit, currency)}
            </p>
            <span className="font-mono text-[11px] text-[#64748b] mt-1 block">
              Operating Margin: <span className="font-bold text-[#191c1e]">{stats.profitMargin.toFixed(1)}%</span>
            </span>
          </div>

          {/* Volume */}
          <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-lg p-4">
            <span className="font-mono text-xs uppercase text-[#475569] font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#00288e]" />
              Total Volume
            </span>
            <p className="font-sans text-xl md:text-2xl font-bold text-[#191c1e] mt-1.5">
              {stats.totalTransactions}
            </p>
            <span className="font-mono text-[11px] text-[#64748b] mt-1 block">
              Avg ticket: {formatCurrency(stats.avgSale, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* PERIOD BREAKDOWN VIEW (Sub-Tables & Graphs based on Period) */}

      {/* 1. WEEKLY SUB-TABLE */}
      {periodType === 'weekly' && (
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow space-y-3">
          <h4 className="font-sans text-base font-bold text-[#191c1e] flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#00288e]" />
            7-Day Breakdown for this Week
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] font-mono text-[11px] text-[#475569] uppercase">
                  <th className="py-2.5 px-3">Day / Date</th>
                  <th className="py-2.5 px-3 text-right">Revenue (Sales)</th>
                  <th className="py-2.5 px-3 text-right">Disbursements (Expenses)</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                  <th className="py-2.5 px-3 text-center">Tx Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] font-mono text-xs">
                {weeklyDayBreakdown.map((d) => (
                  <tr key={d.dateStr} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[#191c1e] mr-2">{d.dayName}</span>
                      <span className="text-[#64748b] text-[11px]">{d.formatted}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#006d30]">
                      {d.sales > 0 ? formatCurrency(d.sales, currency) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#ba1a1a]">
                      {d.expenses > 0 ? formatCurrency(d.expenses, currency) : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        d.profit > 0 ? 'text-[#006d30]' : d.profit < 0 ? 'text-[#ba1a1a]' : 'text-[#64748b]'
                      }`}
                    >
                      {d.profit !== 0 ? formatCurrency(d.profit, currency) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#64748b]">{d.txCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. MONTHLY SUB-TABLE */}
      {periodType === 'monthly' && (
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow space-y-3">
          <h4 className="font-sans text-base font-bold text-[#191c1e] flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#00288e]" />
            Weekly Tranches for {monthNames[selectedMonth]} {selectedMonthYear}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] font-mono text-[11px] text-[#475569] uppercase">
                  <th className="py-2.5 px-3">Tranche</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                  <th className="py-2.5 px-3 text-center">Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] font-mono text-xs">
                {monthlyWeekBreakdown.map((w, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#191c1e]">{w.weekLabel}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#006d30]">
                      {w.sales > 0 ? formatCurrency(w.sales, currency) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#ba1a1a]">
                      {w.expenses > 0 ? formatCurrency(w.expenses, currency) : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        w.profit > 0 ? 'text-[#006d30]' : w.profit < 0 ? 'text-[#ba1a1a]' : 'text-[#64748b]'
                      }`}
                    >
                      {w.profit !== 0 ? formatCurrency(w.profit, currency) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#64748b]">{w.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. YEARLY 12-MONTH STATEMENT */}
      {periodType === 'yearly' && (
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow space-y-3">
          <h4 className="font-sans text-base font-bold text-[#191c1e] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00288e]" />
            Annual 12-Month Financial Statement for FY {selectedYear}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] font-mono text-[11px] text-[#475569] uppercase">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-right">Revenue (Sales)</th>
                  <th className="py-2.5 px-3 text-right">Operational Burn</th>
                  <th className="py-2.5 px-3 text-right">Net Profit / (Loss)</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                  <th className="py-2.5 px-3 text-center">Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] font-mono text-xs">
                {yearlyMonthBreakdown.map((m) => (
                  <tr key={m.monthName} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#191c1e]">{m.monthName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#006d30]">
                      {m.sales > 0 ? formatCurrency(m.sales, currency) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#ba1a1a]">
                      {m.expenses > 0 ? formatCurrency(m.expenses, currency) : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        m.profit > 0 ? 'text-[#006d30]' : m.profit < 0 ? 'text-[#ba1a1a]' : 'text-[#64748b]'
                      }`}
                    >
                      {m.profit !== 0 ? formatCurrency(m.profit, currency) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#64748b]">
                      {m.sales > 0 ? `${m.margin >= 0 ? '+' : ''}${m.margin.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#64748b]">{m.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#191c1e] font-mono text-xs font-bold bg-[#f8fafc]">
                <tr>
                  <td className="py-3 px-3 uppercase text-[#191c1e]">Total Fiscal Year</td>
                  <td className="py-3 px-3 text-right text-[#006d30]">{formatCurrency(stats.totalSales, currency)}</td>
                  <td className="py-3 px-3 text-right text-[#ba1a1a]">{formatCurrency(stats.totalExpenses, currency)}</td>
                  <td className={`py-3 px-3 text-right ${stats.netProfit >= 0 ? 'text-[#006d30]' : 'text-[#ba1a1a]'}`}>
                    {formatCurrency(stats.netProfit, currency)}
                  </td>
                  <td className="py-3 px-3 text-right">{stats.profitMargin.toFixed(1)}%</td>
                  <td className="py-3 px-3 text-center">{stats.totalTransactions}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Category Allocation & Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales by Category */}
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow space-y-4">
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-2">
            <h4 className="font-sans text-sm font-bold text-[#191c1e] flex items-center gap-2">
              <Banknote className="w-4 h-4 text-[#006d30]" />
              Revenue Breakdown by Category
            </h4>
            <span className="font-mono text-xs font-bold text-[#006d30]">
              {formatCurrency(stats.totalSales, currency)}
            </span>
          </div>

          <div className="space-y-3">
            {stats.sortedSalesCategories.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#191c1e] font-medium">{c.category}</span>
                  <span className="text-[#006d30] font-bold">
                    {formatCurrency(c.amount, currency)} ({c.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#006d30] rounded-full transition-all duration-300"
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </div>
            ))}

            {stats.sortedSalesCategories.length === 0 && (
              <p className="font-mono text-xs text-[#64748b] text-center py-4">
                No revenue recorded in this period.
              </p>
            )}
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow space-y-4">
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-2">
            <h4 className="font-sans text-sm font-bold text-[#191c1e] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#ba1a1a]" />
              Expense Burn by Category
            </h4>
            <span className="font-mono text-xs font-bold text-[#ba1a1a]">
              {formatCurrency(stats.totalExpenses, currency)}
            </span>
          </div>

          <div className="space-y-3">
            {stats.sortedExpenseCategories.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#191c1e] font-medium">{c.category}</span>
                  <span className="text-[#ba1a1a] font-bold">
                    {formatCurrency(c.amount, currency)} ({c.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ba1a1a] rounded-full transition-all duration-300"
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </div>
            ))}

            {stats.sortedExpenseCategories.length === 0 && (
              <p className="font-mono text-xs text-[#64748b] text-center py-4">
                No disbursements recorded in this period.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Itemized Transactions for this Period */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 kpi-shadow space-y-4">
        <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-2">
          <h4 className="font-sans text-base font-bold text-[#191c1e]">
            Itemized Audit Ledger ({filteredTransactions.length} entries)
          </h4>
          <span className="font-mono text-xs text-[#64748b]">
            Period: {periodType.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] font-mono text-[11px] text-[#475569] uppercase">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Title / Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Payment Channel</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] font-mono text-xs">
              {filteredTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onSelectTransaction && onSelectTransaction(tx)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-3 text-[#475569]">
                    <span className="font-bold text-[#191c1e] block">{tx.date}</span>
                    <span className="text-[10px]">{tx.time}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'sale'
                          ? 'bg-emerald-50 text-[#006d30] border border-emerald-200'
                          : 'bg-red-50 text-[#ba1a1a] border border-red-200'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-sans font-semibold text-[#191c1e]">{tx.title}</p>
                    {tx.customerOrVendor && (
                      <p className="text-[11px] text-[#64748b]">{tx.customerOrVendor}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[#475569]">{tx.category}</td>
                  <td className="py-2.5 px-3 text-[#475569] capitalize">
                    {tx.paymentMethod ? tx.paymentMethod.replace('_', ' ') : '—'}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold text-sm ${
                      tx.type === 'sale' ? 'text-[#006d30]' : 'text-[#ba1a1a]'
                    }`}
                  >
                    {tx.type === 'sale' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748b] font-mono text-xs">
                    No transactions recorded for this {periodType} period.
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
