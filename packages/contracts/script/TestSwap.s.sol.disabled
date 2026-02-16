// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestSwap is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant SWAP_ROUTER = 0x2AAF6C551168DCF22804c04DdA2c08c82031F289;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;

    function run() external {
        console.log("=== Test Swap ===");
        console.log("");

        // PoolKey
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(HOOK)
        });

        console.log("Pool Key:");
        console.log("  currency0 (USDC):", USDC);
        console.log("  currency1 (WETH):", WETH);
        console.log("  fee: 500");
        console.log("  tickSpacing: 10");
        console.log("  hooks:", HOOK);
        console.log("");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("");

        // 检查 Session
        bool sessionActive = ISessionManager(SESSION_MANAGER).isSessionActive(deployer);
        console.log("Session active:", sessionActive);
        console.log("");

        // 检查余额和授权
        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        uint256 wethBalance = IERC20(WETH).balanceOf(deployer);
        uint256 usdcAllowance = IERC20(USDC).allowance(deployer, SWAP_ROUTER);
        uint256 wethAllowance = IERC20(WETH).allowance(deployer, SWAP_ROUTER);
        
        console.log("Balances:");
        console.log("  USDC:", usdcBalance);
        console.log("  WETH:", wethBalance);
        console.log("");
        console.log("Allowances to Router:");
        console.log("  USDC:", usdcAllowance);
        console.log("  WETH:", wethAllowance);
        console.log("");

        // 检查 Pool 状态
        bytes32 poolId = keccak256(abi.encode(key));
        console.log("Pool ID:");
        console.logBytes32(poolId);
        console.log("");

        // 尝试获取 slot0
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        try poolManager.getSlot0(poolId) returns (uint160 sqrtPriceX96, int24 tick, uint24, uint24) {
            console.log("Pool initialized!");
            console.log("  sqrtPriceX96:", sqrtPriceX96);
            console.log("  tick:", vm.toString(tick));
        } catch {
            console.log("ERROR: Pool not initialized or error reading slot0");
        }
        
        console.log("");
        console.log("=== Attempting Swap ===");
        
        vm.startBroadcast(deployerPrivateKey);

        // Swap params: USDC -> WETH (0.1 USDC)
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true,  // USDC (currency0) -> WETH (currency1)
            amountSpecified: -100000,  // 0.1 USDC (6 decimals)
            sqrtPriceLimitX96: 4295128740  // MIN_SQRT_PRICE + 1
        });

        bytes memory hookData = abi.encodePacked(deployer);

        try ISimpleSwapRouter(SWAP_ROUTER).swap(key, params, hookData) returns (int256) {
            console.log("SUCCESS: Swap executed!");
        } catch (bytes memory reason) {
            console.log("FAILED: Swap reverted");
            console.log("Reason length:", reason.length);
            if (reason.length > 0) {
                console.logBytes(reason);
            }
        }

        vm.stopBroadcast();
    }
}

interface ISessionManager {
    function isSessionActive(address user) external view returns (bool);
}

interface ISimpleSwapRouter {
    function swap(
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData
    ) external payable returns (int256);
}
