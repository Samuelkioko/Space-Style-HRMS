import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BillingDocument, CompanyInfo } from '../types';
import { formatCurrency, getCurrencySymbol } from './formatters';

export interface GenerateDocumentPDFOptions {
  document: BillingDocument;
  companyInfo: CompanyInfo;
  currency: string;
}

export function generateAndDownloadDocumentPDF(options: GenerateDocumentPDFOptions): void {
  const { document: docData, companyInfo, currency } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const isReceipt = docData.type === 'receipt';
  const isInvoice = docData.type === 'invoice';
  const isQuotation = docData.type === 'quotation';

  // Palette definition
  const primaryNavy = [0, 40, 142]; // #00288e
  const emeraldGreen = [0, 109, 48]; // #006d30
  const crimsonRed = [186, 26, 26]; // #ba1a1a
  const slateDark = [25, 28, 30]; // #191c1e
  const slateMuted = [100, 116, 139]; // #64748b
  const slateBorder = [203, 213, 225]; // #cbd5e1

  const headerThemeColor = isReceipt ? emeraldGreen : isQuotation ? [30, 64, 175] : primaryNavy;

  let currentY = 16;

  // 1. Top Header: Company Info (Left) + Document Type Banner (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(headerThemeColor[0], headerThemeColor[1], headerThemeColor[2]);
  doc.text((companyInfo.businessName || 'MGATOR INDUSTRIES LTD').toUpperCase(), margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  if (companyInfo.legalEntityName && companyInfo.legalEntityName !== companyInfo.businessName) {
    doc.text(companyInfo.legalEntityName, margin, currentY);
    currentY += 3.5;
  }
  doc.text(`Tax PIN: ${companyInfo.taxId || 'P052254755G'}`, margin, currentY);
  currentY += 3.5;
  doc.text(`Phone: ${companyInfo.phone || '0728353883'} | Email: ${companyInfo.businessEmail || 'mgatordoc@gmail.com'}`, margin, currentY);
  currentY += 3.5;
  let addrStr = `Address: ${companyInfo.address || 'Nairobi, Kenya'}`;
  if (companyInfo.website) {
    addrStr += ` | Web: ${companyInfo.website}`;
  }
  doc.text(addrStr, margin, currentY);

  // Right Header: Document Type Title & Badge
  const docTypeLabel = isReceipt
    ? 'PAYMENT RECEIPT'
    : isInvoice
    ? 'INVOICE'
    : 'QUOTATION';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(headerThemeColor[0], headerThemeColor[1], headerThemeColor[2]);
  doc.text(docTypeLabel, pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`No: ${docData.documentNumber}`, pageWidth - margin, 24, { align: 'right' });

  // Status Badge on Top Right
  const statusStr = (docData.status || 'ISSUED').toUpperCase().replace('_', ' ');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (isReceipt || docData.status === 'paid') {
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  } else if (docData.status === 'unpaid' || docData.status === 'overdue') {
    doc.setTextColor(crimsonRed[0], crimsonRed[1], crimsonRed[2]);
  } else {
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  }
  doc.text(`STATUS: ${statusStr}`, pageWidth - margin, 29, { align: 'right' });

  currentY += 4;

  // Divider Line
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // 2. Client & Meta 2-Column Info Box
  const colWidth = (pageWidth - margin * 2 - 6) / 2;
  const boxHeight = 28;

  // Left Box: Customer Info
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.roundedRect(margin, currentY, colWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(headerThemeColor[0], headerThemeColor[1], headerThemeColor[2]);
  doc.text(isReceipt ? 'RECEIVED FROM / PAYER:' : 'CLIENT / INVOICE TO:', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(docData.customerName || 'Walk-in Client', margin + 3, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  let clientY = currentY + 14;
  if (docData.customerTaxId) {
    doc.text(`Tax PIN: ${docData.customerTaxId}`, margin + 3, clientY);
    clientY += 3.5;
  }
  if (docData.customerPhone || docData.customerEmail) {
    doc.text(`Contact: ${[docData.customerPhone, docData.customerEmail].filter(Boolean).join(' | ')}`, margin + 3, clientY);
    clientY += 3.5;
  }
  if (docData.customerAddress) {
    doc.text(`Location: ${docData.customerAddress}`, margin + 3, clientY);
  }

  // Right Box: Document Dates & Payment References
  const rightBoxX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.roundedRect(rightBoxX, currentY, colWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(headerThemeColor[0], headerThemeColor[1], headerThemeColor[2]);
  doc.text('DOCUMENT DETAILS:', rightBoxX + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Issue Date: ${docData.date}`, rightBoxX + 3, currentY + 10);

  if (isQuotation && docData.dueDate) {
    doc.text(`Valid Until: ${docData.dueDate}`, rightBoxX + 3, currentY + 14.5);
  } else if (isInvoice && docData.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(crimsonRed[0], crimsonRed[1], crimsonRed[2]);
    doc.text(`Payment Due: ${docData.dueDate}`, rightBoxX + 3, currentY + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  } else if (isReceipt) {
    doc.text(`Payment Date: ${docData.date}`, rightBoxX + 3, currentY + 14.5);
  }

  if (docData.paymentMethod) {
    doc.text(`Payment Method: ${docData.paymentMethod.replace('_', ' ').toUpperCase()}`, rightBoxX + 3, currentY + 19);
  }
  if (docData.paymentReference) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(`Ref / Code: ${docData.paymentReference}`, rightBoxX + 3, currentY + 23.5);
  }

  currentY += boxHeight + 6;

  // Title / Subject line if present
  if (docData.title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`Subject / Memo: ${docData.title}`, margin, currentY);
    currentY += 4;
  }

  // 3. Itemized Line Items Table
  const tableData = docData.items.map((item, index) => [
    (index + 1).toString(),
    `${item.name}${item.description ? `\n${item.description}` : ''}`,
    item.quantity.toString(),
    item.unitType || 'units',
    formatCurrency(item.unitPrice, currency),
    item.discountPercent && item.discountPercent > 0 ? `${item.discountPercent}%` : '-',
    formatCurrency(item.amount, currency),
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Item & Description', 'Qty', 'Unit', `Rate (${getCurrencySymbol(currency).trim()})`, 'Disc', `Amount (${getCurrencySymbol(currency).trim()})`]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: headerThemeColor as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [25, 28, 30],
      cellPadding: 2.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;
  currentY = finalY;

  // 4. Financial Calculations Summary (Right Aligned Box)
  const calcBoxWidth = 80;
  const calcBoxX = pageWidth - margin - calcBoxWidth;
  let calcY = currentY;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.roundedRect(calcBoxX, calcY, calcBoxWidth, 34, 1.5, 1.5, 'FD');

  const rowH = 5;
  let lineY = calcY + 4.5;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Subtotal:', calcBoxX + 4, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(formatCurrency(docData.subtotal, currency), pageWidth - margin - 4, lineY, { align: 'right' });
  lineY += rowH;

  // Discount if any
  if (docData.discountTotal && docData.discountTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(crimsonRed[0], crimsonRed[1], crimsonRed[2]);
    doc.text('Discount:', calcBoxX + 4, lineY);
    doc.text(`-${formatCurrency(docData.discountTotal, currency)}`, pageWidth - margin - 4, lineY, { align: 'right' });
    lineY += rowH;
  }

  // VAT / Tax
  if (docData.taxTotal && docData.taxTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`VAT (${docData.taxRate || 16}%):`, calcBoxX + 4, lineY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(formatCurrency(docData.taxTotal, currency), pageWidth - margin - 4, lineY, { align: 'right' });
    lineY += rowH;
  }

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(headerThemeColor[0], headerThemeColor[1], headerThemeColor[2]);
  doc.text('TOTAL AMOUNT:', calcBoxX + 4, lineY);
  doc.text(formatCurrency(docData.total, currency), pageWidth - margin - 4, lineY, { align: 'right' });
  lineY += rowH + 0.5;

  // Amount Paid & Balance Due
  if (!isQuotation) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.text('Amount Paid:', calcBoxX + 4, lineY);
    doc.text(formatCurrency(docData.amountPaid, currency), pageWidth - margin - 4, lineY, { align: 'right' });
    lineY += rowH;

    if (docData.balanceDue > 0) {
      doc.setTextColor(crimsonRed[0], crimsonRed[1], crimsonRed[2]);
      doc.text('Balance Due:', calcBoxX + 4, lineY);
      doc.text(formatCurrency(docData.balanceDue, currency), pageWidth - margin - 4, lineY, { align: 'right' });
    } else {
      doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
      doc.text('Balance Due:', calcBoxX + 4, lineY);
      doc.text('KES 0.00 (PAID IN FULL)', pageWidth - margin - 4, lineY, { align: 'right' });
    }
  }

  // 5. Left Side: Payment Instructions & Banking Details (or Official Stamp)
  const leftBoxWidth = colWidth;
  if (isReceipt || docData.status === 'paid') {
    // Official "PAID" verification stamp
    doc.setDrawColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.setLineWidth(1);
    doc.roundedRect(margin, currentY, 65, 26, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.text('★ OFFICIAL PAID ★', margin + 32.5, currentY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`VERIFIED PAYMENT: ${formatCurrency(docData.amountPaid || docData.total, currency)}`, margin + 32.5, currentY + 15, { align: 'center' });
    doc.text(`CONFIRMED: ${docData.date} | ${docData.paymentReference || 'VERIFIED'}`, margin + 32.5, currentY + 20, { align: 'center' });
  } else {
    // Payment Remittance Instructions
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
    doc.roundedRect(margin, currentY, leftBoxWidth, 26, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(headerThemeColor[0], headerThemeColor[1], headerThemeColor[2]);
    doc.text('PAYMENT INSTRUCTIONS & REMITTANCE:', margin + 3, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    const opts = companyInfo.paymentOptions;
    const mpText = opts?.paybillNumber
      ? `• ${opts.mobileMoneyProvider || 'M-PESA'} Paybill: ${opts.paybillNumber} | Account: ${opts.accountNumber || docData.documentNumber}`
      : opts?.tillNumber
      ? `• Buy Goods Till: ${opts.tillNumber} (${opts.mobileMoneyName || companyInfo.businessName})`
      : '• M-PESA Paybill: 522522 | Account: 1289410984';

    const bankText = opts?.bankName && opts?.bankAccountNumber
      ? `• ${opts.bankName} | Branch: ${opts.bankBranch || 'Corporate'} | A/C: ${opts.bankAccountNumber}`
      : '• NCBA Bank Kenya | Branch: Industrial Area | A/C: 1004829101';

    const refText = `• Reference: Quote/Invoice #${docData.documentNumber} on payment remittance`;
    const instrText = opts?.paymentInstructions
      ? `• Note: ${opts.paymentInstructions.substring(0, 58)}`
      : `• Send payment confirmation to: ${companyInfo.businessEmail || 'accounts@company.co.ke'}`;

    doc.text(mpText, margin + 3, currentY + 9.5);
    doc.text(bankText, margin + 3, currentY + 14);
    doc.text(refText, margin + 3, currentY + 18.5);
    doc.text(instrText, margin + 3, currentY + 23);
  }

  currentY += 38;

  // 6. Notes & Terms & Conditions
  if (docData.notes || docData.termsAndConditions) {
    if (docData.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Notes / Remarks:', margin, currentY);
      currentY += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      const splitNotes = doc.splitTextToSize(docData.notes, pageWidth - margin * 2);
      doc.text(splitNotes, margin, currentY);
      currentY += splitNotes.length * 3.5 + 2;
    }

    if (docData.termsAndConditions) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Terms & Conditions:', margin, currentY);
      currentY += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      const splitTerms = doc.splitTextToSize(docData.termsAndConditions, pageWidth - margin * 2);
      doc.text(splitTerms, margin, currentY);
      currentY += splitTerms.length * 3.2;
    }
  }

  // 7. Footer: Sign-off & Verification Seal
  const footerY = pageHeight - 18;
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Generated by Executive Ledger Enterprise ERP on ${new Date().toLocaleDateString()} | System Verified Document`, margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.text(`Authorized Signature / Stamp: ________________________`, pageWidth - margin, footerY, { align: 'right' });

  // Trigger browser download
  const cleanDocNumber = docData.documentNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${docData.type}-${cleanDocNumber}.pdf`;
  doc.save(filename);
}
