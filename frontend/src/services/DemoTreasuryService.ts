import { ITreasuryService } from './types';
import { DepartmentBudget, EscalatedProposal, ApprovedVendor, TransactionRecord, ProposalStatus } from '../types';
import { DEFAULT_ADDRESSES, DEMO_PERSONAS, INITIAL_APPROVED_VENDORS } from '../contracts/addresses';

export class DemoTreasuryService implements ITreasuryService {
  isDemoMode = true;

  private safeUSDC = 10000;
  private safeETH = "10.00";

  private budgets: DepartmentBudget[] = [
    {
      roleName: "Events & Logistics",
      lead: DEMO_PERSONAS[0].address,
      token: DEFAULT_ADDRESSES.mockToken,
      monthlyCeiling: BigInt(1000 * 10 ** 6), // $1,000 USDC
      spentInCurrentEpoch: BigInt(0), // Spent: $0 initially
      epochStart: BigInt(Math.floor(Date.now() / 1000)),
      epochDuration: BigInt(30 * 86400),
      enforceVendorWhitelist: true, // Strict whitelist
      isActive: true,
    },
    {
      roleName: "Design & Creative",
      lead: DEMO_PERSONAS[1].address,
      token: DEFAULT_ADDRESSES.mockToken,
      monthlyCeiling: BigInt(500 * 10 ** 6), // $500 USDC
      spentInCurrentEpoch: BigInt(0), // Spent: $0 initially
      epochStart: BigInt(Math.floor(Date.now() / 1000)),
      epochDuration: BigInt(30 * 86400),
      enforceVendorWhitelist: false, // Open vendor policy
      isActive: true,
    }
  ];

  private vendors: ApprovedVendor[] = [
    {
      address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      name: "Campus Catering",
      category: "Food & Refreshments",
      departmentLead: DEMO_PERSONAS[0].address,
    },
    {
      address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      name: "Print Shop",
      category: "Event Merchandise & Posters",
      departmentLead: DEMO_PERSONAS[0].address,
    },
    {
      address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      name: "New Venue & AV Logistics",
      category: "Venue Rentals",
      departmentLead: DEMO_PERSONAS[0].address,
    }
  ];

  private proposals: EscalatedProposal[] = [];
  private transactions: TransactionRecord[] = [];
  private signerApprovals: Record<number, string[]> = {};

  async getTreasuryBalances(): Promise<{ usdcBalance: string; ethBalance: string }> {
    return {
      usdcBalance: this.safeUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ethBalance: this.safeETH,
    };
  }

  async getDepartmentBudgets(): Promise<DepartmentBudget[]> {
    return [...this.budgets];
  }

  async getProposals(): Promise<EscalatedProposal[]> {
    return [...this.proposals];
  }

  async getTransactions(): Promise<TransactionRecord[]> {
    return [...this.transactions];
  }

  async getApprovedVendors(): Promise<ApprovedVendor[]> {
    return [...this.vendors];
  }

  async spend(
    account: string,
    to: string,
    amountStr: string,
    reason: string,
    metadataURI: string = "ipfs://receipt-proof"
  ) {
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { success: false, fastPath: false, error: "Invalid payment amount" };
    }

    const amountBigInt = BigInt(Math.round(amountNum * 10 ** 6));
    const currentLeadBudget = this.budgets.find(
      (b) => b.lead.toLowerCase() === account.toLowerCase()
    );

    if (!currentLeadBudget || !currentLeadBudget.isActive) {
      return { success: false, fastPath: false, error: "Account is not an active Department Lead." };
    }

    const isWhitelisted = !currentLeadBudget.enforceVendorWhitelist || this.vendors.some(
      (v) => v.address.toLowerCase() === to.toLowerCase() && v.departmentLead.toLowerCase() === account.toLowerCase()
    );

    const remainingBudget = currentLeadBudget.monthlyCeiling - currentLeadBudget.spentInCurrentEpoch;
    const isWithinBudget = amountBigInt <= remainingBudget;

    const vendorMatch = this.vendors.find((v) => v.address.toLowerCase() === to.toLowerCase());
    const recipientLabel = vendorMatch ? vendorMatch.name : `Vendor (${to.slice(0, 6)}...${to.slice(-4)})`;
    const txHash = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    if (isWithinBudget && isWhitelisted) {
      // --- FAST PATH EXECUTION ---
      currentLeadBudget.spentInCurrentEpoch += amountBigInt;
      this.safeUSDC -= amountNum;

      const remainingFormatted = (Number(currentLeadBudget.monthlyCeiling - currentLeadBudget.spentInCurrentEpoch) / 1e6).toFixed(2);

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        txHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`,
        timestamp: Date.now(),
        type: "FAST_PATH",
        leadName: currentLeadBudget.roleName,
        leadAddress: account,
        recipientName: recipientLabel,
        recipientAddress: to,
        amount: amountNum.toFixed(2),
        tokenSymbol: "USDC",
        status: "Completed",
        metadataURI,
        reason,
      };
      this.transactions.unshift(newTx);

      return {
        success: true,
        fastPath: true,
        txHash,
        remainingAllowance: `$${remainingFormatted} USDC`,
        safeVault: DEFAULT_ADDRESSES.safeVault,
      };
    } else {
      // --- ESCALATION PATH ---
      const newProposalId = this.proposals.length + 1;
      const escalationReason = !isWithinBudget
        ? `Exceeds monthly allowance ($${(Number(currentLeadBudget.monthlyCeiling) / 1e6).toLocaleString()})`
        : "Unapproved Vendor Address";

      const newProposal: EscalatedProposal = {
        id: newProposalId,
        lead: account,
        token: DEFAULT_ADDRESSES.mockToken,
        to,
        amount: amountBigInt,
        metadataURI,
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        approvalCount: 0,
        status: ProposalStatus.PENDING,
      };
      this.proposals.unshift(newProposal);
      this.signerApprovals[newProposalId] = [];

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        txHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`,
        timestamp: Date.now(),
        type: "ESCALATED_CREATED",
        leadName: currentLeadBudget.roleName,
        leadAddress: account,
        recipientName: recipientLabel,
        recipientAddress: to,
        amount: amountNum.toFixed(2),
        tokenSymbol: "USDC",
        status: "Pending Approval",
        metadataURI,
        reason: `${reason} (${escalationReason})`,
      };
      this.transactions.unshift(newTx);

      return {
        success: true,
        fastPath: false,
        proposalId: newProposalId,
        txHash,
        requiredApprovals: 2,
        safeVault: DEFAULT_ADDRESSES.safeVault,
      };
    }
  }

  async approveEscalation(proposalId: number, account: string) {
    const isCouncil = [
      DEMO_PERSONAS[2].address.toLowerCase(),
      DEMO_PERSONAS[3].address.toLowerCase(),
      DEMO_PERSONAS[4].address.toLowerCase(),
    ].includes(account.toLowerCase());

    if (!isCouncil) {
      return {
        success: false,
        executed: false,
        error: "Unauthorized: Only Council Signers can authorize escalations. Switch to Elena or Marcus in the top-right persona menu."
      };
    }

    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (!proposal) return { success: false, executed: false, error: "Proposal not found." };
    if (proposal.status !== ProposalStatus.PENDING) {
      return { success: false, executed: false, error: "Proposal is no longer pending." };
    }

    const currentSigners = this.signerApprovals[proposalId] || [];
    if (currentSigners.includes(account.toLowerCase())) {
      return { success: false, executed: false, error: "Duplicate signature: You have already approved this proposal." };
    }

    currentSigners.push(account.toLowerCase());
    this.signerApprovals[proposalId] = currentSigners;
    proposal.approvalCount = currentSigners.length;

    const isExecuted = proposal.approvalCount >= 2;
    if (isExecuted) {
      proposal.status = ProposalStatus.EXECUTED;
      const amountNum = Number(proposal.amount) / 1e6;
      this.safeUSDC -= amountNum;

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        txHash: `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').slice(0, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        timestamp: Date.now(),
        type: "ESCALATED_EXECUTED",
        leadName: "Council Multisig",
        leadAddress: account,
        recipientName: `Vendor (${proposal.to.slice(0, 6)}...${proposal.to.slice(-4)})`,
        recipientAddress: proposal.to,
        amount: amountNum.toFixed(2),
        tokenSymbol: "USDC",
        status: "Completed",
        metadataURI: proposal.metadataURI,
        reason: `Proposal #${proposalId} Approved & Executed by Council (2/2 Threshold Reached)`,
      };
      this.transactions.unshift(newTx);
    }

    return { success: true, executed: isExecuted };
  }

  async cancelEscalation(proposalId: number, reason: string, account: string) {
    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (!proposal) return { success: false, error: "Proposal not found." };
    proposal.status = ProposalStatus.CANCELLED;

    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      txHash: `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').slice(0, 6)}...${Math.random().toString(16).slice(2, 6)}`,
      timestamp: Date.now(),
      type: "ESCALATED_CREATED",
      leadName: "Council Signer",
      leadAddress: account,
      recipientName: "Rejected Proposal",
      recipientAddress: proposal.to,
      amount: "0.00",
      tokenSymbol: "USDC",
      status: "Cancelled",
      reason: `Proposal #${proposalId} Cancelled: ${reason}`,
    };
    this.transactions.unshift(newTx);

    return { success: true };
  }

  async setDepartmentBudget(
    lead: string,
    roleName: string,
    monthlyCeiling: string,
    epochDurationDays: number,
    enforceVendorWhitelist: boolean
  ) {
    const ceilingBigInt = BigInt(Math.round(parseFloat(monthlyCeiling) * 10 ** 6));
    const epochSeconds = BigInt(epochDurationDays * 86400);

    const existing = this.budgets.find((b) => b.lead.toLowerCase() === lead.toLowerCase());
    if (existing) {
      existing.roleName = roleName;
      existing.monthlyCeiling = ceilingBigInt;
      existing.epochDuration = epochSeconds;
      existing.enforceVendorWhitelist = enforceVendorWhitelist;
      existing.isActive = true;
    } else {
      this.budgets.push({
        roleName,
        lead,
        token: DEFAULT_ADDRESSES.mockToken,
        monthlyCeiling: ceilingBigInt,
        spentInCurrentEpoch: BigInt(0),
        epochStart: BigInt(Math.floor(Date.now() / 1000)),
        epochDuration: epochSeconds,
        enforceVendorWhitelist,
        isActive: true,
      });
    }
    return { success: true };
  }

  async setDepartmentActive(lead: string, isActive: boolean) {
    const budget = this.budgets.find((b) => b.lead.toLowerCase() === lead.toLowerCase());
    if (budget) budget.isActive = isActive;
    return { success: true };
  }

  async setVendorApproval(
    lead: string,
    vendorAddress: string,
    approved: boolean,
    name: string,
    category: string
  ) {
    if (approved) {
      this.vendors = [
        ...this.vendors.filter((v) => !(v.address.toLowerCase() === vendorAddress.toLowerCase() && v.departmentLead.toLowerCase() === lead.toLowerCase())),
        { address: vendorAddress, name, category, departmentLead: lead }
      ];
    } else {
      this.vendors = this.vendors.filter((v) => !(v.address.toLowerCase() === vendorAddress.toLowerCase() && v.departmentLead.toLowerCase() === lead.toLowerCase()));
    }
    return { success: true };
  }

  resetDemoState() {
    this.safeUSDC = 10000;
    this.safeETH = "10.00";
    this.budgets = [
      {
        roleName: "Events & Logistics",
        lead: DEMO_PERSONAS[0].address,
        token: DEFAULT_ADDRESSES.mockToken,
        monthlyCeiling: BigInt(1000 * 10 ** 6),
        spentInCurrentEpoch: BigInt(0),
        epochStart: BigInt(Math.floor(Date.now() / 1000)),
        epochDuration: BigInt(30 * 86400),
        enforceVendorWhitelist: true,
        isActive: true,
      },
      {
        roleName: "Design & Creative",
        lead: DEMO_PERSONAS[1].address,
        token: DEFAULT_ADDRESSES.mockToken,
        monthlyCeiling: BigInt(500 * 10 ** 6),
        spentInCurrentEpoch: BigInt(0),
        epochStart: BigInt(Math.floor(Date.now() / 1000)),
        epochDuration: BigInt(30 * 86400),
        enforceVendorWhitelist: false,
        isActive: true,
      }
    ];
    this.vendors = [
      {
        address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        name: "Campus Catering",
        category: "Food & Refreshments",
        departmentLead: DEMO_PERSONAS[0].address,
      },
      {
        address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
        name: "Print Shop",
        category: "Event Merchandise & Posters",
        departmentLead: DEMO_PERSONAS[0].address,
      },
      {
        address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
        name: "New Venue & AV Logistics",
        category: "Venue Rentals",
        departmentLead: DEMO_PERSONAS[0].address,
      }
    ];
    this.proposals = [];
    this.transactions = [];
    this.signerApprovals = {};
  }
}
