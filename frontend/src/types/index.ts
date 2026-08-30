export enum ProposalStatus {
  NONE = 0,
  PENDING = 1,
  APPROVED = 2,
  EXECUTED = 3,
  CANCELLED = 4,
}

export interface DepartmentBudget {
  roleName: string;
  lead: string;
  token: string;
  monthlyCeiling: bigint;
  spentInCurrentEpoch: bigint;
  epochStart: bigint;
  epochDuration: bigint;
  enforceVendorWhitelist: boolean;
  isActive: boolean;
}

export interface EscalatedProposal {
  id: number;
  lead: string;
  token: string;
  to: string;
  amount: bigint;
  metadataURI: string;
  createdAt: bigint;
  approvalCount: number;
  status: ProposalStatus;
}

export interface ApprovedVendor {
  address: string;
  name: string;
  category: string;
  departmentLead: string;
}

export interface DemoPersona {
  id: string;
  name: string;
  role: string;
  address: string;
  avatarColor: string;
  badge: string;
}

export interface TransactionRecord {
  id: string;
  txHash: string;
  timestamp: number;
  type: 'FAST_PATH' | 'ESCALATED_CREATED' | 'ESCALATED_EXECUTED' | 'BUDGET_CONFIGURED';
  leadName: string;
  leadAddress: string;
  recipientName: string;
  recipientAddress: string;
  amount: string;
  tokenSymbol: string;
  status: 'Completed' | 'Pending Approval' | 'Cancelled';
  metadataURI?: string;
  reason?: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

