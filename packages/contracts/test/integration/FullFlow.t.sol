// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/MockVerifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title FullFlowTest
 * @notice 完整流程集成测试 - 验证从注册到交易的完整用户旅程
 */
contract FullFlowTest is Test {
    Registry public registry;
    SessionManager public sessionManager;
    ComplianceHook public hook;
    MockVerifier public verifier;

    address public governance;
    address public attester;
    address public alice;
    address public bob;
    address public router;

    uint256 public alicePrivateKey = 0xa11ce;
    uint256 public bobPrivateKey = 0xb0b;

    bytes32 public constant ISSUER_ID = keccak256("test-issuer");

    function setUp() public {
        governance = makeAddr("governance");
        attester = makeAddr("attester");
        router = makeAddr("router");
        alice = vm.addr(alicePrivateKey);
        bob = vm.addr(bobPrivateKey);

        vm.label(alice, "alice");
        vm.label(bob, "bob");

        // 部署合约
        _deployAllContracts();
        
        // 配置系统
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

        // 赋予 verifier VERIFIER_ROLE
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        vm.prank(governance);
        sessionManager.grantRole(verifierRole, address(verifier));

        // 部署 Hook
        hook = new ComplianceHook(address(registry), address(sessionManager));
    }

    function _configureSystem() internal {
        vm.startPrank(governance);

        // 注册 Issuer
        registry.registerIssuer(ISSUER_ID, attester, address(verifier));

        // 批准 Router
        registry.approveRouter(router, true);

        vm.stopPrank();
    }

    /**
     * @notice 测试完整的用户注册和验证流程
     */
    function test_FullFlow_UserRegistration() public {
        // 1. 白名单用户
        verifier.setUserAllowed(alice, true);

        // 2. 启动 Session (通过 verifier 启动，因为它有 VERIFIER_ROLE)
        uint256 expiry = block.timestamp + 24 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        // 3. 检查 Session 状态
        assertTrue(sessionManager.isSessionActive(alice), "Session should be active");
        assertEq(sessionManager.sessionExpiry(alice), expiry, "Expiry should match");
    }

    /**
     * @notice 测试多用户并发验证
     */
    function test_FullFlow_MultipleUsers() public {
        address[] memory users = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            users[i] = address(uint160(0x1000 + i));
            vm.label(users[i], string.concat("user", vm.toString(i)));
        }

        // 批量白名单
        verifier.setUsersAllowed(users, true);

        // 批量启动 Session (通过 verifier)
        uint256 expiry = block.timestamp + 24 hours;
        for (uint256 i = 0; i < users.length; i++) {
            vm.prank(address(verifier));
            sessionManager.startSession(users[i], expiry);
            assertTrue(sessionManager.isSessionActive(users[i]), "Session should be active");
        }
    }

    /**
     * @notice 测试 Session 过期处理
     */
    function test_FullFlow_SessionExpiry() public {
        // 设置用户
        verifier.setUserAllowed(alice, true);

        // 启动短期 Session
        uint256 expiry = block.timestamp + 1 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        assertTrue(sessionManager.isSessionActive(alice), "Session should be active");

        // 时间流逝
        vm.warp(block.timestamp + 2 hours);

        // Session 应该过期
        assertFalse(sessionManager.isSessionActive(alice), "Session should be expired");

        // 可以重新启动 Session
        uint256 newExpiry = block.timestamp + 24 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, newExpiry);

        assertTrue(sessionManager.isSessionActive(alice), "New session should be active");
    }

    /**
     * @notice 测试紧急暂停功能
     */
    function test_FullFlow_EmergencyPause() public {
        // 设置用户
        verifier.setUserAllowed(alice, true);
        verifier.setUserAllowed(bob, true);

        // 启动 Session
        uint256 expiry = block.timestamp + 24 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        // 触发紧急暂停
        vm.prank(governance);
        registry.setEmergencyPause(true);

        assertTrue(registry.emergencyPaused(), "Should be paused");

        // 解除暂停
        vm.prank(governance);
        registry.setEmergencyPause(false);

        assertFalse(registry.emergencyPaused(), "Should not be paused");

        // 现在可以启动 Session
        vm.prank(address(verifier));
        sessionManager.startSession(bob, expiry);
        assertTrue(sessionManager.isSessionActive(bob), "Bob's session should be active");
    }

    /**
     * @notice 测试 Issuer 撤销
     */
    function test_FullFlow_IssuerRevocation() public {
        // 验证用户
        verifier.setUserAllowed(alice, true);

        uint256 expiry = block.timestamp + 24 hours;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);

        assertTrue(sessionManager.isSessionActive(alice), "Alice's session should be active");

        // 撤销 Issuer
        vm.prank(governance);
        registry.revokeIssuer(ISSUER_ID);

        // 用户的 Session 仍然有效（已启动的不受影响）
        assertTrue(sessionManager.isSessionActive(alice), "Alice's session should still be active");
    }

    /**
     * @notice 测试 Gas 消耗
     */
    function test_FullFlow_GasConsumption() public {
        verifier.setUserAllowed(alice, true);

        // 测量启动 Session Gas
        uint256 expiry = block.timestamp + 24 hours;
        uint256 gasBefore = gasleft();
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);
        uint256 sessionGas = gasBefore - gasleft();

        // 记录 Gas 消耗
        emit log_named_uint("Start session gas", sessionGas);

        // 确保 Gas 在合理范围内
        assertLt(sessionGas, 150000, "Session gas too high");
    }

    /**
     * @notice 测试 Router 授权
     */
    function test_FullFlow_RouterAuthorization() public {
        address newRouter = makeAddr("newRouter");

        // 初始状态：未授权
        assertFalse(registry.isRouterApproved(newRouter), "Should not be approved initially");

        // 授权
        vm.prank(governance);
        registry.approveRouter(newRouter, true);

        assertTrue(registry.isRouterApproved(newRouter), "Should be approved");

        // 撤销授权
        vm.prank(governance);
        registry.approveRouter(newRouter, false);

        assertFalse(registry.isRouterApproved(newRouter), "Should not be approved after revocation");
    }

    /**
     * @notice 测试 Session TTL 配置
     */
    function test_FullFlow_SessionTTL() public {
        uint256 newTTL = 48 hours;

        // 更新 TTL
        vm.prank(governance);
        registry.setSessionTTL(newTTL);

        assertEq(registry.getSessionTTL(), newTTL, "TTL should be updated");
    }
}
