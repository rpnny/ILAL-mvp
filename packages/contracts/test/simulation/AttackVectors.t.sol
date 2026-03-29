// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@uniswap/v4-core/types/PoolKey.sol";
import "@uniswap/v4-core/types/Currency.sol";
import "@uniswap/v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";

/**
 * @title AttackVectors
 * @notice Isolated attack vector tests — each test targets a single vulnerability class.
 *         Organized by STRIDE threat model:
 *           S = Spoofing, T = Tampering, R = Repudiation, I = Information Disclosure,
 *           D = Denial of Service, E = Elevation of Privilege
 */
contract AttackVectors is Test {
    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;
    ComplianceHook public hook;
    VerifiedPoolsPositionManager public positionManager;

    address public governance = makeAddr("governance");
    address public router = makeAddr("router");
    address public mockPM;

    uint256 aliceKey = 0xa11ce;
    uint256 bobKey = 0xb0b;
    uint256 attackerKey = 0xa77ac;
    address alice;
    address bob;
    address attacker;

    function setUp() public {
        alice = vm.addr(aliceKey);
        bob = vm.addr(bobKey);
        attacker = vm.addr(attackerKey);
        mockPM = makeAddr("poolManager");

        Registry ri = new Registry();
        registry = Registry(address(new ERC1967Proxy(address(ri), abi.encodeWithSelector(Registry.initialize.selector, governance))));

        verifier = new MockVerifier();

        SessionManager si = new SessionManager();
        sessionManager = SessionManager(address(new ERC1967Proxy(
            address(si),
            abi.encodeWithSelector(SessionManager.initialize.selector, address(registry), address(verifier), governance)
        )));

        bytes32 vRole = sessionManager.VERIFIER_ROLE();
        vm.prank(governance);
        sessionManager.grantRole(vRole, address(verifier));

        hook = new ComplianceHook(mockPM, address(registry), address(sessionManager));
        positionManager = new VerifiedPoolsPositionManager(mockPM, address(registry), address(sessionManager));

        vm.startPrank(governance);
        registry.registerIssuer(keccak256("CB"), makeAddr("att"), address(verifier));
        registry.approveRouter(router, true);
        registry.approveIdentityRouter(router, true);
        vm.stopPrank();

        verifier.setUserAllowed(alice, true);
        verifier.setUserAllowed(bob, true);
    }

    // ─── Helpers ───

    function _pk() internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0x036CbD53842c5426634e7929541eC2318f3dCF7e)),
            currency1: Currency.wrap(address(0x4200000000000000000000000000000000000006)),
            fee: 500, tickSpacing: 10, hooks: IHooks(address(hook))
        });
    }

    function _sp() internal pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 4295128740});
    }

    function _mp() internal pure returns (IPoolManager.ModifyLiquidityParams memory) {
        return IPoolManager.ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 1e18, salt: bytes32(0)});
    }

    function _activate(address user) internal {
        vm.prank(address(verifier));
        sessionManager.startSession(user, block.timestamp + 24 hours);
    }

    function _signSwap(uint256 pk, address user, uint256 deadline, uint256 nonce) internal view returns (bytes memory) {
        bytes32 sh = keccak256(abi.encode(hook.SWAP_PERMIT_TYPEHASH(), user, deadline, nonce));
        bytes32 d = keccak256(abi.encodePacked("\x19\x01", hook.getDomainSeparator(), sh));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, d);
        return abi.encodePacked(r, s, v);
    }

    function _signLiq(uint256 pk, address user, uint256 deadline, uint256 nonce, bool isAdd) internal view returns (bytes memory) {
        bytes32 sh = keccak256(abi.encode(hook.LIQUIDITY_PERMIT_TYPEHASH(), user, deadline, nonce, isAdd));
        bytes32 d = keccak256(abi.encodePacked("\x19\x01", hook.getDomainSeparator(), sh));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, d);
        return abi.encodePacked(r, s, v);
    }

    function _encodePermit(address user, uint256 dl, uint256 n, bytes memory sig) internal pure returns (bytes memory) {
        return abi.encode(ComplianceHook.PermitData({user: user, deadline: dl, nonce: n, signature: sig}));
    }

    // ════════════════════════════════════════════
    //  S1: Identity Spoofing — Wrong Key
    // ════════════════════════════════════════════

    function test_S1_IdentitySpoofing_WrongKey() public {
        _activate(alice);
        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(attackerKey, alice, dl, n);
        bytes memory hd = _encodePermit(alice, dl, n, sig);

        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    // ════════════════════════════════════════════
    //  S2: Identity Spoofing — Impersonate User in hookData
    // ════════════════════════════════════════════

    function test_S2_IdentitySpoofing_ImpersonateUser() public {
        _activate(alice);
        _activate(bob);

        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(bobKey, alice, dl, n);
        bytes memory hd = _encodePermit(alice, dl, n, sig);

        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    // ════════════════════════════════════════════
    //  S3: Identity Spoofing — Zero Address User
    // ════════════════════════════════════════════

    function test_S3_ZeroAddressUser() public {
        vm.prank(address(verifier));
        vm.expectRevert(SessionManager.ZeroAddress.selector);
        sessionManager.startSession(address(0), block.timestamp + 24 hours);
    }

    // ════════════════════════════════════════════
    //  T1: Tampering — Modify hookData After Signing
    // ════════════════════════════════════════════

    function test_T1_Tampering_ModifyDeadline() public {
        _activate(alice);
        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(aliceKey, alice, dl, n);

        bytes memory hd = _encodePermit(alice, dl + 50 minutes, n, sig);

        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    function test_T1_Tampering_ModifyNonce() public {
        _activate(alice);
        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(aliceKey, alice, dl, n);

        bytes memory hd = _encodePermit(alice, dl, n + 1, sig);

        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    function test_T1_Tampering_ModifyUser() public {
        _activate(alice);
        _activate(bob);
        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(aliceKey, alice, dl, n);

        bytes memory hd = _encodePermit(bob, dl, n, sig);

        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    function test_S4_Mode2RejectedForGenericApprovedRouter() public {
        address genericRouter = makeAddr("genericRouter");

        vm.startPrank(governance);
        registry.approveRouter(genericRouter, true);
        vm.stopPrank();

        _activate(alice);

        vm.prank(mockPM);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.IdentityRouterRequired.selector, genericRouter));
        hook.beforeSwap(genericRouter, _pk(), _sp(), abi.encode(alice));
    }

    // ════════════════════════════════════════════
    //  T2: Tampering — Truncated / Padded Signature
    // ════════════════════════════════════════════

    function test_T2_TruncatedSignature() public {
        _activate(alice);
        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(aliceKey, alice, dl, n);

        // Truncate signature to 32 bytes
        bytes memory truncSig = new bytes(32);
        for (uint256 i = 0; i < 32; i++) truncSig[i] = sig[i];

        bytes memory hd = _encodePermit(alice, dl, n, truncSig);

        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    // ════════════════════════════════════════════
    //  R1: Repudiation — Nonce Replay
    // ════════════════════════════════════════════

    function test_R1_NonceReplay() public {
        _activate(alice);

        // First swap consumes nonce 0
        uint256 dl = block.timestamp + 10 minutes;
        bytes memory sig0 = _signSwap(aliceKey, alice, dl, 0);
        bytes memory hd0 = _encodePermit(alice, dl, 0, sig0);
        vm.prank(mockPM);
        hook.beforeSwap(router, _pk(), _sp(), hd0);

        // Try to replay with nonce 0 again
        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), hd0);
    }

    // ════════════════════════════════════════════
    //  R2: Repudiation — Cross-Operation Replay (swap sig for liquidity)
    // ════════════════════════════════════════════

    function test_R2_CrossOperationReplay() public {
        _activate(alice);

        uint256 dl = block.timestamp + 10 minutes;
        uint256 n = hook.getNonce(alice);
        bytes memory swapSig = _signSwap(aliceKey, alice, dl, n);
        bytes memory hd = _encodePermit(alice, dl, n, swapSig);

        // Use swap permit for add liquidity: different typehash → signature mismatch
        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeAddLiquidity(router, _pk(), _mp(), hd);
    }

    // ════════════════════════════════════════════
    //  D1: DoS — Session Activation Spam
    // ════════════════════════════════════════════

    function test_D1_SessionActivationSpam() public {
        // Only VERIFIER_ROLE can start sessions, so attacker cannot spam
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.startSession(attacker, block.timestamp + 24 hours);
    }

    // ════════════════════════════════════════════
    //  D2: DoS — Mass Session End Attack
    // ════════════════════════════════════════════

    function test_D2_MassSessionEndAttack() public {
        _activate(alice);
        _activate(bob);

        address[] memory targets = new address[](2);
        targets[0] = alice;
        targets[1] = bob;

        // Attacker cannot batch-end sessions
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.endSessionBatch(targets);

        assertTrue(sessionManager.isSessionActive(alice));
        assertTrue(sessionManager.isSessionActive(bob));
    }

    // ════════════════════════════════════════════
    //  D3: DoS — Emergency Pause Abuse
    // ════════════════════════════════════════════

    function test_D3_EmergencyPauseAbuse() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.setEmergencyPause(true);

        assertFalse(registry.emergencyPaused());
    }

    // ════════════════════════════════════════════
    //  D4: DoS — Router De-approval Attack
    // ════════════════════════════════════════════

    function test_D4_RouterDeapprovalAttack() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.approveRouter(router, false);

        assertTrue(registry.isRouterApproved(router));
    }

    // ════════════════════════════════════════════
    //  D5: DoS — TTL Manipulation to Lock Sessions
    // ════════════════════════════════════════════

    function test_D5_TTLManipulationAttack() public {
        uint256 originalTTL = registry.getSessionTTL();

        // Attacker tries to set TTL to minimum to limit all sessions
        vm.prank(attacker);
        vm.expectRevert();
        registry.setSessionTTL(1 hours);

        assertEq(registry.getSessionTTL(), originalTTL);
    }

    // ════════════════════════════════════════════
    //  E1: Elevation — Attacker Gains VERIFIER_ROLE
    // ════════════════════════════════════════════

    function test_E1_UnauthorizedVerifierRole() public {
        bytes32 vRole = sessionManager.VERIFIER_ROLE();

        // Attacker cannot grant themselves VERIFIER_ROLE
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.grantRole(vRole, attacker);

        assertFalse(sessionManager.hasRole(vRole, attacker));
    }

    // ════════════════════════════════════════════
    //  E2: Elevation — Attacker Gains Admin Role
    // ════════════════════════════════════════════

    function test_E2_UnauthorizedAdminRole() public {
        bytes32 adminRole = sessionManager.DEFAULT_ADMIN_ROLE();

        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.grantRole(adminRole, attacker);

        assertFalse(sessionManager.hasRole(adminRole, attacker));
    }

    // ════════════════════════════════════════════
    //  E3: Elevation — Registry Ownership Takeover
    // ════════════════════════════════════════════

    function test_E3_OwnershipTakeover() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.transferOwnership(attacker);

        assertEq(registry.owner(), governance);
    }

    // ════════════════════════════════════════════
    //  E4: Elevation — Proxy Upgrade Hijack
    // ════════════════════════════════════════════

    function test_E4_ProxyUpgradeHijack_Registry() public {
        address maliciousImpl = address(new Registry());

        vm.prank(attacker);
        vm.expectRevert();
        registry.upgradeToAndCall(maliciousImpl, "");
    }

    function test_E4_ProxyUpgradeHijack_SessionManager() public {
        address maliciousImpl = address(new SessionManager());

        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.upgradeToAndCall(maliciousImpl, "");
    }

    // ════════════════════════════════════════════
    //  E5: Elevation — Issuer Registration
    // ════════════════════════════════════════════

    function test_E5_UnauthorizedIssuerRegistration() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.registerIssuer(keccak256("Evil"), attacker, attacker);
    }

    // ════════════════════════════════════════════
    //  COMBINED: Multi-Step Attack Chain
    // ════════════════════════════════════════════

    /// @notice Simulates a sophisticated multi-step attack attempting to exploit
    ///         every available surface in sequence.
    function test_MultiStepAttackChain() public {
        _activate(alice);

        // 1. Try direct call to hook (bypass PoolManager)
        vm.prank(attacker);
        vm.expectRevert(ComplianceHook.OnlyPoolManager.selector);
        hook.beforeSwap(attacker, _pk(), _sp(), "");

        // 2. Try to get VERIFIER_ROLE
        bytes32 vRole = sessionManager.VERIFIER_ROLE();
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.grantRole(vRole, attacker);

        // 3. Try to start own session
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.startSession(attacker, block.timestamp + 24 hours);

        // 4. Try to forge Alice's signature
        uint256 dl = block.timestamp + 10 minutes;
        uint256 aliceN = hook.getNonce(alice);
        bytes memory fakeSig = _signSwap(attackerKey, alice, dl, aliceN);
        bytes memory fakeHD = _encodePermit(alice, dl, aliceN, fakeSig);
        vm.prank(mockPM);
        vm.expectRevert();
        hook.beforeSwap(router, _pk(), _sp(), fakeHD);

        // 5. Try emergency pause
        vm.prank(attacker);
        vm.expectRevert();
        registry.setEmergencyPause(true);

        // 6. Try registry upgrade
        Registry newRegistryImpl = new Registry();
        vm.prank(attacker);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newRegistryImpl), "");

        // 7. Try sessionManager upgrade
        SessionManager newSessionImpl = new SessionManager();
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.upgradeToAndCall(address(newSessionImpl), "");

        // 8. Try to end Alice's session
        vm.prank(attacker);
        vm.expectRevert();
        sessionManager.endSession(alice);

        // 9. Try to change TTL
        vm.prank(attacker);
        vm.expectRevert();
        registry.setSessionTTL(1 hours);

        // 10. Try NFT transfer
        vm.prank(attacker);
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.transferFrom(alice, attacker, 1);

        // FINAL: Verify system is completely unaffected
        assertTrue(sessionManager.isSessionActive(alice));
        assertFalse(registry.emergencyPaused());
        assertEq(registry.owner(), governance);
        assertTrue(registry.isRouterApproved(router));

        // Alice can still swap
        vm.prank(mockPM);
        hook.beforeSwap(alice, _pk(), _sp(), "");
    }

    // ════════════════════════════════════════════
    //  EDGE: Deadline Exactly at block.timestamp
    // ════════════════════════════════════════════

    function test_Edge_DeadlineExactlyNow() public {
        _activate(alice);

        uint256 dl = block.timestamp; // exactly now — should pass (>= check in OZ)
        uint256 n = hook.getNonce(alice);
        bytes memory sig = _signSwap(aliceKey, alice, dl, n);
        bytes memory hd = _encodePermit(alice, dl, n, sig);

        // deadline == block.timestamp: verifySwapPermit checks block.timestamp > deadline
        // Since block.timestamp == deadline, it should NOT revert (not >)
        vm.prank(mockPM);
        hook.beforeSwap(router, _pk(), _sp(), hd);
    }

    // ════════════════════════════════════════════
    //  EDGE: Session Expiry Exactly at block.timestamp
    // ════════════════════════════════════════════

    function test_Edge_SessionExpiryExactlyNow() public {
        uint256 expiry = block.timestamp + 1 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        // Warp to exact expiry: _isSessionActive checks block.timestamp <= expiry
        vm.warp(expiry);
        assertTrue(sessionManager.isSessionActive(alice));

        vm.prank(mockPM);
        hook.beforeSwap(alice, _pk(), _sp(), "");

        // 1 second later: expired
        vm.warp(expiry + 1);
        assertFalse(sessionManager.isSessionActive(alice));
    }

    // ════════════════════════════════════════════
    //  EDGE: Concurrent Session Overwrite
    // ════════════════════════════════════════════

    function test_Edge_SessionOverwrite() public {
        // Start with 24h session
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);
        uint256 expiry1 = sessionManager.sessionExpiry(alice);

        // Overwrite with shorter session — allowed, new expiry replaces old
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 1 hours);
        uint256 expiry2 = sessionManager.sessionExpiry(alice);

        assertLt(expiry2, expiry1);
        assertTrue(sessionManager.isSessionActive(alice));

        // After 1 hour: expired (not 24 hours)
        vm.warp(block.timestamp + 1 hours + 1);
        assertFalse(sessionManager.isSessionActive(alice));
    }

    // ════════════════════════════════════════════
    //  EDGE: Duplicate Issuer Registration
    // ════════════════════════════════════════════

    function test_Edge_DuplicateIssuerRegistration() public {
        bytes32 issuerId = keccak256("DupIssuer");

        vm.prank(governance);
        registry.registerIssuer(issuerId, makeAddr("att1"), makeAddr("ver1"));

        // Second registration with same ID should fail
        vm.prank(governance);
        vm.expectRevert(Registry.IssuerAlreadyExists.selector);
        registry.registerIssuer(issuerId, makeAddr("att2"), makeAddr("ver2"));
    }

    // ════════════════════════════════════════════
    //  EDGE: Revoked Issuer Cannot Re-register
    // ════════════════════════════════════════════

    function test_Edge_RevokedIssuerReregister() public {
        bytes32 issuerId = keccak256("TempIssuer");

        vm.prank(governance);
        registry.registerIssuer(issuerId, makeAddr("att"), makeAddr("ver"));

        vm.prank(governance);
        registry.revokeIssuer(issuerId);

        // Attester address mapping is deleted, but the issuer slot still has attester != 0
        // So re-registration should fail (IssuerAlreadyExists)
        vm.prank(governance);
        vm.expectRevert(Registry.IssuerAlreadyExists.selector);
        registry.registerIssuer(issuerId, makeAddr("att2"), makeAddr("ver2"));
    }

    function test_Edge_RevokedIssuerCannotStartNewSession() public {
        bytes32 issuerId = keccak256("TempIssuer");
        address attester = makeAddr("att");
        address revocableVerifier = makeAddr("revocableVerifier");

        vm.startPrank(governance);
        registry.registerIssuer(issuerId, attester, revocableVerifier);
        sessionManager.grantRole(sessionManager.VERIFIER_ROLE(), revocableVerifier);
        registry.revokeIssuer(issuerId);
        vm.stopPrank();

        vm.prank(revocableVerifier);
        vm.expectRevert(
            abi.encodeWithSelector(SessionManager.InactiveVerifier.selector, revocableVerifier)
        );
        sessionManager.startSession(alice, block.timestamp + 24 hours);
    }

    // ════════════════════════════════════════════
    //  GAS: Benchmark All Attack Rejections
    // ════════════════════════════════════════════

    function test_Gas_AttackRejectionCosts() public {
        _activate(alice);

        // Direct call rejection cost
        uint256 g1 = gasleft();
        vm.prank(attacker);
        try hook.beforeSwap(attacker, _pk(), _sp(), "") {} catch {}
        uint256 directCallGas = g1 - gasleft();

        // Forged signature rejection cost
        uint256 dl = block.timestamp + 10 minutes;
        uint256 aliceN2 = hook.getNonce(alice);
        bytes memory fakeSig = _signSwap(attackerKey, alice, dl, aliceN2);
        bytes memory fakeHD = _encodePermit(alice, dl, aliceN2, fakeSig);
        uint256 g2 = gasleft();
        vm.prank(mockPM);
        try hook.beforeSwap(router, _pk(), _sp(), fakeHD) {} catch {}
        uint256 forgedSigGas = g2 - gasleft();

        // Malformed hookData rejection cost
        bytes memory bad = new bytes(100);
        uint256 g3 = gasleft();
        vm.prank(mockPM);
        try hook.beforeSwap(alice, _pk(), _sp(), bad) {} catch {}
        uint256 malformedGas = g3 - gasleft();

        // All rejections should be cheap
        assertLt(directCallGas, 10_000, "Direct call rejection too expensive");
        assertLt(forgedSigGas, 100_000, "Forged sig rejection too expensive");
        assertLt(malformedGas, 10_000, "Malformed data rejection too expensive");
    }
}
