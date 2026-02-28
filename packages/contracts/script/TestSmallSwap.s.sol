// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISimpleSwapRouter {
    function swap(
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData,
        uint128 minAmountOut
    ) external payable returns (BalanceDelta delta);
}

contract TestSmallSwap is Script {
    address constant SIMPLE_SWAP_ROUTER = 0x851A12a1A0A5670F4D8A74aD0f3534825EC5e7c2;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address trader = vm.addr(pk);

        vm.startBroadcast(pk);

        IERC20(USDC).approve(SIMPLE_SWAP_ROUTER, 100000);

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(HOOK)
        });

        // 0.1 USDC -> WETH
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -100000,
            sqrtPriceLimitX96: 4295128740 
        });

        bytes memory hookData = abi.encodePacked(trader);
        
        try ISimpleSwapRouter(SIMPLE_SWAP_ROUTER).swap(
            poolKey,
            params,
            hookData,
            0
        ) returns (BalanceDelta delta) {
            console.log("swap success");
        } catch Error(string memory reason) {
            console.log("Revert reason:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("Low level revert!");
        }

        vm.stopBroadcast();
    }
}
