// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IComplianceHook
 * @notice Uniswap v4 合规 Hook 接口
 */
interface IComplianceHook {
    // ============ Events ============

    event UserVerified(address indexed user);

    event AccessDenied(address indexed user, string reason);

    // ============ Hook 状态 ============

    function isUserAllowed(address user) external view returns (bool);
}
