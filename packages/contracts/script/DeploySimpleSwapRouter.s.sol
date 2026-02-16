// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {SimpleSwapRouter} from "../src/helpers/SimpleSwapRouter.sol";

/**
 * @title DeploySimpleSwapRouter
 * @notice 部署 SimpleSwapRouter 到 Base Sepolia
 * 
 * 使用方法:
 * forge script script/DeploySimpleSwapRouter.s.sol:DeploySimpleSwapRouter \
 *   --rpc-url https://sepolia.base.org \
 *   --broadcast \
 *   --verify
 */
contract DeploySimpleSwapRouter is Script {
    // Uniswap v4 PoolManager - Base Sepolia
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("==============================================");
        console.log("Deploying SimpleSwapRouter");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("PoolManager:", POOL_MANAGER);
        console.log("==============================================");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 部署 SimpleSwapRouter
        SimpleSwapRouter router = new SimpleSwapRouter(POOL_MANAGER);

        vm.stopBroadcast();

        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("==============================================");
        console.log("");
        console.log("SimpleSwapRouter:");
        console.logAddress(address(router));
        console.log("");
        console.log("Verification:");
        console.log("  poolManager:");
        console.logAddress(address(router.poolManager()));
        console.log("");
        console.log("BaseScan:");
        console.log(string.concat(
            "https://sepolia.basescan.org/address/",
            vm.toString(address(router))
        ));
        console.log("==============================================");
        console.log("");
        console.log("Remember to update:");
        console.log("1. deployments/base-sepolia-20260211.json");
        console.log("2. frontend/lib/contracts.ts");
        console.log("3. frontend/hooks/useUniswapV4Swap.ts");
    }
}
