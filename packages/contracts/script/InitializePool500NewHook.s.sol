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
 * @title InitializePool500NewHook
 * @notice 使用新的 ComplianceHook 初始化 USDC/WETH Pool (fee=500, tickSpacing=10)
 */
contract InitializePool500NewHook is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant NEW_HOOK = 0xba90d5Fe45b84b2b99e9C5A1A36C72695c514A80; // 新的正确 ComplianceHook

    uint24 constant FEE = 500; // 0.05%
    int24 constant TICK_SPACING = 10;

    function run() external {
        console.log("=======================================================");
        console.log("Initialize USDC/WETH Pool with New Hook");
        console.log("=======================================================");

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(NEW_HOOK)
        });

        // 初始价格: 1 WETH ≈ 3000 USDC
        // tick ≈ 196,250
        int24 initialTick = 196250;
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(initialTick);

        console.log("Hook:            ", NEW_HOOK);
        console.log("Fee:             ", FEE);
        console.log("Tick Spacing:    ", uint24(TICK_SPACING));
        console.log("Initial tick:    ", int256(initialTick));
        console.log("Initial sqrtPriceX96:", sqrtPriceX96);
        console.log("");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96);

        vm.stopBroadcast();

        console.log("");
        console.log("Pool initialized successfully!");
        console.log("=======================================================");
    }
}
