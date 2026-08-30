import React from 'react';
import { CheckCircle2, XCircle, Sparkles, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PolicyEvaluationProps {
  isAuthorizedLead: boolean;
  isApprovedVendor: boolean;
  isWithinAllowance: boolean;
  monthlyCeiling: number;
  remainingAllowance: number;
  amount: number;
  enforceWhitelist: boolean;
  vendorName?: string;
}

export const PolicyEvaluationCard: React.FC<PolicyEvaluationProps> = ({
  isAuthorizedLead,
  isApprovedVendor,
  isWithinAllowance,
  monthlyCeiling,
  remainingAllowance,
  amount,
  enforceWhitelist,
  vendorName,
}) => {
  const isFastPath = isAuthorizedLead && isApprovedVendor && isWithinAllowance;
  const remainingAfterTx = Math.max(remainingAllowance - amount, 0);

  return (
    <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
        <div>
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">
            On-Chain Policy Guard
          </span>
          <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
            Real-Time Policy Check
          </h3>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            isFastPath
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
        >
          {isFastPath ? 'Fast Path Eligible' : 'Escalation Required'}
        </span>
      </div>

      {/* Dynamic Rule Checklist */}
      <div className="space-y-2.5 text-xs">
        {/* Check 1: Authorized Lead */}
        <div
          className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
            isAuthorizedLead
              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isAuthorizedLead ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">
              {isAuthorizedLead ? 'Authorized Department Lead' : 'Unauthorized / Inactive Spender'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            {isAuthorizedLead ? 'VALID' : 'INVALID'}
          </span>
        </div>

        {/* Check 2: Vendor Whitelist Status */}
        <div
          className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
            isApprovedVendor
              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isApprovedVendor ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-medium">
              {!enforceWhitelist
                ? 'Open Vendor Policy (Any Merchant Permitted)'
                : isApprovedVendor
                ? `Approved Vendor: ${vendorName || 'Whitelisted'}`
                : 'Vendor Not Approved'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            {isApprovedVendor ? 'WHITELISTED' : 'UNLISTED'}
          </span>
        </div>

        {/* Check 3: Allowance Limit */}
        <div
          className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
            isWithinAllowance
              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isWithinAllowance ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">
              {isWithinAllowance
                ? `Within $${monthlyCeiling.toLocaleString()} Monthly Limit`
                : `Exceeds Remaining Budget ($${remainingAllowance.toFixed(2)} remaining)`}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            {isWithinAllowance ? 'WITHIN CAP' : 'OVER CAP'}
          </span>
        </div>
      </div>

      {/* Remaining allowance metric row */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400 font-sans">Remaining After Payment:</span>
        <span className={`font-bold text-sm ${isWithinAllowance ? 'text-white' : 'text-rose-400'}`}>
          ${remainingAfterTx.toFixed(2)} <span className="text-[10px] text-slate-400 font-sans">USDC</span>
        </span>
      </div>

      {/* DISTINCT ROUTE OUTCOME BOX */}
      {isFastPath ? (
        /* FAST PATH OUTCOME */
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-teal-950/30 border border-emerald-500/40 text-emerald-200 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-xs tracking-wider uppercase text-emerald-400 font-mono">
              FAST PATH ROUTE
            </span>
          </div>
          <div className="font-bold text-sm text-white">
            Within policy → executed immediately
          </div>
          <p className="text-[11px] text-emerald-300/80 leading-relaxed">
            No council vote required. Single-signature disbursement executed autonomously from Safe Vault.
          </p>
        </div>
      ) : (
        /* ESCALATION OUTCOME */
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/50 to-orange-950/30 border border-amber-500/40 text-amber-200 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-extrabold text-xs tracking-wider uppercase text-amber-400 font-mono">
              ESCALATION ROUTE
            </span>
          </div>
          <div className="font-bold text-sm text-white">
            Outside policy → governance approval required
          </div>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Payment violates budget or vendor constraints. Creates an on-chain proposal requiring 2 Council signatures.
          </p>
        </div>
      )}
    </div>
  );
};
