import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  Code2, 
  Calendar,
  ShieldCheck,
  Building2,
  Receipt
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { ProposalStatus } from '../types';
import { getExplorerTxLink, getExplorerAddressLink } from '../lib/format';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab }) => {
  const { 
    safeBalance, 
    budgets, 
    proposals, 
    transactions, 
    contractAddresses,
    approveEscalation,
    isLoading 
  } = useWeb3();

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Shorten address helper: 0x1234...ABCD
  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4).toUpperCase()}`;
  };

  // Calculations for Summary Cards
  const totalCeilings = budgets.reduce((acc, b) => acc + Number(b.monthlyCeiling) / 1e6, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + Number(b.spentInCurrentEpoch) / 1e6, 0);
  const totalAvailable = Math.max(totalCeilings - totalSpent, 0);
  const pendingList = proposals.filter((p) => p.status === ProposalStatus.PENDING);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Purpose */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Treasury Overview
          </h1>
          <p className="text-sm text-slate-400">
            Real-time balance, department spending limits, and pending approval requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('payment')}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
          >
            <span>Make a Payment</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Treasury Balance */}
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Treasury Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            ${safeBalance} <span className="text-xs font-normal text-slate-400 font-sans">USDC</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Held in Protected Vault</span>
          </p>
        </div>

        {/* 2. Spent This Month */}
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Spent This Month</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            ${totalSpent.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Across {budgets.length} active departments
          </p>
        </div>

        {/* 3. Available Department Budget */}
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Budget</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            ${totalAvailable.toFixed(2)}
          </div>
          <p className="text-[11px] text-purple-400 mt-2">
            Ready for instant fast-path payout
          </p>
        </div>

        {/* 4. Pending Approvals */}
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              pendingList.length > 0 ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            {pendingList.length} {pendingList.length === 1 ? 'Request' : 'Requests'}
          </div>
          <p className="text-[11px] text-amber-400 mt-2 font-medium">
            {pendingList.length > 0 ? 'Requires Council Decision' : 'All requests up to date'}
          </p>
        </div>
      </div>

      {/* DEPARTMENT BUDGETS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Department Budgets
            </h2>
            <p className="text-xs text-slate-400">
              Allocated monthly spending ceilings per department lead
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('budgets')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            Manage Departments →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b, idx) => {
            const ceiling = Number(b.monthlyCeiling) / 1e6;
            const spent = Number(b.spentInCurrentEpoch) / 1e6;
            const remaining = Math.max(ceiling - spent, 0);
            const percentageUsed = Math.min((spent / ceiling) * 100, 100);

            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800/80 hover:border-slate-700 transition-all space-y-5"
              >
                {/* Department Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                      Department
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {b.roleName}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      b.enforceVendorWhitelist
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}
                  >
                    {b.enforceVendorWhitelist ? 'Approved Vendors Only' : 'Any Vendor'}
                  </span>
                </div>

                {/* Lead Person Info */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-slate-400">Department Lead</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {shortenAddress(b.lead)}
                  </span>
                </div>

                {/* Numbers Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-medium">Monthly Budget</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      ${ceiling.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-medium">Spent</div>
                    <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                      ${spent.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-medium">Remaining</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      ${remaining.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Utilization</span>
                    <span className="font-medium text-slate-300">{percentageUsed.toFixed(0)}% Used</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentageUsed > 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      }`}
                      style={{ width: `${percentageUsed}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Auto-resets every 30 days
                    </span>
                    <span>${remaining.toFixed(2)} left</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PENDING APPROVALS SECTION (When payments need council action) */}
      {pendingList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Pending Approvals
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingList.length} Action Needed
              </span>
            </div>
            <button
              onClick={() => setCurrentTab('approvals')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Open Approvals Queue →
            </button>
          </div>

          <div className="space-y-3">
            {pendingList.map((proposal) => {
              const amountFormatted = (Number(proposal.amount) / 1e6).toFixed(2);
              const requestingBudget = budgets.find(
                (b) => b.lead.toLowerCase() === proposal.lead.toLowerCase()
              );

              return (
                <div
                  key={proposal.id}
                  className="p-5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        Payment #{proposal.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {requestingBudget ? requestingBudget.roleName : 'Department Lead'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-amber-300 font-medium">
                        Exceeds Monthly Limit
                      </span>
                    </div>

                    <div className="text-lg font-bold text-white font-mono">
                      ${amountFormatted} <span className="text-xs font-normal text-slate-400 font-sans">USDC</span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Payee: <span className="font-mono text-slate-200">{shortenAddress(proposal.to)}</span>
                      {proposal.metadataURI && (
                        <span className="ml-3 text-sky-400 hover:underline cursor-pointer">
                          (View Receipt Attached)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <div className="text-slate-400">Approval Progress</div>
                      <div className="font-bold text-amber-300 font-mono">
                        {proposal.approvalCount} of 2 Council Signatures
                      </div>
                    </div>

                    <button
                      onClick={() => approveEscalation(proposal.id)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{proposal.approvalCount === 1 ? 'Finalize Payment' : 'Sign Approval'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-400">
              Complete history of executed payments and council-reviewed requests
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0D1322] border border-slate-800/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Vendor / Purpose</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => {
                  const dateFormatted = new Date(tx.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Normalize Statuses as requested: Executed, Pending Approval, Rejected
                  const isFastPath = tx.type === 'FAST_PATH';
                  let statusBadge = {
                    label: isFastPath ? 'Fast Path Executed' : 'Executed (Council Quorum)',
                    color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                    icon: CheckCircle2,
                  };

                  if (tx.status === 'Pending Approval' || tx.type === 'ESCALATED_CREATED') {
                    statusBadge = {
                      label: 'Escalation Pending',
                      color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                      icon: Clock,
                    };
                  } else if (tx.status === 'Cancelled') {
                    statusBadge = {
                      label: 'Proposal Rejected',
                      color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                      icon: XCircle,
                    };
                  }

                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Department */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-xs">
                          {tx.leadName.replace(/\s\(.*\)/, '')}
                        </div>
                        <a
                          href={getExplorerAddressLink(tx.leadAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-slate-400 font-mono hover:text-sky-400 transition-colors flex items-center gap-1 mt-0.5"
                        >
                          <span>{shortenAddress(tx.leadAddress)}</span>
                        </a>
                      </td>

                      {/* Vendor */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200 text-xs">
                          {tx.recipientName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {tx.reason || 'General expense'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-mono font-bold text-white text-xs">
                        ${tx.amount} <span className="text-[10px] font-normal text-slate-400 font-sans">USDC</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusBadge.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusBadge.label}</span>
                        </span>
                      </td>

                      {/* Date & Explorer Link */}
                      <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">
                        <div>{dateFormatted}</div>
                        <a
                          href={getExplorerTxLink(tx.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-sky-400 hover:underline mt-0.5 inline-block"
                        >
                          {tx.txHash} ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EXPANDABLE "TECHNICAL DETAILS" SECTION (For Developers & Judges) */}
      <div className="rounded-2xl bg-[#0D1322] border border-slate-800/80 overflow-hidden">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full px-6 py-4 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Developer & Smart Contract Technical Details</span>
          </div>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-4 text-xs font-mono bg-slate-950/40">
            <p className="text-slate-400 font-sans text-xs">
              Raw contract configuration and Gnosis Safe module parameters powering this treasury.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Gnosis Safe Vault Contract</span>
                <div className="text-sky-400 select-all">{contractAddresses.safeVault}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">ScopedBudgetModule Contract</span>
                <div className="text-sky-400 select-all">{contractAddresses.scopedBudgetModule}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Execution Mechanism</span>
                <div className="text-emerald-400">ISafe.execTransactionFromModule (Call)</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Escalation Quorum Threshold</span>
                <div className="text-amber-400">2 Council Approvals Required</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
