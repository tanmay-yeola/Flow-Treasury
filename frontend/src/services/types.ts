import { DepartmentBudget, EscalatedProposal, ApprovedVendor, TransactionRecord } from '../types';

export interface ITreasuryService {
  isDemoMode: boolean;
  getTreasuryBalances(): Promise<{ usdcBalance: string; ethBalance: string }>;
  getDepartmentBudgets(): Promise<DepartmentBudget[]>;
  getProposals(): Promise<EscalatedProposal[]>;
  getTransactions(): Promise<TransactionRecord[]>;
  getApprovedVendors(): Promise<ApprovedVendor[]>;
  
  spend(
    account: string,
    to: string,
    amountStr: string,
    reason: string,
    metadataURI?: string
  ): Promise<{
    success: boolean;
    fastPath: boolean;
    proposalId?: number;
    txHash?: string;
    remainingAllowance?: string;
    safeVault?: string;
    requiredApprovals?: number;
    error?: string;
  }>;

  approveEscalation(
    proposalId: number,
    account: string
  ): Promise<{
    success: boolean;
    executed: boolean;
    error?: string;
  }>;

  cancelEscalation(
    proposalId: number,
    reason: string,
    account: string
  ): Promise<{
    success: boolean;
    error?: string;
  }>;

  setDepartmentBudget(
    lead: string,
    roleName: string,
    monthlyCeiling: string,
    epochDurationDays: number,
    enforceVendorWhitelist: boolean
  ): Promise<{
    success: boolean;
    error?: string;
  }>;

  setDepartmentActive(
    lead: string,
    isActive: boolean
  ): Promise<{
    success: boolean;
    error?: string;
  }>;

  setVendorApproval(
    lead: string,
    vendorAddress: string,
    approved: boolean,
    name: string,
    category: string
  ): Promise<{
    success: boolean;
    error?: string;
  }>;

  resetDemoState?(): void;
}
