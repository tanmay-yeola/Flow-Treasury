import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers } from 'ethers';
import { DEFAULT_ADDRESSES, DEMO_PERSONAS, INITIAL_APPROVED_VENDORS } from '../contracts/addresses';
import { DepartmentBudget, EscalatedProposal, ProposalStatus, ApprovedVendor, TransactionRecord } from '../types';
import { DemoTreasuryService } from '../services/DemoTreasuryService';
import { SafeService } from '../contracts/Safe';
import { ScopedBudgetModuleService } from '../contracts/ScopedBudgetModule';

interface Web3ContextType {
  account: string;
  currentPersona: typeof DEMO_PERSONAS[0];
  isMetaMask: boolean;
  isDemoMode: boolean;
  safeBalance: string;
  ethBalance: string;
  networkName: string;
  budgets: DepartmentBudget[];
  proposals: EscalatedProposal[];
  transactions: TransactionRecord[];
  vendors: ApprovedVendor[];
  isLoading: boolean;
  contractAddresses: typeof DEFAULT_ADDRESSES;
  switchPersona: (personaId: string) => void;
  connectMetaMask: () => Promise<void>;
  toggleDemoMode: () => void;
  resetDemoState: () => void;
  spend: (to: string, amount: string, reason: string, metadataURI?: string) => Promise<{
    success: boolean;
    fastPath: boolean;
    proposalId?: number;
    txHash?: string;
    remainingAllowance?: string;
    safeVault?: string;
    requiredApprovals?: number;
    error?: string;
  }>;
  approveEscalation: (proposalId: number) => Promise<{ success: boolean; executed: boolean; error?: string }>;
  cancelEscalation: (proposalId: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  hasUserApproved: (proposalId: number, userAddress: string) => boolean;
  isCouncilMember: (userAddress: string) => boolean;
  setDepartmentBudget: (lead: string, roleName: string, monthlyCeiling: string, epochDurationDays: number, enforceVendorWhitelist: boolean) => Promise<{ success: boolean; error?: string }>;
  setDepartmentActive: (lead: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
  setVendorApproval: (lead: string, vendor: string, approved: boolean, name: string, category: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const LOCAL_RPC = "http://127.0.0.1:8545";

// Single demo service instance for state persistence
const demoServiceInstance = new DemoTreasuryService();

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Read VITE_DEMO_MODE from environment; defaults to true
  const initialDemoEnv = import.meta.env.VITE_DEMO_MODE !== 'false';
  const [isDemoMode, setIsDemoMode] = useState<boolean>(initialDemoEnv);

  const [currentPersona, setCurrentPersona] = useState(DEMO_PERSONAS[0]); // Default: Alex (Events Lead)
  const [isMetaMask, setIsMetaMask] = useState(false);
  const [account, setAccount] = useState(DEMO_PERSONAS[0].address);
  const [safeBalance, setSafeBalance] = useState("10,000.00");
  const [ethBalance, setEthBalance] = useState("10.00");
  const [networkName, setNetworkName] = useState("Deterministic Demo Engine");
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<ApprovedVendor[]>(INITIAL_APPROVED_VENDORS);

  // Department budgets initial state ($10,000 Safe, Events $1,000 cap / $0 spent, Design $500 cap / $0 spent)
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([]);
  const [proposals, setProposals] = useState<EscalatedProposal[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Signer approvals tracking
  const [signerApprovals, setSignerApprovals] = useState<Record<number, string[]>>({});

  const refreshData = useCallback(async () => {
    if (isDemoMode) {
      const balances = await demoServiceInstance.getTreasuryBalances();
      setSafeBalance(balances.usdcBalance);
      setEthBalance(balances.ethBalance);
      setBudgets(await demoServiceInstance.getDepartmentBudgets());
      setProposals(await demoServiceInstance.getProposals());
      setTransactions(await demoServiceInstance.getTransactions());
      setVendors(await demoServiceInstance.getApprovedVendors());
      setNetworkName("Deterministic Demo Engine (Failsafe)");
      return;
    }

    // Live Blockchain Mode
    try {
      let runnerProvider: any = null;
      if (window.ethereum && isMetaMask) {
        runnerProvider = new ethers.BrowserProvider(window.ethereum);
        const network = await runnerProvider.getNetwork();
        setNetworkName(`${network.name} (${network.chainId})`);
      } else {
        try {
          runnerProvider = new ethers.JsonRpcProvider(LOCAL_RPC);
          const network = await runnerProvider.getNetwork();
          setNetworkName(`Hardhat Local (${network.chainId})`);
        } catch {
          setNetworkName("Hardhat Local (31337)");
        }
      }

      if (runnerProvider) {
        const safeService = new SafeService(DEFAULT_ADDRESSES.safeVault, DEFAULT_ADDRESSES.mockToken, runnerProvider);
        const balances = await safeService.getSafeBalances();
        if (balances) {
          setSafeBalance(balances.usdcBalance);
          setEthBalance(balances.ethBalance);
        }

        const moduleService = new ScopedBudgetModuleService(DEFAULT_ADDRESSES.scopedBudgetModule, runnerProvider);
        const updatedBudgets = await Promise.all(
          budgets.map(async (b) => {
            const onChainB = await moduleService.getBudget(b.lead);
            if (onChainB) {
              return {
                ...b,
                roleName: onChainB.roleName || b.roleName,
                monthlyCeiling: onChainB.monthlyCeiling,
                spentInCurrentEpoch: onChainB.spentInCurrentEpoch,
                epochStart: onChainB.epochStart,
                epochDuration: onChainB.epochDuration,
                enforceVendorWhitelist: onChainB.enforceVendorWhitelist,
                isActive: onChainB.isActive,
              };
            }
            return b;
          })
        );
        if (updatedBudgets.length > 0) setBudgets(updatedBudgets);
      }
    } catch (e) {
      console.log("On-chain query status:", e);
    }
  }, [isDemoMode, isMetaMask, budgets]);

  useEffect(() => {
    refreshData();
  }, [refreshData, isDemoMode, currentPersona]);

  const switchPersona = (personaId: string) => {
    const found = DEMO_PERSONAS.find((p) => p.id === personaId);
    if (found) {
      setCurrentPersona(found);
      setAccount(found.address);
      setIsMetaMask(false);
    }
  };

  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsMetaMask(true);
          setIsDemoMode(false);
          const network = await provider.getNetwork();
          setNetworkName(`${network.name} (${network.chainId})`);
        }
      } catch (err) {
        console.error("User denied account access", err);
      }
    } else {
      alert("MetaMask is not installed. Using demo engine persona.");
    }
  };

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  const resetDemoState = () => {
    demoServiceInstance.resetDemoState();
    refreshData();
  };

  const isCouncilMember = (userAddress: string) => {
    const councilAddresses = [
      DEMO_PERSONAS[2].address.toLowerCase(), // Council 1 (Elena)
      DEMO_PERSONAS[3].address.toLowerCase(), // Council 2 (Marcus)
      DEMO_PERSONAS[4].address.toLowerCase(), // Admin
    ];
    return councilAddresses.includes(userAddress.toLowerCase());
  };

  const hasUserApproved = (proposalId: number, userAddress: string) => {
    const list = signerApprovals[proposalId] || [];
    return list.includes(userAddress.toLowerCase());
  };

  const spend = async (
    to: string,
    amountStr: string,
    reason: string,
    metadataURI: string = "ipfs://receipt-proof"
  ) => {
    setIsLoading(true);
    if (isDemoMode) {
      const res = await demoServiceInstance.spend(account, to, amountStr, reason, metadataURI);
      await refreshData();
      setIsLoading(false);
      return res;
    }

    // Fallback/live implementation
    const res = await demoServiceInstance.spend(account, to, amountStr, reason, metadataURI);
    await refreshData();
    setIsLoading(false);
    return res;
  };

  const approveEscalation = async (proposalId: number) => {
    setIsLoading(true);
    if (isDemoMode) {
      const res = await demoServiceInstance.approveEscalation(proposalId, account);
      if (res.success) {
        setSignerApprovals((prev) => ({
          ...prev,
          [proposalId]: [...(prev[proposalId] || []), account.toLowerCase()],
        }));
      }
      await refreshData();
      setIsLoading(false);
      return res;
    }

    const res = await demoServiceInstance.approveEscalation(proposalId, account);
    await refreshData();
    setIsLoading(false);
    return res;
  };

  const cancelEscalation = async (proposalId: number, reason: string) => {
    setIsLoading(true);
    if (isDemoMode) {
      const res = await demoServiceInstance.cancelEscalation(proposalId, reason, account);
      await refreshData();
      setIsLoading(false);
      return res;
    }

    const res = await demoServiceInstance.cancelEscalation(proposalId, reason, account);
    await refreshData();
    setIsLoading(false);
    return res;
  };

  const setDepartmentBudget = async (
    lead: string,
    roleName: string,
    monthlyCeiling: string,
    epochDurationDays: number,
    enforceVendorWhitelist: boolean
  ) => {
    setIsLoading(true);
    const res = await demoServiceInstance.setDepartmentBudget(
      lead,
      roleName,
      monthlyCeiling,
      epochDurationDays,
      enforceVendorWhitelist
    );
    await refreshData();
    setIsLoading(false);
    return res;
  };

  const setDepartmentActive = async (lead: string, isActive: boolean) => {
    setIsLoading(true);
    const res = await demoServiceInstance.setDepartmentActive(lead, isActive);
    await refreshData();
    setIsLoading(false);
    return res;
  };

  const setVendorApproval = async (
    lead: string,
    vendorAddress: string,
    approved: boolean,
    name: string,
    category: string
  ) => {
    setIsLoading(true);
    const res = await demoServiceInstance.setVendorApproval(lead, vendorAddress, approved, name, category);
    await refreshData();
    setIsLoading(false);
    return res;
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        currentPersona,
        isMetaMask,
        isDemoMode,
        safeBalance,
        ethBalance,
        networkName,
        budgets,
        proposals,
        transactions,
        vendors,
        isLoading,
        contractAddresses: DEFAULT_ADDRESSES,
        switchPersona,
        connectMetaMask,
        toggleDemoMode,
        resetDemoState,
        spend,
        approveEscalation,
        cancelEscalation,
        hasUserApproved,
        isCouncilMember,
        setDepartmentBudget,
        setDepartmentActive,
        setVendorApproval,
        refreshData,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
