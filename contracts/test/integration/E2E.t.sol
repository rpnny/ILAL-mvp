// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/libraries/EIP712Verifier.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public router = makeAddr("router");

    uint256 public alicePrivateKey = 0xa11ce;
    address public aliceAddr;

    bytes32 public constant COINBASE_ID = keccak256("Coinbase");
    address public coinbaseAttester = makeAddr("coinbaseAttester");

    function setUp() public {
        aliceAddr = vm.addr(alicePrivateKey);
        vm.label(aliceAddr, "alice");

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

        // 赋予 verifier VERIFIER_ROLE
        vm.prank(governance);
        sessionManager.grantRole(sessionManager.VERIFIER_ROLE(), address(verifier));

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

    // ============ 完整用户流程测试 ============

    function test_E2E_CompleteUserJourney() public {
        console.log("========================================");
        console.log("ILAL 端到端测试: 完整用户流程");
        console.log("========================================");

        // === 步骤 1: 用户验证身份 ===
        console.log("\n1. Alice 验证身份...");

        // Alice 生成 ZK Proof 并验证
        bytes memory proof = "mock_proof";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = uint256(uint160(aliceAddr));

        uint256 expiry = block.timestamp + 24 hours;

        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, expiry);

        assertTrue(sessionManager.isSessionActive(aliceAddr));
        console.log("   \u2713 Alice Session \u5df2\u6fc0\u6d3b");

        // === 步骤 2: 执行 Swap 交易 ===
        console.log("\n2. Alice \u6267\u884c Swap \u4ea4\u6613...");

        // 生成 EIP-712 签名
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(aliceAddr);

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            aliceAddr,
            deadline,
            nonce
        );

        // 编码 hookData
        bytes memory hookData = abi.encode(
            aliceAddr,
            deadline,
            nonce,
            signature
        );

        // 模拟通过 Router 执行 Swap
        vm.prank(router);
        bool allowed = hook.beforeSwap(router, hookData);

        assertTrue(allowed);
        console.log("   \u2713 Swap \u4ea4\u6613\u5141\u8bb8\u901a\u8fc7");

        // === 步骤 3: 添加流动性 ===
        console.log("\n3. Alice \u6dfb\u52a0\u6d41\u52a8\u6027...");

        // 重新生成签名（nonce 已增加）
        nonce = hook.getNonce(aliceAddr);
        signature = _signSwapPermit(alicePrivateKey, aliceAddr, deadline, nonce);
        hookData = abi.encode(aliceAddr, deadline, nonce, signature);

        vm.prank(router);
        allowed = hook.beforeAddLiquidity(router, hookData);

        assertTrue(allowed);
        console.log("   \u2713 \u6dfb\u52a0\u6d41\u52a8\u6027\u5141\u8bb8\u901a\u8fc7");

        // === 步骤 4: Session 过期 ===
        console.log("\n4. \u5feb\u8fdb\u5230 Session \u8fc7\u671f...");

        vm.warp(expiry + 1);

        assertFalse(sessionManager.isSessionActive(aliceAddr));
        console.log("   \u2713 Session \u5df2\u8fc7\u671f");

        // === 步骤 5: 过期后交易失败 ===
        console.log("\n5. Alice \u8fc7\u671f\u540e\u5c1d\u8bd5\u4ea4\u6613...");

        nonce = hook.getNonce(aliceAddr);
        signature = _signSwapPermit(alicePrivateKey, aliceAddr, deadline + 1 days, nonce);
        hookData = abi.encode(aliceAddr, deadline + 1 days, nonce, signature);

        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, aliceAddr));
        hook.beforeSwap(router, hookData);

        console.log("   \u2713 \u4ea4\u6613\u88ab\u62d2\u7edd\uff08\u9884\u671f\u884c\u4e3a\uff09");

        // === 步骤 6: 重新验证 ===
        console.log("\n6. Alice \u91cd\u65b0\u9a8c\u8bc1\u8eab\u4efd...");

        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, block.timestamp + 24 hours);

        assertTrue(sessionManager.isSessionActive(aliceAddr));
        console.log("   \u2713 Session \u5df2\u7eed\u671f");

        // === 步骤 7: 恢复交易 ===
        console.log("\n7. Alice \u6062\u590d\u4ea4\u6613...");

        nonce = hook.getNonce(aliceAddr);
        deadline = block.timestamp + 10 minutes;
        signature = _signSwapPermit(alicePrivateKey, aliceAddr, deadline, nonce);
        hookData = abi.encode(aliceAddr, deadline, nonce, signature);

        vm.prank(router);
        allowed = hook.beforeSwap(router, hookData);

        assertTrue(allowed);
        console.log("   \u2713 \u4ea4\u6613\u6210\u529f\u6062\u590d");

        console.log("\n========================================");
        console.log("\u2705 \u7aef\u5230\u7aef\u6d4b\u8bd5\u5168\u90e8\u901a\u8fc7!");
        console.log("========================================");
    }

    // ============ 未验证用户测试 ============

    function test_E2E_UnverifiedUserBlocked() public {
        console.log("\n\u6d4b\u8bd5: \u672a\u9a8c\u8bc1\u7528\u6237\u88ab\u963b\u6b62");

        // Bob 没有验证
        assertFalse(sessionManager.isSessionActive(bob));

        // Bob 尝试交易
        uint256 bobPrivateKey = 0xb0b;
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(bob);

        bytes memory signature = _signSwapPermit(bobPrivateKey, bob, deadline, nonce);
        bytes memory hookData = abi.encode(bob, deadline, nonce, signature);

        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(ComplianceHook.NotVerified.selector, bob));
        hook.beforeSwap(router, hookData);

        console.log("\u2713 \u672a\u9a8c\u8bc1\u7528\u6237\u88ab\u6b63\u786e\u963b\u6b62");
    }

    // ============ 紧急暂停测试 ============

    function test_E2E_EmergencyPause() public {
        console.log("\n\u6d4b\u8bd5: \u7d27\u6025\u6682\u505c\u673a\u5236");

        // Alice 验证并激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(aliceAddr, block.timestamp + 24 hours);

        // 治理触发紧急暂停
        vm.prank(governance);
        registry.setEmergencyPause(true);

        console.log("\u2713 \u7d27\u6025\u6682\u505c\u5df2\u89e6\u53d1");

        // Alice 尝试交易应该失败
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(aliceAddr);
        bytes memory signature = _signSwapPermit(alicePrivateKey, aliceAddr, deadline, nonce);
        bytes memory hookData = abi.encode(aliceAddr, deadline, nonce, signature);

        vm.prank(router);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        hook.beforeSwap(router, hookData);

        console.log("\u2713 \u6682\u505c\u671f\u95f4\u4ea4\u6613\u88ab\u963b\u6b62");

        // 解除暂停
        vm.prank(governance);
        registry.setEmergencyPause(false);

        // 现在应该可以交易
        vm.prank(router);
        bool allowed = hook.beforeSwap(router, hookData);
        assertTrue(allowed);

        console.log("\u2713 \u89e3\u9664\u6682\u505c\u540e\u4ea4\u6613\u6062\u590d");
    }

    // ============ 辅助函数 ============

    function _signSwapPermit(
        uint256 privateKey,
        address user,
        uint256 deadline,
        uint256 nonce
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                hook.SWAP_PERMIT_TYPEHASH(),
                user,
                deadline,
                nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                hook.getDomainSeparator(),
                structHash
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
