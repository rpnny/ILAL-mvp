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
 * @title LiquidityHelper
 * @notice 直接通过 PoolManager 添加流动性的辅助合约
 */
contract LiquidityHelper is IUnlockCallback {
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

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
        deployer = msg.sender;
    }

    function addLiquidity(AddLiqParams calldata params) external returns (BalanceDelta) {
        require(msg.sender == deployer, "only deployer");
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

        // 结算 delta
        int128 delta0 = callerDelta.amount0();
        int128 delta1 = callerDelta.amount1();

        // Note: can't use vm inside non-Script contract, so cast to uint for logging
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
            // 需要支付 USDC 给 pool
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

/**
 * @title AddLiquidity
 * @notice 部署 LiquidityHelper 并添加 WETH 单边流动性到 USDC/WETH Pool (fee=500)
 */
contract AddLiquidity is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;

    function run() external {
        console.log("=======================================================");
        console.log("Add WETH liquidity to USDC/WETH Pool (fee=500)");
        console.log("=======================================================");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 LiquidityHelper
        LiquidityHelper helper = new LiquidityHelper(POOL_MANAGER);
        console.log("LiquidityHelper deployed:", address(helper));

        // 2. 注册 helper 为白名单路由 (ComplianceHook 需要)
        (bool s1, ) = REGISTRY.call(
            abi.encodeWithSignature("approveRouter(address,bool)", address(helper), true)
        );
        require(s1, "Failed to approve router");
        console.log("Helper approved as router");

        // 3. 确保 deployer 有 active session
        (bool s2, bytes memory sessionData) = SESSION_MANAGER.call(
            abi.encodeWithSignature("isSessionActive(address)", deployer)
        );
        require(s2, "Failed to check session");
        bool isActive = abi.decode(sessionData, (bool));
        if (!isActive) {
            uint256 expiry = block.timestamp + 24 hours;
            (bool s3, ) = SESSION_MANAGER.call(
                abi.encodeWithSignature("startSession(address,uint256)", deployer, expiry)
            );
            require(s3, "Failed to start session");
            console.log("Session activated");
        } else {
            console.log("Session already active");
        }

        // 4. Approve WETH 给 helper
        IERC20(WETH).approve(address(helper), type(uint256).max);
        // 也 approve USDC 以防万一
        IERC20(USDC).approve(address(helper), type(uint256).max);
        console.log("Tokens approved");

        // 5. 添加流动性
        // Pool 当前 tick = 196250
        // 单边 WETH: tickLower > 196250
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(HOOK)
        });

        // 重要: 要提供纯 WETH (token1)，需要 tickUpper <= currentTick
        // currentTick = 196250，tickSpacing = 10
        // 范围覆盖 WETH 价格约 1500-3000 USDC (tick ~190700 到 196250)
        int24 tickLower = 190700;   // ~1500 USDC/WETH
        int24 tickUpper = 196250;   // = current tick (整好覆盖到当前价格)
        int256 liquidity = 2000000000000; // 2e12 — reasonable liquidity

        // hookData: deployer 地址 (20 bytes) — 白名单路由模式
        bytes memory hookData = abi.encodePacked(deployer);

        console.log("");
        console.log("Adding liquidity...");
        console.log("Tick range: [190700, 196250]");
        console.log("Liquidity:", vm.toString(liquidity));

        LiquidityHelper.AddLiqParams memory params = LiquidityHelper.AddLiqParams({
            poolKey: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidity,
            hookData: hookData
        });

        BalanceDelta delta = helper.addLiquidity(params);
        console.log("");

        vm.stopBroadcast();

        console.log("=======================================================");
        console.log("SUCCESS! Liquidity added to Pool!");
        console.log("=======================================================");
    }
}
