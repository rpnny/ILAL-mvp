// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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

        // 赋予 verifier VERIFIER_ROLE
        vm.prank(admin);
        sessionManager.grantRole(sessionManager.VERIFIER_ROLE(), address(verifier));

        // 部署 Hook
        hook = new ComplianceHook(address(registry), address(sessionManager));

        // 批准路由器
        vm.prank(admin);
        registry.approveRouter(router, true);
    }

    // ============ 交换测试 ============

    function test_BeforeSwap_Allowed() public {
        // 设置 Alice 的会话
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // 模拟交换
        bytes memory hookData = abi.encodePacked(alice);
        bool allowed = hook.beforeSwap(router, hookData);

        assertTrue(allowed);
    }

    function testFail_BeforeSwap_NotVerified() public {
        // Bob 没有会话，应该失败
        bytes memory hookData = abi.encodePacked(bob);
        hook.beforeSwap(router, hookData);
    }

    function testFail_BeforeSwap_EmergencyPaused() public {
        // 设置 Alice 的会话
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // 触发紧急暂停
        vm.prank(admin);
        registry.setEmergencyPause(true);

        // 应该失败
        bytes memory hookData = abi.encodePacked(alice);
        hook.beforeSwap(router, hookData);
    }

    function test_BeforeSwap_EOA() public {
        // Alice 直接调用 (不通过路由器)
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // 模拟 EOA 调用 (空 hookData)
        bytes memory hookData = "";
        vm.prank(alice);
        bool allowed = hook.beforeSwap(alice, hookData);

        assertTrue(allowed);
    }

    // ============ 流动性测试 ============

    function test_BeforeAddLiquidity_Allowed() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = abi.encodePacked(alice);
        bool allowed = hook.beforeAddLiquidity(router, hookData);

        assertTrue(allowed);
    }

    function testFail_BeforeAddLiquidity_NotVerified() public {
        bytes memory hookData = abi.encodePacked(bob);
        hook.beforeAddLiquidity(router, hookData);
    }

    function test_BeforeRemoveLiquidity_Allowed() public {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = abi.encodePacked(alice);
        bool allowed = hook.beforeRemoveLiquidity(router, hookData);

        assertTrue(allowed);
    }

    function testFail_BeforeRemoveLiquidity_NotVerified() public {
        bytes memory hookData = abi.encodePacked(bob);
        hook.beforeRemoveLiquidity(router, hookData);
    }

    // ============ 用户解析测试 ============

    function testFail_ResolveUser_UntrustedRouter() public {
        // 未批准的路由器传递 hookData 应该失败
        address untrustedRouter = makeAddr("untrustedRouter");

        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = abi.encodePacked(alice);
        hook.beforeSwap(untrustedRouter, hookData);
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
        hook.beforeSwap(router, hookData);
    }
}
