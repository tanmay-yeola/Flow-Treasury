// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISafe.sol";

/**
 * @title MockSafe
 * @notice Mock implementation of Gnosis Safe for testing module transactions
 */
contract MockSafe is ISafe {
    address[] public owners;
    mapping(address => bool) public override isOwner;
    mapping(address => bool) public isModule;
    uint256 public threshold;

    event ModuleTransactionExecuted(
        address indexed module,
        address indexed to,
        uint256 value,
        bytes data,
        Enum.Operation operation,
        bool success
    );

    constructor(address[] memory _owners, uint256 _threshold) {
        owners = _owners;
        threshold = _threshold;
        for (uint256 i = 0; i < _owners.length; i++) {
            isOwner[_owners[i]] = true;
        }
    }

    receive() external payable {}

    function enableModule(address module) external {
        isModule[module] = true;
    }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external override returns (bool success) {
        require(isModule[msg.sender], "Caller is not an authorized module");

        if (operation == Enum.Operation.Call) {
            (success, ) = to.call{value: value}(data);
        } else {
            revert("DelegateCall not supported in mock");
        }

        emit ModuleTransactionExecuted(msg.sender, to, value, data, operation, success);
    }

    function getOwners() external view override returns (address[] memory) {
        return owners;
    }

    function getThreshold() external view override returns (uint256) {
        return threshold;
    }
}
