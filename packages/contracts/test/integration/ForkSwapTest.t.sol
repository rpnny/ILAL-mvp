// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "@uniswap/v4-core/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/types/PoolKey.sol";
import "@uniswap/v4-core/types/BalanceDelta.sol";
import "@uniswap/v4-core/types/Currency.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../src/helpers/SimpleSwapRouter.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";
import {Registry} from "../../src/core/Registry.sol";

interface IForkRegistry {
    function approveRouter(address router, bool approved) external;
    function isRouterApproved(address router) external view returns (bool);
    function setEmergencyPause(bool paused) external;
    function emergencyPaused() external view returns (bool);
}

interface IForkSessionMgr {
    function startSession(address user, uint256 expiry) external;
    function isSessionActive(address user) external view returns (bool);
    function sessionExpiry(address user) external view returns (uint256);
}

interface IAccessControl {
    function grantRole(bytes32 role, address account) external;
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/**
 * @title ForkSwapTest
 * @notice Base Sepolia fork integration tests for SimpleSwapRouter + ComplianceHook.
 *
 * Run with:
 *   forge test --match-path "test/integration/ForkSwapTest.t.sol" -vv \
 *     --fork-url $BASE_SEPOLIA_RPC_URL
 *
 * Or set BASE_SEPOLIA_RPC_URL in your environment and run `forge test`.
 *
 * These tests use the *actually deployed* contracts on Base Sepolia testnet.
 * They verify the full on-chain flow: hook auth → settle → token balances.
 */
contract ForkSwapTest is Test {
    // ============ Deployed Addresses (Base Sepolia) ============

    address constant POOL_MANAGER   = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant REGISTRY       = 0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD;
    address constant SESSION_MGR    = 0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2;
    address constant COMPLIANCE_HOOK= 0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80;
    address constant POSITION_MGR   = 0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6;
    address constant SWAP_ROUTER    = 0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73;

    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;

    // ============ Interfaces ============

    IForkRegistry   registry;
    IForkSessionMgr sessionMgr;
    SimpleSwapRouter router;

    PoolKey poolKey;

    // ============ Test Accounts ============

    address verifier;   // will be granted VERIFIER_ROLE
    address alice;      // verified user with active session
    address nonUser;    // user without session

    // ============ Setup ============

    function setUp() public {
        // Fork Base Sepolia — skip if no RPC url is set
        string memory rpcUrl = vm.envOr("BASE_SEPOLIA_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            vm.skip(true);
            return;
        }

        uint256 forkId = vm.createFork(rpcUrl);
        vm.selectFork(forkId);

        registry   = IForkRegistry(REGISTRY);
        sessionMgr = IForkSessionMgr(SESSION_MGR);
        router     = SimpleSwapRouter(payable(SWAP_ROUTER));

        poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(COMPLIANCE_HOOK)
        });

        // Create test accounts
        verifier = makeAddr("verifier");
        alice    = makeAddr("alice");
        nonUser  = makeAddr("nonUser");

        // ---- Fund alice with USDC and WETH via deal() ----
        deal(USDC, alice, 1_000_000e6);  // 1M USDC
        deal(WETH, alice, 100 ether);
        vm.deal(alice, 1 ether);         // ETH for gas

        // ---- Grant VERIFIER_ROLE to verifier account ----
        bytes32 VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

        // Use prank as existing admin to grant role
        address defaultAdmin = _getDefaultAdmin();
        vm.prank(defaultAdmin);
        IAccessControl(SESSION_MGR).grantRole(VERIFIER_ROLE, verifier);

        // ---- Open sessions ----
        // With empty hookData, hook resolves user = sender (the contract
        // that called poolManager). So router & position manager need sessions.
        vm.startPrank(verifier);
        sessionMgr.startSession(alice, block.timestamp + 86400);
        sessionMgr.startSession(SWAP_ROUTER, block.timestamp + 86400);
        sessionMgr.startSession(POSITION_MGR, block.timestamp + 86400);
        vm.stopPrank();

        // ---- Approve router to spend alice's tokens ----
        vm.startPrank(alice);
        IERC20(USDC).approve(SWAP_ROUTER, type(uint256).max);
        IERC20(WETH).approve(SWAP_ROUTER, type(uint256).max);
        vm.stopPrank();
    }

    // ============ Test 1: ZeroForOne Swap Succeeds ============

    /// @notice USDC → WETH swap should succeed for a user with an active session.
    function test_SwapZeroForOne_Succeeds() public {
        uint256 usdcBefore = IERC20(USDC).balanceOf(alice);
        uint256 wethBefore = IERC20(WETH).balanceOf(alice);

        // hookData = Mode 2: right-pad alice's address to 20 bytes
        bytes memory hookData = _routerHookData(alice);

        vm.prank(alice);
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -100e6,          // exact input: 100 USDC
                sqrtPriceLimitX96: 4295128739 + 1 // MIN_SQRT + 1
            }),
            hookData,
            0 // no slippage check
        );

        uint256 usdcAfter = IERC20(USDC).balanceOf(alice);
        uint256 wethAfter = IERC20(WETH).balanceOf(alice);

        assertLt(usdcAfter, usdcBefore, "USDC should decrease");
        assertGt(wethAfter, wethBefore, "WETH should increase");

        console.log("USDC spent:", usdcBefore - usdcAfter);
        console.log("WETH received:", wethAfter - wethBefore);
    }

    // ============ Test 2: OneForZero Swap Succeeds ============

    /// @notice WETH → USDC swap should succeed after seeding the pool with USDC.
    ///         Pool has single-sided WETH liquidity, so we first do a USDC→WETH swap
    ///         to push USDC into the pool, then swap back.
    function test_SwapOneForZero_Succeeds() public {
        bytes memory hookData = _routerHookData(alice);

        // Seed: push USDC into the pool so oneForZero has something to buy
        vm.prank(alice);
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -10_000e6,       // 10k USDC in
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            0
        );

        uint256 usdcBefore = IERC20(USDC).balanceOf(alice);
        uint256 wethBefore = IERC20(WETH).balanceOf(alice);

        vm.prank(alice);
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: false,
                amountSpecified: -0.001 ether,    // exact input: 0.001 WETH
                sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970342 - 1
            }),
            hookData,
            0
        );

        uint256 usdcAfter = IERC20(USDC).balanceOf(alice);
        uint256 wethAfter = IERC20(WETH).balanceOf(alice);

        assertLt(wethAfter, wethBefore, "WETH should decrease");
        assertGt(usdcAfter, usdcBefore, "USDC should increase");

        console.log("WETH spent:", wethBefore - wethAfter);
        console.log("USDC received:", usdcAfter - usdcBefore);
    }

    // ============ Test 3: Unverified User Is Rejected ============

    /// @notice An unapproved router sending non-empty hookData should be rejected.
    function test_Swap_RevertsIfNotVerified() public {
        deal(USDC, nonUser, 1_000e6);
        vm.deal(nonUser, 1 ether);

        // Deploy a fresh (unapproved) router to simulate unauthorized access
        SimpleSwapRouter badRouter = new SimpleSwapRouter(POOL_MANAGER);

        vm.prank(nonUser);
        IERC20(USDC).approve(address(badRouter), type(uint256).max);

        // Non-empty hookData from unapproved router → RouterNotApproved
        bytes memory hookData = abi.encodePacked(nonUser);

        vm.prank(nonUser);
        vm.expectRevert();
        badRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -100e6,
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            0
        );
    }

    // ============ Test 4: Add Liquidity Then Swap ============

    /// @notice Full E2E flow: add liquidity, then swap through it.
    function test_AddLiquidity_ThenSwap() public {
        bytes memory hookData = _routerHookData(alice);

        // 1. Add liquidity via VerifiedPoolsPositionManager
        vm.startPrank(alice);
        IERC20(USDC).approve(POSITION_MGR, type(uint256).max);
        IERC20(WETH).approve(POSITION_MGR, type(uint256).max);

        VerifiedPoolsPositionManager positionMgr = VerifiedPoolsPositionManager(payable(POSITION_MGR));
        positionMgr.mint(poolKey, -600, 600, 1_000_000, hookData);
        vm.stopPrank();

        // 2. Swap
        uint256 usdcBefore = IERC20(USDC).balanceOf(alice);

        vm.prank(alice);
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -1000,           // tiny amount
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            0
        );

        uint256 usdcAfter = IERC20(USDC).balanceOf(alice);
        assertLt(usdcAfter, usdcBefore, "USDC should decrease after swap");
    }

    // ============ Test 5: CurrencyNotSettled Regression ============

    /// @notice Regression: swap must not revert with CurrencyNotSettled.
    ///         This test directly validates the 2026-02-27 fix to _settleSwap.
    function test_BothCurrencyDeltasAreSettled() public {
        bytes memory hookData = _routerHookData(alice);

        // If CurrencyNotSettled() is triggered, the tx will revert.
        // A successful call proves both deltas were settled.
        vm.prank(alice);
        BalanceDelta delta = router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -1000,
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            0
        );

        // delta.amount0() < 0 means USDC was taken from alice (correct)
        // delta.amount1() > 0 means WETH was given to alice (correct)
        assertLt(delta.amount0(), 0, "amount0 should be negative (USDC spent)");
        assertGt(delta.amount1(), 0, "amount1 should be positive (WETH received)");
    }

    // ============ Test 6: Expired Session Reverts ============

    /// @notice After router session expires, swaps through it should fail.
    function test_ExpiredSession_RevertsSwap() public {
        // Warp past router's session expiry (setUp gives it 24h)
        uint256 expiry = sessionMgr.sessionExpiry(SWAP_ROUTER);
        vm.warp(expiry + 1);

        bytes memory hookData = _routerHookData(alice);

        vm.prank(alice);
        vm.expectRevert();
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -100e6,
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            0
        );
    }

    // ============ Test 7: Emergency Pause Reverts ============

    /// @notice Registry emergency pause should cause ComplianceHook to revert swaps.
    function test_EmergencyPause_RevertsSwap() public {
        bytes memory hookData = _routerHookData(alice);

        // Toggle emergency pause as the Registry default admin
        address registryAdmin = _getDefaultAdmin();
        vm.prank(registryAdmin);
        registry.setEmergencyPause(true);
        assertTrue(registry.emergencyPaused(), "Emergency pause should be active");

        vm.prank(alice);
        vm.expectRevert();
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -100e6,
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            0
        );
    }

    // ============ Test 8: Slippage Protection ============

    /// @notice Swap with an impossible minAmountOut should revert with InsufficientOutput.
    function test_SlippageProtection_Reverts() public {
        bytes memory hookData = _routerHookData(alice);

        // Set minAmountOut to max uint128 — no swap output can satisfy this
        vm.prank(alice);
        vm.expectRevert();
        router.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -100e6, // 100 USDC in
                sqrtPriceLimitX96: 4295128739 + 1
            }),
            hookData,
            type(uint128).max // impossible minimum
        );
    }

    // ============ Helpers ============

    /// @dev Empty hookData → hook resolves user = sender (router).
    ///      For EIP-712 permit flow, hookData would be 148+ bytes.
    function _routerHookData(address) internal pure returns (bytes memory) {
        return "";
    }

    function _getDefaultAdmin() internal pure returns (address) {
        // On Base Sepolia, the deployer/admin of SessionManager and Registry is the test wallet.
        // Confirmed via: cast call SESSION_MGR "hasRole(bytes32,address)" 0x0..0 <address>
        return 0x1b869CaC69Df23Ad9D727932496AEb3605538c8D;
    }
}

// (interfaces moved to top of file)
