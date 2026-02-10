// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISessionManager} from "../interfaces/ISessionManager.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {IComplianceHook} from "../interfaces/IComplianceHook.sol";
import {IMessageSender} from "../interfaces/IMessageSender.sol";
import {EIP712Verifier} from "../libraries/EIP712Verifier.sol";

/**
 * @title ComplianceHook
 * @notice Uniswap v4 合规 Hook - 实现身份验证和准入控制
 * @dev 使用 hookData + EIP-712 签名验证方案（Phase 0 决策）
 *      
 * ✅ Phase 0 决策实施：
 * 1. hookData 传递用户地址和签名
 * 2. EIP-712 签名验证防伪造
 * 3. 支持 EOA 直接调用（签名可选）
 */
contract ComplianceHook is IComplianceHook, EIP712Verifier {
    // ============ 状态变量 ============

    /// @notice Registry 合约引用
    IRegistry public immutable override registry;

    /// @notice SessionManager 合约引用
    ISessionManager public immutable override sessionManager;

    // ============ Events ============

    event SwapAttempt(address indexed user, bool allowed);
    event LiquidityAttempt(address indexed user, bool isAdd, bool allowed);

    // ============ Errors ============

    error NotVerified(address user);
    error EmergencyPaused();
    error InvalidHookData();

    // ============ Structs ============

    /// @notice hookData 解析结构
    struct PermitData {
        address user;        // 用户地址
        uint256 deadline;    // 签名过期时间
        uint256 nonce;       // 用户 nonce
        bytes signature;     // EIP-712 签名
    }

    // ============ 构造函数 ============

    constructor(address _registry, address _sessionManager) EIP712Verifier() {
        if (_registry == address(0) || _sessionManager == address(0)) {
            revert("Invalid addresses");
        }

        registry = IRegistry(_registry);
        sessionManager = ISessionManager(_sessionManager);
    }

    // ============ Hook 函数 (简化版) ============

    /**
     * @notice 交换前检查
     * @param sender 调用者地址 (可能是路由器)
     * @param hookData 自定义数据 (包含实际用户地址)
     * @return 是否允许
     */
    function beforeSwap(address sender, bytes calldata hookData)
        external
        returns (bool)
    {
        // 检查紧急暂停
        if (registry.emergencyPaused()) {
            revert EmergencyPaused();
        }

        // 解析用户地址
        address user = _resolveUser(sender, hookData);

        // 检查会话
        bool allowed = sessionManager.isSessionActive(user);

        if (!allowed) {
            emit AccessDenied(user, "Session not active");
            revert NotVerified(user);
        }

        emit SwapAttempt(user, allowed);
        return allowed;
    }

    /**
     * @notice 添加流动性前检查
     * @param sender 调用者地址
     * @param hookData 自定义数据
     * @return 是否允许
     */
    function beforeAddLiquidity(address sender, bytes calldata hookData)
        external
        returns (bool)
    {
        if (registry.emergencyPaused()) {
            revert EmergencyPaused();
        }

        address user = _resolveUser(sender, hookData);
        bool allowed = sessionManager.isSessionActive(user);

        if (!allowed) {
            emit AccessDenied(user, "Session not active");
            revert NotVerified(user);
        }

        emit LiquidityAttempt(user, true, allowed);
        return allowed;
    }

    /**
     * @notice 移除流动性前检查
     * @param sender 调用者地址
     * @param hookData 自定义数据
     * @return 是否允许
     * 
     * @dev ⚠️ 重要：紧急模式下仍允许移除流动性（机构需要的"逃生舱"）
     *      这是机构投资者最看重的安全机制 - 在极端情况下能够撤出资金
     */
    function beforeRemoveLiquidity(address sender, bytes calldata hookData)
        external
        returns (bool)
    {
        // ⚠️ 注意：这里不检查 emergencyPaused，确保紧急情况下可以撤资
        // if (registry.emergencyPaused()) {
        //     revert EmergencyPaused();
        // }

        address user = _resolveUser(sender, hookData);
        bool allowed = sessionManager.isSessionActive(user);

        if (!allowed) {
            emit AccessDenied(user, "Session not active");
            revert NotVerified(user);
        }

        emit LiquidityAttempt(user, false, allowed);
        return allowed;
    }

    // ============ 用户解析 ============

    /**
     * @notice 解析实际用户地址（使用 EIP-712 签名验证）
     * @param sender 调用者 (可能是路由器或 EOA)
     * @param hookData 包含用户地址和签名的数据
     * @return user 实际用户地址
     * 
     * @dev Phase 0 决策实现: hookData + EIP-712
     *      hookData 格式: abi.encode(user, deadline, nonce, signature)
     * 
     *      支持三种模式:
     *      1. 完整签名模式 (推荐): hookData 包含完整 PermitData
     *      2. EOA 直接调用: hookData 为空，直接使用 sender
     *      3. 白名单路由: hookData 仅含地址（向后兼容）
     */
    function _resolveUser(address sender, bytes calldata hookData)
        internal
        returns (address user)
    {
        // 模式 1: 完整签名验证（安全性最高）
        if (hookData.length >= 148) { // 20 + 32 + 32 + 64 最小长度
            PermitData memory permit = abi.decode(hookData, (PermitData));
            
            // 验证 EIP-712 签名
            verifySwapPermit(
                permit.user,
                permit.deadline,
                permit.nonce,
                permit.signature
            );
            
            emit UserVerified(permit.user);
            return permit.user;
        }

        // 模式 2: EOA 直接调用（无需签名）
        if (hookData.length == 0) {
            // 直接使用 sender（EOA 自己交易）
            return sender;
        }

        // 模式 3: 仅地址模式（向后兼容，仅限白名单路由）
        if (hookData.length >= 20) {
            user = address(bytes20(hookData[0:20]));
            
            // 必须是白名单路由器才能使用此模式
            if (!registry.isRouterApproved(sender)) {
                revert InvalidHookData();
            }
            
            return user;
        }

        // 无法解析，拒绝
        revert InvalidHookData();
    }

    // ============ 查询函数 ============

    /// @inheritdoc IComplianceHook
    function isUserAllowed(address user) external view override returns (bool) {
        return sessionManager.isSessionActive(user);
    }

    /**
     * @notice 批量检查用户权限
     * @param users 用户地址数组
     * @return allowed 对应的权限状态
     */
    function batchIsUserAllowed(address[] calldata users)
        external
        view
        returns (bool[] memory allowed)
    {
        allowed = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            allowed[i] = sessionManager.isSessionActive(users[i]);
        }
    }
}
