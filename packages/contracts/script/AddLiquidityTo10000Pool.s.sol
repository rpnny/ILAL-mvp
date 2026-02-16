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

contract LiquidityHelper10000 is IUnlockCallback {
    using CurrencyLibrary for Currency;
    
    IPoolManager public immutable poolManager;
    address public immutable deployer;
    
    struct AddLiqParams {
        PoolKey poolKey;
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
        bytes hookData;
    }
    
    constructor(address _poolManager, address _deployer) {
        poolManager = IPoolManager(_poolManager);
        deployer = _deployer;
    }
    
    function addLiquidity(
        PoolKey memory poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        bytes memory hookData
    ) external returns (BalanceDelta) {
        AddLiqParams memory params = AddLiqParams({
            poolKey: poolKey,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: int256(uint256(liquidity)),
            hookData: hookData
        });
        
        bytes memory result = poolManager.unlock(abi.encode(params));
        return abi.decode(result, (BalanceDelta));
    }
    
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "only pool manager");
        
        AddLiqParams memory params = abi.decode(data, (AddLiqParams));
        
        (BalanceDelta callerDelta, ) = poolManager.modifyLiquidity(
            params.poolKey,
            IPoolManager.ModifyLiquidityParams({
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                liquidityDelta: params.liquidityDelta,
                salt: bytes32(0)
            }),
            params.hookData
        );
        
        int128 delta0 = callerDelta.amount0();
        int128 delta1 = callerDelta.amount1();
        
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
        if (delta0 < 0) {
            uint128 amt = uint128(-delta0);
            console.log("Settling USDC:", amt);
            poolManager.sync(params.poolKey.currency0);
            IERC20(Currency.unwrap(params.poolKey.currency0)).transferFrom(deployer, address(poolManager), amt);
            poolManager.settle();
        } else if (delta0 > 0) {
            poolManager.take(params.poolKey.currency0, deployer, uint128(delta0));
        }
        
        // 处理 token1 (WETH)
        if (delta1 < 0) {
            uint128 amt = uint128(-delta1);
            console.log("Settling WETH:", amt);
            poolManager.sync(params.poolKey.currency1);
            IERC20(Currency.unwrap(params.poolKey.currency1)).transferFrom(deployer, address(poolManager), amt);
            poolManager.settle();
        } else if (delta1 > 0) {
            poolManager.take(params.poolKey.currency1, deployer, uint128(delta1));
        }
        
        return abi.encode(callerDelta);
    }
}

contract AddLiquidityTo10000Pool is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    function run() external {
        console.log("=== Add Liquidity to Pool (fee=10000) ===");
        
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        vm.startBroadcast(pk);
        
        // 1. Deploy helper
        LiquidityHelper10000 helper = new LiquidityHelper10000(POOL_MANAGER, deployer);
        console.log("Helper deployed:", address(helper));
        
        // 2. Approve helper as router
        IRegistry(REGISTRY).approveRouter(address(helper), true);
        console.log("Helper approved as router");
        
        // 3. Check session
        bool sessionActive = ISessionManager(SESSION_MANAGER).isSessionActive(deployer);
        console.log("Session active:", sessionActive);
        require(sessionActive, "Session not active");
        
        // 4. Approve tokens
        IERC20(WETH).approve(address(helper), type(uint256).max);
        IERC20(USDC).approve(address(helper), type(uint256).max);
        console.log("Tokens approved");
        
        // 5. Pool key
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(HOOK)
        });
        
        // 6. 添加流动性
        // Tick range: [195800, 196600] 围绕 current tick 196200
        int24 tickLower = 195800;  // -400 ticks
        int24 tickUpper = 196600;  // +400 ticks
        uint128 liquidity = 2000000000000; // 2e12
        
        bytes memory hookData = abi.encodePacked(deployer);
        
        console.log("Adding liquidity:");
        console.log("  tickLower:", vm.toString(tickLower));
        console.log("  tickUpper:", vm.toString(tickUpper));
        console.log("  liquidity:", liquidity);
        
        BalanceDelta delta = helper.addLiquidity(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            hookData
        );
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("SUCCESS! Liquidity added.");
        console.log("Delta amount0 (USDC):", vm.toString(delta.amount0()));
        console.log("Delta amount1 (WETH):", vm.toString(delta.amount1()));
    }
}

interface IRegistry {
    function approveRouter(address router, bool approved) external;
    function isRouterApproved(address router) external view returns (bool);
}

interface ISessionManager {
    function isSessionActive(address user) external view returns (bool);
}
