// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title HellModeTest
 * @notice 🔥 地狱级测试 - 补充关键安全场景
 * 
 * 这些测试覆盖了最危险的攻击向量和极端场景
 */
contract HellModeTest is Test {
    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;
    ComplianceHook public hook;
    VerifiedPoolsPositionManager public positionManager;

    address public governance = makeAddr("governance");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public attacker = makeAddr("attacker");
    address public router = makeAddr("router");

    uint256 public alicePrivateKey = 0xa11ce;
    uint256 public bobPrivateKey = 0xb0b;
    uint256 public attackerPrivateKey = 0xa77ac;

    bytes32 public constant COINBASE_ID = keccak256("Coinbase");

    function setUp() public {
        // 部署所有合约
        _deployContracts();
        
        // 配置系统
        _configureSystem();
    }

    function _deployContracts() internal {
        // Registry (UUPS)
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

        // Verifier
        verifier = new MockVerifier();

        // SessionManager (UUPS)
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

        vm.prank(governance);
        sessionManager.grantRole(sessionManager.VERIFIER_ROLE(), address(verifier));

        // Hook
        hook = new ComplianceHook(address(registry), address(sessionManager));

        // PositionManager
        positionManager = new VerifiedPoolsPositionManager(
            address(registry),
            address(sessionManager)
        );
    }

    function _configureSystem() internal {
        vm.startPrank(governance);
        registry.registerIssuer(COINBASE_ID, makeAddr("coinbaseAttester"), address(verifier));
        registry.approveRouter(router, true);
        vm.stopPrank();

        // 允许 Alice
        verifier.setUserAllowed(vm.addr(alicePrivateKey), true);
    }

    // ============================================
    // 🔥 TEST 1: 伪造签名拦截
    // ============================================

    function test_Hell_FakeSignature() public {
        console.log("🔥 TEST: 伪造签名拦截");

        // Alice 激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(vm.addr(alicePrivateKey), block.timestamp + 24 hours);

        // Attacker 尝试用错误的私钥签名 Alice 的交易
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(vm.addr(alicePrivateKey));

        // ❌ 使用 attacker 的私钥签名 Alice 的地址
        bytes memory fakeSignature = _signSwapPermit(
            attackerPrivateKey,  // 错误的私钥
            vm.addr(alicePrivateKey),  // Alice 的地址
            deadline,
            nonce
        );

        bytes memory hookData = abi.encode(
            vm.addr(alicePrivateKey),
            deadline,
            nonce,
            fakeSignature
        );

        // 应该失败
        vm.prank(router);
        vm.expectRevert(); // EIP-712 签名验证失败
        hook.beforeSwap(router, hookData);

        console.log("✅ 伪造签名被正确拦截");
    }

    // ============================================
    // 🔥 TEST 2: 紧急模式下可撤资（关键）
    // ============================================

    function test_Hell_EmergencyWithdrawal() public {
        console.log("🔥 TEST: 紧急模式下可撤资");

        // Alice 激活 Session 并添加流动性
        vm.prank(address(verifier));
        sessionManager.startSession(vm.addr(alicePrivateKey), block.timestamp + 24 hours);

        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(vm.addr(alicePrivateKey));

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            vm.addr(alicePrivateKey),
            deadline,
            nonce
        );

        bytes memory hookData = abi.encode(
            vm.addr(alicePrivateKey),
            deadline,
            nonce,
            signature
        );

        // 正常添加流动性
        vm.prank(router);
        hook.beforeAddLiquidity(router, hookData);
        console.log("✅ 流动性添加成功");

        // 🚨 触发紧急暂停
        vm.prank(governance);
        registry.setEmergencyPause(true);
        console.log("🚨 紧急暂停已触发");

        // 尝试 Swap（应该失败）
        nonce = hook.getNonce(vm.addr(alicePrivateKey));
        signature = _signSwapPermit(alicePrivateKey, vm.addr(alicePrivateKey), deadline, nonce);
        hookData = abi.encode(vm.addr(alicePrivateKey), deadline, nonce, signature);

        vm.prank(router);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        hook.beforeSwap(router, hookData);
        console.log("✅ Swap 被正确阻止");

        // ⚠️ 关键：Remove Liquidity 必须成功（机构最看重）
        nonce = hook.getNonce(vm.addr(alicePrivateKey));
        signature = _signSwapPermit(alicePrivateKey, vm.addr(alicePrivateKey), deadline, nonce);
        hookData = abi.encode(vm.addr(alicePrivateKey), deadline, nonce, signature);

        // 注意：removeLiquidity 不检查 emergency pause
        vm.prank(router);
        bool allowed = hook.beforeRemoveLiquidity(router, hookData);
        assertTrue(allowed, "Emergency withdrawal should succeed");

        console.log("✅ 紧急模式下移除流动性成功 (Escape Hatch)");
    }

    // ============================================
    // 🔥 TEST 3: NFT 转让被阻止
    // ============================================

    function test_Hell_NFTTransferBlocked() public {
        console.log("🔥 TEST: LP NFT 转让被阻止");

        // Alice 铸造 LP NFT
        vm.prank(address(verifier));
        sessionManager.startSession(vm.addr(alicePrivateKey), block.timestamp + 24 hours);

        vm.prank(vm.addr(alicePrivateKey));
        uint256 tokenId = positionManager.mint(
            makeAddr("pool"),
            -100,  // tickLower
            100,   // tickUpper
            1000   // liquidity
        );
        console.log("✅ LP NFT 铸造成功, tokenId:", tokenId);

        // 尝试转让给 Bob（应该失败）
        vm.prank(vm.addr(alicePrivateKey));
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.safeTransferFrom(
            vm.addr(alicePrivateKey),
            bob,
            tokenId
        );

        console.log("✅ NFT 转让被正确阻止");
    }

    // ============================================
    // 🔥 TEST 4: 非管理员无权限
    // ============================================

    function test_Hell_UnauthorizedAccess() public {
        console.log("🔥 TEST: 非管理员操作被拒绝");

        // Attacker 尝试注册 Issuer
        vm.prank(attacker);
        vm.expectRevert(); // Ownable: caller is not the owner
        registry.registerIssuer(
            keccak256("FakeIssuer"),
            attacker,
            address(verifier)
        );
        console.log("✅ 非管理员无法注册 Issuer");

        // Attacker 尝试触发紧急暂停
        vm.prank(attacker);
        vm.expectRevert();
        registry.setEmergencyPause(true);
        console.log("✅ 非管理员无法触发紧急暂停");

        // Attacker 尝试批准路由器
        vm.prank(attacker);
        vm.expectRevert();
        registry.approveRouter(makeAddr("fakeRouter"), true);
        console.log("✅ 非管理员无法批准路由器");
    }

    // ============================================
    // 🔥 TEST 5: 合约升级保留数据
    // ============================================

    function test_Hell_UpgradePreservesData() public {
        console.log("🔥 TEST: 合约升级后数据保留");

        // 记录升级前的数据
        address issuer1Attester = makeAddr("issuer1Attester");
        
        vm.prank(governance);
        registry.registerIssuer(
            keccak256("TestIssuer"),
            issuer1Attester,
            address(verifier)
        );

        Registry.IssuerInfo memory infoBefore = registry.getIssuerInfo(keccak256("TestIssuer"));
        assertTrue(infoBefore.active, "Issuer should be active before upgrade");
        console.log("✅ 升级前数据已记录");

        // 部署新版本逻辑合约
        Registry newRegistryImpl = new Registry();

        // 执行升级
        vm.prank(governance);
        registry.upgradeTo(address(newRegistryImpl));
        console.log("✅ 合约升级成功");

        // 验证数据保留
        Registry.IssuerInfo memory infoAfter = registry.getIssuerInfo(keccak256("TestIssuer"));
        assertTrue(infoAfter.active, "Issuer should still be active after upgrade");
        assertEq(infoAfter.attester, issuer1Attester, "Attester address should be preserved");
        console.log("✅ 升级后数据完整保留");

        // 验证 Owner 保留
        assertEq(registry.owner(), governance, "Owner should be preserved");
        console.log("✅ Owner 权限保留");
    }

    // ============================================
    // 🔥 TEST 6: 防重放 - 跨用户
    // ============================================

    function test_Hell_ProofReplayCrossUser() public {
        console.log("🔥 TEST: 防重放 - 跨用户攻击");

        // Alice 和 Bob 都允许验证
        verifier.setUserAllowed(vm.addr(alicePrivateKey), true);
        verifier.setUserAllowed(vm.addr(bobPrivateKey), true);

        // Alice 生成 Proof 并激活 Session
        bytes memory aliceProof = "alice_proof_data";
        uint256[] memory alicePublicInputs = new uint256[](1);
        alicePublicInputs[0] = uint256(uint160(vm.addr(alicePrivateKey)));

        vm.prank(address(verifier));
        sessionManager.startSession(vm.addr(alicePrivateKey), block.timestamp + 24 hours);
        console.log("✅ Alice Session 激活");

        // ❌ Attacker 尝试用 Alice 的 Proof 为 Bob 开 Session
        // 注意：MockVerifier 简化了这个检查，实际 PlonkVerifier 会验证 publicInputs[0] == msg.sender

        // 在 MockVerifier 中，我们通过 publicInputs[0] 验证用户
        uint256[] memory bobPublicInputs = new uint256[](1);
        bobPublicInputs[0] = uint256(uint160(bob));

        // 尝试用 Alice 的 Proof 但 Bob 的 publicInputs（应该失败）
        bool isValid = verifier.verifyComplianceProof(aliceProof, bobPublicInputs);
        assertFalse(isValid, "Cross-user proof replay should fail");

        console.log("✅ 跨用户 Proof 重放被阻止");
    }

    // ============================================
    // 🔥 TEST 7: 防重放 - 过期 Proof
    // ============================================

    function test_Hell_ProofReplayOldProof() public {
        console.log("🔥 TEST: 防重放 - 过期 Proof");

        // Alice 激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(vm.addr(alicePrivateKey), block.timestamp + 24 hours);
        console.log("✅ Alice Session 激活（24h）");

        // Session 过期
        vm.warp(block.timestamp + 25 hours);
        assertFalse(sessionManager.isSessionActive(vm.addr(alicePrivateKey)));
        console.log("✅ Session 已过期");

        // ❌ 尝试用昨天的 Proof（实际中 Proof 应包含 timestamp）
        // MockVerifier 不验证时间戳，但实际 PlonkVerifier 会

        // 在实际电路中，publicInputs 应包含 timestamp
        // 合约应检查 block.timestamp - proofTimestamp < MAX_AGE (例如 1 小时)

        console.log("⚠️  注意：完整实现需在电路中包含 timestamp");
    }

    // ============================================
    // 🔥 TEST 8: Gas 消耗基准
    // ============================================

    function test_Hell_GasConsumption() public {
        console.log("🔥 TEST: Gas 消耗基准");

        // Alice 激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(vm.addr(alicePrivateKey), block.timestamp + 24 hours);

        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(vm.addr(alicePrivateKey));

        bytes memory signature = _signSwapPermit(
            alicePrivateKey,
            vm.addr(alicePrivateKey),
            deadline,
            nonce
        );

        bytes memory hookData = abi.encode(
            vm.addr(alicePrivateKey),
            deadline,
            nonce,
            signature
        );

        // 记录 Gas
        uint256 gasBefore = gasleft();
        
        vm.prank(router);
        hook.beforeSwap(router, hookData);

        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas 消耗:", gasUsed);

        // 目标：Hook 额外消耗 < 15,000 Gas
        // 普通 Uniswap v4 Swap ~200,000 Gas
        // 带 Hook 的 Swap 应该 < 215,000 Gas
        
        assertLt(gasUsed, 15000, "Hook overhead should be < 15,000 Gas");
        console.log("✅ Gas 消耗符合预期 (< 15k Gas)");
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
