import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, PaymentMethod } from '../types';
import { formatCurrency, getCurrencySymbol } from './formatters';

interface ReportStats {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalTransactions: number;
  salesCount: number;
  expenseCount: number;
  avgSale: number;
  avgExpense: number;
  sortedSalesCategories: { category: string; amount: number; percent: number }[];
  sortedExpenseCategories: { category: string; amount: number; percent: number }[];
}

interface PeriodBreakdownRow {
  label: string;
  sales: number;
  expenses: number;
  profit: number;
  count: number;
  margin?: number;
}

export interface PDFExportOptions {
  businessName: string;
  taxId: string;
  periodTitle: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  currency: string;
  stats: ReportStats;
  transactions: Transaction[];
  breakdownRows?: PeriodBreakdownRow[];
  breakdownTitle?: string;
}

export function generateAndDownloadPDF(options: PDFExportOptions): void {
  const {
    businessName,
    taxId,
    periodTitle,
    periodType,
    currency,
    stats,
    transactions,
    breakdownRows,
    breakdownTitle,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Colors
  const primaryColor = [0, 40, 142]; // #00288e Navy
  const textColor = [25, 28, 30]; // #191c1e Dark Slate
  const grayColor = [100, 116, 139]; // #64748b Muted Slate
  const greenColor = [0, 109, 48]; // #006d30 Emerald
  const redColor = [186, 26, 26]; // #ba1a1a Crimson
  const lightBg = [248, 250, 252]; // #f8fafc

  let currentY = 16;

  // 1. Header & Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(businessName.toUpperCase(), margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(periodTitle, margin, currentY);

  // Right-aligned metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  const dateStr = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateStr, pageWidth - margin, 16, { align: 'right' });
  doc.text(`Tax PIN: ${taxId}`, pageWidth - margin, 21, { align: 'right' });
  doc.text(`Currency: ${currency} (${getCurrencySymbol(currency).trim()})`, pageWidth - margin, 26, { align: 'right' });

  currentY += 8;

  // Divider line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // 2. Executive Key Figures Box (4 metric cards in a grid)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('EXECUTIVE FINANCIAL SUMMARY', margin, currentY);
  currentY += 4;

  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 20;

  // Metric 1: Gross Revenue
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  doc.text('GROSS REVENUE', margin + 3, currentY + 5);
  doc.setFontSize(10.5);
  doc.text(formatCurrency(stats.totalSales, currency), margin + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`${stats.salesCount} sales invoices`, margin + 3, currentY + 17);

  // Metric 2: Total Expenses
  const card2X = margin + cardWidth + 3;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(redColor[0], redColor[1], redColor[2]);
  doc.text('TOTAL EXPENSES', card2X + 3, currentY + 5);
  doc.setFontSize(10.5);
  doc.text(formatCurrency(stats.totalExpenses, currency), card2X + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`${stats.expenseCount} disbursements`, card2X + 3, currentY + 17);

  // Metric 3: Net Operating Profit
  const card3X = card2X + cardWidth + 3;
  const isProfitable = stats.netProfit >= 0;
  doc.setFillColor(isProfitable ? 240 : 254, isProfitable ? 253 : 242, isProfitable ? 244 : 242);
  doc.setDrawColor(isProfitable ? 110 : 252, isProfitable ? 231 : 165, isProfitable ? 183 : 165);
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isProfitable ? greenColor[0] : redColor[0], isProfitable ? greenColor[1] : redColor[1], isProfitable ? greenColor[2] : redColor[2]);
  doc.text('NET OPERATING PROFIT', card3X + 3, currentY + 5);
  doc.setFontSize(10.5);
  doc.text(formatCurrency(stats.netProfit, currency), card3X + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Margin: ${stats.profitMargin.toFixed(1)}%`, card3X + 3, currentY + 17);

  // Metric 4: Volume & Ticket
  const card4X = card3X + cardWidth + 3;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card4X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TOTAL VOLUME', card4X + 3, currentY + 5);
  doc.setFontSize(10.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`${stats.totalTransactions} Tx`, card4X + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Avg Ticket: ${formatCurrency(stats.avgSale, currency)}`, card4X + 3, currentY + 17);

  currentY += cardHeight + 6;

  // 3. Periodic Sub-Breakdown Table (if Weekly, Monthly, or Yearly)
  if (breakdownRows && breakdownRows.length > 0) {
    const tableBody = breakdownRows.map((r) => [
      r.label,
      r.sales > 0 ? formatCurrency(r.sales, currency) : '—',
      r.expenses > 0 ? formatCurrency(r.expenses, currency) : '—',
      r.profit !== 0 ? formatCurrency(r.profit, currency) : '—',
      r.margin !== undefined ? `${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(1)}%` : `${r.count} entries`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[breakdownTitle || 'Period Tranche', 'Gross Revenue', 'Disbursements', 'Net Profit', 'Margin / Count']],
      body: tableBody,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [0, 40, 142],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [25, 28, 30],
        font: 'helvetica',
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { halign: 'right', textColor: [0, 109, 48] },
        2: { halign: 'right', textColor: [186, 26, 26] },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // 4. Category Allocations (Revenue & Expenses summary)
  if (stats.sortedSalesCategories.length > 0 || stats.sortedExpenseCategories.length > 0) {
    // Check if we have space on current page
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('CATEGORY ALLOCATION BREAKDOWN', margin, currentY);
    currentY += 4;

    const catWidth = (pageWidth - margin * 2 - 4) / 2;

    // Sales Categories Table
    const salesCatData = stats.sortedSalesCategories.map((c) => [
      c.category,
      formatCurrency(c.amount, currency),
      `${c.percent.toFixed(1)}%`,
    ]);

    const expenseCatData = stats.sortedExpenseCategories.map((c) => [
      c.category,
      formatCurrency(c.amount, currency),
      `${c.percent.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin + catWidth + 4 },
      head: [['Revenue Channel', 'Amount', '%']],
      body: salesCatData.length > 0 ? salesCatData : [['No sales recorded', '—', '—']],
      theme: 'plain',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 109, 48],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' },
        2: { halign: 'right' },
      },
    });

    const salesTableFinalY = (doc as any).lastAutoTable.finalY;

    // Expenses Categories Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin + catWidth + 4, right: margin },
      head: [['Expense Category', 'Amount', '%']],
      body: expenseCatData.length > 0 ? expenseCatData : [['No expenses recorded', '—', '—']],
      theme: 'plain',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [186, 26, 26],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' },
        2: { halign: 'right' },
      },
    });

    const expenseTableFinalY = (doc as any).lastAutoTable.finalY;
    currentY = Math.max(salesTableFinalY, expenseTableFinalY) + 6;
  }

  // 5. Itemized Transaction Ledger
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`ITEMIZED AUDIT LEDGER (${transactions.length} Transactions)`, margin, currentY);
  currentY += 3;

  const ledgerBody = transactions.map((t) => [
    `${t.date}\n${t.time}`,
    t.type.toUpperCase(),
    t.title + (t.customerOrVendor ? `\n(${t.customerOrVendor})` : ''),
    t.category,
    (t.paymentMethod || '—').replace('_', ' '),
    (t.type === 'sale' ? '+' : '-') + formatCurrency(t.amount, currency),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date / Time', 'Type', 'Description / Entity', 'Category', 'Channel', 'Amount']],
    body: ledgerBody.length > 0 ? ledgerBody : [['—', '—', 'No transactions logged for this period', '—', '—', '—']],
    margin: { left: margin, right: margin, bottom: 18 },
    theme: 'striped',
    headStyles: {
      fillColor: [25, 28, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [25, 28, 30],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 16, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 28 },
      4: { cellWidth: 24 },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Add page footer to every page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);

      // Footer divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.text(
        `${businessName} • Official Audit & Financial Statement`,
        margin,
        pageHeight - 7
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 7,
        { align: 'right' }
      );
    },
  });

  // Save the PDF file directly to client
  const filename = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${periodType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function openPrintableReportHTML(options: PDFExportOptions): void {
  const {
    businessName,
    taxId,
    periodTitle,
    periodType,
    currency,
    stats,
    transactions,
    breakdownRows,
    breakdownTitle,
  } = options;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${businessName} - ${periodTitle}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #191c1e;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #00288e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .company-title {
      font-size: 20px;
      font-weight: bold;
      color: #00288e;
      margin: 0 0 4px 0;
    }
    .report-title {
      font-size: 15px;
      font-weight: 600;
      color: #191c1e;
      margin: 0;
    }
    .meta-info {
      text-align: right;
      color: #64748b;
      font-size: 11px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #64748b;
    }
    .rev { color: #006d30; }
    .exp { color: #ba1a1a; }
    .navy { color: #00288e; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #00288e;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-size: 11px;
      text-transform: uppercase;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
    }
    .btn-bar {
      margin-bottom: 15px;
      display: flex;
      gap: 10px;
    }
    .print-btn {
      background: #00288e;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
    }
    @media print {
      .btn-bar { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="btn-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Click to Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="company-title">${businessName}</h1>
      <h2 class="report-title">${periodTitle}</h2>
    </div>
    <div class="meta-info">
      <div>Tax PIN: <strong>${taxId}</strong></div>
      <div>Currency: <strong>${currency}</strong></div>
      <div>Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label rev">Gross Revenue</div>
      <div class="kpi-val rev">${formatCurrency(stats.totalSales, currency)}</div>
      <div class="kpi-sub">${stats.salesCount} sales invoices</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label exp">Total Expenses</div>
      <div class="kpi-val exp">${formatCurrency(stats.totalExpenses, currency)}</div>
      <div class="kpi-sub">${stats.expenseCount} disbursements</div>
    </div>
    <div class="kpi-card" style="background: ${stats.netProfit >= 0 ? '#f0fdf4' : '#fef2f2'}; border-color: ${stats.netProfit >= 0 ? '#86efac' : '#fca5a5'};">
      <div class="kpi-label ${stats.netProfit >= 0 ? 'rev' : 'exp'}">Net Operating Profit</div>
      <div class="kpi-val ${stats.netProfit >= 0 ? 'rev' : 'exp'}">${formatCurrency(stats.netProfit, currency)}</div>
      <div class="kpi-sub">Margin: <strong>${stats.profitMargin.toFixed(1)}%</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label navy">Total Volume</div>
      <div class="kpi-val">${stats.totalTransactions}</div>
      <div class="kpi-sub">Avg ticket: ${formatCurrency(stats.avgSale, currency)}</div>
    </div>
  </div>

  ${
    breakdownRows && breakdownRows.length > 0
      ? `
    <h3 style="font-size: 13px; margin: 12px 0 6px 0;">${breakdownTitle || 'Period Breakdown'}</h3>
    <table>
      <thead>
        <tr>
          <th>Period Tranche</th>
          <th class="text-right">Gross Revenue</th>
          <th class="text-right">Disbursements</th>
          <th class="text-right">Net Profit</th>
          <th class="text-right">Margin / Volume</th>
        </tr>
      </thead>
      <tbody>
        ${breakdownRows
          .map(
            (r) => `
          <tr>
            <td class="bold">${r.label}</td>
            <td class="text-right bold rev">${r.sales > 0 ? formatCurrency(r.sales, currency) : '—'}</td>
            <td class="text-right bold exp">${r.expenses > 0 ? formatCurrency(r.expenses, currency) : '—'}</td>
            <td class="text-right bold ${r.profit >= 0 ? 'rev' : 'exp'}">${r.profit !== 0 ? formatCurrency(r.profit, currency) : '—'}</td>
            <td class="text-right">${r.margin !== undefined ? `${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(1)}%` : `${r.count} entries`}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
      : ''
  }

  <h3 style="font-size: 13px; margin: 16px 0 6px 0;">Itemized Ledger Entries (${transactions.length})</h3>
  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Type</th>
        <th>Description</th>
        <th>Category</th>
        <th>Payment Channel</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${
        transactions.length > 0
          ? transactions
              .map(
                (t) => `
        <tr>
          <td>${t.date} <small style="color: #64748b;">${t.time}</small></td>
          <td class="bold ${t.type === 'sale' ? 'rev' : 'exp'}">${t.type.toUpperCase()}</td>
          <td><strong>${t.title}</strong>${t.customerOrVendor ? `<br><small style="color:#64748b">${t.customerOrVendor}</small>` : ''}</td>
          <td>${t.category}</td>
          <td>${(t.paymentMethod || '—').replace('_', ' ')}</td>
          <td class="text-right bold ${t.type === 'sale' ? 'rev' : 'exp'}">
            ${t.type === 'sale' ? '+' : '-'}${formatCurrency(t.amount, currency)}
          </td>
        </tr>
      `
              )
              .join('')
          : `<tr><td colspan="6" class="text-center" style="padding: 20px; color: #64748b;">No transactions recorded for this period.</td></tr>`
      }
    </tbody>
  </table>

  <div class="footer">
    <div>${businessName} • Confidential Financial Audit</div>
    <div>Generated via Executive Ledger System</div>
  </div>
</body>
</html>
`;

  // Create a Blob URL and trigger opening or download
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');

  // If popup was blocked by iframe/browser, download the printable HTML directly
  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${periodType}_statement.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
