// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapTester500 is IUnlockCallback {
    using CurrencyLibrary for Currency;

    IPoolManager public immutable poolManager;
    address public immutable trader;

    struct SwapCallbackData {
        PoolKey poolKey;
        IPoolManager.SwapParams params;
        bytes hookData;
    }

    constructor(address _poolManager, address _trader) {
        poolManager = IPoolManager(_poolManager);
        trader = _trader;
    }

    function testSwap(
        PoolKey memory poolKey,
        IPoolManager.SwapParams memory params,
        bytes memory hookData
    ) external returns (BalanceDelta) {
        bytes memory result = poolManager.unlock(abi.encode(SwapCallbackData({
            poolKey: poolKey,
            params: params,
            hookData: hookData
        })));
        return abi.decode(result, (BalanceDelta));
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "only pool manager");
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));

        BalanceDelta delta = poolManager.swap(callbackData.poolKey, callbackData.params, callbackData.hookData);

        int128 delta0 = delta.amount0();
        int128 delta1 = delta.amount1();

        // 与官方测试路由逻辑一致
        if (callbackData.params.zeroForOne) {
            if (delta0 < 0) _settle(trader, callbackData.poolKey.currency0, uint128(-delta0));
            if (delta1 > 0) poolManager.take(callbackData.poolKey.currency1, trader, uint128(delta1));
        } else {
            if (delta1 < 0) _settle(trader, callbackData.poolKey.currency1, uint128(-delta1));
            if (delta0 > 0) poolManager.take(callbackData.poolKey.currency0, trader, uint128(delta0));
        }

        return abi.encode(delta);
    }

    function _settle(address from, Currency currency, uint128 amount) internal {
        poolManager.sync(currency);
        IERC20(Currency.unwrap(currency)).transferFrom(from, address(poolManager), amount);
        poolManager.settle();
    }
}

contract DirectSwapTest500 is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address trader = vm.addr(pk);

        vm.startBroadcast(pk);

        SwapTester500 tester = new SwapTester500(POOL_MANAGER, trader);
        IRegistry(REGISTRY).approveRouter(address(tester), true);

        require(ISessionManager(SESSION_MANAGER).isSessionActive(trader), "session inactive");

        IERC20(USDC).approve(address(tester), type(uint256).max);
        IERC20(WETH).approve(address(tester), type(uint256).max);

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(HOOK)
        });

        // 0.2 USDC -> WETH
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -200000, // 0.2 USDC
            sqrtPriceLimitX96: 4295128740 // MIN+1
        });

        bytes memory hookData = abi.encodePacked(trader);
        BalanceDelta delta = tester.testSwap(poolKey, params, hookData);

        vm.stopBroadcast();

        console.log("swap success");
        console.logInt(delta.amount0());
        console.logInt(delta.amount1());
    }
}

interface IRegistry {
    function approveRouter(address router, bool approved) external;
}

interface ISessionManager {
    function isSessionActive(address user) external view returns (bool);
}
