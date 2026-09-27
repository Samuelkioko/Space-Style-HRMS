import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Scale,
  Sparkles,
  Tag,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Boxes,
  RotateCcw,
} from 'lucide-react';
import { ProductServiceItem, UnitType } from '../types';
import { getCurrencySymbol, formatCurrency } from '../utils/formatters';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';

interface ProductCatalogManagerProps {
  products: ProductServiceItem[];
  currency: string;
  onSaveProduct: (product: ProductServiceItem) => Promise<void> | void;
  onDeleteProduct: (productId: string) => Promise<void> | void;
  onResetToDefaults: () => Promise<void> | void;
}

export const ProductCatalogManager: React.FC<ProductCatalogManagerProps> = ({
  products,
  currency,
  onSaveProduct,
  onDeleteProduct,
  onResetToDefaults,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'service' | 'low_stock'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductServiceItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Quick Restock state
  const [restockModalItem, setRestockModalItem] = useState<ProductServiceItem | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [category, setCategory] = useState('Fabrication & Machining');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('pcs');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [inStock, setInStock] = useState('50');
  const [isActive, setIsActive] = useState(true);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setType('product');
    setCategory('Fabricated Enclosures');
    setUnitPrice('');
    setUnitType('pcs');
    setDescription('');
    setSku(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setInStock('25');
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: ProductServiceItem) => {
    setEditingItem(item);
    setName(item.name);
    setType(item.type);
    setCategory(item.category || (item.type === 'product' ? 'Fabricated Enclosures' : 'Fabrication & Machining'));
    setUnitPrice(item.unitPrice.toString());
    setUnitType(item.unitType || (item.type === 'product' ? 'pcs' : 'hours'));
    setDescription(item.description || '');
    setSku(item.sku || '');
    setInStock(item.inStock !== undefined ? item.inStock.toString() : '0');
    setIsActive(item.isActive !== false);
    setIsModalOpen(true);
  };

  // Save / Update Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(unitPrice);
    if (!name.trim() || isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid product name and price.');
      return;
    }

    setIsSaving(true);
    const stockVal = type === 'product' ? (inStock.trim() !== '' ? parseFloat(inStock) : 0) : undefined;

    const itemToSave: ProductServiceItem = {
      id: editingItem ? editingItem.id : `prod-${Date.now()}`,
      name: name.trim(),
      type,
      category: category.trim() || (type === 'product' ? 'Fabricated Enclosures' : 'Fabrication & Machining'),
      unitPrice: priceNum,
      unitType,
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      inStock: stockVal,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveProduct(itemToSave);
      setFeedbackMsg(editingItem ? `Updated "${itemToSave.name}"` : `Added "${itemToSave.name}" to catalog!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Error saving item: ${err.message || 'Failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Restock Handler
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    const addQty = parseFloat(restockQty);
    if (isNaN(addQty)) {
      alert('Please enter a valid restock quantity.');
      return;
    }

    const currentStock = typeof restockModalItem.inStock === 'number' ? restockModalItem.inStock : 0;
    const newStock = currentStock + addQty;

    const updatedItem: ProductServiceItem = {
      ...restockModalItem,
      inStock: newStock,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveProduct(updatedItem);
      setFeedbackMsg(`Restocked "${restockModalItem.name}": +${addQty} ${restockModalItem.unitType} (Total: ${newStock})`);
      setTimeout(() => setFeedbackMsg(null), 3500);
      setRestockModalItem(null);
    } catch (err: any) {
      alert(`Failed to restock: ${err.message || 'Error'}`);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string, itemName: string) => {
    try {
      await onDeleteProduct(id);
      setConfirmDeleteId(null);
      setFeedbackMsg(`Removed "${itemName}" from catalog.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete item:', err);
    }
  };

  // Filtered list
  const filteredProducts = products.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchSearch) return false;

    if (filterType === 'all') return true;
    if (filterType === 'product') return item.type === 'product';
    if (filterType === 'service') return item.type === 'service';
    if (filterType === 'low_stock') {
      return item.type === 'product' && ((item.inStock ?? 0) <= 5);
    }
    return true;
  });

  const physicalProducts = products.filter((p) => p.type === 'product');
  const servicesList = products.filter((p) => p.type === 'service');
  const lowStockCount = physicalProducts.filter((p) => (p.inStock ?? 0) <= 5).length;
  const outOfStockCount = physicalProducts.filter((p) => (p.inStock ?? 0) <= 0).length;

  return (
    <div id="product-catalog-manager" className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-[#006d30] rounded-lg font-mono text-xs font-semibold animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Catalog Overview Header Card */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-5 md:p-6 kpi-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00288e]" />
            <span className="font-mono text-xs text-[#00288e] uppercase font-bold tracking-widest">
              Products, Inventory & Rate Cards
            </span>
          </div>
          <h3 className="font-sans text-xl font-bold text-[#191c1e] tracking-tight mt-1">
            Products & Services Master Catalog
          </h3>
          <p className="font-mono text-xs text-[#475569] mt-0.5">
            Specify physical products (tracks real-time stock & deductions on sale) vs on-demand services (labor, cutting, bending).
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            id="btn-add-new-product"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white px-4 py-2.5 rounded-md font-mono text-xs uppercase font-bold tracking-wider transition-colors shadow-xs active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item / Service</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Total Catalog Items</span>
          <p className="font-sans text-2xl font-bold text-[#191c1e] mt-1">
            {products.length} <span className="text-xs font-mono text-[#64748b] font-normal">Active</span>
          </p>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Physical Products</span>
          <p className="font-sans text-2xl font-bold text-[#006d30] mt-1">
            {physicalProducts.length} <span className="text-xs font-mono text-[#64748b] font-normal">Tracked</span>
          </p>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">On-Demand Services</span>
          <p className="font-sans text-2xl font-bold text-[#00288e] mt-1">
            {servicesList.length} <span className="text-xs font-mono text-[#64748b] font-normal">Services</span>
          </p>
        </div>

        <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow">
          <span className="font-mono text-xs uppercase text-[#475569]">Low / Out of Stock</span>
          <p className={`font-sans text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-[#ba1a1a]' : 'text-slate-700'}`}>
            {lowStockCount} <span className="text-xs font-mono text-[#64748b] font-normal">Items ({outOfStockCount} zero)</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 kpi-shadow flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search by name, SKU or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#00288e] text-white'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
            }`}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setFilterType('product')}
            className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer ${
              filterType === 'product'
                ? 'bg-[#00288e] text-white'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
            }`}
          >
            Products ({physicalProducts.length})
          </button>
          <button
            onClick={() => setFilterType('service')}
            className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer ${
              filterType === 'service'
                ? 'bg-[#00288e] text-white'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-slate-200'
            }`}
          >
            Services ({servicesList.length})
          </button>
          {lowStockCount > 0 && (
            <button
              onClick={() => setFilterType('low_stock')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs uppercase font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'low_stock'
                  ? 'bg-[#ba1a1a] text-white'
                  : 'bg-rose-50 text-[#ba1a1a] border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock ({lowStockCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-[#c4c5d5]/70 rounded-lg overflow-hidden kpi-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#cbd5e1] font-mono text-[11px] text-[#475569] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-center">Remaining Stock / Availability</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748b] font-mono">
                    <Package className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                    No products or services found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const stockNum = item.inStock ?? 0;
                  const isProduct = item.type === 'product';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#191c1e] text-sm flex items-center gap-1.5">
                          {isProduct ? (
                            <Boxes className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-[#00288e] flex-shrink-0" />
                          )}
                          <span>{item.name}</span>
                        </div>
                        {item.sku && (
                          <div className="font-mono text-[10px] text-[#64748b] mt-0.5">
                            SKU: <span className="text-[#00288e] font-semibold">{item.sku}</span>
                          </div>
                        )}
                        {item.description && (
                          <div className="text-[11px] text-[#64748b] truncate max-w-xs mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                            isProduct
                              ? 'bg-emerald-50 text-[#006d30] border border-emerald-200'
                              : 'bg-blue-50 text-[#00288e] border border-blue-200'
                          }`}
                        >
                          {isProduct ? 'Physical Product' : 'Service / Labor'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 font-mono text-[#334155]">
                        {item.category || 'General'}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#006d30]">
                        {getCurrencySymbol(currency)}{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-[#64748b] font-normal block">
                          per {item.unitType}
                        </span>
                      </td>

                      {/* Remaining Stock / Inventory Column */}
                      <td className="py-3.5 px-4 text-center">
                        {isProduct ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            {stockNum > 5 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-emerald-50 text-[#006d30] border border-emerald-200">
                                <Boxes className="w-3 h-3 text-emerald-600" />
                                <span>{stockNum} {item.unitType} in stock</span>
                              </span>
                            ) : stockNum > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Low: {stockNum} {item.unitType} left</span>
                              </span>
                            ) : stockNum === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-rose-50 text-[#ba1a1a] border border-rose-300">
                                <AlertCircle className="w-3 h-3 text-[#ba1a1a]" />
                                <span>0 {item.unitType} (Out of Stock)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
                                <RotateCcw className="w-3 h-3 text-purple-600" />
                                <span>Backordered ({stockNum} {item.unitType})</span>
                              </span>
                            )}

                            {/* Quick Restock Action Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRestockModalItem(item);
                                setRestockQty('10');
                              }}
                              className="text-[10px] font-mono text-[#00288e] hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                            >
                              <Plus className="w-2.5 h-2.5" /> Quick Restock
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-semibold bg-blue-50/70 text-[#00288e] border border-blue-200/60">
                            <Sparkles className="w-3 h-3 text-[#00288e]" />
                            <span>On-Demand (Unlimited)</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            item.isActive !== false ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'
                          }`}
                          title={item.isActive !== false ? 'Active for sales' : 'Inactive'}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-[#00288e] hover:bg-blue-100/60 rounded-md transition-colors cursor-pointer"
                            title="Edit product details & stock"
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
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Reset button */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#cbd5e1] flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="font-mono text-xs text-[#64748b]">
            Showing {filteredProducts.length} of {products.length} products & services
          </span>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-red-600 font-bold">Reset all products?</span>
              <button
                type="button"
                onClick={async () => {
                  await onResetToDefaults();
                  setConfirmReset(false);
                  setFeedbackMsg('Catalog reset to workshop fabrication presets.');
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
              className="font-mono text-xs text-[#64748b] hover:text-[#00288e] hover:underline cursor-pointer"
            >
              ↺ Restore Standard Preset Catalog
            </button>
          )}
        </div>
      </div>

      {/* QUICK RESTOCK MODAL */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#00288e]" />
                <h3 className="font-sans text-sm font-bold text-[#191c1e]">
                  Restock Inventory: {restockModalItem.name}
                </h3>
              </div>
              <button
                onClick={() => setRestockModalItem(null)}
                className="text-[#64748b] hover:text-[#191c1e] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-5 space-y-3 font-sans text-xs">
              <div className="font-mono text-xs text-[#475569] bg-slate-50 p-2.5 rounded border border-slate-200">
                Current Stock: <span className="font-bold text-[#191c1e]">{restockModalItem.inStock ?? 0} {restockModalItem.unitType}</span>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[#00288e] uppercase font-bold mb-1">
                  Quantity to Add ({restockModalItem.unitType}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-mono text-sm font-bold text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                  placeholder="e.g. 20"
                />
              </div>

              <div className="font-mono text-[11px] text-[#006d30] font-semibold">
                New Total: {(restockModalItem.inStock ?? 0) + (parseFloat(restockQty) || 0)} {restockModalItem.unitType}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-3 py-1.5 font-mono text-xs uppercase font-semibold text-[#64748b] hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-mono text-xs uppercase font-bold text-white bg-[#00288e] hover:bg-[#1e40af] rounded shadow-xs cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#c4c5d5] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#00288e]" />
                <h3 className="font-sans text-lg font-bold text-[#191c1e]">
                  {editingItem ? 'Edit Product / Service' : 'Add New Product or Service'}
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
              {/* Type Switcher: Product vs Service */}
              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                  Specify Category Type *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => {
                      setType('product');
                      setUnitType('pcs');
                    }}
                    className={`py-2.5 px-3 rounded font-mono text-xs font-bold uppercase transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      type === 'product'
                        ? 'bg-white text-[#006d30] shadow-xs border border-emerald-200'
                        : 'text-[#475569] hover:text-[#191c1e]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Physical Product</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Tracks Inventory Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('service');
                      setUnitType('hours');
                    }}
                    className={`py-2.5 px-3 rounded font-mono text-xs font-bold uppercase transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      type === 'service'
                        ? 'bg-white text-[#00288e] shadow-xs border border-blue-200'
                        : 'text-[#475569] hover:text-[#191c1e]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Service / Labor</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">On-Demand (No Stock)</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                  {type === 'product' ? 'Product Name *' : 'Service Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={type === 'product' ? 'e.g. Electric Boxes or Sheet Metal Enclosures' : 'e.g. Bending, Cutting, CNC or Powder Coating'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20 font-medium"
                />
              </div>

              {/* Unit Price & Measurement Grid */}
              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-lg border border-blue-200/60">
                <div>
                  <label className="block font-mono text-[11px] text-[#00288e] uppercase font-bold mb-1">
                    Price Rate ({currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#64748b]">
                      {getCurrencySymbol(currency).trim()}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full pl-11 pr-3 py-2 bg-white border border-[#94a3b8] rounded font-mono text-sm font-bold text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-[#00288e] uppercase font-bold mb-1">
                    Measurement Unit *
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                    className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-mono text-xs font-bold text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="meters">meters (Meters)</option>
                    <option value="units">units (Units)</option>
                    <option value="hours">hours (Hourly Rate)</option>
                    <option value="service">service (Fixed Service Fee)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="boxes">boxes (Boxes / Cartons)</option>
                    <option value="bags">bags (Bags)</option>
                    <option value="liters">liters (Liters)</option>
                    <option value="g">g (Grams)</option>
                  </select>
                </div>

                <div className="col-span-2 text-right font-mono text-[11px] text-[#006d30] font-bold">
                  Billing Rate: {getCurrencySymbol(currency)}{parseFloat(unitPrice || '0').toLocaleString()} / {unitType}
                </div>
              </div>

              {/* INVENTORY STOCK FIELD (FOR PHYSICAL PRODUCTS ONLY) */}
              {type === 'product' ? (
                <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[11px] text-[#006d30] uppercase font-bold flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Available In-Stock Inventory ({unitType}) *</span>
                    </label>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                      Auto-Deducts on Sale
                    </span>
                  </div>

                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 50"
                    value={inStock}
                    onChange={(e) => setInStock(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-mono text-sm font-bold text-[#191c1e] focus:outline-none focus:border-[#006d30] focus:ring-2 focus:ring-[#006d30]/20"
                  />
                  <p className="font-mono text-[10px] text-[#475569]">
                    Current inventory balance. When you sell this product, stock will reduce automatically. You can also sell even if 0 (backorders permitted).
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-[#64748b] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00288e] flex-shrink-0" />
                  <span>On-demand service. No physical stock required. Available indefinitely for unlimited sales logs.</span>
                </div>
              )}

              {/* Category & SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                    Ledger Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fabrication & Machining"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                    SKU / Reference Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRD-EBOX-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-[11px] text-[#475569] uppercase font-bold mb-1">
                  Item Description & Specs
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details, dimensions, machine specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#94a3b8] rounded font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="checkbox-item-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                />
                <label htmlFor="checkbox-item-active" className="font-mono text-xs font-semibold text-[#191c1e] cursor-pointer">
                  Available in Sales entry dropdown
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#475569] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-mono uppercase font-bold text-white bg-[#00288e] hover:bg-[#1e40af] active:scale-95 rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

