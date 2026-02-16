// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {VerifiedPoolsPositionManager} from "../src/core/VerifiedPoolsPositionManager.sol";

/**
 * @title RedeployPositionManager
 * @notice 重新部署 VerifiedPoolsPositionManager，使用正确的 PoolManager 地址
 * 
 * 使用方法:
 * forge script script/RedeployPositionManager.s.sol:RedeployPositionManager \
 *   --rpc-url https://sepolia.base.org \
 *   --broadcast \
 *   --verify
 */
contract RedeployPositionManager is Script {
    // 从最新部署记录中获取的地址
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    
    // Uniswap v4 PoolManager - Base Sepolia
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("==============================================");
        console.log("Redeploying VerifiedPoolsPositionManager");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        console.log("Dependencies:");
        console.log("  Registry:", REGISTRY);
        console.log("  SessionManager:", SESSION_MANAGER);
        console.log("  PoolManager (Uniswap v4):", POOL_MANAGER);
        console.log("==============================================");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 部署 VerifiedPoolsPositionManager
        VerifiedPoolsPositionManager positionManager = new VerifiedPoolsPositionManager(
            POOL_MANAGER,
            REGISTRY,
            SESSION_MANAGER
        );

        vm.stopBroadcast();

        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("==============================================");
        console.log("");
        console.log("VerifiedPoolsPositionManager:");
        console.logAddress(address(positionManager));
        console.log("");
        console.log("Verification:");
        console.log("  poolManager:");
        console.logAddress(address(positionManager.poolManager()));
        console.log("  registry:");
        console.logAddress(address(positionManager.registry()));
        console.log("  sessionManager:");
        console.logAddress(address(positionManager.sessionManager()));
        console.log("  nextTokenId:");
        console.logUint(positionManager.nextTokenId());
        console.log("");
        console.log("BaseScan:");
        console.log(string.concat(
            "https://sepolia.basescan.org/address/",
            vm.toString(address(positionManager))
        ));
        console.log("==============================================");
        
        // 保存地址
        console.log("");
        console.log("Remember to update:");
        console.log("1. deployments/base-sepolia-20260211.json");
        console.log("2. frontend/lib/contracts.ts");
        console.log("3. bot/config.yaml");
    }
}
