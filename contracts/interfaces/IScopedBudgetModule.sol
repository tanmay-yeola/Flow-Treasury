// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Interface for ScopedBudgetModule
interface IScopedBudgetModule {
    enum ProposalStatus {
        NONE,
        PENDING,
        APPROVED,
        EXECUTED,
        CANCELLED
    }

    struct DepartmentBudget {
        string roleName;
        address lead;
        address token; // address(0) for native ETH
        uint256 monthlyCeiling;
        uint256 spentInCurrentEpoch;
        uint256 epochStart;
        uint256 epochDuration;
        bool enforceVendorWhitelist;
        bool isActive;
    }

    struct EscalatedProposal {
        uint256 id;
        address lead;
        address token;
        address payable to;
        uint256 amount;
        string metadataURI;
        uint256 createdAt;
        uint256 approvalCount;
        ProposalStatus status;
    }

    // --- Events ---
    event BudgetConfigured(
        address indexed lead,
        string roleName,
        address indexed token,
        uint256 monthlyCeiling,
        uint256 epochDuration,
        bool enforceVendorWhitelist
    );
    event VendorApprovalUpdated(address indexed lead, address indexed vendor, bool approved);
    event DepartmentStatusChanged(address indexed lead, bool isActive);
    event EscalationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    event FastPathExecuted(
        address indexed lead,
        address indexed token,
        address indexed to,
        uint256 amount,
        string metadataURI,
        uint256 epochRemaining
    );
    event EscalationCreated(
        uint256 indexed proposalId,
        address indexed lead,
        address indexed token,
        address to,
        uint256 amount,
        string metadataURI,
        string reason
    );
    event EscalationApproved(uint256 indexed proposalId, address indexed approver, uint256 totalApprovals);
    event EscalationExecuted(uint256 indexed proposalId, address indexed executor, address indexed to, uint256 amount);
    event EscalationCancelled(uint256 indexed proposalId, address indexed canceller, string reason);
    event EpochRollover(address indexed lead, uint256 newEpochStart);

    // --- Admin Operations ---
    function setDepartmentBudget(
        address lead,
        string calldata roleName,
        address token,
        uint256 monthlyCeiling,
        uint256 epochDuration,
        bool enforceVendorWhitelist
    ) external;

    function setVendorApproval(address lead, address vendor, bool approved) external;

    function setBatchVendorApproval(
        address lead,
        address[] calldata vendors,
        bool[] calldata approvals
    ) external;

    function setEscalationThreshold(uint256 newThreshold) external;

    function setDepartmentActive(address lead, bool isActive) external;

    // --- Spender Operations ---
    function spend(
        address payable to,
        uint256 amount,
        string calldata metadataURI
    ) external returns (bool fastPath, uint256 proposalId);

    function spendToken(
        address token,
        address to,
        uint256 amount,
        string calldata metadataURI
    ) external returns (bool fastPath, uint256 proposalId);

    // --- Escalation Resolution ---
    function approveEscalation(uint256 proposalId) external;

    function executeEscalatedProposal(uint256 proposalId) external;

    function cancelEscalation(uint256 proposalId, string calldata reason) external;

    // --- Views ---
    function getBudget(address lead) external view returns (DepartmentBudget memory);

    function getRemainingBudget(address lead) external view returns (uint256 remaining, uint256 currentEpochStart);

    function isVendorApproved(address lead, address vendor) external view returns (bool);

    function getProposal(uint256 proposalId) external view returns (EscalatedProposal memory);

    function hasApprovedProposal(uint256 proposalId, address approver) external view returns (bool);
}
