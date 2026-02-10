// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/Registry.sol";
import "../../src/core/MockVerifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract SessionManagerTest is Test {
    SessionManager public sessionManager;
    Registry public registry;
    MockVerifier public verifier;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

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
    }

    // ============ 初始化测试 ============

    function test_Initialize() public view {
        assertEq(address(sessionManager.registry()), address(registry));
        assertTrue(sessionManager.hasRole(sessionManager.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ============ 会话管理测试 ============

    function test_StartSession() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        assertTrue(sessionManager.isSessionActive(alice));
        assertEq(sessionManager.sessionExpiry(alice), expiry);
    }

    function test_StartSession_Event() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.expectEmit(true, true, true, true);
        emit ISessionManager.SessionStarted(alice, expiry);

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);
    }

    function testFail_StartSession_NotVerifier() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(alice);
        sessionManager.startSession(alice, expiry);
    }

    function testFail_StartSession_InvalidExpiry() public {
        uint256 expiry = block.timestamp - 1 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);
    }

    function test_IsSessionActive_NotActive() public view {
        assertFalse(sessionManager.isSessionActive(bob));
    }

    function test_IsSessionActive_Expired() public {
        uint256 expiry = block.timestamp + 1 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        // 快进到过期后
        vm.warp(expiry + 1);

        assertFalse(sessionManager.isSessionActive(alice));
    }

    function test_EndSession() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        vm.prank(admin);
        sessionManager.endSession(alice);

        assertFalse(sessionManager.isSessionActive(alice));
    }

    function testFail_EndSession_NotActive() public {
        vm.prank(admin);
        sessionManager.endSession(alice);
    }

    function test_EndSessionBatch() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.startPrank(address(verifier));
        sessionManager.startSession(alice, expiry);
        sessionManager.startSession(bob, expiry);
        vm.stopPrank();

        address[] memory users = new address[](2);
        users[0] = alice;
        users[1] = bob;

        vm.prank(admin);
        sessionManager.endSessionBatch(users);

        assertFalse(sessionManager.isSessionActive(alice));
        assertFalse(sessionManager.isSessionActive(bob));
    }

    // ============ 工具函数测试 ============

    function test_BatchIsSessionActive() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        address[] memory users = new address[](2);
        users[0] = alice;
        users[1] = bob;

        bool[] memory statuses = sessionManager.batchIsSessionActive(users);

        assertTrue(statuses[0]);
        assertFalse(statuses[1]);
    }

    function test_GetRemainingTime() public {
        uint256 expiry = block.timestamp + 10 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        uint256 remaining = sessionManager.getRemainingTime(alice);
        assertEq(remaining, 10 hours);

        // 快进 5 小时
        vm.warp(block.timestamp + 5 hours);

        remaining = sessionManager.getRemainingTime(alice);
        assertEq(remaining, 5 hours);
    }

    function test_GetRemainingTime_Expired() public {
        uint256 expiry = block.timestamp + 1 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        vm.warp(expiry + 1);

        uint256 remaining = sessionManager.getRemainingTime(alice);
        assertEq(remaining, 0);
    }

    // ============ Gas 优化测试 ============

    function test_IsSessionActive_Gas() public {
        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        uint256 gasBefore = gasleft();
        sessionManager.isSessionActive(alice);
        uint256 gasUsed = gasBefore - gasleft();

        // 确保 Session 检查低于 5000 gas
        assertLt(gasUsed, 5000, "Session check too expensive");
    }

    // ============ 升级测试 ============

    function test_UpgradeToNewImplementation() public {
        SessionManager newImpl = new SessionManager();

        vm.prank(admin);
        sessionManager.upgradeToAndCall(address(newImpl), "");

        assertEq(address(sessionManager.registry()), address(registry));
    }
}
