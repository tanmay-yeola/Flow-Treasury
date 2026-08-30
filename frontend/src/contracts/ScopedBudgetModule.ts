import { ethers, Contract, JsonRpcSigner, BrowserProvider, JsonRpcProvider } from 'ethers';
import { SCOPED_BUDGET_MODULE_ABI } from './abis';
import { DepartmentBudget, EscalatedProposal, ProposalStatus } from '../types';

export class ScopedBudgetModuleService {
  private address: string;
  private runner: BrowserProvider | JsonRpcProvider | JsonRpcSigner;

  constructor(address: string, runner: BrowserProvider | JsonRpcProvider | JsonRpcSigner) {
    this.address = address;
    this.runner = runner;
  }

  private getContract(signerOrProvider?: any): Contract {
    return new Contract(this.address, SCOPED_BUDGET_MODULE_ABI, signerOrProvider || this.runner);
  }

  async getBudget(leadAddress: string): Promise<DepartmentBudget | null> {
    try {
      const contract = this.getContract();
      const b = await contract.getBudget(leadAddress);
      if (!b || b.lead === ethers.ZeroAddress) return null;

      return {
        roleName: b.roleName,
        lead: b.lead,
        token: b.token,
        monthlyCeiling: BigInt(b.monthlyCeiling),
        spentInCurrentEpoch: BigInt(b.spentInCurrentEpoch),
        epochStart: BigInt(b.epochStart),
        epochDuration: BigInt(b.epochDuration),
        enforceVendorWhitelist: Boolean(b.enforceVendorWhitelist),
        isActive: Boolean(b.isActive),
      };
    } catch (e) {
      console.warn(`Could not fetch on-chain budget for ${leadAddress}:`, e);
      return null;
    }
  }

  async getRemainingBudget(leadAddress: string): Promise<{ remaining: bigint; currentEpochStart: bigint } | null> {
    try {
      const contract = this.getContract();
      const res = await contract.getRemainingBudget(leadAddress);
      return {
        remaining: BigInt(res[0]),
        currentEpochStart: BigInt(res[1]),
      };
    } catch (e) {
      console.warn(`Could not fetch remaining budget for ${leadAddress}:`, e);
      return null;
    }
  }

  async isVendorApproved(leadAddress: string, vendorAddress: string): Promise<boolean> {
    try {
      const contract = this.getContract();
      return await contract.isVendorApproved(leadAddress, vendorAddress);
    } catch {
      return false;
    }
  }

  async getProposalCounter(): Promise<number> {
    try {
      const contract = this.getContract();
      const count = await contract.proposalCounter();
      return Number(count);
    } catch {
      return 0;
    }
  }

  async getProposal(proposalId: number): Promise<EscalatedProposal | null> {
    try {
      const contract = this.getContract();
      const p = await contract.getProposal(proposalId);
      if (!p || p.lead === ethers.ZeroAddress) return null;

      return {
        id: Number(p.id),
        lead: p.lead,
        token: p.token,
        to: p.to,
        amount: BigInt(p.amount),
        metadataURI: p.metadataURI,
        createdAt: BigInt(p.createdAt),
        approvalCount: Number(p.approvalCount),
        status: p.status as ProposalStatus,
      };
    } catch {
      return null;
    }
  }

  async hasApprovedProposal(proposalId: number, approverAddress: string): Promise<boolean> {
    try {
      const contract = this.getContract();
      return await contract.hasApprovedProposal(proposalId, approverAddress);
    } catch {
      return false;
    }
  }

  async getEscalationThreshold(): Promise<number> {
    try {
      const contract = this.getContract();
      const threshold = await contract.escalationThreshold();
      return Number(threshold);
    } catch {
      return 2;
    }
  }
}
