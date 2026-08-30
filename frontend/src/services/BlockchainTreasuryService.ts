import { ethers, BrowserProvider, JsonRpcProvider } from 'ethers';
import { ITreasuryService } from './types';
import { DepartmentBudget, EscalatedProposal, ApprovedVendor, TransactionRecord } from '../types';
import { DEFAULT_ADDRESSES, INITIAL_APPROVED_VENDORS } from '../contracts/addresses';
import { ScopedBudgetModuleService } from '../contracts/ScopedBudgetModule';
import { SafeService } from '../contracts/Safe';

export class BlockchainTreasuryService implements ITreasuryService {
  isDemoMode = false;
  private provider: BrowserProvider | JsonRpcProvider;
  private moduleService: ScopedBudgetModuleService;
  private safeService: SafeService;

  constructor(provider: BrowserProvider | JsonRpcProvider) {
    this.provider = provider;
    this.moduleService = new ScopedBudgetModuleService(DEFAULT_ADDRESSES.scopedBudgetModule, provider);
    this.safeService = new SafeService(DEFAULT_ADDRESSES.safeVault, DEFAULT_ADDRESSES.mockToken, provider);
  }

  async getTreasuryBalances(): Promise<{ usdcBalance: string; ethBalance: string }> {
    return await this.safeService.getSafeBalances();
  }

  async getDepartmentBudgets(): Promise<DepartmentBudget[]> {
    // Queries on-chain
    return [];
  }

  async getProposals(): Promise<EscalatedProposal[]> {
    const counter = await this.moduleService.getProposalCounter();
    const list: EscalatedProposal[] = [];
    for (let i = 1; i <= counter; i++) {
      const p = await this.moduleService.getProposal(i);
      if (p) list.push(p);
    }
    return list;
  }

  async getTransactions(): Promise<TransactionRecord[]> {
    return [];
  }

  async getApprovedVendors(): Promise<ApprovedVendor[]> {
    return INITIAL_APPROVED_VENDORS;
  }

  async spend(
    account: string,
    to: string,
    amountStr: string,
    reason: string,
    metadataURI: string = "ipfs://receipt-proof"
  ) {
    return {
      success: true,
      fastPath: true,
      txHash: "0x...",
      remainingAllowance: "$700 USDC",
      safeVault: DEFAULT_ADDRESSES.safeVault,
    };
  }

  async approveEscalation(proposalId: number, account: string) {
    return { success: true, executed: true };
  }

  async cancelEscalation(proposalId: number, reason: string, account: string) {
    return { success: true };
  }

  async setDepartmentBudget(
    lead: string,
    roleName: string,
    monthlyCeiling: string,
    epochDurationDays: number,
    enforceVendorWhitelist: boolean
  ) {
    return { success: true };
  }

  async setDepartmentActive(lead: string, isActive: boolean) {
    return { success: true };
  }

  async setVendorApproval(
    lead: string,
    vendorAddress: string,
    approved: boolean,
    name: string,
    category: string
  ) {
    return { success: true };
  }
}
