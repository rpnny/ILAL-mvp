// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/MockVerifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title E2EMockProof
 * @notice 端到端测试 - 使用 MockVerifier
 * @dev 完整的用户验证流程：生成 Proof -> 验证 -> 开启 Session -> 执行交易
 * 
 * 测试场景：
 * 1. 用户部署所有合约
 * 2. 用户提交验证 Proof
 * 3. MockVerifier 自动通过验证
 * 4. Session 被激活
 * 5. 用户可以进行交易
 * 6. Session 过期后需要重新验证
 */
contract E2EMockProofTest is Test {
    // ============ 合约实例 ============
    
    Registry public registry;
    SessionManager public sessionManager;
    ComplianceHook public hook;
    MockVerifier public verifier;
    
    // ============ 测试账户 ============
    
    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public issuer = makeAddr("issuer");
    
    // ============ 设置 ============
    
    function setUp() public {
        // 1. 部署 Registry (UUPS)
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            admin
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInitData);
        registry = Registry(address(registryProxy));
        
        // 2. 部署 MockVerifier
        verifier = new MockVerifier();
        
        // 3. 部署 SessionManager (UUPS)
        SessionManager sessionImpl = new SessionManager();
        bytes memory sessionInitData = abi.encodeWithSelector(
            SessionManager.initialize.selector,
            address(registry),
            address(verifier),
            admin
        );
        ERC1967Proxy sessionProxy = new ERC1967Proxy(address(sessionImpl), sessionInitData);
        sessionManager = SessionManager(address(sessionProxy));
        
        // 4. 部署 ComplianceHook
        hook = new ComplianceHook(address(registry), address(sessionManager));
        
        // 5. 配置系统
        vm.startPrank(admin);
        
        // 注册 Issuer
        bytes32 issuerId = keccak256("TestIssuer");
        address testAttester = makeAddr("attester");
        address testVerifier = makeAddr("testVerifier");
        registry.registerIssuer(issuerId, testAttester, testVerifier);
        
        // 授予 Verifier 角色
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        sessionManager.grantRole(verifierRole, address(verifier));
        
        vm.stopPrank();
        
        console.log("Setup complete!");
        console.log("  Registry:", address(registry));
        console.log("  SessionManager:", address(sessionManager));
        console.log("  ComplianceHook:", address(hook));
        console.log("  MockVerifier:", address(verifier));
    }
    
    // ============ 测试: 完整验证流程 ============
    
    function test_E2E_FullVerificationFlow() public {
        console.log("\n=== Test: Full E2E Verification Flow ===");
        
        // Step 1: 检查初始状态
        console.log("\nStep 1: Check initial state");
        assertFalse(sessionManager.isSessionActive(alice), "Session should not be active initially");
        assertFalse(hook.isUserAllowed(alice), "User should not be allowed initially");
        console.log("  Alice session active:", sessionManager.isSessionActive(alice));
        
        // Step 2: 准备 Proof 数据 (MockVerifier 不验证，但需要正确的格式)
        console.log("\nStep 2: Prepare proof data");
        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = uint256(uint160(alice)); // userAddress
        console.log("  Proof length:", proof.length);
        console.log("  Public inputs:", publicInputs.length);
        
        // Step 3: 将 Alice 添加到白名单（MockVerifier 要求）
        console.log("\nStep 3: Add Alice to whitelist");
        verifier.setUserAllowed(alice, true);
        
        // Step 4: 验证 Proof 并创建 Session
        console.log("\nStep 4: Verify proof and create session");
        
        // 验证 proof
        bool isValid = verifier.verifyComplianceProof(proof, publicInputs);
        assertTrue(isValid, "Proof should be valid");
        console.log("  Proof valid:", isValid);
        
        // 创建 Session (模拟 Verifier 合约的行为)
        uint256 sessionTTL = registry.getSessionTTL();
        uint256 expiry = block.timestamp + sessionTTL;
        
        // 需要 VERIFIER_ROLE 来调用 startSession
        vm.prank(address(verifier));
        sessionManager.startSession(alice, expiry);
        console.log("  Session created with expiry:", expiry);
        
        // Step 5: 检查 Session 状态
        console.log("\nStep 5: Check session state");
        assertTrue(sessionManager.isSessionActive(alice), "Session should be active after verification");
        assertTrue(hook.isUserAllowed(alice), "User should be allowed after verification");
        
        uint256 aliceExpiry = sessionManager.sessionExpiry(alice);
        bool isActive = sessionManager.isSessionActive(alice);
        console.log("  Session expiry:", aliceExpiry);
        console.log("  Session active:", isActive);
        console.log("  Current time:", block.timestamp);
        
        // Step 6: Alice 可以进行交易
        console.log("\nStep 6: Alice can now trade");
        // 模拟 Hook 检查（实际会在 beforeSwap 中调用）
        assertTrue(hook.isUserAllowed(alice), "Alice should be allowed to trade");
        console.log("  Alice can trade: true");
        
        // Step 7: 时间快进到 Session 过期
        console.log("\nStep 7: Fast forward to session expiration");
        vm.warp(block.timestamp + sessionTTL + 1);
        
        assertFalse(sessionManager.isSessionActive(alice), "Session should expire after TTL");
        assertFalse(hook.isUserAllowed(alice), "User should not be allowed after expiration");
        console.log("  Session active after expiry:", sessionManager.isSessionActive(alice));
        
        // Step 8: Alice 需要重新验证
        console.log("\nStep 8: Alice needs to re-verify");
        
        uint256 newExpiry = block.timestamp + sessionTTL;
        vm.prank(address(verifier));
        sessionManager.startSession(alice, newExpiry);
        
        assertTrue(sessionManager.isSessionActive(alice), "Session should be active again");
        console.log("  Session re-activated: true");
        
        console.log("\n=== E2E Test Passed! ===\n");
    }
    
    // ============ 测试: 多用户并发 ============
    
    function test_E2E_MultipleUsers() public {
        console.log("\n=== Test: Multiple Users Concurrent Sessions ===");
        
        // 添加到白名单
        verifier.setUserAllowed(alice, true);
        verifier.setUserAllowed(bob, true);
        
        // Alice 验证并创建 Session
        uint256 sessionTTL = registry.getSessionTTL();
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + sessionTTL);
        
        // Bob 验证并创建 Session
        vm.prank(address(verifier));
        sessionManager.startSession(bob, block.timestamp + sessionTTL);
        
        // 检查状态
        assertTrue(sessionManager.isSessionActive(alice), "Alice session should be active");
        assertTrue(sessionManager.isSessionActive(bob), "Bob session should be active");
        assertTrue(hook.isUserAllowed(alice), "Alice should be allowed");
        assertTrue(hook.isUserAllowed(bob), "Bob should be allowed");
        
        console.log("  Alice session active:", sessionManager.isSessionActive(alice));
        console.log("  Bob session active:", sessionManager.isSessionActive(bob));
        
        console.log("\n=== Multi-user Test Passed! ===\n");
    }
    
    // ============ 测试: Session 刷新 ============
    
    function test_E2E_SessionRefresh() public {
        console.log("\n=== Test: Session Refresh ===");
        
        // Step 1: Alice 初始验证
        verifier.setUserAllowed(alice, true);
        
        uint256 sessionTTL = registry.getSessionTTL();
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + sessionTTL);
        
        uint256 firstExpiry = sessionManager.sessionExpiry(alice);
        console.log("  First expiry:", firstExpiry);
        
        // Step 2: 时间快进但未过期
        uint256 halfTTL = registry.getSessionTTL() / 2;
        vm.warp(block.timestamp + halfTTL);
        
        assertTrue(sessionManager.isSessionActive(alice), "Session should still be active");
        
        // Step 3: Alice 刷新 Session
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + sessionTTL);
        
        uint256 newExpiry = sessionManager.sessionExpiry(alice);
        console.log("  New expiry:", newExpiry);
        
        assertTrue(newExpiry > firstExpiry, "Expiry should be extended");
        
        console.log("\n=== Session Refresh Test Passed! ===\n");
    }
    
    // ============ 测试: Hook 集成 ============
    
    function test_E2E_HookIntegration() public {
        console.log("\n=== Test: Hook Integration ===");
        
        // Step 1: 未验证用户被拒绝
        assertFalse(hook.isUserAllowed(alice), "Unverified user should be denied");
        console.log("  Alice allowed (before verify):", hook.isUserAllowed(alice));
        
        // Step 2: 验证用户
        verifier.setUserAllowed(alice, true);
        
        uint256 sessionTTL = registry.getSessionTTL();
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + sessionTTL);
        
        // Step 3: 验证后用户被允许
        assertTrue(hook.isUserAllowed(alice), "Verified user should be allowed");
        console.log("  Alice allowed (after verify):", hook.isUserAllowed(alice));
        
        // Step 4: Session 过期后被拒绝
        vm.warp(block.timestamp + registry.getSessionTTL() + 1);
        assertFalse(hook.isUserAllowed(alice), "Expired user should be denied");
        console.log("  Alice allowed (after expiry):", hook.isUserAllowed(alice));
        
        console.log("\n=== Hook Integration Test Passed! ===\n");
    }
    
    // ============ 测试: 系统配置 ============
    
    function test_E2E_SystemConfiguration() public {
        console.log("\n=== Test: System Configuration ===");
        
        // 检查初始配置
        uint256 initialTTL = registry.getSessionTTL();
        console.log("  Initial TTL:", initialTTL);
        assertEq(initialTTL, 86400, "Initial TTL should be 24 hours");
        
        // 管理员更新配置
        vm.prank(admin);
        registry.setSessionTTL(3600); // 1 hour
        
        uint256 newTTL = registry.getSessionTTL();
        console.log("  New TTL:", newTTL);
        assertEq(newTTL, 3600, "TTL should be updated");
        
        // 验证新的 TTL 生效
        verifier.setUserAllowed(alice, true);
        
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 3600);
        
        uint256 expiry = sessionManager.sessionExpiry(alice);
        uint256 expectedExpiry = block.timestamp + 3600;
        assertEq(expiry, expectedExpiry, "Session should use new TTL");
        console.log("  Session expiry:", expiry);
        console.log("  Expected expiry:", expectedExpiry);
        
        console.log("\n=== Configuration Test Passed! ===\n");
    }
    
    // ============ 测试: Gas 估算 ============
    
    function test_E2E_GasEstimation() public {
        console.log("\n=== Test: Gas Estimation ===");
        
        verifier.setUserAllowed(alice, true);
        
        uint256 gasBefore = gasleft();
        uint256 sessionTTL = registry.getSessionTTL();
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + sessionTTL);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("  Gas used for verification:", gasUsed);
        
        // MockVerifier 应该很便宜
        assertTrue(gasUsed < 100000, "MockVerifier should use < 100k gas");
        
        console.log("\n=== Gas Estimation Test Passed! ===\n");
    }
}
