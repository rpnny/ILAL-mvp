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

/**
 * 直接在 PoolManager 上测试 Swap
 * 绕过 SimpleSwapRouter 来排查问题
 */
contract SwapTester is IUnlockCallback {
    using CurrencyLibrary for Currency;
    
    IPoolManager public immutable poolManager;
    address public immutable deployer;
    
    struct SwapCallbackData {
        PoolKey poolKey;
        IPoolManager.SwapParams params;
        bytes hookData;
    }
    
    constructor(address _poolManager, address _deployer) {
        poolManager = IPoolManager(_poolManager);
        deployer = _deployer;
    }
    
    function testSwap(
        PoolKey memory poolKey,
        IPoolManager.SwapParams memory params,
        bytes memory hookData
    ) external returns (BalanceDelta) {
        SwapCallbackData memory data = SwapCallbackData({
            poolKey: poolKey,
            params: params,
            hookData: hookData
        });
        
        bytes memory result = poolManager.unlock(abi.encode(data));
        return abi.decode(result, (BalanceDelta));
    }
    
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "only pool manager");
        
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));
        
        // 执行 swap
        BalanceDelta delta = poolManager.swap(
            callbackData.poolKey,
            callbackData.params,
            callbackData.hookData
        );
        
        console.log("Swap executed!");
        int128 delta0 = delta.amount0();
        int128 delta1 = delta.amount1();
        
        if (delta0 >= 0) {
            console.log("delta0 (USDC) positive:", uint128(delta0));
        } else {
            console.log("delta0 (USDC) negative:", uint128(-delta0));
        }
        if (delta1 >= 0) {
            console.log("delta1 (WETH) positive:", uint128(delta1));
        } else {
            console.log("delta1 (WETH) negative:", uint128(-delta1));
        }
        
        // 处理 token0 (USDC)
        // delta < 0 = 欠 Pool,需要 settle
        // delta > 0 = Pool 欠我们,需要 take
        if (delta0 < 0) {
            uint128 amt = uint128(-delta0);
            poolManager.sync(callbackData.poolKey.currency0);
            IERC20(Currency.unwrap(callbackData.poolKey.currency0)).transferFrom(deployer, address(poolManager), amt);
            poolManager.settle();
        } else if (delta0 > 0) {
            poolManager.take(callbackData.poolKey.currency0, deployer, uint128(delta0));
        }
        
        // 处理 token1 (WETH)
        if (delta1 < 0) {
            uint128 amt = uint128(-delta1);
            poolManager.sync(callbackData.poolKey.currency1);
            IERC20(Currency.unwrap(callbackData.poolKey.currency1)).transferFrom(deployer, address(poolManager), amt);
            poolManager.settle();
        } else if (delta1 > 0) {
            poolManager.take(callbackData.poolKey.currency1, deployer, uint128(delta1));
        }
        
        return abi.encode(delta);
    }
}

contract DirectSwapTest is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    function run() external {
        console.log("=== Direct Swap Test (Bypass SimpleSwapRouter) ===");
        console.log("");
        
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(pk);
        
        // 1. Deploy tester
        SwapTester tester = new SwapTester(POOL_MANAGER, deployer);
        console.log("SwapTester deployed:", address(tester));
        console.log("");
        
        // 2. Approve tester as router
        IRegistry(REGISTRY).approveRouter(address(tester), true);
        console.log("Tester approved as router");
        
        // 3. Check session
        bool sessionActive = ISessionManager(SESSION_MANAGER).isSessionActive(deployer);
        console.log("Session active:", sessionActive);
        require(sessionActive, "Session not active");
        console.log("");
        
        // 4. Approve tokens
        IERC20(USDC).approve(address(tester), type(uint256).max);
        IERC20(WETH).approve(address(tester), type(uint256).max);
        console.log("Tokens approved to tester");
        console.log("");
        
        // 5. Pool key (使用新Pool: fee=10000)
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(HOOK)
        });
        
        // 6. Swap params: USDC -> WETH, 0.1 USDC
        // zeroForOne: true -> price decreases -> use MIN_SQRT_PRICE + 1
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -100000,  // 0.1 USDC
            sqrtPriceLimitX96: 4295128740  // TickMath.MIN_SQRT_PRICE + 1
        });
        
        bytes memory hookData = abi.encodePacked(deployer);
        
        console.log("Executing swap:");
        console.log("  Pool: USDC/WETH fee=10000");
        console.log("  Direction: USDC -> WETH");
        console.log("  Amount: 0.1 USDC");
        console.log("");
        
        // 7. Execute swap
        BalanceDelta delta = tester.testSwap(poolKey, params, hookData);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("SUCCESS! Swap completed.");
        console.log("Delta amount0 (USDC):", vm.toString(delta.amount0()));
        console.log("Delta amount1 (WETH):", vm.toString(delta.amount1()));
        console.log("");
        console.log("=== Test Complete ===");
    }
}

interface IRegistry {
    function approveRouter(address router, bool approved) external;
}

interface ISessionManager {
    function isSessionActive(address user) external view returns (bool);
}
