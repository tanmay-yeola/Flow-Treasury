import React, { useState } from 'react';
import { 
  CheckSquare, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ExternalLink, 
  Users, 
  AlertCircle, 
  UserCheck, 
  Check, 
  ArrowRight,
  Info,
  Sparkles
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { ProposalStatus, EscalatedProposal } from '../types';
import { DEMO_PERSONAS } from '../contracts/addresses';

export const Approvals: React.FC = () => {
  const { 
    proposals, 
    budgets, 
    approveEscalation, 
    cancelEscalation, 
    hasUserApproved, 
    isCouncilMember, 
    isLoading, 
    account, 
    currentPersona,
    switchPersona
  } = useWeb3();

  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4).toUpperCase()}`;
  };

  const pendingList = proposals.filter((p) => p.status === ProposalStatus.PENDING);
  const resolvedList = proposals.filter(
    (p) => p.status === ProposalStatus.EXECUTED || p.status === ProposalStatus.CANCELLED
  );

  const userIsCouncil = isCouncilMember(account);

  const handleApprove = async (proposalId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await approveEscalation(proposalId);
    if (res.success) {
      if (res.executed) {
        setSuccessMessage(`APPROVED & EXECUTED: 2 / 2 approvals reached. Funds have been automatically dispatched from the Safe Treasury Vault.`);
      } else {
        setSuccessMessage(`Approval recorded. 1 of 2 council signatures gathered.`);
      }
    } else {
      setErrorMessage(res.error || "Approval failed");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalId || !rejectReason) return;
    setErrorMessage(null);

    const res = await cancelEscalation(rejectModalId, rejectReason);
    if (res.success) {
      setSuccessMessage(`Proposal #${rejectModalId} has been rejected and cancelled.`);
      setRejectModalId(null);
      setRejectReason('');
    } else {
      setErrorMessage(res.error || "Rejection failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Council Escalation Approvals
          </h1>
          <p className="text-sm text-slate-400">
            Multisig review queue for payments that exceed department ceilings or target unapproved vendors.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-[#0D1322] border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending Proposals</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900/60 text-[10px]">
              {pendingList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'resolved'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Resolved History</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900/60 text-[10px]">
              {resolvedList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Helper Banner for Non-Council Personas */}
      {!userIsCouncil && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You are connected as <strong>{currentPersona.name}</strong> (Department Spender). Only Council Signers can authorize escalations.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-amber-300 font-medium">Quick switch to:</span>
            <button
              onClick={() => switchPersona('council-1')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors"
            >
              Elena (Council 1)
            </button>
            <button
              onClick={() => switchPersona('council-2')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors"
            >
              Marcus (Council 2)
            </button>
          </div>
        </div>
      )}

      {/* Global Status Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* PENDING PROPOSALS TAB */}
      {activeTab === 'pending' && (
        <div className="space-y-5">
          {pendingList.length > 0 ? (
            pendingList.map((proposal) => {
              const amountFormatted = (Number(proposal.amount) / 1e6).toFixed(2);
              const requestingBudget = budgets.find(
                (b) => b.lead.toLowerCase() === proposal.lead.toLowerCase()
              );
              const departmentName = requestingBudget?.roleName || "Events Department";
              const userAlreadyApproved = hasUserApproved(proposal.id, account);
              const progressPercent = Math.min((proposal.approvalCount / 2) * 100, 100);

              // Determine escalation reason
              const ceiling = requestingBudget ? Number(requestingBudget.monthlyCeiling) / 1e6 : 0;
              const isOverCeiling = parseFloat(amountFormatted) > ceiling;
              const reasonDescription = isOverCeiling
                ? `Exceeds monthly allowance of $${ceiling.toLocaleString()}`
                : `Payment to unapproved merchant address`;

              return (
                <div
                  key={proposal.id}
                  className="p-7 rounded-3xl bg-[#0D1322] border border-slate-800/80 hover:border-slate-700 transition-all space-y-6 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Proposal Details */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                          Proposal #{proposal.id}
                        </span>
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                          {departmentName}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">
                          {new Date(Number(proposal.createdAt) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Large Amount & Reason */}
                      <div>
                        <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
                          ${amountFormatted} <span className="text-xs text-sky-400 font-sans font-semibold">USDC</span>
                        </div>
                        <p className="text-xs text-amber-300 font-medium mt-1 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Escalation Reason: {reasonDescription}</span>
                        </p>
                      </div>

                      {/* Requester & Payee Information */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Requested by:</span>
                          <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-200 border border-slate-800">
                            {shortenAddress(proposal.lead)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Payee / Vendor:</span>
                          <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-200 border border-slate-800">
                            {shortenAddress(proposal.to)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quorum Progress & Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:border-l lg:border-slate-800 lg:pl-6">
                      {/* Quorum Progress Block */}
                      <div className="space-y-1.5 min-w-[170px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-medium">Approvals</span>
                          <span className="font-bold text-sky-400 font-mono">
                            {proposal.approvalCount} / 2
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          {proposal.approvalCount >= 1 ? '1 more to reach 2/2 threshold' : 'Requires 2 council votes'}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5">
                        {/* Reject Button */}
                        {userIsCouncil && (
                          <button
                            onClick={() => setRejectModalId(proposal.id)}
                            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-slate-800 hover:border-rose-500/40 transition-colors"
                          >
                            Reject
                          </button>
                        )}

                        {/* Approve Button / Approved by You state */}
                        {userAlreadyApproved ? (
                          <div className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Approved by you ✓</span>
                          </div>
                        ) : userIsCouncil ? (
                          <button
                            onClick={() => handleApprove(proposal.id)}
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{proposal.approvalCount === 1 ? 'Approve & Release Funds (Quorum Reached)' : 'Sign Approval'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setErrorMessage("Only Council Signers can authorize escalations. Switch persona to Elena or Marcus in the top right menu.")}
                            className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                          >
                            Approve (Council Only)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Receipt & Invoice Attachment Link */}
                  {proposal.metadataURI && (
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>Receipt Proof: <span className="font-mono text-slate-300">{proposal.metadataURI}</span></span>
                      </div>
                      <span className="text-sky-400 hover:underline cursor-pointer flex items-center gap-1">
                        <span>View Invoice Proof</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 rounded-3xl bg-[#0D1322] border border-slate-800/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Pending Escalation Requests</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All micro-expenses are flowing through the Autonomous Fast-Path within department limits.
              </p>
            </div>
          )}
        </div>
      )}

      {/* RESOLVED HISTORY TAB */}
      {activeTab === 'resolved' && (
        <div className="space-y-4">
          {resolvedList.length > 0 ? (
            resolvedList.map((proposal) => {
              const amountFormatted = (Number(proposal.amount) / 1e6).toFixed(2);
              const isExecuted = proposal.status === ProposalStatus.EXECUTED;

              return (
                <div
                  key={proposal.id}
                  className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isExecuted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isExecuted ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-white">
                          Proposal #{proposal.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isExecuted
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {isExecuted ? 'APPROVED & EXECUTED' : 'REJECTED / CANCELLED'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Payee: {shortenAddress(proposal.to)} • Requested by: {shortenAddress(proposal.lead)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-white font-mono">
                      ${amountFormatted} <span className="text-xs font-normal text-slate-400 font-sans">USDC</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isExecuted
                        ? '2 / 2 approvals reached • Funds dispatched from treasury'
                        : 'Proposal cancelled by Council'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 rounded-3xl bg-[#0D1322] border border-slate-800 text-center text-xs text-slate-400">
              No historical proposals yet.
            </div>
          )}
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1322] border border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-rose-400">
              <XCircle className="w-5 h-5" />
              Reject Proposal #{rejectModalId}
            </h3>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Rejection Rationale / Reason
                </label>
                <textarea
                  placeholder="e.g. Expense exceeds budget allocation and is not covered under current event charter."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-rose-500 focus:outline-none h-24 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25"
                >
                  {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
