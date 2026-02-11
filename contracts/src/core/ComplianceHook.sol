// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";

import {ISessionManager} from "../interfaces/ISessionManager.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {IComplianceHook} from "../interfaces/IComplianceHook.sol";
import {EIP712Verifier} from "../libraries/EIP712Verifier.sol";

/**
 * @title ComplianceHook
 * @notice Uniswap v4 合规 Hook — 实现身份验证和准入控制
 * @dev 实现完整的 IHooks 接口，与 Uniswap v4 PoolManager 完全兼容
 *
 * 合规流程：
 *   beforeSwap / beforeAddLiquidity / beforeRemoveLiquidity
 *   → 解析 hookData 获取用户身份
 *   → 检查 SessionManager.isSessionActive(user)
 *   → 放行或拒绝
 *
 * hookData 支持三种模式：
 *   1. 完整 EIP-712 签名（最安全）
 *   2. EOA 直接调用（hookData 为空）
 *   3. 白名单路由转发（hookData 仅含地址）
 */
contract ComplianceHook is IComplianceHook, IHooks, EIP712Verifier {
    // ============ 状态变量 ============

    /// @notice Registry 合约引用
    IRegistry public immutable registry;

    /// @notice SessionManager 合约引用
    ISessionManager public immutable sessionManager;

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
        address user;
        uint256 deadline;
        uint256 nonce;
        bytes signature;
    }

    // ============ 构造函数 ============

    constructor(address _registry, address _sessionManager) EIP712Verifier() {
        if (_registry == address(0) || _sessionManager == address(0)) {
            revert("Invalid addresses");
        }
        registry = IRegistry(_registry);
        sessionManager = ISessionManager(_sessionManager);
    }

    // ============ Uniswap v4 IHooks — 完整实现 ============

    /// @notice Swap 前合规检查
    function beforeSwap(
        address sender,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        if (registry.emergencyPaused()) {
            revert EmergencyPaused();
        }

        address user = _resolveUser(sender, hookData);
        bool allowed = sessionManager.isSessionActive(user);

        if (!allowed) {
            emit AccessDenied(user, "Session not active");
            revert NotVerified(user);
        }

        emit SwapAttempt(user, allowed);
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice 添加流动性前合规检查
    function beforeAddLiquidity(
        address sender,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata hookData
    ) external override returns (bytes4) {
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
        return IHooks.beforeAddLiquidity.selector;
    }

    /// @notice 移除流动性前合规检查
    /// @dev 紧急暂停时仍允许移除（机构"逃生舱"）
    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata hookData
    ) external override returns (bytes4) {
        // 不检查 emergencyPaused — 确保紧急情况下可撤资
        address user = _resolveUser(sender, hookData);
        bool allowed = sessionManager.isSessionActive(user);

        if (!allowed) {
            emit AccessDenied(user, "Session not active");
            revert NotVerified(user);
        }

        emit LiquidityAttempt(user, false, allowed);
        return IHooks.beforeRemoveLiquidity.selector;
    }

    // ============ IHooks — 未使用的 Hook（返回默认值） ============

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function afterAddLiquidity(
        address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta, BalanceDelta, bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    function afterRemoveLiquidity(
        address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta, BalanceDelta, bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    function afterSwap(
        address, PoolKey calldata, IPoolManager.SwapParams calldata,
        BalanceDelta, bytes calldata
    ) external pure override returns (bytes4, int128) {
        return (IHooks.afterSwap.selector, 0);
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external pure override returns (bytes4)
    {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external pure override returns (bytes4)
    {
        return IHooks.afterDonate.selector;
    }

    // ============ 用户解析 ============

    /**
     * @notice 解析实际用户地址
     * @dev 支持三种模式：
     *   1. 完整 EIP-712 签名（hookData >= 148 bytes）
     *   2. EOA 直接调用（hookData 为空）
     *   3. 白名单路由转发（hookData >= 20 bytes，仅含地址）
     */
    function _resolveUser(address sender, bytes calldata hookData)
        internal
        returns (address user)
    {
        // 模式 1: 完整签名验证
        if (hookData.length >= 148) {
            PermitData memory permit = abi.decode(hookData, (PermitData));
            verifySwapPermit(permit.user, permit.deadline, permit.nonce, permit.signature);
            emit UserVerified(permit.user);
            return permit.user;
        }

        // 模式 2: EOA 直接调用
        if (hookData.length == 0) {
            return sender;
        }

        // 模式 3: 白名单路由转发
        if (hookData.length >= 20) {
            user = address(bytes20(hookData[0:20]));
            if (!registry.isRouterApproved(sender)) {
                revert InvalidHookData();
            }
            return user;
        }

        revert InvalidHookData();
    }

    // ============ 查询函数 ============

    /// @inheritdoc IComplianceHook
    function isUserAllowed(address user) external view override(IComplianceHook) returns (bool) {
        return sessionManager.isSessionActive(user);
    }

    function batchIsUserAllowed(address[] calldata users)
        external view returns (bool[] memory allowed)
    {
        allowed = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            allowed[i] = sessionManager.isSessionActive(users[i]);
        }
    }
}
