import React, { useState } from 'react';
import { 
  Vault, 
  ChevronDown, 
  Check, 
  ExternalLink,
  Shield,
  Activity,
  Users
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { DEMO_PERSONAS } from '../contracts/addresses';

export const Header: React.FC = () => {
  const { 
    account, 
    currentPersona, 
    safeBalance, 
    ethBalance, 
    networkName, 
    switchPersona, 
    isMetaMask,
    isDemoMode,
    toggleDemoMode,
    resetDemoState,
    connectMetaMask,
    contractAddresses
  } = useWeb3();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="h-20 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Treasury Vault Balance */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 shadow-sm">
            <Vault className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Safe Treasury Vault</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-xl font-bold text-white tracking-tight flex items-baseline gap-2 font-mono">
              ${safeBalance} <span className="text-xs text-sky-400 font-sans font-semibold">USDC</span>
              <span className="text-xs text-slate-400 font-normal font-sans">({ethBalance} ETH)</span>
            </div>
          </div>
        </div>

        {/* Demo Mode Badge & Controls */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={toggleDemoMode}
            title="Click to toggle between Demo Mode and Live Blockchain"
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isDemoMode
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span>{isDemoMode ? 'DEMO MODE (Failsafe)' : 'LIVE CHAIN'}</span>
          </button>

          {isDemoMode && (
            <button
              onClick={resetDemoState}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-800 transition-colors"
              title="Reset Demo Script to Initial State"
            >
              Reset Demo
            </button>
          )}
        </div>
      </div>

      {/* Right: Persona / Wallet Switcher */}
      <div className="flex items-center gap-4">
        {/* Persona Dropdown (Critical for Hackathon Judges) */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-700/70 transition-all text-left group"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${currentPersona.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/20`}>
              {currentPersona.name.charAt(0)}
            </div>

            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{currentPersona.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-sky-400" />
                {currentPersona.role}
              </div>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0D1322] border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Switch Demo Persona</span>
                <Users className="w-3.5 h-3.5 text-sky-400" />
              </div>

              <div className="py-1">
                {DEMO_PERSONAS.map((p) => {
                  const isSelected = p.id === currentPersona.id && !isMetaMask;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchPersona(p.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/60 transition-colors text-left ${
                        isSelected ? 'bg-sky-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20`}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                            {p.name}
                            {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400">{p.badge}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Injected Wallet Option */}
              <div className="p-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    connectMetaMask();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>Connect MetaMask Wallet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
