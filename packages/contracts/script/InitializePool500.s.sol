// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/libraries/TickMath.sol";

/**
 * @title InitializePool500
 * @notice 初始化新的 USDC/WETH Pool (fee=500, tickSpacing=10)
 *         旧 Pool (fee=3000) 价格已被推至 MAX_TICK，不可用
 *         新 Pool 使用正确的初始价格 (1 WETH ≈ 3000 USDC)
 */
contract InitializePool500 is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    // 新 Pool 参数
    uint24 constant FEE = 500; // 0.05%
    int24 constant TICK_SPACING = 10;

    function run() external {
        console.log("=======================================================");
        console.log("Initialize USDC/WETH Pool (fee=500, tickSpacing=10)");
        console.log("=======================================================");

        // PoolKey: currency0 = USDC (lower address), currency1 = WETH (higher address)
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        // 正确的初始价格: 1 WETH ≈ 3000 USDC
        // Uniswap v4 price = token1_raw / token0_raw = WETH_raw / USDC_raw
        // For 1 WETH = 3000 USDC: price = 1e18 / 3e9 = 3.333e8
        // tick = log_1.0001(3.333e8) ≈ 196,249
        // Rounded to nearest multiple of tickSpacing(10): 196,250
        int24 initialTick = 196250;
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(initialTick);

        console.log("Hook:            ", HOOK);
        console.log("Fee:             ", FEE);
        console.log("Tick Spacing:     10");
        console.log("Initial tick:    ", vm.toString(initialTick));
        console.log("sqrtPriceX96:    ", vm.toString(sqrtPriceX96));

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        int24 resultTick = poolManager.initialize(key, sqrtPriceX96);

        vm.stopBroadcast();

        console.log("");
        console.log("Pool initialized! Result tick:", vm.toString(resultTick));
        console.log("=======================================================");
        console.log("SUCCESS! Pool ready for liquidity.");
        console.log("=======================================================");
    }
}
