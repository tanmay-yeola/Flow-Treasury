import { useWeb3 } from '../context/Web3Context';
import { ProposalStatus, EscalatedProposal } from '../types';

export function useApprovals() {
  const {
    proposals,
    approveEscalation,
    cancelEscalation,
    hasUserApproved,
    isCouncilMember,
    account,
    isLoading
  } = useWeb3();

  const pendingProposals = proposals.filter((p) => p.status === ProposalStatus.PENDING);
  const resolvedProposals = proposals.filter(
    (p) => p.status === ProposalStatus.EXECUTED || p.status === ProposalStatus.CANCELLED
  );

  return {
    proposals,
    pendingProposals,
    resolvedProposals,
    pendingCount: pendingProposals.length,
    approveProposal: approveEscalation,
    rejectProposal: cancelEscalation,
    hasUserApproved: (proposalId: number) => hasUserApproved(proposalId, account),
    isCouncilSigner: isCouncilMember(account),
    isLoading,
  };
}
