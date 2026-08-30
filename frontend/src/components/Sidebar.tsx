import React from 'react';
import { 
  LayoutDashboard, 
  WalletCards, 
  Send, 
  CheckSquare, 
  ShieldCheck, 
  Layers,
  Sparkles
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { ProposalStatus } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { proposals } = useWeb3();
  const pendingApprovalsCount = proposals.filter((p) => p.status === ProposalStatus.PENDING).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & Treasury Health',
    },
    {
      id: 'budgets',
      label: 'Department Budgets',
      icon: WalletCards,
      description: 'Role Ceilings & Whitelists',
    },
    {
      id: 'payment',
      label: 'Make Payment',
      icon: Send,
      description: '1-Click Fast-Path & Receipts',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      description: 'Escalation Quorum Queue',
    },
  ];

  return (
    <aside className="w-64 bg-[#0D1322] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none min-h-screen">
      <div>
        {/* Brand Logo & Name */}
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">FlowTreasury</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                  SAFE
                </span>
              </div>
              <p className="text-xs text-slate-400">Scoped Treasury Engine</p>
            </div>
          </div>
        </div>

        {/* Main Navigation Links */}
        <div className="px-3 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/10 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium leading-none">{item.label}</div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-800 shadow-inner">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Autonomous Safe Vault</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
          Micro-expenses execute in 1-click within budget. Overages auto-escalate to multisig quorum.
        </p>
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" />
            Fast-Path Enabled
          </span>
          <span className="font-mono text-slate-400">v1.0-devcon</span>
        </div>
      </div>
    </aside>
  );
};
