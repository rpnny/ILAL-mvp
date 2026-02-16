// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";

contract QuickSwapTest is Script {
    address constant SWAP_ROUTER = 0x2AAF6C551168DCF22804c04DdA2c08c82031F289;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant HOOK = 0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80;

    function run() external {
        console.log("=== Quick Swap Test ===");
        
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(HOOK)
        });

        // USDC -> WETH: 0.1 USDC
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -100000,  // -0.1 USDC
            sqrtPriceLimitX96: 4295128740
        });

        bytes memory hookData = abi.encodePacked(deployer);

        vm.startBroadcast(pk);
        
        (bool success, bytes memory returnData) = SWAP_ROUTER.call{value: 0}(
            abi.encodeWithSignature(
                "swap((address,address,uint24,int24,address),(bool,int256,uint160),bytes)",
                key,
                params,
                hookData
            )
        );

        vm.stopBroadcast();

        if (success) {
            console.log("SUCCESS!");
        } else {
            console.log("FAILED");
            console.log("Error data length:", returnData.length);
            if (returnData.length >= 4) {
                bytes4 errorSig;
                assembly {
                    errorSig := mload(add(returnData, 0x20))
                }
                console.log("Error selector:");
                console.logBytes4(errorSig);
            }
        }
    }
}
