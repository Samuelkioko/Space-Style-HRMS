import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  onSaveCustomer: (customer: Customer) => Promise<void> | void;
  onDeleteCustomer: (id: string) => Promise<void> | void;
  isAdmin?: boolean;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  onSaveCustomer,
  onDeleteCustomer,
  isAdmin = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setBillingAddress('');
    setTaxId('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setBillingAddress(customer.billingAddress || customer.address || '');
    setTaxId(customer.taxId || customer.kraPin || customer.pin || '');
    setNotes(customer.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setFormError(null);

    // Strict duplicate check: Name, Tax PIN, Phone, Email
    const cleanLowerName = trimmedName.toLowerCase();
    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanTax = taxId.trim().toUpperCase();

    const duplicate = customers.find((c) => {
      if (editingCustomer && c.id === editingCustomer.id) return false;
      // Check Name match
      if (c.name.trim().toLowerCase() === cleanLowerName) return true;
      // Check Tax ID / PIN match
      const cTax = (c.taxId || c.kraPin || c.pin || '').trim().toUpperCase();
      if (cleanTax && cTax && cTax === cleanTax) return true;
      // Check Email match
      if (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) return true;
      // Check Phone match
      if (cleanPhone && c.phone) {
        const cPhone = c.phone.trim().replace(/[\s\-\(\)]/g, '');
        if (cPhone && cPhone === cleanPhone) return true;
      }
      return false;
    });

    if (duplicate) {
      let reason = `the name "${duplicate.name}"`;
      const cTax = (duplicate.taxId || duplicate.kraPin || duplicate.pin || '').trim().toUpperCase();
      if (cleanTax && cTax && cTax === cleanTax) {
        reason = `the KRA PIN / Tax ID "${cTax}" (Registered to ${duplicate.name})`;
      } else if (cleanEmail && duplicate.email?.trim().toLowerCase() === cleanEmail) {
        reason = `the email address "${duplicate.email}" (Registered to ${duplicate.name})`;
      } else if (cleanPhone && duplicate.phone?.trim().replace(/[\s\-\(\)]/g, '') === cleanPhone) {
        reason = `the phone number "${duplicate.phone}" (Registered to ${duplicate.name})`;
      }

      setFormError(`Duplicate Customer Found: A record already exists with ${reason}. Duplicates are strictly prevented. Please update the existing customer instead.`);
      return;
    }

    setIsSaving(true);
    try {
      const finalTax = taxId.trim() || undefined;
      const finalBilling = billingAddress.trim() || address.trim() || undefined;
      const finalPhysical = address.trim() || billingAddress.trim() || undefined;

      const customerToSave: Customer = {
        id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: trimmedName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: finalPhysical,
        billingAddress: finalBilling,
        taxId: finalTax,
        kraPin: finalTax,
        pin: finalTax,
        notes: notes.trim() || undefined,
        createdAt: editingCustomer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSaveCustomer(customerToSave);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving customer:', err);
      setFormError('Failed to save customer to database. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteCustomer(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  const filtered = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.taxId && c.taxId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="font-sans text-base font-bold text-[#191c1e] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00288e]" />
            <span>Customer & Client Directory</span>
          </h3>
          <p className="font-mono text-xs text-[#64748b] mt-0.5">
            {customers.length} saved customer(s) in cloud database. Automatically saved during sales & invoicing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, PIN, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            id="btn-add-customer-entry"
            className="flex items-center gap-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white font-mono text-xs font-bold uppercase px-3.5 py-2 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Customers List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-sans font-bold text-sm text-slate-700">
            {searchTerm ? 'No matching customers found' : 'No customers saved yet'}
          </p>
          <p className="font-mono text-xs text-slate-500 max-w-md mx-auto">
            Customers are automatically saved when you type their name in sales transactions, quotations, invoices, or receipts.
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-[#00288e] text-white rounded text-xs font-mono font-bold uppercase cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Customer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((cust) => (
            <div
              key={cust.id}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-[#00288e]/40 transition-all space-y-2.5 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-sans font-bold text-sm text-[#191c1e] flex items-center gap-1.5 truncate">
                    <Building className="w-4 h-4 text-[#00288e] shrink-0" />
                    <span className="truncate">{cust.name}</span>
                  </h4>
                  {cust.taxId && (
                    <span className="inline-block mt-0.5 font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      KRA PIN: {cust.taxId}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="p-1 text-slate-500 hover:text-[#00288e] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Edit Customer Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteId === cust.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-200">
                      <button
                        onClick={() => handleDelete(cust.id)}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                      >
                        Confirm Delete
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
                      onClick={() => setConfirmDeleteId(cust.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Delete Customer from Directory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs text-[#475569] pt-1 border-t border-slate-100">
                {cust.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                )}
                {cust.billingAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">Billing: {cust.billingAddress}</span>
                  </div>
                )}
                {cust.address && cust.address !== cust.billingAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Delivery: {cust.address}</span>
                  </div>
                )}
                {cust.notes && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded mt-1">
                    {cust.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-sans text-sm font-bold text-[#191c1e] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00288e]" />
                <span>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 font-mono text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Cannot Save Customer:</span>
                    <p className="font-sans text-xs">{formError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-[#475569] uppercase font-bold mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Works Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-sans text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-[#475569] uppercase font-bold mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="0728353883"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#475569] uppercase font-bold mb-1">
                    KRA PIN / PIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="P052254755G"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#475569] uppercase font-bold mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="client@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#475569] uppercase font-bold mb-1">
                  Billing Address (for Invoices & Quotations)
                </label>
                <input
                  type="text"
                  placeholder="e.g. P.O. Box 4520-00100, Nairobi"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#475569] uppercase font-bold mb-1">
                  Physical / Delivery Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Workshop Road, Industrial Area, Nairobi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#475569] uppercase font-bold mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms, contact person, preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-[#191c1e] focus:outline-none focus:border-[#00288e]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-mono text-xs uppercase font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#00288e] text-white rounded font-mono text-xs uppercase font-bold hover:bg-[#1e40af] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save to Cloud'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
