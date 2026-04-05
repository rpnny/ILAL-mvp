// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {VerifiedPoolsPositionManager} from "../src/core/VerifiedPoolsPositionManager.sol";
import {Registry} from "../src/core/Registry.sol";

/**
 * @title FixPositionManager
 * @notice Redeploys VerifiedPoolsPositionManager with v2 hookData forwarding,
 *         then registers it in Registry as both approvedRouter + identityRouter.
 *
 * Run:
 *   source .env   # needs PRIVATE_KEY
 *   cd packages/contracts
 *   forge script script/FixPositionManager.s.sol:FixPositionManager \
 *     --rpc-url https://base-sepolia-rpc.publicnode.com \
 *     --broadcast -vvv
 *
 * After running, update:
 *   apps/api/src/config/constants.ts  → positionManager: '<NEW_ADDRESS>'
 *   .env (Railway)                    → POSITION_MANAGER_ADDRESS=<NEW_ADDRESS>
 */
contract FixPositionManager is Script {
    // ── Existing deployed addresses ───────────────────────────────────────────
    address constant POOL_MANAGER     = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY_PROXY   = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MANAGER  = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant OLD_PM           = 0x692548a6E1797d2762b9d04f29112C172E5Cea32;
    address constant SWAP_ROUTER      = 0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        Registry registry = Registry(REGISTRY_PROXY);

        console.log("=== Fix PositionManager (hookData forwarding) ===");
        console.log("Deployer:      ", deployer);
        console.log("Old PM:        ", OLD_PM);
        console.log("");

        // ── Diagnostics ───────────────────────────────────────────────────────
        console.log("--- Current Registry State ---");
        console.log("Old PM isRouterApproved:  ", registry.isRouterApproved(OLD_PM));
        console.log("Old PM isIdentityRouter:  ", registry.isIdentityRouter(OLD_PM));
        console.log("SwapRouter isIdentityRouter:", registry.isIdentityRouter(SWAP_ROUTER));
        console.log("");

        vm.startBroadcast(pk);

        // ── 1. Deploy new PM with v2 source ──────────────────────────────────
        VerifiedPoolsPositionManager newPM = new VerifiedPoolsPositionManager(
            POOL_MANAGER,
            REGISTRY_PROXY,
            SESSION_MANAGER
        );
        address newPMAddr = address(newPM);
        console.log("New PM deployed:", newPMAddr);

        // ── 2. Register new PM in Registry ───────────────────────────────────
        // Must be approvedRouter first (identity router check builds on this)
        if (!registry.isRouterApproved(newPMAddr)) {
            registry.approveRouter(newPMAddr, true);
            console.log("New PM: approveRouter = true");
        }
        registry.approveIdentityRouter(newPMAddr, true);
        console.log("New PM: approveIdentityRouter = true");

        // ── 3. Ensure SwapRouter is also registered (idempotent) ─────────────
        if (!registry.isRouterApproved(SWAP_ROUTER)) {
            registry.approveRouter(SWAP_ROUTER, true);
            console.log("SwapRouter: approveRouter = true");
        }
        if (!registry.isIdentityRouter(SWAP_ROUTER)) {
            registry.approveIdentityRouter(SWAP_ROUTER, true);
            console.log("SwapRouter: approveIdentityRouter = true");
        }

        vm.stopBroadcast();

        // ── 4. Verify ─────────────────────────────────────────────────────────
        require(registry.isRouterApproved(newPMAddr), "New PM router check failed");
        require(registry.isIdentityRouter(newPMAddr), "New PM identity router check failed");
        require(registry.isIdentityRouter(SWAP_ROUTER), "SwapRouter identity router check failed");

        console.log("");
        console.log("=== DONE ===");
        console.log("New PM isRouterApproved:   true");
        console.log("New PM isIdentityRouter:   true");
        console.log("SwapRouter isIdentityRouter: true");
        console.log("");
        console.log("=== ACTION REQUIRED ===");
        console.log("Update the following with the new PM address:");
        console.log("");
        console.log("1. apps/api/src/config/constants.ts:");
        console.log("   positionManager: '", vm.toString(newPMAddr), "' as Address,");
        console.log("");
        console.log("2. Railway Dashboard → Variables:");
        console.log("   POSITION_MANAGER_ADDRESS =", vm.toString(newPMAddr));
        console.log("");
        console.log("3. packages/contracts/script/UpgradeRegistry.s.sol:");
        console.log("   address constant POSITION_MANAGER =", vm.toString(newPMAddr), ";");
        console.log("");
        console.log("BaseScan:");
        console.log(string.concat(
            "  https://sepolia.basescan.org/address/",
            vm.toString(newPMAddr)
        ));
    }
}
