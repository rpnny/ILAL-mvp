// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";

contract ComplianceHookTest is Test {
    ComplianceHook public hook;
    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public router = makeAddr("router");

    function setUp() public {
        // 部署 Registry
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            admin
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = Registry(address(registryProxy));

        // 部署 Verifier
        verifier = new MockVerifier();

        // 部署 SessionManager
        SessionManager sessionImpl = new SessionManager();
        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(verifier),
            admin
        );
        ERC1967Proxy sessionProxy = new ERC1967Proxy(
            address(sessionImpl),
            sessionInitData
        );
        sessionManager = SessionManager(address(sessionProxy));

        // 赋予 verifier VERIFIER_ROLE (先获取角色再 prank)
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        vm.prank(admin);
        sessionManager.grantRole(verifierRole, address(verifier));

        // 部署 Hook
        hook = new ComplianceHook(address(registry), address(sessionManager));

        // 批准路由器
        vm.prank(admin);
        registry.approveRouter(router, true);
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

    // ============ 交换测试 ============

    function test_BeforeSwap_Allowed() public {
        // 设置 Alice 的会话
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // 模拟交换
        bytes memory hookData = abi.encodePacked(alice);
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        (bytes4 selector,,) = hook.beforeSwap(router, key, params, hookData);

        assertTrue(selector == IHooks.beforeSwap.selector);
    }

    function test_RevertWhen_BeforeSwap_NotVerified() public {
        // Bob 没有会话，应该失败
        bytes memory hookData = abi.encodePacked(bob);
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, bob));
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(router, key, params, hookData);
    }

    function test_RevertWhen_BeforeSwap_EmergencyPaused() public {
        // 设置 Alice 的会话
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // 触发紧急暂停
        vm.prank(admin);
        registry.setEmergencyPause(true);

        // 应该失败
        bytes memory hookData = abi.encodePacked(alice);
        vm.prank(router);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(router, key, params, hookData);
    }

    function test_BeforeSwap_EOA() public {
        // Alice 直接调用 (不通过路由器)
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // 模拟 EOA 调用 (空 hookData)
        bytes memory hookData = "";
        vm.prank(alice);
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        (bytes4 selector,,) = hook.beforeSwap(alice, key, params, hookData);

        assertTrue(selector == IHooks.beforeSwap.selector);
    }

    // ============ 流动性测试 ============

    function test_BeforeAddLiquidity_Allowed() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = abi.encodePacked(alice);
        PoolKey memory key = _createPoolKey();
        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        bytes4 selector = hook.beforeAddLiquidity(router, key, modParams, hookData);

        assertTrue(selector == IHooks.beforeAddLiquidity.selector);
    }

    function test_RevertWhen_BeforeAddLiquidity_NotVerified() public {
        bytes memory hookData = abi.encodePacked(bob);
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, bob));
        PoolKey memory key = _createPoolKey();
        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        hook.beforeAddLiquidity(router, key, modParams, hookData);
    }

    function test_BeforeRemoveLiquidity_Allowed() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = abi.encodePacked(alice);
        PoolKey memory key = _createPoolKey();
        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        bytes4 selector = hook.beforeRemoveLiquidity(router, key, modParams, hookData);

        assertTrue(selector == IHooks.beforeRemoveLiquidity.selector);
    }

    function test_RevertWhen_BeforeRemoveLiquidity_NotVerified() public {
        bytes memory hookData = abi.encodePacked(bob);
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, bob));
        PoolKey memory key = _createPoolKey();
        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        hook.beforeRemoveLiquidity(router, key, modParams, hookData);
    }

    // ============ 用户解析测试 ============

    function test_RevertWhen_ResolveUser_UntrustedRouter() public {
        // 未批准的路由器传递 hookData 应该失败
        address untrustedRouter = makeAddr("untrustedRouter");

        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = abi.encodePacked(alice);
        vm.prank(untrustedRouter);
        vm.expectRevert(ComplianceHook.InvalidHookData.selector);
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(untrustedRouter, key, params, hookData);
    }

    // ============ 查询函数测试 ============

    function test_IsUserAllowed() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        assertTrue(hook.isUserAllowed(alice));
        assertFalse(hook.isUserAllowed(bob));
    }

    function test_BatchIsUserAllowed() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        address[] memory users = new address[](2);
        users[0] = alice;
        users[1] = bob;

        bool[] memory allowed = hook.batchIsUserAllowed(users);

        assertTrue(allowed[0]);
        assertFalse(allowed[1]);
    }

    // ============ 事件测试 ============

    function test_SwapAttempt_Event() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        vm.expectEmit(true, true, true, true);
        emit ComplianceHook.SwapAttempt(alice, true);

        bytes memory hookData = abi.encodePacked(alice);
        vm.prank(router);
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(router, key, params, hookData);
    }
}
