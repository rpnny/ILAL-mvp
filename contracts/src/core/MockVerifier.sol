// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVerifier} from "../interfaces/IVerifier.sol";

/**
 * @title MockVerifier
 * @notice Mock ZK 验证器，用于测试和开发
 * @dev 在真实 Groth16/PLONK Verifier 实现前使用
 *      生产环境必须替换为真实的 ZK 验证合约！
 */
contract MockVerifier is IVerifier {
    // ============ 状态变量 ============

    /// @notice 是否强制验证失败 (用于测试)
    bool public forceFailure;

    /// @notice 白名单用户 (用于快速测试)
    mapping(address => bool) public allowedUsers;

    // ============ Events ============

    event VerificationAttempt(address indexed user, bool success);
    event UserAllowed(address indexed user, bool allowed);

    // ============ 构造函数 ============

    constructor() {
        forceFailure = false;
    }

    // ============ 验证函数 ============

    /// @inheritdoc IVerifier
    function verifyComplianceProof(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        // 开发模式：允许跳过验证
        if (forceFailure) {
            return false;
        }

        // 简单验证：proof 不为空且 publicInputs 至少包含用户地址
        if (proof.length == 0 || publicInputs.length == 0) {
            return false;
        }

        // 从 publicInputs[0] 提取用户地址
        address user = address(uint160(publicInputs[0]));

        // 检查白名单（用于测试）
        return allowedUsers[user];
    }

    /// @inheritdoc IVerifier
    function verifyAndExtractUser(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (address user, bool isValid) {
        if (publicInputs.length == 0) {
            return (address(0), false);
        }

        user = address(uint160(publicInputs[0]));
        isValid = this.verifyComplianceProof(proof, publicInputs);
    }

    // ============ 测试辅助函数 ============

    /**
     * @notice 设置用户白名单状态 (仅用于测试)
     * @param user 用户地址
     * @param allowed 是否允许
     */
    function setUserAllowed(address user, bool allowed) external {
        allowedUsers[user] = allowed;
        emit UserAllowed(user, allowed);
    }

    /**
     * @notice 批量设置白名单
     * @param users 用户地址数组
     * @param allowed 是否允许
     */
    function setUsersAllowed(address[] calldata users, bool allowed) external {
        for (uint256 i = 0; i < users.length; i++) {
            allowedUsers[users[i]] = allowed;
            emit UserAllowed(users[i], allowed);
        }
    }

    /**
     * @notice 设置强制失败标志 (用于测试负面场景)
     * @param _forceFailure 是否强制失败
     */
    function setForceFailure(bool _forceFailure) external {
        forceFailure = _forceFailure;
    }
}
