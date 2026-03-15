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
 * @title WarTheater
 * @notice Full-fidelity simulation test — institution lifecycle, extreme conditions, attack resilience
 *
 * Phase 1: Multi-institution lifecycle (10 institutions, parallel sessions, concurrent ops)
 * Phase 2: Extreme conditions (mass activations, rapid-fire ops, boundary TTL, gas limits)
 * Phase 3: Attack simulation (20+ attack vectors across signature, session, governance, proxy layers)
 */
contract WarTheater is Test {
    // ─── Core contracts ───
    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;
    ComplianceHook public hook;
    VerifiedPoolsPositionManager public positionManager;

    // ─── Actors ───
    address public governance = makeAddr("governance");
    address public approvedRouter = makeAddr("approvedRouter");
    address public mockPoolManager;

    uint256 constant NUM_INSTITUTIONS = 10;
    uint256[] private institutionKeys;
    address[] private institutions;

    uint256 constant NUM_ATTACKERS = 5;
    uint256[] private attackerKeys;
    address[] private attackers;

    bytes32 public constant COINBASE_ID = keccak256("Coinbase");

    // ─── Metrics ───
    uint256 public totalGasConsumed;
    uint256 public peakGasPerOp;

    // ════════════════════════════════════════════════════
    //  Setup
    // ════════════════════════════════════════════════════

    function setUp() public {
        mockPoolManager = makeAddr("poolManager");

        // Generate institution keys
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            uint256 pk = 0x100 + i;
            institutionKeys.push(pk);
            institutions.push(vm.addr(pk));
        }

        // Generate attacker keys
        for (uint256 i = 0; i < NUM_ATTACKERS; i++) {
            uint256 pk = 0xa0000 + i;
            attackerKeys.push(pk);
            attackers.push(vm.addr(pk));
        }

        _deployAll();
        _configureSystem();
    }

    function _deployAll() internal {
        Registry registryImpl = new Registry();
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, governance)
        );
        registry = Registry(address(registryProxy));

        verifier = new MockVerifier();

        SessionManager sessionImpl = new SessionManager();
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            abi.encodeWithSelector(
                SessionManager.initialize.selector,
                address(registry),
                address(verifier),
                governance
            )
        );
        sessionManager = SessionManager(address(sessionProxy));

        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        vm.prank(governance);
        sessionManager.grantRole(verifierRole, address(verifier));

        hook = new ComplianceHook(mockPoolManager, address(registry), address(sessionManager));

        positionManager = new VerifiedPoolsPositionManager(
            mockPoolManager,
            address(registry),
            address(sessionManager)
        );
    }

    function _configureSystem() internal {
        vm.startPrank(governance);
        registry.registerIssuer(COINBASE_ID, makeAddr("coinbaseAttester"), address(verifier));
        registry.approveRouter(approvedRouter, true);
        vm.stopPrank();

        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            verifier.setUserAllowed(institutions[i], true);
        }
    }

    // ════════════════════════════════════════════════════
    //  Helpers
    // ════════════════════════════════════════════════════

    function _poolKey() internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0x036CbD53842c5426634e7929541eC2318f3dCF7e)),
            currency1: Currency.wrap(address(0x4200000000000000000000000000000000000006)),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(address(hook))
        });
    }

    function _swapParams() internal pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 4295128740});
    }

    function _modifyParams() internal pure returns (IPoolManager.ModifyLiquidityParams memory) {
        return IPoolManager.ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 1e18, salt: bytes32(0)});
    }

    function _activateSession(address user) internal {
        vm.prank(address(verifier));
        sessionManager.startSession(user, block.timestamp + 24 hours);
    }

    function _signSwapPermit(uint256 pk, address user, uint256 deadline, uint256 nonce)
        internal view returns (bytes memory)
    {
        bytes32 structHash = keccak256(abi.encode(hook.SWAP_PERMIT_TYPEHASH(), user, deadline, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", hook.getDomainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _signLiquidityPermit(uint256 pk, address user, uint256 deadline, uint256 nonce, bool isAdd)
        internal view returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(hook.LIQUIDITY_PERMIT_TYPEHASH(), user, deadline, nonce, isAdd)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", hook.getDomainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _buildPermitHookData(uint256 pk, address user) internal view returns (bytes memory) {
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(user);
        bytes memory sig = _signSwapPermit(pk, user, deadline, nonce);
        ComplianceHook.PermitData memory permit = ComplianceHook.PermitData({
            user: user, deadline: deadline, nonce: nonce, signature: sig
        });
        return abi.encode(permit);
    }

    // ════════════════════════════════════════════════════════════
    //  PHASE 1: MULTI-INSTITUTION LIFECYCLE
    // ════════════════════════════════════════════════════════════

    /// @notice 10 institutions onboard, get sessions, trade, renew, expire
    function test_Phase1_FullInstitutionLifecycle() public {
        // Step 1: Batch onboarding — all institutions activate sessions
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            _activateSession(institutions[i]);
            assertTrue(sessionManager.isSessionActive(institutions[i]));
        }

        // Step 2: All institutions perform swaps via approved router (EIP-712)
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            bytes memory hookData = _buildPermitHookData(institutionKeys[i], institutions[i]);
            vm.prank(mockPoolManager);
            hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
        }

        // Step 3: Verify nonces incremented
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            assertEq(hook.getNonce(institutions[i]), 1);
        }

        // Step 4: Session renewal — extend all sessions (max TTL = 24h)
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            vm.prank(address(verifier));
            sessionManager.startSession(institutions[i], block.timestamp + 24 hours);
            assertTrue(sessionManager.isSessionActive(institutions[i]));
        }

        // Step 5: Warp past 24h sessions to expire them all
        vm.warp(block.timestamp + 25 hours);
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            assertFalse(sessionManager.isSessionActive(institutions[i]));
        }

        // Step 6: Re-onboard subset
        for (uint256 i = 0; i < 5; i++) {
            _activateSession(institutions[i]);
            assertTrue(sessionManager.isSessionActive(institutions[i]));
        }
        for (uint256 i = 5; i < NUM_INSTITUTIONS; i++) {
            assertFalse(sessionManager.isSessionActive(institutions[i]));
        }

        // Step 7: Expired institutions can NOT swap
        for (uint256 i = 5; i < NUM_INSTITUTIONS; i++) {
            vm.prank(mockPoolManager);
            vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, institutions[i]));
            hook.beforeSwap(institutions[i], _poolKey(), _swapParams(), "");
        }
    }

    /// @notice Concurrent EIP-712 permit operations across all institutions
    function test_Phase1_ConcurrentPermitOperations() public {
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            _activateSession(institutions[i]);
        }

        // Each institution does 3 sequential swaps
        for (uint256 round = 0; round < 3; round++) {
            for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
                bytes memory hookData = _buildPermitHookData(institutionKeys[i], institutions[i]);
                vm.prank(mockPoolManager);
                hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
            }
        }

        // All nonces should be at 3
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            assertEq(hook.getNonce(institutions[i]), 3);
        }
    }

    /// @notice EOA direct mode works for all institutions
    function test_Phase1_EOADirectSwap() public {
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            _activateSession(institutions[i]);
        }

        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            vm.prank(mockPoolManager);
            hook.beforeSwap(institutions[i], _poolKey(), _swapParams(), "");
        }

        // Nonces should remain 0 (EOA mode doesn't use nonces)
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            assertEq(hook.getNonce(institutions[i]), 0);
        }
    }

    /// @notice Batch session queries work correctly
    function test_Phase1_BatchSessionQuery() public {
        for (uint256 i = 0; i < 5; i++) {
            _activateSession(institutions[i]);
        }

        bool[] memory statuses = sessionManager.batchIsSessionActive(institutions);
        for (uint256 i = 0; i < 5; i++) {
            assertTrue(statuses[i]);
        }
        for (uint256 i = 5; i < NUM_INSTITUTIONS; i++) {
            assertFalse(statuses[i]);
        }
    }

    /// @notice Admin batch end sessions
    function test_Phase1_BatchEndSessions() public {
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            _activateSession(institutions[i]);
        }

        vm.prank(governance);
        sessionManager.endSessionBatch(institutions);

        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            assertFalse(sessionManager.isSessionActive(institutions[i]));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  PHASE 2: EXTREME CONDITIONS
    // ════════════════════════════════════════════════════════════

    /// @notice Mass session activations — 50 users simultaneously
    function test_Phase2_MassSessionActivation() public {
        address[] memory massUsers = new address[](50);
        for (uint256 i = 0; i < 50; i++) {
            massUsers[i] = vm.addr(0x5000 + i);
            verifier.setUserAllowed(massUsers[i], true);
        }

        uint256 gasBefore = gasleft();
        for (uint256 i = 0; i < 50; i++) {
            vm.prank(address(verifier));
            sessionManager.startSession(massUsers[i], block.timestamp + 24 hours);
        }
        uint256 totalGas = gasBefore - gasleft();

        for (uint256 i = 0; i < 50; i++) {
            assertTrue(sessionManager.isSessionActive(massUsers[i]));
        }

        assertLt(totalGas / 50, 100_000, "Average gas per session activation too high");
    }

    /// @notice Rapid-fire swaps — 100 swaps from single institution
    function test_Phase2_RapidFireSwaps() public {
        _activateSession(institutions[0]);

        uint256 gasBefore = gasleft();
        for (uint256 i = 0; i < 100; i++) {
            bytes memory hookData = _buildPermitHookData(institutionKeys[0], institutions[0]);
            vm.prank(mockPoolManager);
            hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
        }
        uint256 totalGas = gasBefore - gasleft();

        assertEq(hook.getNonce(institutions[0]), 100);
        assertLt(totalGas / 100, 80_000, "Average gas per swap hook too high");
    }

    /// @notice Session boundary: swap at exact expiry timestamp
    function test_Phase2_SessionBoundaryExactExpiry() public {
        uint256 expiry = block.timestamp + 24 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(institutions[0], expiry);

        // At exact expiry: should still be active (<=)
        vm.warp(expiry);
        assertTrue(sessionManager.isSessionActive(institutions[0]));

        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        // 1 second after: expired
        vm.warp(expiry + 1);
        assertFalse(sessionManager.isSessionActive(institutions[0]));

        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, institutions[0]));
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");
    }

    /// @notice TTL boundary testing — min and max values
    function test_Phase2_TTLBoundaries() public {
        // Min TTL: 1 hour
        vm.prank(governance);
        registry.setSessionTTL(1 hours);

        vm.prank(address(verifier));
        sessionManager.startSession(institutions[0], block.timestamp + 1 hours);
        assertTrue(sessionManager.isSessionActive(institutions[0]));

        // Attempting > 1h should revert
        vm.prank(address(verifier));
        vm.expectRevert(SessionManager.InvalidExpiry.selector);
        sessionManager.startSession(institutions[1], block.timestamp + 1 hours + 1);

        // Max TTL: 7 days
        vm.prank(governance);
        registry.setSessionTTL(7 days);

        vm.prank(address(verifier));
        sessionManager.startSession(institutions[1], block.timestamp + 7 days);
        assertTrue(sessionManager.isSessionActive(institutions[1]));

        // Invalid TTL values
        vm.prank(governance);
        vm.expectRevert(Registry.InvalidTTL.selector);
        registry.setSessionTTL(59 minutes);

        vm.prank(governance);
        vm.expectRevert(Registry.InvalidTTL.selector);
        registry.setSessionTTL(7 days + 1);
    }

    /// @notice Emergency pause blocks swaps/adds but allows removals
    function test_Phase2_EmergencyPauseCycle() public {
        for (uint256 i = 0; i < 5; i++) {
            _activateSession(institutions[i]);
        }

        // Normal operation
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        vm.prank(mockPoolManager);
        hook.beforeAddLiquidity(institutions[1], _poolKey(), _modifyParams(), "");

        // PAUSE
        vm.prank(governance);
        registry.setEmergencyPause(true);

        // Swap blocked
        vm.prank(mockPoolManager);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        // Add liquidity blocked
        vm.prank(mockPoolManager);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        hook.beforeAddLiquidity(institutions[1], _poolKey(), _modifyParams(), "");

        // Remove liquidity allowed
        vm.prank(mockPoolManager);
        bytes4 sel = hook.beforeRemoveLiquidity(institutions[2], _poolKey(), _modifyParams(), "");
        assertEq(sel, IHooks.beforeRemoveLiquidity.selector);

        // UNPAUSE
        vm.prank(governance);
        registry.setEmergencyPause(false);

        // Swap works again
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");
    }

    /// @notice Rapid pause/unpause cycling doesn't corrupt state
    function test_Phase2_RapidPauseUnpauseCycle() public {
        _activateSession(institutions[0]);

        for (uint256 i = 0; i < 20; i++) {
            vm.prank(governance);
            registry.setEmergencyPause(true);
            assertTrue(registry.emergencyPaused());

            vm.prank(governance);
            registry.setEmergencyPause(false);
            assertFalse(registry.emergencyPaused());
        }

        // System still functional
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");
        assertTrue(sessionManager.isSessionActive(institutions[0]));
    }

    /// @notice Gas benchmark: hook overhead per operation type
    function test_Phase2_GasBenchmarks() public {
        _activateSession(institutions[0]);

        // EOA swap
        uint256 g1 = gasleft();
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");
        uint256 eoaSwapGas = g1 - gasleft();

        // EIP-712 swap
        bytes memory hookData = _buildPermitHookData(institutionKeys[0], institutions[0]);
        uint256 g2 = gasleft();
        vm.prank(mockPoolManager);
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
        uint256 permitSwapGas = g2 - gasleft();

        // Add liquidity
        uint256 g3 = gasleft();
        vm.prank(mockPoolManager);
        hook.beforeAddLiquidity(institutions[0], _poolKey(), _modifyParams(), "");
        uint256 addLiqGas = g3 - gasleft();

        // Remove liquidity
        uint256 g4 = gasleft();
        vm.prank(mockPoolManager);
        hook.beforeRemoveLiquidity(institutions[0], _poolKey(), _modifyParams(), "");
        uint256 removeLiqGas = g4 - gasleft();

        assertLt(eoaSwapGas, 30_000, "EOA swap gas too high");
        assertLt(permitSwapGas, 80_000, "Permit swap gas too high");
        assertLt(addLiqGas, 30_000, "Add liquidity gas too high");
        assertLt(removeLiqGas, 20_000, "Remove liquidity gas too high");
    }

    /// @notice Session expiry mid-operation sequence
    function test_Phase2_SessionExpiryDuringOperations() public {
        uint256 expiry = block.timestamp + 1 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(institutions[0], expiry);

        // Operations succeed before expiry
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(mockPoolManager);
            hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");
            vm.warp(block.timestamp + 10 minutes);
        }

        // 50 minutes passed, 10 more minutes left
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        // Expire the session
        vm.warp(expiry + 1);

        // Operations fail after expiry
        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, institutions[0]));
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        // But can still remove liquidity
        vm.prank(mockPoolManager);
        hook.beforeRemoveLiquidity(institutions[0], _poolKey(), _modifyParams(), "");
    }

    // ════════════════════════════════════════════════════════════
    //  PHASE 3: ATTACK SIMULATION
    // ════════════════════════════════════════════════════════════

    // ── 3.1 Signature Attacks ──

    /// @notice Attacker forges signature with wrong private key
    function test_Phase3_Attack_ForgedSignature() public {
        _activateSession(institutions[0]);

        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(institutions[0]);

        bytes memory fakeSig = _signSwapPermit(attackerKeys[0], institutions[0], deadline, nonce);
        ComplianceHook.PermitData memory permit = ComplianceHook.PermitData({
            user: institutions[0], deadline: deadline, nonce: nonce, signature: fakeSig
        });
        bytes memory hookData = abi.encode(permit);

        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
    }

    /// @notice Replay attack — reuse same permit twice
    function test_Phase3_Attack_SignatureReplay() public {
        _activateSession(institutions[0]);

        bytes memory hookData = _buildPermitHookData(institutionKeys[0], institutions[0]);

        // First use: success
        vm.prank(mockPoolManager);
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);

        // Second use with same hookData: nonce already consumed
        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
    }

    /// @notice Expired signature is rejected
    function test_Phase3_Attack_ExpiredSignature() public {
        _activateSession(institutions[0]);

        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(institutions[0]);
        bytes memory sig = _signSwapPermit(institutionKeys[0], institutions[0], deadline, nonce);
        bytes memory hookData = abi.encode(ComplianceHook.PermitData({
            user: institutions[0], deadline: deadline, nonce: nonce, signature: sig
        }));

        vm.warp(deadline + 1);

        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
    }

    /// @notice Swap permit cannot be used for liquidity operations
    function test_Phase3_Attack_PermitTypeMismatch() public {
        _activateSession(institutions[0]);

        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(institutions[0]);
        bytes memory swapSig = _signSwapPermit(institutionKeys[0], institutions[0], deadline, nonce);
        bytes memory hookData = abi.encode(ComplianceHook.PermitData({
            user: institutions[0], deadline: deadline, nonce: nonce, signature: swapSig
        }));

        // Swap permit used for add liquidity: different typehash → signature mismatch
        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeAddLiquidity(approvedRouter, _poolKey(), _modifyParams(), hookData);
    }

    /// @notice Cross-user nonce manipulation: user A's nonce ≠ user B's
    function test_Phase3_Attack_CrossUserNonce() public {
        _activateSession(institutions[0]);
        _activateSession(institutions[1]);

        bytes memory hookData0 = _buildPermitHookData(institutionKeys[0], institutions[0]);
        vm.prank(mockPoolManager);
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData0);
        assertEq(hook.getNonce(institutions[0]), 1);

        // Institution 1 tries to use nonce=1 (their actual nonce is 0)
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _signSwapPermit(institutionKeys[1], institutions[1], deadline, 1);
        bytes memory hookData1 = abi.encode(ComplianceHook.PermitData({
            user: institutions[1], deadline: deadline, nonce: 1, signature: sig
        }));

        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData1);
    }

    // ── 3.2 Session Attacks ──

    /// @notice Attacker without session cannot swap
    function test_Phase3_Attack_NoSessionSwap() public {
        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, attackers[0]));
        hook.beforeSwap(attackers[0], _poolKey(), _swapParams(), "");
    }

    /// @notice Attacker tries to start session without VERIFIER_ROLE
    function test_Phase3_Attack_UnauthorizedSessionStart() public {
        vm.prank(attackers[0]);
        vm.expectRevert();
        sessionManager.startSession(attackers[0], block.timestamp + 24 hours);
    }

    /// @notice Attacker tries to end another user's session
    function test_Phase3_Attack_UnauthorizedSessionEnd() public {
        _activateSession(institutions[0]);

        vm.prank(attackers[0]);
        vm.expectRevert();
        sessionManager.endSession(institutions[0]);

        assertTrue(sessionManager.isSessionActive(institutions[0]));
    }

    /// @notice Setting session expiry beyond TTL is rejected
    function test_Phase3_Attack_ExcessiveSessionExpiry() public {
        uint256 ttl = registry.getSessionTTL();

        vm.prank(address(verifier));
        vm.expectRevert(SessionManager.InvalidExpiry.selector);
        sessionManager.startSession(institutions[0], block.timestamp + ttl + 1);
    }

    /// @notice Session with past expiry is rejected
    function test_Phase3_Attack_PastExpirySession() public {
        vm.prank(address(verifier));
        vm.expectRevert(SessionManager.InvalidExpiry.selector);
        sessionManager.startSession(institutions[0], block.timestamp - 1);
    }

    /// @notice Session for address(0) is rejected
    function test_Phase3_Attack_ZeroAddressSession() public {
        vm.prank(address(verifier));
        vm.expectRevert(SessionManager.ZeroAddress.selector);
        sessionManager.startSession(address(0), block.timestamp + 24 hours);
    }

    // ── 3.3 Governance Attacks ──

    /// @notice Non-owner cannot register issuer
    function test_Phase3_Attack_UnauthorizedIssuerRegistration() public {
        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.registerIssuer(keccak256("FakeIssuer"), attackers[0], attackers[1]);
    }

    /// @notice Non-owner cannot approve router
    function test_Phase3_Attack_UnauthorizedRouterApproval() public {
        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.approveRouter(attackers[0], true);
    }

    /// @notice Non-owner cannot trigger emergency pause
    function test_Phase3_Attack_UnauthorizedEmergencyPause() public {
        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.setEmergencyPause(true);

        assertFalse(registry.emergencyPaused());
    }

    /// @notice Non-owner cannot change TTL
    function test_Phase3_Attack_UnauthorizedTTLChange() public {
        uint256 originalTTL = registry.getSessionTTL();

        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.setSessionTTL(1 hours);

        assertEq(registry.getSessionTTL(), originalTTL);
    }

    /// @notice Non-owner cannot revoke issuer
    function test_Phase3_Attack_UnauthorizedIssuerRevocation() public {
        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.revokeIssuer(COINBASE_ID);

        Registry.IssuerInfo memory info = registry.getIssuerInfo(COINBASE_ID);
        assertTrue(info.active);
    }

    // ── 3.4 Router & hookData Attacks ──

    /// @notice Unapproved router with hookData is rejected
    function test_Phase3_Attack_UnapprovedRouter() public {
        _activateSession(institutions[0]);

        bytes memory hookData = _buildPermitHookData(institutionKeys[0], institutions[0]);

        address fakeRouter = makeAddr("fakeRouter");
        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.RouterNotApproved.selector, fakeRouter));
        hook.beforeSwap(fakeRouter, _poolKey(), _swapParams(), hookData);
    }

    /// @notice Malformed hookData (wrong length) is rejected
    function test_Phase3_Attack_MalformedHookData() public {
        _activateSession(institutions[0]);

        // hookData length between 1 and 147: sender not approved router → RouterNotApproved
        // hookData length > 0 with unapproved sender triggers router check first
        bytes memory badData = new bytes(50);
        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.RouterNotApproved.selector, institutions[0]));
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), badData);

        // With approved router: short data triggers InvalidHookData
        bytes memory shortData = new bytes(100);
        vm.prank(mockPoolManager);
        vm.expectRevert(ComplianceHook.InvalidHookData.selector);
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), shortData);
    }

    /// @notice Garbage hookData >= 148 bytes causes decode failure
    function test_Phase3_Attack_GarbageHookData() public {
        _activateSession(institutions[0]);

        bytes memory garbage = new bytes(200);
        for (uint256 i = 0; i < 200; i++) {
            garbage[i] = bytes1(uint8(i));
        }

        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), garbage);
    }

    /// @notice Only PoolManager can call hook functions
    function test_Phase3_Attack_DirectHookCall() public {
        _activateSession(institutions[0]);

        // Any non-PoolManager address calling beforeSwap should fail
        vm.prank(attackers[0]);
        vm.expectRevert(ComplianceHook.OnlyPoolManager.selector);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        vm.prank(attackers[0]);
        vm.expectRevert(ComplianceHook.OnlyPoolManager.selector);
        hook.beforeAddLiquidity(institutions[0], _poolKey(), _modifyParams(), "");

        vm.prank(attackers[0]);
        vm.expectRevert(ComplianceHook.OnlyPoolManager.selector);
        hook.beforeRemoveLiquidity(institutions[0], _poolKey(), _modifyParams(), "");
    }

    // ── 3.5 Proxy/Upgrade Attacks ──

    /// @notice Non-admin cannot upgrade SessionManager
    function test_Phase3_Attack_UnauthorizedUpgrade_SessionManager() public {
        SessionManager newImpl = new SessionManager();

        vm.prank(attackers[0]);
        vm.expectRevert();
        sessionManager.upgradeToAndCall(address(newImpl), "");
    }

    /// @notice Non-owner cannot upgrade Registry
    function test_Phase3_Attack_UnauthorizedUpgrade_Registry() public {
        Registry newImpl = new Registry();

        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImpl), "");
    }

    /// @notice Legitimate upgrade preserves all state
    function test_Phase3_UpgradePreservesState() public {
        // Setup state with EOA mode
        _activateSession(institutions[0]);
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        // Record pre-upgrade state
        bool sessionActive = sessionManager.isSessionActive(institutions[0]);
        uint256 ttl = registry.getSessionTTL();
        bool routerApproved = registry.isRouterApproved(approvedRouter);

        // Upgrade Registry
        Registry newRegistryImpl = new Registry();
        vm.prank(governance);
        registry.upgradeToAndCall(address(newRegistryImpl), "");

        // Upgrade SessionManager
        SessionManager newSessionImpl = new SessionManager();
        vm.prank(governance);
        sessionManager.upgradeToAndCall(address(newSessionImpl), "");

        // Verify state preserved
        assertEq(sessionManager.isSessionActive(institutions[0]), sessionActive);
        assertEq(registry.getSessionTTL(), ttl);
        assertEq(registry.isRouterApproved(approvedRouter), routerApproved);
        assertEq(registry.owner(), governance);
    }

    // ── 3.6 NFT / Position Manager Attacks ──

    /// @notice LP NFT transfer is always blocked
    function test_Phase3_Attack_NFTTransferBlocked() public {
        vm.prank(institutions[0]);
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.safeTransferFrom(institutions[0], attackers[0], 1);

        vm.prank(institutions[0]);
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.transferFrom(institutions[0], attackers[0], 1);

        // safeTransferFrom with data
        vm.prank(institutions[0]);
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.safeTransferFrom(institutions[0], attackers[0], 1, "");
    }

    // ── 3.7 Combined Attack Scenarios ──

    /// @notice Attacker sequence: tries every vector
    function test_Phase3_CombinedAttack_FullSequence() public {
        _activateSession(institutions[0]);

        // Step 1: Try direct hook call
        vm.prank(attackers[0]);
        vm.expectRevert(ComplianceHook.OnlyPoolManager.selector);
        hook.beforeSwap(attackers[0], _poolKey(), _swapParams(), "");

        // Step 2: Try unauthorized session start
        vm.prank(attackers[0]);
        vm.expectRevert();
        sessionManager.startSession(attackers[0], block.timestamp + 24 hours);

        // Step 3: Try forged signature via PoolManager
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(institutions[0]);
        bytes memory fakeSig = _signSwapPermit(attackerKeys[0], institutions[0], deadline, nonce);
        bytes memory fakeHookData = abi.encode(ComplianceHook.PermitData({
            user: institutions[0], deadline: deadline, nonce: nonce, signature: fakeSig
        }));

        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), fakeHookData);

        // Step 4: Try emergency pause
        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.setEmergencyPause(true);

        // Step 5: Try upgrade (cache address before prank)
        address newImpl = address(new Registry());
        vm.prank(attackers[0]);
        vm.expectRevert();
        registry.upgradeToAndCall(newImpl, "");

        // Step 6: Verify system still functional
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        assertFalse(registry.emergencyPaused());
        assertTrue(sessionManager.isSessionActive(institutions[0]));
    }

    /// @notice Race condition: session expires between permit sign and execution
    function test_Phase3_Attack_SessionExpiryRaceCondition() public {
        uint256 expiry = block.timestamp + 1 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(institutions[0], expiry);

        // Build permit while session is active
        bytes memory hookData = _buildPermitHookData(institutionKeys[0], institutions[0]);

        // Session expires
        vm.warp(expiry + 1);
        assertFalse(sessionManager.isSessionActive(institutions[0]));

        // Even with valid signature, swap fails because session expired
        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);
    }

    /// @notice Issuer revocation blocks new sessions but existing sessions persist
    function test_Phase3_Attack_IssuerRevocationImpact() public {
        _activateSession(institutions[0]);

        // Revoke issuer
        vm.prank(governance);
        registry.revokeIssuer(COINBASE_ID);

        // Existing session still works
        assertTrue(sessionManager.isSessionActive(institutions[0]));
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");

        // Issuer is no longer active
        Registry.IssuerInfo memory info = registry.getIssuerInfo(COINBASE_ID);
        assertFalse(info.active);

        // Revoked verifier can no longer issue new sessions.
        vm.prank(address(verifier));
        vm.expectRevert(
            abi.encodeWithSelector(SessionManager.InactiveVerifier.selector, address(verifier))
        );
        sessionManager.startSession(institutions[1], block.timestamp + 24 hours);
    }

    /// @notice Router de-approval blocks existing users from permit mode
    function test_Phase3_Attack_RouterDeapproval() public {
        _activateSession(institutions[0]);

        // Build permit for approved router
        bytes memory hookData = _buildPermitHookData(institutionKeys[0], institutions[0]);

        // De-approve router
        vm.prank(governance);
        registry.approveRouter(approvedRouter, false);

        // Permit mode fails because router is no longer approved
        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.RouterNotApproved.selector, approvedRouter));
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), hookData);

        // But EOA mode still works (no router check for empty hookData)
        vm.prank(mockPoolManager);
        hook.beforeSwap(institutions[0], _poolKey(), _swapParams(), "");
    }

    // ════════════════════════════════════════════════════════════
    //  PHASE 3 EXTENDED: FUZZ TESTS
    // ════════════════════════════════════════════════════════════

    /// @notice Fuzz: random users cannot swap without session
    function testFuzz_NoSessionNoSwap(address randomUser) public {
        vm.assume(randomUser != address(0));
        // Exclude institutions that might have sessions
        for (uint256 i = 0; i < NUM_INSTITUTIONS; i++) {
            vm.assume(randomUser != institutions[i]);
        }

        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, randomUser));
        hook.beforeSwap(randomUser, _poolKey(), _swapParams(), "");
    }

    /// @notice Fuzz: random expiry values are properly validated
    function testFuzz_SessionExpiryValidation(uint256 expiry) public {
        uint256 ttl = registry.getSessionTTL();

        if (expiry <= block.timestamp || expiry > block.timestamp + ttl) {
            vm.prank(address(verifier));
            vm.expectRevert();
            sessionManager.startSession(institutions[0], expiry);
        } else {
            vm.prank(address(verifier));
            sessionManager.startSession(institutions[0], expiry);
            assertTrue(sessionManager.isSessionActive(institutions[0]));
        }
    }

    /// @notice Fuzz: random TTL values are properly validated
    function testFuzz_TTLValidation(uint256 newTTL) public {
        if (newTTL < 1 hours || newTTL > 7 days) {
            vm.prank(governance);
            vm.expectRevert(Registry.InvalidTTL.selector);
            registry.setSessionTTL(newTTL);
        } else {
            vm.prank(governance);
            registry.setSessionTTL(newTTL);
            assertEq(registry.getSessionTTL(), newTTL);
        }
    }

    /// @notice Fuzz: arbitrary hookData lengths are safely handled
    function testFuzz_HookDataLength(uint256 length) public {
        length = bound(length, 1, 147);
        _activateSession(institutions[0]);

        bytes memory badData = new bytes(length);
        // hookData.length > 0 with non-approved sender → RouterNotApproved
        // hookData.length > 0 with approved router → InvalidHookData (for short data)
        vm.prank(mockPoolManager);
        vm.expectRevert();
        hook.beforeSwap(approvedRouter, _poolKey(), _swapParams(), badData);
    }
}
