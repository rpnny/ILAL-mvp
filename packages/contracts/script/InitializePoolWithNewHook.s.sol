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
 * @title InitializePoolWithNewHook
 * @notice 使用新部署的 ComplianceHook 初始化 Uniswap v4 Pool
 */
contract InitializePoolWithNewHook is Script {
    // 合约地址 (Base Sepolia)
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant NEW_HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;
    
    // Pool 参数
    uint24 constant FEE = 3000; // 0.3%
    int24 constant TICK_SPACING = 60;
    
    function run() external {
        console.log("=======================================================");
        console.log("Initializing Pool with New Hook");
        console.log("=======================================================");
        console.log("PoolManager: ", POOL_MANAGER);
        console.log("Hook:        ", NEW_HOOK);
        console.log("WETH:        ", WETH);
        console.log("USDC:        ", USDC);
        console.log("Fee:         ", FEE);
        console.log("Tick Spacing:", TICK_SPACING);
        console.log("");

        // 构造 PoolKey (currency0 < currency1)
        // USDC (0x036C...) < WETH (0x4200...)
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(NEW_HOOK)
        });

        // 初始价格：USDC/WETH = 1/3000 (1 USDC = 0.000333 ETH)
        // sqrtPriceX96 = sqrt(price) * 2^96
        // 因为 currency0 是 USDC，currency1 是 WETH，所以 price = USDC/WETH = 1/3000
        int24 initialTick = -276325; // 对应 price = 1/3000
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(initialTick);

        console.log("Initial tick:", vm.toString(initialTick));
        console.log("Initial sqrtPriceX96:", vm.toString(sqrtPriceX96));
        console.log("");

        // 开始部署
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 初始化 Pool
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        int24 initializedTick = poolManager.initialize(key, sqrtPriceX96);

        vm.stopBroadcast();

        console.log("Pool initialized!");
        console.log("Initial tick:", vm.toString(initializedTick));
        console.log("");
        console.log("=======================================================");
        console.log("SUCCESS!");
        console.log("=======================================================");
        console.log("Next: Update frontend and bot configs");
    }
}
