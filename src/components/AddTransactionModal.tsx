import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  Receipt,
  Calendar,
  Clock,
  CreditCard,
  User,
  Check,
  Package,
  Calculator,
  AlertCircle,
  Settings,
  Building2,
  Smartphone,
  Coins,
  Plus,
  Trash2,
  ShoppingBag,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  FinancialAccountType,
  TabType,
  ProductServiceItem,
  UnitType,
  ExpenseCategoryItem,
  Customer,
  DocumentLineItem,
} from '../types';
import { EXPENSE_CATEGORIES } from '../data/mockData';
import { getCurrencySymbol, formatCurrency } from '../utils/formatters';
import { CustomerAutocomplete } from './CustomerAutocomplete';

interface PosLineItem {
  id: string;
  productId: string;
  name: string;
  category?: string;
  quantity: string;
  unitPrice: string;
  unitType: UnitType;
  amount: number;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  currency: string;
  defaultType?: TransactionType;
  activeTab?: TabType;
  products?: ProductServiceItem[];
  expenseCategories?: ExpenseCategoryItem[];
  onNavigateTab?: (tab: TabType) => void;
  customers?: Customer[];
  onSaveCustomer?: (customer: Customer) => Promise<void> | void;
  isAdminMode?: boolean;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  currency,
  defaultType = 'sale',
  activeTab,
  products = [],
  expenseCategories = [],
  onNavigateTab,
  customers = [],
  onSaveCustomer,
  isAdminMode = true,
}) => {
  // Determine if transaction type is strictly locked by current active screen tab or staff restrictions
  const effectiveDefaultType = !isAdminMode ? 'sale' : defaultType;
  const lockedType: TransactionType | null = !isAdminMode
    ? 'sale'
    : activeTab === 'sales'
    ? 'sale'
    : activeTab === 'expenses'
    ? 'expense'
    : null;

  // Active products list
  const activeProducts = products.filter((p) => p.isActive !== false);

  // Active expense categories list
  const activeExpenseCategoryList =
    expenseCategories && expenseCategories.length > 0
      ? expenseCategories.filter((c) => c.isActive !== false)
      : EXPENSE_CATEGORIES.map((name, idx) => ({
          id: `exp-${idx}`,
          name,
          group: 'General',
          isActive: true,
        }));

  const [type, setType] = useState<TransactionType>(lockedType || effectiveDefaultType);

  useEffect(() => {
    if (!isAdminMode && type === 'expense') {
      setType('sale');
    }
  }, [isAdminMode, type]);

  // POS Multi-Item Sale Cart State
  const [saleItems, setSaleItems] = useState<PosLineItem[]>([]);

  // For Expenses: strictly selected from added expense categories
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('');

  // Common transaction fields
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [financialAccount, setFinancialAccount] = useState<FinancialAccountType>('mpesa');
  const [customerOrVendor, setCustomerOrVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string>('');

  // Auto-sync financial account when payment method changes
  const handlePaymentMethodChange = (pm: PaymentMethod) => {
    setPaymentMethod(pm);
    if (pm === 'mobile_money') {
      setFinancialAccount('mpesa');
    } else if (pm === 'cash') {
      setFinancialAccount('cash');
    } else {
      setFinancialAccount('bank');
    }
  };

  const createSaleLineItem = (product?: ProductServiceItem, initialQty = '1'): PosLineItem => {
    const prod = product || activeProducts[0];
    if (prod) {
      const q = parseFloat(initialQty) > 0 ? parseFloat(initialQty) : 1;
      return {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        name: prod.name,
        category: prod.category || 'Retail Sales',
        quantity: q.toString(),
        unitPrice: prod.unitPrice.toString(),
        unitType: prod.unitType || 'units',
        amount: Math.round(q * prod.unitPrice * 100) / 100,
      };
    }
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: '',
      name: '',
      category: 'Retail Sales',
      quantity: '1',
      unitPrice: '0',
      unitType: 'units',
      amount: 0,
    };
  };

  // Recalculates total across all items
  const syncTotalAmountFromItems = (items: PosLineItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    setAmount(total.toFixed(2));
  };

  // Reset and initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeType = lockedType || defaultType || 'sale';
      setType(activeType);
      setFormError('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
      setNotes('');
      setCustomerOrVendor('');

      if (activeType === 'sale') {
        if (activeProducts.length > 0) {
          const firstItem = createSaleLineItem(activeProducts[0], '1');
          setSaleItems([firstItem]);
          setAmount(firstItem.amount.toFixed(2));
        } else {
          setSaleItems([]);
          setAmount('');
        }
      } else {
        if (activeExpenseCategoryList.length > 0) {
          setSelectedExpenseCategory(activeExpenseCategoryList[0].name);
        } else {
          setSelectedExpenseCategory('Lunch');
        }
        setAmount('');
      }
    }
  }, [isOpen, activeTab, defaultType, lockedType]);

  // Handle switching type between Sale and Expense
  const handleTypeSwitch = (newType: TransactionType) => {
    setType(newType);
    setFormError('');
    if (newType === 'sale') {
      if (activeProducts.length > 0) {
        const firstItem = createSaleLineItem(activeProducts[0], '1');
        setSaleItems([firstItem]);
        setAmount(firstItem.amount.toFixed(2));
      } else {
        setSaleItems([]);
        setAmount('');
      }
    } else {
      if (activeExpenseCategoryList.length > 0) {
        setSelectedExpenseCategory(activeExpenseCategoryList[0].name);
      }
      setAmount('');
    }
  };

  // Update a field in a specific line item
  const handleUpdateItem = (
    index: number,
    field: 'productId' | 'quantity' | 'unitPrice',
    value: string
  ) => {
    setFormError('');
    const updated = [...saleItems];
    const target = { ...updated[index] };

    if (field === 'productId') {
      const prod = activeProducts.find((p) => p.id === value);
      if (prod) {
        target.productId = prod.id;
        target.name = prod.name;
        target.category = prod.category || 'Retail Sales';
        target.unitType = prod.unitType || 'units';
        target.unitPrice = prod.unitPrice.toString();
        const qty = parseFloat(target.quantity) || 1;
        target.amount = Math.round(qty * prod.unitPrice * 100) / 100;
      }
    } else if (field === 'quantity') {
      target.quantity = value;
      const qty = parseFloat(value) || 0;
      const rate = parseFloat(target.unitPrice) || 0;
      target.amount = Math.round(qty * rate * 100) / 100;
    } else if (field === 'unitPrice') {
      target.unitPrice = value;
      const qty = parseFloat(target.quantity) || 0;
      const rate = parseFloat(value) || 0;
      target.amount = Math.round(qty * rate * 100) / 100;
    }

    updated[index] = target;
    setSaleItems(updated);
    syncTotalAmountFromItems(updated);
  };

  // Adjust item quantity with +/- buttons
  const handleAdjustQuantity = (index: number, delta: number) => {
    const target = saleItems[index];
    if (!target) return;
    const currentQty = parseFloat(target.quantity) || 0;
    const newQty = Math.max(1, currentQty + delta);
    handleUpdateItem(index, 'quantity', newQty.toString());
  };

  // Add another item to the sale cart
  const handleAddSaleItem = (productIdToAdd?: string) => {
    setFormError('');
    if (productIdToAdd) {
      // If product is already in the cart, simply increment its quantity!
      const existingIndex = saleItems.findIndex((it) => it.productId === productIdToAdd);
      if (existingIndex >= 0) {
        handleAdjustQuantity(existingIndex, 1);
        return;
      }

      const prod = activeProducts.find((p) => p.id === productIdToAdd);
      if (prod) {
        const newItem = createSaleLineItem(prod, '1');
        const updated = [...saleItems, newItem];
        setSaleItems(updated);
        syncTotalAmountFromItems(updated);
        return;
      }
    }

    // Find next unused product in catalog or fallback to first product
    const usedIds = new Set(saleItems.map((i) => i.productId));
    const nextProd = activeProducts.find((p) => !usedIds.has(p.id)) || activeProducts[0];
    const newItem = createSaleLineItem(nextProd, '1');
    const updated = [...saleItems, newItem];
    setSaleItems(updated);
    syncTotalAmountFromItems(updated);
  };

  // Remove item from sale cart
  const handleRemoveSaleItem = (index: number) => {
    setFormError('');
    if (saleItems.length <= 1) {
      return;
    }
    const updated = saleItems.filter((_, i) => i !== index);
    setSaleItems(updated);
    syncTotalAmountFromItems(updated);
  };

  // Handle Expense Category Selection (Expense Mode)
  const handleExpenseCategorySelect = (categoryName: string) => {
    setSelectedExpenseCategory(categoryName);
    setFormError('');
  };

  if (!isOpen) return null;

  // Inventory validation checks across all items in POS sale
  const stockExceededItems =
    type === 'sale'
      ? saleItems
          .map((item, idx) => {
            const prod = activeProducts.find((p) => p.id === item.productId);
            if (prod && prod.type === 'product' && prod.inStock !== undefined) {
              const qty = parseFloat(item.quantity) || 0;
              if (qty > prod.inStock) {
                return {
                  index: idx,
                  name: prod.name,
                  inStock: prod.inStock,
                  requested: qty,
                  unitType: prod.unitType,
                };
              }
            }
            return null;
          })
          .filter(Boolean)
      : [];

  const isAnyStockExceeded = stockExceededItems.length > 0;

  const totalSaleUnits = saleItems.reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0);
  const totalSaleAmount = saleItems.reduce((acc, it) => acc + (it.amount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isAdminMode && type === 'expense') {
      setFormError('Staff roles cannot create new expenses. Expense recording is restricted to Administrators.');
      return;
    }

    if (type === 'sale') {
      if (saleItems.length === 0) {
        setFormError('Please add at least one item to the sale.');
        return;
      }

      // Validate quantities and prices for all items
      for (let i = 0; i < saleItems.length; i++) {
        const item = saleItems[i];
        const q = parseFloat(item.quantity);
        const p = parseFloat(item.unitPrice);
        if (isNaN(q) || q <= 0) {
          setFormError(`Please enter a valid quantity greater than 0 for item #${i + 1} (${item.name || 'Item'}).`);
          return;
        }
        if (isNaN(p) || p < 0) {
          setFormError(`Please enter a valid rate for item #${i + 1} (${item.name || 'Item'}).`);
          return;
        }
      }

      // Stock validation check: Sale cannot proceed if any quantity exceeds inventory
      if (isAnyStockExceeded) {
        const firstIssue = stockExceededItems[0];
        setFormError(
          `Stock Validation Error: Only ${firstIssue?.inStock} ${firstIssue?.unitType} available in inventory for "${firstIssue?.name}". Requested quantity (${firstIssue?.requested}) exceeds available stock.`
        );
        return;
      }

      const finalTotalAmount = totalSaleAmount > 0 ? totalSaleAmount : parseFloat(amount) || 0;
      if (finalTotalAmount <= 0) {
        setFormError('Sale total amount must be greater than 0.');
        return;
      }

      if (customerOrVendor.trim() && onSaveCustomer) {
        onSaveCustomer({
          id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: customerOrVendor.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Construct itemized DocumentLineItem array
      const finalLineItems: DocumentLineItem[] = saleItems.map((item, idx) => {
        const q = parseFloat(item.quantity) || 1;
        const p = parseFloat(item.unitPrice) || 0;
        return {
          id: item.id || `item-${Date.now()}-${idx}`,
          productId: item.productId,
          name: item.name,
          quantity: q,
          unitPrice: p,
          unitType: item.unitType,
          amount: Math.round(q * p * 100) / 100,
        };
      });

      // Composite sale title
      const compositeTitle =
        finalLineItems.length === 1
          ? finalLineItems[0].name
          : `${finalLineItems[0].name} + ${finalLineItems.length - 1} more items`;

      // Auto-summary for notes if not provided
      const itemsSummaryText = finalLineItems
        .map((it) => `${it.name} (${it.quantity} ${it.unitType || 'units'})`)
        .join(', ');

      const defaultSaleNotes =
        finalLineItems.length > 1 ? `POS Sale (${finalLineItems.length} items): ${itemsSummaryText}` : '';

      onAddTransaction({
        title: compositeTitle,
        amount: finalTotalAmount,
        type: 'sale',
        category: saleItems[0]?.category || 'Retail Sales',
        date,
        time,
        paymentMethod,
        financialAccount,
        customerOrVendor: customerOrVendor.trim() || undefined,
        notes: notes.trim() ? notes.trim() : defaultSaleNotes || undefined,
        status: 'completed',
        referenceNo: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: finalLineItems[0].productId,
        productName: finalLineItems[0].name,
        quantity: totalSaleUnits,
        unitPrice: finalLineItems[0].unitPrice,
        unitType: finalLineItems[0].unitType,
        items: finalLineItems,
      });
    } else {
      // Expense mode
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setFormError('Please enter a valid amount greater than 0.');
        return;
      }

      if (!selectedExpenseCategory) {
        setFormError('Please select an expense category from the configured list.');
        return;
      }

      onAddTransaction({
        title: selectedExpenseCategory,
        amount: numAmount,
        type: 'expense',
        category: selectedExpenseCategory,
        date,
        time,
        paymentMethod,
        financialAccount,
        customerOrVendor: customerOrVendor.trim() || undefined,
        notes: notes.trim() || undefined,
        status: 'completed',
        referenceNo: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }

    onClose();
  };

  // Group active expense categories by group for structured display
  const expenseGroups = activeExpenseCategoryList.reduce<Record<string, ExpenseCategoryItem[]>>(
    (acc, item) => {
      const grp = item.group || 'General Expenses';
      if (!acc[grp]) acc[grp] = [];
      acc[grp].push(item);
      return acc;
    },
    {}
  );

  const modalTitle =
    lockedType === 'sale'
      ? 'POS Sale & Cashier'
      : lockedType === 'expense'
      ? 'Record Expense'
      : 'Record Transaction';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="add-transaction-modal"
        className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-2xl sm:max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                type === 'sale' ? 'bg-[#006d30]' : 'bg-[#ba1a1a]'
              }`}
            />
            <h3 className="font-sans text-base sm:text-lg font-bold text-[#191c1e] flex items-center gap-2">
              <span>{modalTitle}</span>
              {type === 'sale' && (
                <span className="font-mono text-[11px] bg-emerald-100 text-[#006d30] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Multi-Item POS
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#191c1e] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Conditional Type Selector or Fixed Header Banner */}
          {lockedType === null ? (
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]">
              <button
                type="button"
                id="type-selector-sale"
                onClick={() => handleTypeSwitch('sale')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  type === 'sale'
                    ? 'bg-white text-[#006d30] shadow-xs border border-emerald-200'
                    : 'text-[#475569] hover:text-[#191c1e]'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>POS Sale (Multi-Item)</span>
              </button>
              <button
                type="button"
                id="type-selector-expense"
                onClick={() => handleTypeSwitch('expense')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-[#ba1a1a] shadow-xs border border-red-200'
                    : 'text-[#475569] hover:text-[#191c1e]'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Expense (From Categories)</span>
              </button>
            </div>
          ) : lockedType === 'sale' ? (
            <div
              id="sale-only-indicator"
              className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 border border-emerald-200 text-[#006d30] rounded-lg"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[#006d30] shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#006d30]">
                    Point of Sale (POS) Cashier
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Record one or multiple items for the same customer with instant receipt generation
                  </div>
                </div>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab('more');
                  }}
                  className="font-mono text-[11px] text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Settings className="w-3 h-3" />
                  <span className="hidden sm:inline">Manage Catalog</span>
                </button>
              )}
            </div>
          ) : (
            <div
              id="expense-only-indicator"
              className="flex items-center justify-between px-3.5 py-2 bg-red-50/80 border border-red-200 text-[#ba1a1a] rounded-lg"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[#ba1a1a] shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#ba1a1a]">
                    Expense Entry
                  </div>
                  <div className="text-[11px] text-red-800">
                    Select from configured business expense accounts
                  </div>
                </div>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab('more');
                  }}
                  className="font-mono text-[11px] text-red-800 hover:text-red-950 underline flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Manage Categories</span>
                </button>
              )}
            </div>
          )}

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ========================================================= */}
            {/* CASE 1: MULTI-ITEM POS SALES MODE                         */}
            {/* ========================================================= */}
            {type === 'sale' && (
              <div className="space-y-3.5">
                {activeProducts.length === 0 ? (
                  <div className="p-5 bg-amber-50 border border-amber-300 rounded-lg text-center space-y-3">
                    <Package className="w-8 h-8 text-amber-600 mx-auto" />
                    <div>
                      <p className="font-sans font-bold text-sm text-amber-950">
                        No Products or Services in Catalog
                      </p>
                      <p className="font-mono text-xs text-amber-800 mt-1">
                        Sales must be recorded from configured products or services. Add products in Settings to start recording POS sales.
                      </p>
                    </div>
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateTab('more');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00288e] text-white font-mono text-xs font-bold uppercase rounded-md shadow-xs hover:bg-[#1e40af] cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Go to Products & Services Settings</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Quick 1-Tap Catalog Bar */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold uppercase text-[#475569] flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-[#00288e]" />
                          <span>Quick 1-Tap Add to Cart</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Click any item to add or increment
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {activeProducts.map((p) => {
                          const inCart = saleItems.find((it) => it.productId === p.id);
                          const isProductType = p.type === 'product';
                          const stockCount = p.inStock ?? 0;
                          const isOutOfStock = isProductType && stockCount <= 0;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddSaleItem(p.id)}
                              disabled={isOutOfStock}
                              title={
                                isOutOfStock
                                  ? `Out of stock (${p.name})`
                                  : `Add ${p.name} (${getCurrencySymbol(currency)}${p.unitPrice})`
                              }
                              className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                                inCart
                                  ? 'bg-[#006d30] text-white font-bold shadow-xs'
                                  : isOutOfStock
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:border-[#006d30] hover:text-[#006d30]'
                              }`}
                            >
                              <Plus className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[140px] sm:max-w-[200px]">{p.name}</span>
                              <span className="opacity-80 text-[10px] shrink-0">
                                ({getCurrencySymbol(currency).trim()}{p.unitPrice.toLocaleString()})
                              </span>
                              {inCart && (
                                <span className="bg-white/20 text-white font-bold text-[10px] px-1 rounded-full shrink-0">
                                  ×{inCart.quantity}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Multi-Item Line Items List */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block font-mono text-xs text-[#00288e] uppercase font-bold flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4" />
                          <span>Sale Items / Cart ({saleItems.length} {saleItems.length === 1 ? 'item' : 'items'}) *</span>
                        </label>
                        <button
                          type="button"
                          id="btn-add-item-row"
                          onClick={() => handleAddSaleItem()}
                          className="flex items-center gap-1 font-mono text-xs font-bold text-[#006d30] hover:text-[#005224] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>

                      {/* Line Items Container */}
                      <div className="space-y-2">
                        {saleItems.map((item, index) => {
                          const productItem = activeProducts.find((p) => p.id === item.productId);
                          const isProduct = productItem?.type === 'product';
                          const inStock = productItem?.inStock ?? 0;
                          const requestedQty = parseFloat(item.quantity) || 0;
                          const isExceeded = isProduct && productItem?.inStock !== undefined && requestedQty > inStock;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-lg border transition-all ${
                                isExceeded
                                  ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-300'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                                {/* Item Selector */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                                      #{index + 1} Product / Service
                                    </span>
                                    {isProduct && productItem?.inStock !== undefined && (
                                      <span
                                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                          isExceeded
                                            ? 'bg-rose-200 text-rose-900 font-bold'
                                            : inStock > 5
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : inStock > 0
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        Stock: {inStock} {item.unitType}
                                      </span>
                                    )}
                                  </div>
                                  <select
                                    value={item.productId}
                                    onChange={(e) => handleUpdateItem(index, 'productId', e.target.value)}
                                    required
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 hover:border-[#00288e] rounded font-sans text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00288e]"
                                  >
                                    <optgroup label="Physical Products">
                                      {activeProducts
                                        .filter((p) => p.type === 'product')
                                        .map((p) => (
                                          <option key={p.id} value={p.id}>
                                            📦 {p.name} — {getCurrencySymbol(currency)}
                                            {p.unitPrice.toLocaleString()} / {p.unitType}
                                          </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Services">
                                      {activeProducts
                                        .filter((p) => p.type === 'service')
                                        .map((p) => (
                                          <option key={p.id} value={p.id}>
                                            ⚡ {p.name} — {getCurrencySymbol(currency)}
                                            {p.unitPrice.toLocaleString()} / {p.unitType}
                                          </option>
                                        ))}
                                    </optgroup>
                                  </select>
                                </div>

                                {/* Controls Grid: Quantity + Rate + Total + Delete */}
                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                                  {/* Quantity Controls */}
                                  <div>
                                    <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Qty ({item.unitType})
                                    </span>
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustQuantity(index, -1)}
                                        className="w-7 h-[30px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-l font-mono text-xs font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        required
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                                        className={`w-14 h-[30px] px-1 text-center font-mono text-xs font-bold border-y focus:outline-none ${
                                          isExceeded
                                            ? 'bg-rose-50 border-rose-400 text-rose-900'
                                            : 'bg-white border-slate-300 text-slate-900 focus:border-[#00288e]'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustQuantity(index, 1)}
                                        className="w-7 h-[30px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-r font-mono text-xs font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Unit Rate */}
                                  <div className="w-24">
                                    <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Rate ({currency})
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      required
                                      value={item.unitPrice}
                                      onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                                      className="w-full h-[30px] px-2 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00288e]"
                                    />
                                  </div>

                                  {/* Subtotal */}
                                  <div className="w-24 text-right">
                                    <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Subtotal
                                    </span>
                                    <div className="h-[30px] flex items-center justify-end font-mono text-xs font-bold text-[#006d30]">
                                      {formatCurrency(item.amount, currency)}
                                    </div>
                                  </div>

                                  {/* Delete Button */}
                                  <div className="pt-4">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSaleItem(index)}
                                      disabled={saleItems.length <= 1}
                                      title={saleItems.length <= 1 ? 'Minimum 1 item required' : 'Remove item from sale'}
                                      className={`p-1.5 rounded transition-colors ${
                                        saleItems.length <= 1
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                                      }`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Item-specific Stock Limit Error */}
                              {isExceeded && (
                                <div className="mt-2 pt-1.5 border-t border-rose-200 text-rose-800 font-mono text-[11px] flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                  <span>
                                    Requested {item.quantity} {item.unitType}, but only {inStock} {item.unitType} available in inventory.
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Another Item Row Button */}
                      <button
                        type="button"
                        onClick={() => handleAddSaleItem()}
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-[#00288e] text-[#00288e] rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Another Item to This Sale</span>
                      </button>
                    </div>

                    {/* POS Order Summary Box */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold uppercase text-[#006d30] flex items-center gap-1.5">
                          <Calculator className="w-4 h-4" />
                          <span>Sale Total Payable</span>
                        </div>
                        <p className="font-mono text-[11px] text-emerald-800 mt-0.5">
                          {saleItems.length} {saleItems.length === 1 ? 'line item' : 'line items'} •{' '}
                          {totalSaleUnits} total units
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xl sm:text-2xl font-black text-[#006d30]">
                          {formatCurrency(totalSaleAmount, currency)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* CASE 2: EXPENSES MODE (Strictly From Expense Categories)   */}
            {/* ========================================================= */}
            {type === 'expense' && (
              <div className="space-y-3.5">
                {/* Expense Account Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-mono text-xs text-[#ba1a1a] uppercase font-bold flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" />
                      <span>Select Expense Account / Category *</span>
                    </label>
                    <span className="font-mono text-[10px] text-[#64748b]">
                      {activeExpenseCategoryList.length} configured
                    </span>
                  </div>

                  <select
                    id="select-transaction-category"
                    value={selectedExpenseCategory}
                    onChange={(e) => handleExpenseCategorySelect(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#ba1a1a]/30 hover:border-[#ba1a1a] rounded-lg font-sans text-sm text-[#191c1e] font-semibold focus:outline-none focus:border-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/20 transition-all"
                  >
                    {Object.entries(expenseGroups).map(([groupName, items]) => (
                      <optgroup key={groupName} label={groupName}>
                        {items.map((item) => (
                          <option key={item.id} value={item.name}>
                            💳 {item.name} — ({item.group || 'Expense'})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Quick 1-Tap Category Selector Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#64748b] tracking-wider">
                      Quick Pick Expense Account:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {activeExpenseCategoryList.map((item) => {
                      const isSelected = selectedExpenseCategory === item.name;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleExpenseCategorySelect(item.name)}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#ba1a1a] text-white font-bold shadow-xs'
                              : 'bg-white text-[#334155] border border-slate-200 hover:border-[#ba1a1a] hover:text-[#ba1a1a]'
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total Final Amount Field for Expenses */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-mono text-xs text-[#475569] uppercase font-semibold">
                      Total Expense Amount ({currency}) *
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[#64748b] select-none">
                      {getCurrencySymbol(currency).trim()}
                    </span>
                    <input
                      id="input-transaction-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-14 pr-4 py-2.5 bg-white border border-[#94a3b8] rounded-md font-mono text-xl font-bold text-[#191c1e] focus:outline-none focus:border-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/20 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Customer & Payment Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              {/* Customer / Vendor */}
              <div>
                {type === 'sale' ? (
                  <CustomerAutocomplete
                    value={customerOrVendor}
                    onChange={setCustomerOrVendor}
                    onSelectCustomer={(cust) => setCustomerOrVendor(cust.name)}
                    customers={customers}
                    onSaveNewCustomer={onSaveCustomer}
                    label="Customer / Buyer"
                    placeholder="Type customer name to search or add..."
                    id="input-customer-vendor"
                  />
                ) : (
                  <div>
                    <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                      Vendor / Payee
                    </label>
                    <input
                      id="input-customer-vendor"
                      type="text"
                      placeholder="e.g. KPLC, Safaricom, Supplier"
                      value={customerOrVendor}
                      onChange={(e) => setCustomerOrVendor(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                    />
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  id="select-payment-method"
                  value={paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                >
                  <option value="mobile_money">Mobile Money / M-PESA</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card Payment</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="online">Online / Electronic</option>
                </select>
              </div>
            </div>

            {/* Account Credited / Debited (Bank, M-Pesa, Cash) */}
            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="block font-mono text-xs text-[#334155] uppercase font-semibold">
                  {type === 'sale' ? 'Deposit / Credit Account (Inflow) *' : 'Payment / Debit Account (Outflow) *'}
                </label>
                <span className="font-mono text-[10px] text-[#64748b]">
                  {type === 'sale' ? 'Where money enters' : 'Where money leaves'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="select-account-bank"
                  onClick={() => setFinancialAccount('bank')}
                  className={`p-2 rounded-lg border text-left font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    financialAccount === 'bank'
                      ? 'bg-blue-50 border-[#00288e] text-[#00288e] font-bold shadow-xs ring-1 ring-[#00288e]'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0 text-[#00288e]" />
                  <div className="truncate">
                    <p className="text-xs font-bold leading-tight">Bank A/C</p>
                    <p className="text-[10px] text-slate-500 truncate">Operating Bank</p>
                  </div>
                </button>

                <button
                  type="button"
                  id="select-account-mpesa"
                  onClick={() => setFinancialAccount('mpesa')}
                  className={`p-2 rounded-lg border text-left font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    financialAccount === 'mpesa'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-xs ring-1 ring-emerald-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4 shrink-0 text-emerald-600" />
                  <div className="truncate">
                    <p className="text-xs font-bold leading-tight">M-Pesa</p>
                    <p className="text-[10px] text-slate-500 truncate">Till / Paybill</p>
                  </div>
                </button>

                <button
                  type="button"
                  id="select-account-cash"
                  onClick={() => setFinancialAccount('cash')}
                  className={`p-2 rounded-lg border text-left font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    financialAccount === 'cash'
                      ? 'bg-amber-50 border-amber-600 text-amber-900 font-bold shadow-xs ring-1 ring-amber-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0 text-amber-600" />
                  <div className="truncate">
                    <p className="text-xs font-bold leading-tight">Cash Drawer</p>
                    <p className="text-[10px] text-slate-500 truncate">Till Float</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                  Date
                </label>
                <input
                  id="input-transaction-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                  Time
                </label>
                <input
                  id="input-transaction-time"
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="10:42 AM"
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                />
              </div>
            </div>

            {/* Notes & Memo Reference */}
            <div>
              <label className="block font-mono text-xs text-[#475569] uppercase font-semibold mb-1">
                Notes & Receipt Memo
              </label>
              <textarea
                id="input-transaction-notes"
                rows={2}
                placeholder={
                  type === 'sale'
                    ? 'Optional delivery note, order reference, or customer remarks...'
                    : 'Optional receipt number, token account, invoice details, or memo...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-[#e2e8f0]">
              {onNavigateTab && type === 'sale' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab('more');
                  }}
                  className="text-xs font-mono text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure Products Catalog</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#475569] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-transaction-btn"
                  disabled={isAnyStockExceeded}
                  title={isAnyStockExceeded ? 'Cannot proceed: requested quantity exceeds available inventory' : undefined}
                  className={`px-5 py-2.5 text-xs font-mono uppercase font-bold text-white rounded-md shadow-sm transition-all flex items-center gap-1.5 ${
                    isAnyStockExceeded
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : type === 'sale'
                      ? 'bg-[#006d30] hover:bg-[#005224] cursor-pointer active:scale-95'
                      : 'bg-[#ba1a1a] hover:bg-[#93000a] cursor-pointer active:scale-95'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {type === 'sale'
                      ? `Save Sale (${formatCurrency(totalSaleAmount, currency)})`
                      : 'Save Expense'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
