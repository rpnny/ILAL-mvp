// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title GrantVerifierRole
 * @notice Grants VERIFIER_ROLE on the SessionManager to the ILAL API relay wallet.
 *
 * Run with:
 *   forge script script/GrantVerifierRole.s.sol \
 *     --rpc-url https://sepolia.base.org \
 *     --private-key $ADMIN_PRIVATE_KEY \
 *     --broadcast
 *
 * Environment variables:
 *   ADMIN_PRIVATE_KEY    — private key of the DEFAULT_ADMIN_ROLE holder on SessionManager
 *   RELAY_WALLET_ADDRESS — address of the ILAL API relay wallet (from VERIFIER_PRIVATE_KEY)
 *   SESSION_MANAGER_ADDRESS — SessionManager proxy address (defaults to deployed address)
 */
contract GrantVerifierRole is Script {

    // Deployed SessionManager proxy on Base Sepolia
    address constant SESSION_MANAGER = 0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e;

    bytes32 constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    function run() external {
        // Read relay wallet address from env
        address relayWallet = vm.envAddress("RELAY_WALLET_ADDRESS");
        address sessionManager = vm.envOr("SESSION_MANAGER_ADDRESS", SESSION_MANAGER);

        console2.log("=== GrantVerifierRole ===");
        console2.log("SessionManager:", sessionManager);
        console2.log("Granting VERIFIER_ROLE to relay wallet:", relayWallet);

        // Check if role is already granted
        AccessControlUpgradeable sm = AccessControlUpgradeable(sessionManager);
        if (sm.hasRole(VERIFIER_ROLE, relayWallet)) {
            console2.log("[SKIP] Relay wallet already has VERIFIER_ROLE");
            return;
        }

        vm.startBroadcast();

        sm.grantRole(VERIFIER_ROLE, relayWallet);

        vm.stopBroadcast();

        // Verify
        require(sm.hasRole(VERIFIER_ROLE, relayWallet), "Role grant failed");
        console2.log("[OK] VERIFIER_ROLE granted successfully");
        console2.log("The API relay wallet can now call startSession() on SessionManager");
    }
}
