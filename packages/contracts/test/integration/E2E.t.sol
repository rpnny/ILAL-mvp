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

        // 部署 Hook
        hook = new ComplianceHook(address(registry), address(sessionManager));
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
        // === 步骤 1: 用户验证身份 ===
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, expiry);

        assertTrue(sessionManager.isSessionActive(aliceAddr));

        // === 步骤 2: 执行 Swap 交易 ===
        bytes memory hookData = abi.encodePacked(aliceAddr);
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();

        vm.prank(router);
        (bytes4 selector,,) = hook.beforeSwap(router, key, params, hookData);
        assertTrue(selector == IHooks.beforeSwap.selector);

        // === 步骤 3: 添加流动性 ===
        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        
        vm.prank(router);
        bytes4 selectorLiq = hook.beforeAddLiquidity(router, key, modParams, hookData);
        assertTrue(selectorLiq == IHooks.beforeAddLiquidity.selector);

        // === 步骤 4: Session 过期 ===
        vm.warp(expiry + 1);
        assertFalse(sessionManager.isSessionActive(aliceAddr));

        // === 步骤 5: 过期后交易失败 ===
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, aliceAddr));
        hook.beforeSwap(router, key, params, hookData);

        // === 步骤 6: 重新验证 ===
        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, expiry + 48 hours);
        assertTrue(sessionManager.isSessionActive(aliceAddr));

        // === 步骤 7: 恢复交易 ===
        vm.prank(router);
        (selector,,) = hook.beforeSwap(router, key, params, hookData);
        assertTrue(selector == IHooks.beforeSwap.selector);
    }

    // ============ 未验证用户测试 ============

    function test_E2E_UnverifiedUserBlocked() public {
        // console.log removed for compilation

        // Bob 没有验证
        assertFalse(sessionManager.isSessionActive(bob));

        // Bob 尝试交易 - 使用模式 3（仅地址模式）
        bytes memory hookData = abi.encodePacked(bob);

        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, bob));
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(router, key, params, hookData);

        // console.log removed for compilation
    }

    // ============ 紧急暂停测试 ============

    function test_E2E_EmergencyPause() public {
        // console.log removed for compilation

        // Alice 验证并激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, block.timestamp + 24 hours);

        // 治理触发紧急暂停
        vm.prank(governance);
        registry.setEmergencyPause(true);

        // console.log removed for compilation

        // 使用模式 3（仅地址模式）
        bytes memory hookData = abi.encodePacked(aliceAddr);

        // Alice 尝试交易应该失败
        vm.prank(router);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        PoolKey memory key5 = _createPoolKey();
        IPoolManager.SwapParams memory params5 = _createSwapParams();
        hook.beforeSwap(router, key5, params5, hookData);

        // console.log removed for compilation

        // 解除暂停
        vm.prank(governance);
        registry.setEmergencyPause(false);

        // 现在应该可以交易
        vm.prank(router);
        PoolKey memory key6 = _createPoolKey();
        IPoolManager.SwapParams memory params6 = _createSwapParams();
        (bytes4 selector6,,) = hook.beforeSwap(router, key6, params6, hookData);
        assertTrue(selector6 == IHooks.beforeSwap.selector);

        // console.log removed for compilation
    }

}
