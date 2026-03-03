// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/libraries/EIP712Verifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";

/**
 * @title E2E Test
 * @notice 端到端集成测试 - 模拟完整用户流程
 */
contract E2ETest is Test {
    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;
    ComplianceHook public hook;

    address public governance = makeAddr("governance");
    address public router = makeAddr("router");
    address public mockPoolManager = makeAddr("poolManager");

    uint256 public alicePrivateKey = 0xa11ce;
    uint256 public bobPrivateKey = 0xb0b;
    address public aliceAddr;
    address public bob;

    bytes32 public constant COINBASE_ID = keccak256("Coinbase");
    address public coinbaseAttester = makeAddr("coinbaseAttester");

    function setUp() public {
        aliceAddr = vm.addr(alicePrivateKey);
        bob = vm.addr(bobPrivateKey);
        vm.label(aliceAddr, "alice");
        vm.label(bob, "bob");

        // 1. 部署所有合约
        _deployAllContracts();

        // 2. 配置系统
        _configureSystem();
    }

    function _deployAllContracts() internal {
        // 部署 Registry (UUPS)
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            governance
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = Registry(address(registryProxy));

        // 部署 Verifier
        verifier = new MockVerifier();

        // 部署 SessionManager (UUPS)
        SessionManager sessionImpl = new SessionManager();
        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(verifier),
            governance
        );
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            sessionInitData
        );
        sessionManager = SessionManager(address(sessionProxy));

        // 赋予 verifier VERIFIER_ROLE (先获取角色再 prank)
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        vm.prank(governance);
        sessionManager.grantRole(verifierRole, address(verifier));

        hook = new ComplianceHook(mockPoolManager, address(registry), address(sessionManager));
    }

    function _configureSystem() internal {
        vm.startPrank(governance);

        // 注册 Coinbase 为 Issuer
        registry.registerIssuer(
            COINBASE_ID,
            coinbaseAttester,
            address(verifier)
        );

        // 批准 Universal Router
        registry.approveRouter(router, true);

        vm.stopPrank();

        // 配置 MockVerifier 允许 Alice
        verifier.setUserAllowed(aliceAddr, true);
    }
    
    // ============================================
    // Helpers for ComplianceHook v2
    // ============================================
    function _createPoolKey() internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0x036CbD53842c5426634e7929541eC2318f3dCF7e)), // USDC
            currency1: Currency.wrap(address(0x4200000000000000000000000000000000000006)), // WETH
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(address(hook))
        });
    }
    
    function _createSwapParams() internal pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1e18,
            sqrtPriceLimitX96: 4295128740
        });
    }
    
    function _createModifyLiquidityParams() internal pure returns (IPoolManager.ModifyLiquidityParams memory) {
        return IPoolManager.ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: 1e18,
            salt: bytes32(0)
        });
    }

    // ============ 完整用户流程测试 ============

    function test_E2E_CompleteUserJourney() public {
        _e2e_phase1();
    }

    function _e2e_phase1() internal {
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, expiry);
        assertTrue(sessionManager.isSessionActive(aliceAddr));

        bytes memory hookData = "";
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();

        vm.prank(mockPoolManager);
        (bytes4 selector,,) = hook.beforeSwap(aliceAddr, key, params, hookData);
        assertTrue(selector == IHooks.beforeSwap.selector);

        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        vm.prank(mockPoolManager);
        bytes4 selectorLiq = hook.beforeAddLiquidity(aliceAddr, key, modParams, hookData);
        assertTrue(selectorLiq == IHooks.beforeAddLiquidity.selector);

        vm.warp(expiry + 1);
        assertFalse(sessionManager.isSessionActive(aliceAddr));

        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, aliceAddr));
        hook.beforeSwap(aliceAddr, key, params, hookData);

        _e2e_phase2(hookData, key, params);
    }

    function _e2e_phase2(
        bytes memory hookData,
        PoolKey memory key,
        IPoolManager.SwapParams memory params
    ) internal {
        uint256 renewedExpiry = block.timestamp + 12 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, renewedExpiry);
        assertTrue(sessionManager.isSessionActive(aliceAddr));

        vm.prank(mockPoolManager);
        (bytes4 selector,,) = hook.beforeSwap(aliceAddr, key, params, hookData);
        assertTrue(selector == IHooks.beforeSwap.selector);
    }

    // ============ 未验证用户测试 ============

    function test_E2E_UnverifiedUserBlocked() public {
        assertFalse(sessionManager.isSessionActive(bob));

        bytes memory hookData = "";
        vm.prank(mockPoolManager);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, bob));
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(bob, key, params, hookData);
    }

    // ============ 紧急暂停测试 ============

    function test_E2E_EmergencyPause() public {
        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, block.timestamp + 24 hours);

        vm.prank(governance);
        registry.setEmergencyPause(true);

        bytes memory hookData = "";

        vm.prank(mockPoolManager);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        PoolKey memory key5 = _createPoolKey();
        IPoolManager.SwapParams memory params5 = _createSwapParams();
        hook.beforeSwap(aliceAddr, key5, params5, hookData);

        vm.prank(governance);
        registry.setEmergencyPause(false);

        vm.prank(mockPoolManager);
        PoolKey memory key6 = _createPoolKey();
        IPoolManager.SwapParams memory params6 = _createSwapParams();
        (bytes4 selector6,,) = hook.beforeSwap(aliceAddr, key6, params6, hookData);
        assertTrue(selector6 == IHooks.beforeSwap.selector);
    }

}
