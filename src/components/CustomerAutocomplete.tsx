import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Search,
  Plus,
  Check,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  ChevronDown,
  X,
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCustomer?: (customer: Customer) => void;
  customers: Customer[];
  onSaveNewCustomer?: (customer: Customer) => Promise<void> | void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  label?: string;
  isSaleOrInvoice?: boolean;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onChange,
  onSelectCustomer,
  customers = [],
  onSaveNewCustomer,
  placeholder = 'Type customer or company name...',
  required = false,
  id = 'customer-autocomplete-input',
  className = '',
  label = 'Customer / Organization Name *',
  isSaleOrInvoice = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const matchedCustomers = query
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.toLowerCase().includes(query)) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.taxId && c.taxId.toLowerCase().includes(query))
      )
    : customers.slice(0, 8); // show recent/first 8 if empty

  const exactMatch = customers.find(
    (c) => c.name.trim().toLowerCase() === value.trim().toLowerCase()
  );

  const handleSelect = (customer: Customer) => {
    onChange(customer.name);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
    setIsOpen(false);
    setIsQuickCreateOpen(false);
  };

  const handleQuickCreateAndSave = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmedName = value.trim();
    if (!trimmedName) return;

    // Check if customer already exists in the customers table
    const existing = customers.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      // Customer already exists: select them and don't create duplicate
      handleSelect(existing);
      setSuccessMsg(`Customer "${existing.name}" is already in database and selected.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setIsQuickCreateOpen(false);
      return;
    }

    // Customer does NOT exist: Save them in the customers table & cloud database
    setIsSaving(true);
    const newCust: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: trimmedName,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      taxId: newTaxId.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (onSaveNewCustomer) {
        await onSaveNewCustomer(newCust);
      }
      if (onSelectCustomer) {
        onSelectCustomer(newCust);
      }
      setSuccessMsg(`Customer "${newCust.name}" saved to database successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setIsOpen(false);
      setIsQuickCreateOpen(false);
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setNewTaxId('');
    } catch (err) {
      console.error('Error saving customer:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={id}
            className="block font-mono text-[11px] text-[#475569] uppercase font-semibold"
          >
            {label}
          </label>
          {exactMatch ? (
            <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" /> Saved Customer
            </span>
          ) : value.trim() ? (
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
              className="font-mono text-[10px] text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Plus className="w-3 h-3" />
              {isQuickCreateOpen ? 'Hide Quick Add' : '+ Add Details / Save Customer Now'}
            </button>
          ) : null}
        </div>
      )}

      {/* Main Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <User className="w-4 h-4" />
        </div>
        <input
          id={id}
          type="text"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-8 py-2 bg-white border border-[#94a3b8] rounded-md font-sans text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20 transition-colors"
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(true);
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Search & Suggestions Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#cbd5e1] rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
          {/* Header indicator */}
          <div className="px-3 py-2 bg-slate-50 flex items-center justify-between text-[11px] font-mono text-[#64748b]">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-[#475569]">
              <Search className="w-3 h-3 text-[#00288e]" />
              {query ? `Matching Customers (${matchedCustomers.length})` : 'Recent Saved Customers'}
            </span>
            <span>{customers.length} in database</span>
          </div>

          {/* List of matches */}
          {matchedCustomers.length > 0 ? (
            <div className="py-1">
              {matchedCustomers.map((cust) => {
                const isSelected = cust.name.toLowerCase() === query;
                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelect(cust)}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-sans text-xs font-bold text-[#191c1e] truncate flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-[#00288e] shrink-0" />
                        <span className="truncate">{cust.name}</span>
                      </div>
                      <div className="font-mono text-[11px] text-[#64748b] flex items-center gap-3 flex-wrap">
                        {cust.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cust.email}
                          </span>
                        )}
                        {cust.taxId && (
                          <span className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                            PIN: {cust.taxId}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 font-mono">
              No saved customer found matching &quot;{value}&quot;
            </div>
          )}
        </div>
      )}

      {/* Success Banner when customer is saved */}
      {successMsg && (
        <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 font-mono text-xs animate-in fade-in duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Add Customer Details Drawer / Panel */}
      {isQuickCreateOpen && value.trim() && (
        <div className="mt-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#00288e] uppercase flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Quick Save Customer: &quot;{value.trim()}&quot;
            </span>
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
            <div>
              <label className="block text-[10px] text-[#475569] uppercase font-semibold mb-0.5">
                Customer Phone
              </label>
              <input
                type="text"
                placeholder="e.g. 0712345678"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#475569] uppercase font-semibold mb-0.5">
                KRA PIN / Tax ID
              </label>
              <input
                type="text"
                placeholder="e.g. P051239841K"
                value={newTaxId}
                onChange={(e) => setNewTaxId(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#475569] uppercase font-semibold mb-0.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@domain.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#475569] uppercase font-semibold mb-0.5">
                Physical Address
              </label>
              <input
                type="text"
                placeholder="Nairobi, Kenya"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-mono font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleQuickCreateAndSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-[#00288e] text-white rounded text-xs font-mono font-bold uppercase hover:bg-[#1e40af] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? 'Saving...' : 'Save Customer Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
