import { BillingDocument, Transaction, TrashBundle, CascadeDeletePreview } from '../types';

/**
 * Calculates all child/downstream documents and cashbook transactions linked to a BillingDocument
 */
export function calculateCascadeDeletePreview(
  targetDoc: BillingDocument,
  allDocuments: BillingDocument[],
  allTransactions: Transaction[]
): CascadeDeletePreview {
  const cascadedQuotes: BillingDocument[] = [];
  const cascadedInvoices: BillingDocument[] = [];
  const cascadedReceipts: BillingDocument[] = [];
  const cascadedTransactions: Transaction[] = [];

  const targetDocNumber = (targetDoc.documentNumber || '').trim();
  const targetId = (targetDoc.id || '').trim();

  if (targetDoc.type === 'quotation') {
    // 1. Target is a Quotation
    cascadedQuotes.push(targetDoc);

    // Find all invoices converted/generated from this quotation
    const linkedInvoices = allDocuments.filter(
      (d) =>
        d.type === 'invoice' &&
        ((d.linkedQuotationId && d.linkedQuotationId === targetDocNumber) ||
          (d.linkedQuotationId && d.linkedQuotationId === targetId))
    );
    cascadedInvoices.push(...linkedInvoices);

    const linkedInvoiceNumbers = new Set(linkedInvoices.map((i) => i.documentNumber));
    const linkedInvoiceIds = new Set(linkedInvoices.map((i) => i.id));

    // Find all receipts linked to these invoices or directly to this quotation
    const linkedReceipts = allDocuments.filter(
      (d) =>
        d.type === 'receipt' &&
        ((d.linkedInvoiceId && linkedInvoiceNumbers.has(d.linkedInvoiceId)) ||
          (d.linkedInvoiceId && linkedInvoiceIds.has(d.linkedInvoiceId)) ||
          (d.linkedQuotationId && d.linkedQuotationId === targetDocNumber))
    );
    cascadedReceipts.push(...linkedReceipts);

    const allLinkedPaymentRefs = new Set<string>();
    linkedInvoices.forEach((inv) => {
      if (inv.paymentReference) allLinkedPaymentRefs.add(inv.paymentReference.trim());
      if (inv.documentNumber) allLinkedPaymentRefs.add(inv.documentNumber.trim());
    });
    linkedReceipts.forEach((rec) => {
      if (rec.paymentReference) allLinkedPaymentRefs.add(rec.paymentReference.trim());
      if (rec.documentNumber) allLinkedPaymentRefs.add(rec.documentNumber.trim());
    });

    // Find all cashbook/ledger transactions linked to any of these
    const linkedTxs = allTransactions.filter((tx) => {
      if (tx.referenceNo && allLinkedPaymentRefs.has(tx.referenceNo.trim())) return true;
      for (const invNum of linkedInvoiceNumbers) {
        if (tx.title.includes(invNum) || (tx.notes && tx.notes.includes(invNum))) return true;
      }
      for (const rec of linkedReceipts) {
        if (tx.title.includes(rec.documentNumber) || (tx.notes && tx.notes.includes(rec.documentNumber))) return true;
        if (rec.linkedTransactionId && rec.linkedTransactionId === tx.id) return true;
      }
      if (tx.title.includes(targetDocNumber) || (tx.notes && tx.notes.includes(targetDocNumber))) return true;
      return false;
    });
    cascadedTransactions.push(...linkedTxs);
  } else if (targetDoc.type === 'invoice') {
    // 2. Target is an Invoice
    cascadedInvoices.push(targetDoc);

    // Find all receipts linked to this invoice
    const linkedReceipts = allDocuments.filter(
      (d) =>
        d.type === 'receipt' &&
        (d.linkedInvoiceId === targetDocNumber || d.linkedInvoiceId === targetId)
    );
    cascadedReceipts.push(...linkedReceipts);

    const paymentRefs = new Set<string>();
    if (targetDoc.paymentReference) paymentRefs.add(targetDoc.paymentReference.trim());
    if (targetDoc.documentNumber) paymentRefs.add(targetDoc.documentNumber.trim());
    linkedReceipts.forEach((r) => {
      if (r.paymentReference) paymentRefs.add(r.paymentReference.trim());
      if (r.documentNumber) paymentRefs.add(r.documentNumber.trim());
    });

    // Find all ledger transactions linked to this invoice or its receipts
    const linkedTxs = allTransactions.filter((tx) => {
      if (tx.referenceNo && paymentRefs.has(tx.referenceNo.trim())) return true;
      if (tx.title.includes(targetDocNumber) || (tx.notes && tx.notes.includes(targetDocNumber))) return true;
      for (const rec of linkedReceipts) {
        if (tx.title.includes(rec.documentNumber) || (tx.notes && tx.notes.includes(rec.documentNumber))) return true;
        if (rec.linkedTransactionId && rec.linkedTransactionId === tx.id) return true;
      }
      return false;
    });
    cascadedTransactions.push(...linkedTxs);
  } else if (targetDoc.type === 'receipt') {
    // 3. Target is a Receipt
    cascadedReceipts.push(targetDoc);

    const paymentRefs = new Set<string>();
    if (targetDoc.paymentReference) paymentRefs.add(targetDoc.paymentReference.trim());
    if (targetDoc.documentNumber) paymentRefs.add(targetDoc.documentNumber.trim());

    // Find ledger transactions linked to this receipt
    const linkedTxs = allTransactions.filter((tx) => {
      if (targetDoc.linkedTransactionId && tx.id === targetDoc.linkedTransactionId) return true;
      if (tx.referenceNo && paymentRefs.has(tx.referenceNo.trim())) return true;
      if (tx.title.includes(targetDocNumber) || (tx.notes && tx.notes.includes(targetDocNumber))) return true;
      return false;
    });
    cascadedTransactions.push(...linkedTxs);
  }

  // Deduplicate records in lists
  const uniqueDocumentsMap = new Map<string, BillingDocument>();
  [...cascadedQuotes, ...cascadedInvoices, ...cascadedReceipts].forEach((d) => {
    uniqueDocumentsMap.set(d.id, d);
  });

  const uniqueTransactionsMap = new Map<string, Transaction>();
  cascadedTransactions.forEach((tx) => {
    uniqueTransactionsMap.set(tx.id, tx);
  });

  const totalAffectedRecords = uniqueDocumentsMap.size + uniqueTransactionsMap.size;

  return {
    targetDoc,
    cascadedQuotes: Array.from(uniqueDocumentsMap.values()).filter((d) => d.type === 'quotation'),
    cascadedInvoices: Array.from(uniqueDocumentsMap.values()).filter((d) => d.type === 'invoice'),
    cascadedReceipts: Array.from(uniqueDocumentsMap.values()).filter((d) => d.type === 'receipt'),
    cascadedTransactions: Array.from(uniqueTransactionsMap.values()),
    totalAffectedRecords,
  };
}

/**
 * Calculates all associated documents (receipts, invoices, quotations) and ledger transactions
 * linked to a sale (Transaction) so that deleting the sale cascades and deletes all associated records.
 */
export function calculateCascadeDeletePreviewForTransaction(
  targetTx: Transaction,
  allDocuments: BillingDocument[],
  allTransactions: Transaction[]
): CascadeDeletePreview {
  const targetId = (targetTx.id || '').trim();
  const targetRef = (targetTx.referenceNo || '').trim();
  const targetTitle = targetTx.title || '';
  const targetNotes = targetTx.notes || '';

  // 1. Identify all directly associated receipts
  const associatedReceipts = allDocuments.filter((d) => {
    if (d.type !== 'receipt') return false;
    if (d.linkedTransactionId && d.linkedTransactionId === targetId) return true;
    if (targetRef && ((d.paymentReference && d.paymentReference.trim() === targetRef) || d.documentNumber.trim() === targetRef)) return true;
    if (d.documentNumber && (targetTitle.includes(d.documentNumber) || targetNotes.includes(d.documentNumber))) return true;
    return false;
  });

  // Extract receipt document numbers and linked invoice numbers
  const receiptDocNumbers = new Set(associatedReceipts.map((r) => r.documentNumber.trim()));
  const invoiceNumbersFromReceipts = new Set(
    associatedReceipts.map((r) => r.linkedInvoiceId?.trim()).filter(Boolean) as string[]
  );

  // 2. Identify all associated invoices (linked via receipts, linked directly to tx, or reference)
  const associatedInvoices = allDocuments.filter((d) => {
    if (d.type !== 'invoice') return false;
    const invNum = d.documentNumber.trim();
    if (invoiceNumbersFromReceipts.has(invNum) || invoiceNumbersFromReceipts.has(d.id)) return true;
    if (d.linkedTransactionId && d.linkedTransactionId === targetId) return true;
    if (targetRef && (invNum === targetRef || (d.paymentReference && d.paymentReference.trim() === targetRef))) return true;
    if (invNum && (targetTitle.includes(invNum) || targetNotes.includes(invNum))) return true;
    return false;
  });

  const invoiceDocNumbers = new Set(associatedInvoices.map((i) => i.documentNumber.trim()));
  const invoiceIds = new Set(associatedInvoices.map((i) => i.id.trim()));

  // If new invoices were found, grab any OTHER receipts linked to these invoices as well
  const extraReceipts = allDocuments.filter(
    (d) =>
      d.type === 'receipt' &&
      !receiptDocNumbers.has(d.documentNumber.trim()) &&
      d.linkedInvoiceId &&
      (invoiceDocNumbers.has(d.linkedInvoiceId.trim()) || invoiceIds.has(d.linkedInvoiceId.trim()))
  );
  associatedReceipts.push(...extraReceipts);

  // 3. Identify all quotations associated with these invoices or this sale
  const quotationNumbersFromInvoices = new Set(
    associatedInvoices.map((i) => i.linkedQuotationId?.trim()).filter(Boolean) as string[]
  );

  const associatedQuotes = allDocuments.filter((d) => {
    if (d.type !== 'quotation') return false;
    const quoteNum = d.documentNumber.trim();
    if (quotationNumbersFromInvoices.has(quoteNum) || quotationNumbersFromInvoices.has(d.id)) return true;
    if (targetRef && quoteNum === targetRef) return true;
    if (quoteNum && (targetTitle.includes(quoteNum) || targetNotes.includes(quoteNum))) return true;
    return false;
  });

  // 4. Identify any other ledger transactions linked to this sale's invoice/receipt flow
  const allDocNumbers = new Set([
    ...Array.from(receiptDocNumbers),
    ...Array.from(invoiceDocNumbers),
    ...associatedQuotes.map((q) => q.documentNumber.trim()),
  ]);
  const allPaymentRefs = new Set([
    ...associatedReceipts.map((r) => r.paymentReference?.trim()).filter(Boolean) as string[],
    ...associatedInvoices.map((i) => i.paymentReference?.trim()).filter(Boolean) as string[],
  ]);

  const associatedTransactions = allTransactions.filter((tx) => {
    if (tx.id === targetId) return true; // Include target sale itself
    if (tx.referenceNo && allPaymentRefs.has(tx.referenceNo.trim())) return true;
    for (const num of allDocNumbers) {
      if (tx.title.includes(num) || (tx.notes && tx.notes.includes(num))) return true;
    }
    return false;
  });

  // Deduplicate
  const uniqueDocsMap = new Map<string, BillingDocument>();
  [...associatedQuotes, ...associatedInvoices, ...associatedReceipts].forEach((d) => {
    uniqueDocsMap.set(d.id, d);
  });

  const uniqueTxsMap = new Map<string, Transaction>();
  associatedTransactions.forEach((t) => {
    uniqueTxsMap.set(t.id, t);
  });

  return {
    targetTx,
    cascadedQuotes: Array.from(uniqueDocsMap.values()).filter((d) => d.type === 'quotation'),
    cascadedInvoices: Array.from(uniqueDocsMap.values()).filter((d) => d.type === 'invoice'),
    cascadedReceipts: Array.from(uniqueDocsMap.values()).filter((d) => d.type === 'receipt'),
    cascadedTransactions: Array.from(uniqueTxsMap.values()),
    totalAffectedRecords: uniqueDocsMap.size + uniqueTxsMap.size,
  };
}

/**
 * Packs a deletion preview into a complete TrashBundle for storage in Firestore & Trash Bin
 */
export function createTrashBundleFromCascade(preview: CascadeDeletePreview): TrashBundle {
  const { targetDoc, targetTx, cascadedQuotes, cascadedInvoices, cascadedReceipts, cascadedTransactions } = preview;

  const allDocsMap = new Map<string, BillingDocument>();
  [...cascadedQuotes, ...cascadedInvoices, ...cascadedReceipts].forEach((d) => {
    allDocsMap.set(d.id, d);
  });

  const docs = Array.from(allDocsMap.values());
  const txs = cascadedTransactions;

  if (targetTx) {
    let desc = `Deleted SALE "${targetTx.title}"`;
    const parts: string[] = [];
    if (cascadedReceipts.length > 0) {
      parts.push(`${cascadedReceipts.length} receipt${cascadedReceipts.length > 1 ? 's' : ''}`);
    }
    if (cascadedInvoices.length > 0) {
      parts.push(`${cascadedInvoices.length} invoice${cascadedInvoices.length > 1 ? 's' : ''}`);
    }
    if (cascadedQuotes.length > 0) {
      parts.push(`${cascadedQuotes.length} quotation${cascadedQuotes.length > 1 ? 's' : ''}`);
    }
    if (parts.length > 0) {
      desc += ` and removed all associated records (${parts.join(', ')})`;
    }

    return {
      id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      primaryItemType: 'sale',
      primaryItemTitle: targetTx.title || 'Untitled Sale',
      primaryItemNumber: targetTx.referenceNo || targetTx.id || '',
      primaryItemId: targetTx.id,
      trashedAt: new Date().toISOString(),
      totalAmount: targetTx.amount || 0,
      customerName: targetTx.customerOrVendor || '',
      documents: docs,
      transactions: txs,
      description: desc,
    };
  }

  const primaryDoc = targetDoc!;
  let desc = `Deleted ${primaryDoc.type.toUpperCase()} #${primaryDoc.documentNumber}`;
  const otherDocsCount = docs.length - 1;
  const parts: string[] = [];
  if (otherDocsCount > 0) {
    parts.push(`${otherDocsCount} linked document${otherDocsCount > 1 ? 's' : ''}`);
  }
  if (txs.length > 0) {
    parts.push(`${txs.length} ledger transaction${txs.length > 1 ? 's' : ''}`);
  }
  if (parts.length > 0) {
    desc += ` and removed ${parts.join(' & ')}`;
  }

  return {
    id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    primaryItemType: primaryDoc.type,
    primaryItemTitle: primaryDoc.title || `${primaryDoc.type.toUpperCase()} #${primaryDoc.documentNumber}`,
    primaryItemNumber: primaryDoc.documentNumber || '',
    primaryItemId: primaryDoc.id,
    trashedAt: new Date().toISOString(),
    totalAmount: primaryDoc.total || 0,
    customerName: primaryDoc.customerName || '',
    documents: docs,
    transactions: txs,
    description: desc,
  };
}
