export const SCOPED_BUDGET_MODULE_ABI = [
  "function setDepartmentBudget(address lead, string calldata roleName, address token, uint256 monthlyCeiling, uint256 epochDuration, bool enforceVendorWhitelist) external",
  "function setVendorApproval(address lead, address vendor, bool approved) external",
  "function setBatchVendorApproval(address lead, address[] calldata vendors, bool[] calldata approvals) external",
  "function setEscalationThreshold(uint256 newThreshold) external",
  "function setDepartmentActive(address lead, bool isActive) external",
  "function spend(address payable to, uint256 amount, string calldata metadataURI) external returns (bool fastPath, uint256 proposalId)",
  "function spendToken(address token, address to, uint256 amount, string calldata metadataURI) external returns (bool fastPath, uint256 proposalId)",
  "function approveEscalation(uint256 proposalId) external",
  "function executeEscalatedProposal(uint256 proposalId) external",
  "function cancelEscalation(uint256 proposalId, string calldata reason) external",
  "function getBudget(address lead) external view returns (tuple(string roleName, address lead, address token, uint256 monthlyCeiling, uint256 spentInCurrentEpoch, uint256 epochStart, uint256 epochDuration, bool enforceVendorWhitelist, bool isActive))",
  "function getRemainingBudget(address lead) external view returns (uint256 remaining, uint256 currentEpochStart)",
  "function isVendorApproved(address lead, address vendor) external view returns (bool)",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address lead, address token, address to, uint256 amount, string metadataURI, uint256 createdAt, uint256 approvalCount, uint8 status))",
  "function hasApprovedProposal(uint256 proposalId, address approver) external view returns (bool)",
  "function safeVault() external view returns (address)",
  "function owner() external view returns (address)",
  "function escalationThreshold() external view returns (uint256)",
  "function proposalCounter() external view returns (uint256)",
  "event FastPathExecuted(address indexed lead, address indexed token, address indexed to, uint256 amount, string metadataURI, uint256 epochRemaining)",
  "event EscalationCreated(uint256 indexed proposalId, address indexed lead, address indexed token, address to, uint256 amount, string metadataURI, string reason)",
  "event EscalationApproved(uint256 indexed proposalId, address indexed approver, uint256 totalApprovals)",
  "event EscalationExecuted(uint256 indexed proposalId, address indexed executor, address indexed to, uint256 amount)",
  "event EscalationCancelled(uint256 indexed proposalId, address indexed canceller, string reason)"
];

export const SAFE_ABI = [
  "function execTransactionFromModule(address to, uint256 value, bytes memory data, uint8 operation) external returns (bool success)",
  "function getOwners() external view returns (address[] memory)",
  "function isOwner(address owner) external view returns (bool)",
  "function getThreshold() external view returns (uint256)"
];

export const ERC20_ABI = [
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function mint(address to, uint256 amount) external"
];
