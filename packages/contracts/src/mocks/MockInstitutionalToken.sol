// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Testnet-only mintable token for live ILAL integration exercises.
contract MockInstitutionalToken is ERC20 {
    uint8 private immutable _customDecimals;
    address public immutable owner;

    error NotOwner();

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address owner_
    ) ERC20(name_, symbol_) {
        _customDecimals = decimals_;
        owner = owner_;
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        _mint(to, amount);
    }
}
