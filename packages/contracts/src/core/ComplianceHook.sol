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
 * @notice Uniswap v4 compliance hook — identity verification and access control
 * @dev Only callable by the PoolManager (prevents nonce griefing).
 *      hookData modes:
 *        1. Full EIP-712 signature (hookData >= 148 bytes)
 *        2. EOA direct call (hookData empty, sender = user)
 */
contract ComplianceHook is IComplianceHook, IHooks, EIP712Verifier {
    // ============ State ============

    IRegistry public immutable registry;
    ISessionManager public immutable sessionManager;
    IPoolManager public immutable poolManager;

    // ============ Events ============

    event SwapAttempt(address indexed user, bool allowed);
    event LiquidityAttempt(address indexed user, bool isAdd, bool allowed);

    // ============ Errors ============

    error NotVerified(address user);
    error EmergencyPaused();
    error InvalidHookData();
    error OnlyPoolManager();

    // ============ Structs ============

    struct PermitData {
        address user;
        uint256 deadline;
        uint256 nonce;
        bytes signature;
    }

    // ============ Modifiers ============

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        _;
    }

    // ============ Constructor ============

    constructor(
        address _poolManager,
        address _registry,
        address _sessionManager
    ) EIP712Verifier() {
        if (_poolManager == address(0) || _registry == address(0) || _sessionManager == address(0)) {
            revert("Invalid addresses");
        }
        poolManager = IPoolManager(_poolManager);
        registry = IRegistry(_registry);
        sessionManager = ISessionManager(_sessionManager);
    }

    // ============ Uniswap v4 IHooks ============

    function beforeSwap(
        address sender,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
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

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4) {
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

    /// @dev Emergency pause does NOT block removals — ensures users can always withdraw.
    ///      Session check is advisory; non-active users can still withdraw but trigger a warning.
    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4) {
        address user = _resolveUser(sender, hookData);
        bool allowed = sessionManager.isSessionActive(user);

        if (!allowed) {
            emit AccessDenied(user, "Session not active but withdrawal allowed");
        }

        emit LiquidityAttempt(user, false, allowed);
        return IHooks.beforeRemoveLiquidity.selector;
    }

    // ============ IHooks — unused hooks (return defaults) ============

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

    // ============ User Resolution ============

    /**
     * @notice Resolve the actual user address from hookData
     * @dev Two modes only:
     *   1. Full EIP-712 signature (hookData >= 148 bytes)
     *   2. EOA direct call (hookData empty — sender IS the user)
     *
     *   All operations (swap, addLiquidity, removeLiquidity) use the same SwapPermit
     *   type for identity verification. The hook's role is access control (session check),
     *   not operation-level authorization. verifyLiquidityPermit in EIP712Verifier is
     *   available for future use if operation-specific permits are needed.
     */
    function _resolveUser(address sender, bytes calldata hookData)
        internal
        returns (address user)
    {
        if (hookData.length >= 148) {
            PermitData memory permit = abi.decode(hookData, (PermitData));
            verifySwapPermit(permit.user, permit.deadline, permit.nonce, permit.signature);
            emit UserVerified(permit.user);
            return permit.user;
        }

        if (hookData.length == 0) {
            return sender;
        }

        revert InvalidHookData();
    }

    // ============ View Functions ============

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
