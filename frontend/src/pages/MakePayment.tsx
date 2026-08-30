import React, { useState } from 'react';
import { 
  Send, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Upload, 
  ArrowRight, 
  Check, 
  ExternalLink,
  Wallet,
  Building2,
  Lock,
  Copy,
  Loader2
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { DEMO_PERSONAS } from '../contracts/addresses';
import { PolicyEvaluationCard } from '../components/PolicyEvaluationCard';
import { getExplorerTxLink } from '../lib/format';

interface MakePaymentProps {
  setCurrentTab?: (tab: string) => void;
}

export const MakePayment: React.FC<MakePaymentProps> = ({ setCurrentTab }) => {
  const { 
    account, 
    currentPersona, 
    budgets, 
    vendors, 
    spend, 
    isLoading 
  } = useWeb3();

  // Selected Department Lead
  const [selectedLead, setSelectedLead] = useState<string>(account);

  // Payment Form State
  const [vendorNameInput, setVendorNameInput] = useState('Campus Catering');
  const [recipientAddress, setRecipientAddress] = useState('0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc');
  const [amount, setAmount] = useState('300');
  const [tokenSymbol, setTokenSymbol] = useState('USDC');
  const [reason, setReason] = useState('Refreshments and coffee for Devcon workshop');
  const [receiptRef, setReceiptRef] = useState('invoice-campus-catering-300.pdf');

  // Execution Result Modal State
  const [resultData, setResultData] = useState<{
    show: boolean;
    success: boolean;
    fastPath: boolean;
    amount: string;
    vendorName: string;
    txHash?: string;
    safeVault?: string;
    remainingAllowance?: string;
    proposalId?: number;
    requiredApprovals?: number;
    error?: string;
  } | null>(null);

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4).toUpperCase()}`;
  };

  // Find active budget for currently selected lead
  const currentBudget = budgets.find(
    (b) => b.lead.toLowerCase() === selectedLead.toLowerCase()
  );

  const ceiling = currentBudget ? Number(currentBudget.monthlyCeiling) / 1e6 : 0;
  const spentSoFar = currentBudget ? Number(currentBudget.spentInCurrentEpoch) / 1e6 : 0;
  const remainingAllowance = Math.max(ceiling - spentSoFar, 0);

  const amountNum = parseFloat(amount) || 0;

  // Department specific whitelisted vendors
  const deptVendors = vendors.filter(
    (v) => v.departmentLead.toLowerCase() === selectedLead.toLowerCase()
  );

  // Policy Evaluation Rules
  const isAuthorizedLead = Boolean(currentBudget && currentBudget.isActive);
  const isApprovedVendor = Boolean(
    currentBudget && (
      !currentBudget.enforceVendorWhitelist ||
      deptVendors.some((v) => v.address.toLowerCase() === recipientAddress.toLowerCase())
    )
  );
  const isWithinAllowance = amountNum > 0 && amountNum <= remainingAllowance;

  // Expected route based on policy check
  const isExpectedFastPath = isAuthorizedLead && isApprovedVendor && isWithinAllowance;

  const handleSelectPresetVendor = (v: typeof vendors[0]) => {
    setVendorNameInput(v.name);
    setRecipientAddress(v.address);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptRef(e.target.files[0].name);
    }
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientAddress || !amount || !reason) return;

    const res = await spend(
      recipientAddress,
      amount,
      reason,
      receiptRef ? `ipfs://${receiptRef.replace(/\s+/g, '-').toLowerCase()}` : "ipfs://receipt-proof"
    );

    setResultData({
      show: true,
      success: res.success,
      fastPath: res.fastPath,
      amount: `$${amountNum.toFixed(2)}`,
      vendorName: vendorNameInput || shortenAddress(recipientAddress),
      txHash: res.txHash,
      safeVault: res.safeVault,
      remainingAllowance: res.remainingAllowance,
      proposalId: res.proposalId,
      requiredApprovals: res.requiredApprovals || 2,
      error: res.error,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Make a Payment
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Disburse treasury funds. Micro-expenses within policy settle autonomously; overages escalate to Council quorum.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Spender Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-7 rounded-3xl bg-[#0D1322] border border-slate-800 shadow-xl space-y-6">
            <form onSubmit={handleExecutePayment} className="space-y-5">
              {/* 1. Department / Spender Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Department / Spender Role</span>
                  <span className="text-[11px] text-sky-400 font-mono">
                    Limit: ${ceiling.toLocaleString()} / month
                  </span>
                </label>
                <select
                  value={selectedLead}
                  onChange={(e) => setSelectedLead(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none transition-colors"
                >
                  {budgets.map((b) => (
                    <option key={b.lead} value={b.lead}>
                      {b.roleName} — {shortenAddress(b.lead)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Quick-Select Approved Merchants */}
              {deptVendors.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Approved Department Vendors</span>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Whitelisted for Fast-Path
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {deptVendors.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPresetVendor(v)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          recipientAddress.toLowerCase() === v.address.toLowerCase()
                            ? 'bg-sky-500/15 border-sky-500/60 shadow-sm'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-semibold text-white truncate">{v.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {shortenAddress(v.address)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Vendor Name & Settlement Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Vendor / Merchant Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Campus Catering"
                    value={vendorNameInput}
                    onChange={(e) => setVendorNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Settlement Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 4. Payment Amount & Token */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Disbursement Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-slate-400 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Token Asset
                  </label>
                  <select
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none font-semibold"
                  >
                    <option value="USDC">USDC (Vault)</option>
                    <option value="ETH">ETH (Native)</option>
                  </select>
                </div>
              </div>

              {/* 5. Purpose / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Purpose / Rationale
                </label>
                <input
                  type="text"
                  placeholder="e.g. Workshop snacks and coffee"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* 6. Invoice / Receipt Proof Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Receipt / Invoice Proof (Optional)
                </label>
                <div className="border border-dashed border-slate-700 rounded-xl p-3 bg-slate-900/40 relative flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-xs">{receiptRef || 'No file attached'}</span>
                  </div>
                  <label className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer border border-slate-700 transition-colors">
                    Upload
                    <input type="file" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* 7. Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !isAuthorizedLead}
                  className={`w-full py-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                    isExpectedFastPath
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/25'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Transaction...</span>
                    </div>
                  ) : isExpectedFastPath ? (
                    <>
                      <span>Pay ${amountNum > 0 ? amountNum.toFixed(2) : '0.00'} (Instant Safe Execution)</span>
                      <Send className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Submit for Council Approval</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 Columns: Dedicated Policy Evaluation Guard */}
        <div className="lg:col-span-5 sticky top-24">
          <PolicyEvaluationCard
            isAuthorizedLead={isAuthorizedLead}
            isApprovedVendor={isApprovedVendor}
            isWithinAllowance={isWithinAllowance}
            monthlyCeiling={ceiling}
            remainingAllowance={remainingAllowance}
            amount={amountNum}
            enforceWhitelist={currentBudget?.enforceVendorWhitelist ?? true}
            vendorName={vendorNameInput}
          />
        </div>
      </div>

      {/* RESULT CONFIRMATION MODAL */}
      {resultData?.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D1322] border border-slate-700 shadow-2xl p-7 space-y-6 animate-in zoom-in-95 duration-150">
            {resultData.fastPath ? (
              /* --- FAST-PATH SUCCESS --- */
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                    Autonomous Safe Settlement
                  </span>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    PAYMENT EXECUTED
                  </h2>
                  <div className="text-xl font-bold text-slate-100 font-mono pt-1">
                    {resultData.amount} <span className="text-slate-400 font-sans font-normal">• {resultData.vendorName}</span>
                  </div>
                  <div className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold mt-2">
                    Policy-authorized payment • No council vote required
                  </div>
                </div>

                {/* Details Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Transaction Hash:</span>
                    <a
                      href={getExplorerTxLink(resultData.txHash || '')}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>{shortenAddress(resultData.txHash || '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Safe Vault:</span>
                    <span className="font-mono text-slate-200">
                      {shortenAddress(resultData.safeVault || '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-semibold">
                    <span className="text-slate-300">Remaining Department Allowance:</span>
                    <span className="font-mono text-emerald-400">
                      {resultData.remainingAllowance}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setResultData(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* --- ESCALATION QUEUED --- */
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/25 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <AlertTriangle className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                    Escalation Queued
                  </span>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    COUNCIL APPROVAL REQUIRED
                  </h2>
                  <p className="text-xs text-slate-300 pt-1">
                    Proposal created successfully on-chain.
                  </p>
                </div>

                {/* Escalation Details */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Proposal ID:</span>
                    <span className="font-mono font-bold text-amber-300">
                      #{resultData.proposalId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Requested Amount:</span>
                    <span className="font-mono font-bold text-white">
                      {resultData.amount} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payee:</span>
                    <span className="font-mono text-slate-200">
                      {resultData.vendorName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-semibold">
                    <span className="text-slate-300">Required Council Approvals:</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {resultData.requiredApprovals} signatures
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setResultData(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
                  >
                    Close
                  </button>
                  {setCurrentTab && (
                    <button
                      onClick={() => {
                        setResultData(null);
                        setCurrentTab('approvals');
                      }}
                      className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Go to Approvals Queue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
