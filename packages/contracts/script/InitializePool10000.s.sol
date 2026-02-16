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
 * @title InitializePool10000
 * @notice 初始化新的 USDC/WETH Pool (fee=10000, tickSpacing=200)
 *         使用不同的参数以避免与之前的池子冲突
 */
contract InitializePool10000 is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    // 新 Pool 参数 - 使用 1% fee
    uint24 constant FEE = 10000; // 1%
    int24 constant TICK_SPACING = 200;

    function run() external {
        console.log("=======================================================");
        console.log("Initialize USDC/WETH Pool (fee=10000, tickSpacing=200)");
        console.log("=======================================================");

        // PoolKey: currency0 = USDC (lower address), currency1 = WETH (higher address)
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        // 初始价格: 1 WETH ≈ 3000 USDC
        // tick ≈ 196,249
        // Rounded to nearest multiple of tickSpacing(200): 196,200
        int24 initialTick = 196200;
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(initialTick);

        console.log("Hook:            ", HOOK);
        console.log("Fee:             ", FEE);
        console.log("Tick Spacing:     200");
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
        console.log("SUCCESS! Pool ready for liquidity and swaps.");
        console.log("=======================================================");
        
        // 计算并显示 Pool ID
        bytes32 poolId = keccak256(abi.encode(key));
        console.log("");
        console.log("Pool ID:");
        console.logBytes32(poolId);
    }
}
