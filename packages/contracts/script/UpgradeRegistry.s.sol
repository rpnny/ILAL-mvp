// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Registry} from "../src/core/Registry.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title UpgradeRegistry
 * @notice Upgrades the Registry proxy to a new implementation that includes
 *         isIdentityRouter / approveIdentityRouter, then whitelists the
 *         SimpleSwapRouter and PositionManager as identity routers.
 *
 * Usage:
 *   source .env
 *   cd packages/contracts
 *   forge script script/UpgradeRegistry.s.sol:UpgradeRegistry \
 *     --rpc-url https://base-sepolia-rpc.publicnode.com --broadcast -vvv
 */
contract UpgradeRegistry is Script {
    address constant REGISTRY_PROXY    = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SWAP_ROUTER       = 0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891;
    address constant POSITION_MANAGER  = 0xeE0f4bc4D5cA0d00cd743357661D34c2d48cfe7A;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console.log("=== Upgrade Registry ===");
        console.log("Deployer:         ", deployer);
        console.log("Registry proxy:   ", REGISTRY_PROXY);
        console.log("SimpleSwapRouter: ", SWAP_ROUTER);
        console.log("PositionManager:  ", POSITION_MANAGER);

        vm.startBroadcast(pk);

        // 1. Deploy new implementation
        Registry newImpl = new Registry();
        console.log("New implementation:", address(newImpl));

        // 2. Upgrade proxy via UUPS upgradeToAndCall (empty calldata = no re-init)
        UUPSUpgradeable(REGISTRY_PROXY).upgradeToAndCall(address(newImpl), "");
        console.log("Proxy upgraded");

        // 3. Whitelist routers
        Registry registry = Registry(REGISTRY_PROXY);

        // Ensure routers are approved first (approveIdentityRouter requires isRouterApproved)
        if (!registry.isRouterApproved(SWAP_ROUTER)) {
            registry.approveRouter(SWAP_ROUTER, true);
            console.log("SwapRouter approved as router");
        }
        registry.approveIdentityRouter(SWAP_ROUTER, true);
        console.log("SwapRouter approved as identity router");

        if (!registry.isRouterApproved(POSITION_MANAGER)) {
            registry.approveRouter(POSITION_MANAGER, true);
            console.log("PositionManager approved as router");
        }
        registry.approveIdentityRouter(POSITION_MANAGER, true);
        console.log("PositionManager approved as identity router");

        vm.stopBroadcast();

        // Verify
        require(registry.isIdentityRouter(SWAP_ROUTER), "SwapRouter identity check failed");
        require(registry.isIdentityRouter(POSITION_MANAGER), "PM identity check failed");

        console.log("");
        console.log("=== DONE ===");
        console.log("SwapRouter isIdentityRouter:       true");
        console.log("PositionManager isIdentityRouter:  true");
    }
}
