import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Users, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  Unlock, 
  Trash2, 
  ExternalLink,
  Store,
  Layers,
  Power
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { DEMO_PERSONAS } from '../contracts/addresses';
import { DepartmentBudget } from '../types';

export const Budgets: React.FC = () => {
  const { 
    budgets, 
    vendors, 
    setDepartmentBudget, 
    setDepartmentActive,
    setVendorApproval, 
    isLoading 
  } = useWeb3();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<DepartmentBudget | null>(null);

  // Form states for Budget configuration
  const [formRoleName, setFormRoleName] = useState('');
  const [formLeadAddress, setFormLeadAddress] = useState(DEMO_PERSONAS[0].address);
  const [formMonthlyCeiling, setFormMonthlyCeiling] = useState('1000');
  const [formEpochDays, setFormEpochDays] = useState(30);
  const [formEnforceWhitelist, setFormEnforceWhitelist] = useState(true);

  // Form states for Vendor Whitelist
  const [targetLead, setTargetLead] = useState(DEMO_PERSONAS[0].address);
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Campus Catering');

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4).toUpperCase()}`;
  };

  // Helper to calculate next reset countdown in days and date string
  const calculateEpochReset = (epochStart: bigint, epochDuration: bigint) => {
    const startSec = Number(epochStart);
    const durationSec = Number(epochDuration);
    const endSec = startSec + durationSec;
    const nowSec = Math.floor(Date.now() / 1000);

    const secondsRemaining = Math.max(endSec - nowSec, 0);
    const daysRemaining = Math.ceil(secondsRemaining / 86400);

    const resetDate = new Date(endSec * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return {
      daysRemaining: daysRemaining === 0 ? 'Today' : `${daysRemaining} days`,
      resetDate,
    };
  };

  // Open modal for a new budget
  const handleOpenNewBudget = () => {
    setSelectedBudget(null);
    setFormRoleName('');
    setFormLeadAddress(DEMO_PERSONAS[0].address);
    setFormMonthlyCeiling('1000');
    setFormEpochDays(30);
    setFormEnforceWhitelist(true);
    setIsEditModalOpen(true);
  };

  // Open modal to edit existing budget
  const handleOpenEditBudget = (budget: DepartmentBudget) => {
    setSelectedBudget(budget);
    setFormRoleName(budget.roleName);
    setFormLeadAddress(budget.lead);
    setFormMonthlyCeiling((Number(budget.monthlyCeiling) / 1e6).toString());
    setFormEpochDays(Math.round(Number(budget.epochDuration) / 86400));
    setFormEnforceWhitelist(budget.enforceVendorWhitelist);
    setIsEditModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoleName || !formLeadAddress || !formMonthlyCeiling) return;
    await setDepartmentBudget(
      formLeadAddress,
      formRoleName,
      formMonthlyCeiling,
      formEpochDays,
      formEnforceWhitelist
    );
    setIsEditModalOpen(false);
  };

  const handleToggleActive = async (budget: DepartmentBudget) => {
    await setDepartmentActive(budget.lead, !budget.isActive);
  };

  const handleAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorAddress || !vendorName) return;
    await setVendorApproval(targetLead, vendorAddress, true, vendorName, vendorCategory);
    setIsAddVendorModalOpen(false);
    setVendorAddress('');
    setVendorName('');
  };

  const handleRemoveVendor = async (lead: string, vendorAddr: string) => {
    await setVendorApproval(lead, vendorAddr, false, '', '');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Department Budgets & Policies
          </h1>
          <p className="text-sm text-slate-400">
            Configure department spending ceilings, authorized leads, 30-day reset cycles, and approved vendor whitelists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTargetLead(budgets[0]?.lead || DEMO_PERSONAS[0].address);
              setIsAddVendorModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Approved Vendor</span>
          </button>
          <button
            onClick={handleOpenNewBudget}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Department Role</span>
          </button>
        </div>
      </div>

      {/* DEPARTMENT BUDGET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget, idx) => {
          const ceiling = Number(budget.monthlyCeiling) / 1e6;
          const spent = Number(budget.spentInCurrentEpoch) / 1e6;
          const remaining = Math.max(ceiling - spent, 0);
          const percentUsed = Math.min((spent / ceiling) * 100, 100);

          const { daysRemaining, resetDate } = calculateEpochReset(
            budget.epochStart,
            budget.epochDuration
          );

          const deptVendors = vendors.filter(
            (v) => v.departmentLead.toLowerCase() === budget.lead.toLowerCase()
          );

          return (
            <div
              key={idx}
              className={`p-6 rounded-3xl bg-[#0D1322] border transition-all flex flex-col justify-between space-y-6 shadow-sm ${
                budget.isActive
                  ? 'border-slate-800/90 hover:border-slate-700'
                  : 'border-slate-800/40 opacity-75 bg-slate-950/40'
              }`}
            >
              {/* Card Header: Department Name & Status */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-mono">
                      Department #{idx + 1}
                    </span>
                    <h2 className="text-xl font-bold text-white tracking-tight leading-tight mt-0.5">
                      {budget.roleName}
                    </h2>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(budget)}
                      title={budget.isActive ? 'Pause Department' : 'Activate Department'}
                      className={`p-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                        budget.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{budget.isActive ? 'Active' : 'Paused'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditBudget(budget)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      title="Edit Budget Policy"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lead Wallet Address */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">Lead:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {shortenAddress(budget.lead)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Authorized Spender</span>
                </div>

                {/* 3 Metric Blocks: Monthly Budget, Spent, Remaining */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Monthly Budget
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      ${ceiling.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Spent
                    </div>
                    <div className="text-base font-bold text-amber-300 font-mono">
                      ${spent.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Remaining
                    </div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      ${remaining.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Budget Utilization Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Allowance Used</span>
                    <span className="font-semibold text-slate-300">{percentUsed.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentUsed > 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>

                {/* Vendor Policy Section */}
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {budget.enforceVendorWhitelist ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="font-semibold text-slate-200">
                        {budget.enforceVendorWhitelist ? 'Approved Vendors Only' : 'Open Vendor Policy'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        budget.enforceVendorWhitelist
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {budget.enforceVendorWhitelist ? 'Strict' : 'Open'}
                    </span>
                  </div>

                  {budget.enforceVendorWhitelist ? (
                    <div className="space-y-1.5 pt-1">
                      {deptVendors.length > 0 ? (
                        deptVendors.map((v, i) => (
                          <div
                            key={i}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span className="font-medium text-slate-200">{v.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-400">
                                {shortenAddress(v.address)}
                              </span>
                              <button
                                onClick={() => handleRemoveVendor(budget.lead, v.address)}
                                className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                                title="Remove Vendor"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                          No vendors whitelisted yet. All payments will escalate to council.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Lead can disburse to any merchant within the ${ceiling.toLocaleString()} ceiling without pre-approval.
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: Epoch & Next Reset */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Next Reset:</span>
                  <span className="font-bold text-slate-200">{daysRemaining}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {resetDate}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Configure / Edit Department Role */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D1322] border border-slate-700 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                {selectedBudget ? `Edit ${selectedBudget.roleName}` : 'Create Department Budget Role'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department / Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Events Department"
                  value={formRoleName}
                  onChange={(e) => setFormRoleName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Authorized Lead Wallet Address
                </label>
                <select
                  value={formLeadAddress}
                  onChange={(e) => setFormLeadAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none font-mono text-xs"
                >
                  {DEMO_PERSONAS.map((p) => (
                    <option key={p.id} value={p.address}>
                      {p.name} ({shortenAddress(p.address)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Monthly Spending Ceiling ($)
                  </label>
                  <input
                    type="number"
                    value={formMonthlyCeiling}
                    onChange={(e) => setFormMonthlyCeiling(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reset Epoch (Days)
                  </label>
                  <input
                    type="number"
                    value={formEpochDays}
                    onChange={(e) => setFormEpochDays(parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Vendor Policy Toggle */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Enforce Vendor Whitelist (Strict Policy)
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                    If enabled, Fast-Path only executes for pre-approved vendors. Unapproved payees escalate to Council.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormEnforceWhitelist(!formEnforceWhitelist)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    formEnforceWhitelist ? 'bg-sky-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formEnforceWhitelist ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-400 shadow-lg shadow-sky-500/25"
                >
                  {isLoading ? 'Saving Policy...' : 'Save Department Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Whitelist Vendor */}
      {isAddVendorModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1322] border border-slate-700 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                Add Approved Vendor
              </h3>
              <button
                onClick={() => setIsAddVendorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Department
                </label>
                <select
                  value={targetLead}
                  onChange={(e) => setTargetLead(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                >
                  {budgets.map((b) => (
                    <option key={b.lead} value={b.lead}>
                      {b.roleName} ({shortenAddress(b.lead)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Vendor / Merchant Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campus Catering & Cafe"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Vendor Wallet / Settlement Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expense Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Food & Refreshments, Print Shop, Venue"
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddVendorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                >
                  {isLoading ? 'Whitelisting...' : 'Approve Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
