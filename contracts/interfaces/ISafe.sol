// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Gnosis Safe Enum for Operation types
library Enum {
    enum Operation {
        Call,
        DelegateCall
    }
}

/// @notice Minimal interface for Gnosis Safe to execute transactions from authorized modules
interface ISafe {
    /// @notice Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction: 0 == Call, 1 == DelegateCall.
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external returns (bool success);

    /// @notice Returns array of Safe owners.
    function getOwners() external view returns (address[] memory);

    /// @notice Returns whether an account is an owner of the Safe.
    function isOwner(address owner) external view returns (bool);

    /// @notice Returns threshold of Safe signatures required for multisig actions.
    function getThreshold() external view returns (uint256);
}
