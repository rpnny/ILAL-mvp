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
 * @notice Deploy LiquidityHelper and seed the WETH/tUSDC pool on ComplianceHook 0x54b8
 */
contract AddLiquidity is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant TUSDC = 0xa486Fb51ED09B970A23F7Fe910bc90089f78424D;
    address constant HOOK = 0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;

    function run() external {
        console.log("=======================================================");
        console.log("Seed WETH/tUSDC Pool on ComplianceHook 0x54b8");
        console.log("=======================================================");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        LiquidityHelper helper = new LiquidityHelper(POOL_MANAGER);
        console.log("LiquidityHelper deployed:", address(helper));

        (bool s1, ) = REGISTRY.call(
            abi.encodeWithSignature("approveRouter(address,bool)", address(helper), true)
        );
        require(s1, "Failed to approve router");
        (bool s2, ) = REGISTRY.call(
            abi.encodeWithSignature("approveIdentityRouter(address,bool)", address(helper), true)
        );
        require(s2, "Failed to approve identity router");
        console.log("Helper approved as router");

        {
            uint256 expiry = block.timestamp + 24 hours;
            (bool s3, ) = SESSION_MANAGER.call(
                abi.encodeWithSignature("startSession(address,uint256)", address(helper), expiry)
            );
            require(s3, "Failed to start session for helper");
            console.log("Session activated for helper");
        }

        IERC20(WETH).approve(address(helper), type(uint256).max);
        IERC20(TUSDC).approve(address(helper), type(uint256).max);
        console.log("Tokens approved");

        // Pool: WETH(token0) / tUSDC(token1), current tick = -196250
        // Wide two-sided range so the pool can absorb ~0.005 WETH of swaps
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(WETH),
            currency1: Currency.wrap(TUSDC),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(HOOK)
        });

        int24 tickLower = -200000;
        int24 tickUpper = -190000;
        int256 liquidity = 1300000000000; // 1.3e12

        bytes memory hookData = "";

        console.log("");
        console.log("Adding liquidity...");
        console.log("Tick range: [-200000, -190000]");
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
        console.log("SUCCESS! Liquidity added to WETH/tUSDC Pool!");
        console.log("=======================================================");
    }
}
