// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ISafe.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IScopedBudgetModule.sol";

/**
 * @title ScopedBudgetModule
 * @notice Gnosis Safe Module for decentralized organizations enabling role-based scoped budgets
 *         with autonomous fast-path micro-disbursements and threshold-based escalations.
 * @author Devcon Treasury Architecture
 */
contract ScopedBudgetModule is IScopedBudgetModule {
    // --- Custom Errors ---
    error Unauthorized();
    error DepartmentNotActive();
    error InvalidParameters();
    error SafeExecutionFailed();
    error ProposalNotFound();
    error ProposalNotPending();
    error ProposalAlreadyResolved();
    error AlreadyApproved();
    error ThresholdNotMet();
    error ArrayLengthMismatch();
    error ReentrancyGuardReentrantCall();

    // --- State Variables ---
    address public immutable safeVault;
    address public owner;
    uint256 public escalationThreshold;
    uint256 public proposalCounter;

    // Department Lead Address => Department Budget
    mapping(address => DepartmentBudget) public budgets;

    // Lead Address => Vendor Address => Is Approved
    mapping(address => mapping(address => bool)) public override isVendorApproved;

    // Proposal ID => Proposal Data
    mapping(uint256 => EscalatedProposal) public proposals;

    // Proposal ID => Approver Address => Has Approved
    mapping(uint256 => mapping(address => bool)) public override hasApprovedProposal;

    // Reentrancy guard status
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // --- Modifiers ---
    modifier onlyOwnerOrSafe() {
        if (msg.sender != owner && msg.sender != safeVault) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyCouncilOrOwner() {
        if (msg.sender != owner && msg.sender != safeVault && !ISafe(safeVault).isOwner(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /**
     * @notice Initializes the ScopedBudgetModule
     * @param _safeVault Address of the Gnosis Safe treasury vault
     * @param _initialOwner Admin owner of the module (e.g. governance or safe multisig)
     * @param _escalationThreshold Number of council approvals needed for escalated requests
     */
    constructor(
        address _safeVault,
        address _initialOwner,
        uint256 _escalationThreshold
    ) {
        if (_safeVault == address(0) || _initialOwner == address(0)) {
            revert InvalidParameters();
        }
        safeVault = _safeVault;
        owner = _initialOwner;
        escalationThreshold = _escalationThreshold > 0 ? _escalationThreshold : 1;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // =========================================================================
    // Admin Operations
    // =========================================================================

    /**
     * @notice Configures or updates a department budget role
     * @param lead Address of the authorized department lead
     * @param roleName Name of the department role (e.g., "Events & Logistics")
     * @param token Address of the token denomination (address(0) for native ETH)
     * @param monthlyCeiling Spending cap per epoch
     * @param epochDuration Duration of each spend epoch in seconds (e.g. 30 days = 2592000)
     * @param enforceVendorWhitelist If true, fast-path is restricted to whitelisted vendors
     */
    function setDepartmentBudget(
        address lead,
        string calldata roleName,
        address token,
        uint256 monthlyCeiling,
        uint256 epochDuration,
        bool enforceVendorWhitelist
    ) external override onlyOwnerOrSafe {
        if (lead == address(0) || epochDuration == 0) {
            revert InvalidParameters();
        }

        DepartmentBudget storage budget = budgets[lead];
        budget.roleName = roleName;
        budget.lead = lead;
        budget.token = token;
        budget.monthlyCeiling = monthlyCeiling;
        budget.epochDuration = epochDuration;
        budget.enforceVendorWhitelist = enforceVendorWhitelist;
        budget.isActive = true;

        if (budget.epochStart == 0) {
            budget.epochStart = block.timestamp;
            budget.spentInCurrentEpoch = 0;
        }

        emit BudgetConfigured(
            lead,
            roleName,
            token,
            monthlyCeiling,
            epochDuration,
            enforceVendorWhitelist
        );
    }

    /**
     * @notice Whitelists or revokes an approved vendor for a department lead
     */
    function setVendorApproval(
        address lead,
        address vendor,
        bool approved
    ) external override onlyOwnerOrSafe {
        if (lead == address(0) || vendor == address(0)) {
            revert InvalidParameters();
        }
        isVendorApproved[lead][vendor] = approved;
        emit VendorApprovalUpdated(lead, vendor, approved);
    }

    /**
     * @notice Batch whitelists vendors for a department lead
     */
    function setBatchVendorApproval(
        address lead,
        address[] calldata vendors,
        bool[] calldata approvals
    ) external override onlyOwnerOrSafe {
        if (vendors.length != approvals.length || lead == address(0)) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i = 0; i < vendors.length; i++) {
            if (vendors[i] == address(0)) revert InvalidParameters();
            isVendorApproved[lead][vendors[i]] = approvals[i];
            emit VendorApprovalUpdated(lead, vendors[i], approvals[i]);
        }
    }

    /**
     * @notice Updates the required number of approvals for escalated proposals
     */
    function setEscalationThreshold(uint256 newThreshold) external override onlyOwnerOrSafe {
        if (newThreshold == 0) revert InvalidParameters();
        uint256 oldThreshold = escalationThreshold;
        escalationThreshold = newThreshold;
        emit EscalationThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Activates or pauses a department role
     */
    function setDepartmentActive(address lead, bool isActive) external override onlyOwnerOrSafe {
        if (lead == address(0)) revert InvalidParameters();
        budgets[lead].isActive = isActive;
        emit DepartmentStatusChanged(lead, isActive);
    }

    /**
     * @notice Transfers ownership of the module
     */
    function transferOwnership(address newOwner) external onlyOwnerOrSafe {
        if (newOwner == address(0)) revert InvalidParameters();
        owner = newOwner;
    }

    // =========================================================================
    // Spender Operations
    // =========================================================================

    /**
     * @notice Spends Native ETH or configured default token for the caller lead
     */
    function spend(
        address payable to,
        uint256 amount,
        string calldata metadataURI
    ) external override nonReentrant returns (bool fastPath, uint256 proposalId) {
        DepartmentBudget storage budget = budgets[msg.sender];
        return _evaluateAndSpend(budget, budget.token, to, amount, metadataURI);
    }

    /**
     * @notice Spends a specific ERC20 token for the caller lead
     */
    function spendToken(
        address token,
        address to,
        uint256 amount,
        string calldata metadataURI
    ) external override nonReentrant returns (bool fastPath, uint256 proposalId) {
        DepartmentBudget storage budget = budgets[msg.sender];
        return _evaluateAndSpend(budget, token, payable(to), amount, metadataURI);
    }

    // =========================================================================
    // Escalation Resolution
    // =========================================================================

    /**
     * @notice Approves an escalated proposal. If threshold is reached, automatically executes it.
     */
    function approveEscalation(uint256 proposalId) external override nonReentrant onlyCouncilOrOwner {
        EscalatedProposal storage proposal = proposals[proposalId];
        if (proposal.status != ProposalStatus.PENDING) {
            revert ProposalNotPending();
        }
        if (hasApprovedProposal[proposalId][msg.sender]) {
            revert AlreadyApproved();
        }

        hasApprovedProposal[proposalId][msg.sender] = true;
        proposal.approvalCount += 1;

        emit EscalationApproved(proposalId, msg.sender, proposal.approvalCount);

        // Auto-execute if threshold is met
        if (proposal.approvalCount >= escalationThreshold) {
            _executeProposal(proposal);
        }
    }

    /**
     * @notice Explicitly executes an approved proposal that has met the threshold
     */
    function executeEscalatedProposal(uint256 proposalId) external override nonReentrant {
        EscalatedProposal storage proposal = proposals[proposalId];
        if (proposal.status != ProposalStatus.PENDING && proposal.status != ProposalStatus.APPROVED) {
            revert ProposalAlreadyResolved();
        }
        if (proposal.approvalCount < escalationThreshold) {
            revert ThresholdNotMet();
        }
        _executeProposal(proposal);
    }

    /**
     * @notice Cancels an escalated proposal
     */
    function cancelEscalation(uint256 proposalId, string calldata reason) external override onlyCouncilOrOwner {
        EscalatedProposal storage proposal = proposals[proposalId];
        if (proposal.status != ProposalStatus.PENDING) {
            revert ProposalNotPending();
        }
        proposal.status = ProposalStatus.CANCELLED;
        emit EscalationCancelled(proposalId, msg.sender, reason);
    }

    // =========================================================================
    // Internal Evaluation & Execution
    // =========================================================================

    function _evaluateAndSpend(
        DepartmentBudget storage budget,
        address token,
        address payable to,
        uint256 amount,
        string calldata metadataURI
    ) internal returns (bool fastPath, uint256 proposalId) {
        if (!budget.isActive || budget.lead != msg.sender) {
            revert DepartmentNotActive();
        }
        if (to == address(0) || amount == 0) {
            revert InvalidParameters();
        }

        // 1. Process Epoch Rollover
        _updateEpoch(budget);

        // 2. Check Fast-Path Eligibility
        bool withinBudget = (budget.spentInCurrentEpoch + amount) <= budget.monthlyCeiling;
        bool isApproved = !budget.enforceVendorWhitelist || isVendorApproved[msg.sender][to];
        bool tokenMatches = (budget.token == token);

        if (withinBudget && isApproved && tokenMatches) {
            // --- FAST PATH EXECUTION ---
            budget.spentInCurrentEpoch += amount;

            _dispatchSafeTransfer(token, to, amount);

            uint256 remaining = budget.monthlyCeiling - budget.spentInCurrentEpoch;
            emit FastPathExecuted(msg.sender, token, to, amount, metadataURI, remaining);

            return (true, 0);
        } else {
            // --- ESCALATION PATH ---
            proposalCounter += 1;
            proposalId = proposalCounter;

            string memory reason = !withinBudget ? "Ceiling Exceeded" : (!isApproved ? "Unapproved Vendor" : "Token Mismatch");

            proposals[proposalId] = EscalatedProposal({
                id: proposalId,
                lead: msg.sender,
                token: token,
                to: to,
                amount: amount,
                metadataURI: metadataURI,
                createdAt: block.timestamp,
                approvalCount: 0,
                status: ProposalStatus.PENDING
            });

            emit EscalationCreated(proposalId, msg.sender, token, to, amount, metadataURI, reason);

            return (false, proposalId);
        }
    }

    function _updateEpoch(DepartmentBudget storage budget) internal {
        if (block.timestamp >= budget.epochStart + budget.epochDuration) {
            budget.spentInCurrentEpoch = 0;
            budget.epochStart = block.timestamp;
            emit EpochRollover(budget.lead, budget.epochStart);
        }
    }

    function _executeProposal(EscalatedProposal storage proposal) internal {
        proposal.status = ProposalStatus.EXECUTED;

        _dispatchSafeTransfer(proposal.token, proposal.to, proposal.amount);

        emit EscalationExecuted(proposal.id, msg.sender, proposal.to, proposal.amount);
    }

    function _dispatchSafeTransfer(address token, address payable to, uint256 amount) internal {
        bool success;
        if (token == address(0)) {
            // Native ETH Transfer
            success = ISafe(safeVault).execTransactionFromModule(
                to,
                amount,
                "",
                Enum.Operation.Call
            );
        } else {
            // ERC20 Transfer
            bytes memory data = abi.encodeWithSelector(IERC20.transfer.selector, to, amount);
            success = ISafe(safeVault).execTransactionFromModule(
                token,
                0,
                data,
                Enum.Operation.Call
            );
        }

        if (!success) {
            revert SafeExecutionFailed();
        }
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /**
     * @notice Returns the full budget details for a department lead
     */
    function getBudget(address lead) external view override returns (DepartmentBudget memory) {
        return budgets[lead];
    }

    /**
     * @notice Returns the full proposal details by ID
     */
    function getProposal(uint256 proposalId) external view override returns (EscalatedProposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Returns the remaining budget for a department lead in the current epoch
     */
    function getRemainingBudget(address lead)
        external
        view
        override
        returns (uint256 remaining, uint256 currentEpochStart)
    {
        DepartmentBudget memory budget = budgets[lead];
        if (!budget.isActive) return (0, 0);

        if (block.timestamp >= budget.epochStart + budget.epochDuration) {
            return (budget.monthlyCeiling, block.timestamp);
        } else {
            uint256 remainingAmount = budget.spentInCurrentEpoch >= budget.monthlyCeiling
                ? 0
                : budget.monthlyCeiling - budget.spentInCurrentEpoch;
            return (remainingAmount, budget.epochStart);
        }
    }
}
