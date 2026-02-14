// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@uniswap/v4-core/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import "@uniswap/v4-core/types/PoolKey.sol";
import "@uniswap/v4-core/types/Currency.sol";
import "@uniswap/v4-core/types/BalanceDelta.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SimpleSwapRouter
 * @notice 简单的 Uniswap v4 Swap Router
 * @dev 用于演示如何通过 unlock 机制执行 swap
 */
contract SimpleSwapRouter is IUnlockCallback {
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;

    IPoolManager public immutable poolManager;

    // Swap 回调数据
    struct SwapCallbackData {
        address sender;
        PoolKey poolKey;
        IPoolManager.SwapParams params;
        bytes hookData;
    }

    // 错误
    error UnauthorizedCallback();
    error InsufficientOutput();

    // 事件
    event SwapExecuted(
        address indexed sender,
        Currency currency0,
        Currency currency1,
        int256 amount0,
        int256 amount1
    );

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    /**
     * @notice 执行 Swap
     * @param key Pool 标识
     * @param params Swap 参数
     * @param hookData 传递给 Hook 的数据
     * @return delta 代币变化量
     */
    function swap(
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        // 准备回调数据
        SwapCallbackData memory data = SwapCallbackData({
            sender: msg.sender,
            poolKey: key,
            params: params,
            hookData: hookData
        });

        // 调用 unlock 触发回调
        bytes memory result = poolManager.unlock(abi.encode(data));
        delta = abi.decode(result, (BalanceDelta));

        emit SwapExecuted(
            msg.sender,
            key.currency0,
            key.currency1,
            delta.amount0(),
            delta.amount1()
        );
    }

    /**
     * @notice Unlock 回调
     * @dev 在此函数中执行实际的 swap
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        // 只能由 PoolManager 调用
        if (msg.sender != address(poolManager)) revert UnauthorizedCallback();

        // 解码回调数据
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));

        // 执行 swap
        BalanceDelta delta = poolManager.swap(
            callbackData.poolKey,
            callbackData.params,
            callbackData.hookData
        );

        // 处理代币结算
        _settleSwap(callbackData.sender, callbackData.poolKey, callbackData.params, delta);

        // 返回 delta
        return abi.encode(delta);
    }

    /**
     * @notice 处理 Swap 的代币结算
     */
    function _settleSwap(
        address user,
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        BalanceDelta delta
    ) internal {
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();
        // 使用 Uniswap v4 官方测试路由器同款逻辑：
        // zeroForOne: 结算 currency0，提取 currency1
        // oneForZero: 结算 currency1，提取 currency0
        if (params.zeroForOne) {
            if (amount0 < 0) _settle(user, key.currency0, uint128(-amount0));
            if (amount1 > 0) poolManager.take(key.currency1, user, uint128(amount1));
        } else {
            if (amount1 < 0) _settle(user, key.currency1, uint128(-amount1));
            if (amount0 > 0) poolManager.take(key.currency0, user, uint128(amount0));
        }
    }

    /**
     * @notice 将代币存入 PoolManager
     */
    function _settle(address from, Currency currency, uint128 amount) internal {
        if (currency.isAddressZero()) {
            // ETH
            poolManager.settle{value: amount}();
        } else {
            // ERC20
            poolManager.sync(currency);
            IERC20(Currency.unwrap(currency)).safeTransferFrom(
                from,
                address(poolManager),
                amount
            );
            poolManager.settle();
        }
    }

    /**
     * @notice 接收 ETH
     */
    receive() external payable {}
}
