// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SimpleSwapRouter} from "../src/helpers/SimpleSwapRouter.sol";

contract RedeploySimpleSwapRouter is Script {
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;

    function run() external {
        console.log("=== Redeploy SimpleSwapRouter ===");
        console.log("");
        
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(pk);
        
        // Deploy new router
        SimpleSwapRouter router = new SimpleSwapRouter(POOL_MANAGER);
        console.log("New SimpleSwapRouter deployed:", address(router));
        
        // Approve router
        IRegistry(REGISTRY).approveRouter(address(router), true);
        console.log("Router approved in Registry");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("SUCCESS! Update your config with:");
        console.log("  simpleSwapRouter:", address(router));
    }
}

interface IRegistry {
    function approveRouter(address router, bool approved) external;
}
