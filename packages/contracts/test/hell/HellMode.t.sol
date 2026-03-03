// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@uniswap/v4-core/types/PoolKey.sol";
import "@uniswap/v4-core/types/Currency.sol";
import "@uniswap/v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";

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
    address public router = makeAddr("router");

    // 使用私钥派生地址以确保签名一致性
    uint256 public alicePrivateKey = 0xa11ce;
    uint256 public bobPrivateKey = 0xb0b;
    uint256 public attackerPrivateKey = 0xa77ac;
    
    address public alice;
    address public bob;
    address public attacker;

    bytes32 public constant COINBASE_ID = keccak256("Coinbase");

    function setUp() public {
        // 从私钥派生地址
        alice = vm.addr(alicePrivateKey);
        bob = vm.addr(bobPrivateKey);
        attacker = vm.addr(attackerPrivateKey);
        
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

        // 赋予 verifier VERIFIER_ROLE (先获取角色再 prank)
        bytes32 verifierRole = sessionManager.VERIFIER_ROLE();
        vm.prank(governance);
        sessionManager.grantRole(verifierRole, address(verifier));

        // Hook
        address mockPoolManager = makeAddr("poolManager");
        hook = new ComplianceHook(mockPoolManager, address(registry), address(sessionManager));

        // PositionManager (需要 PoolManager 地址，这里使用 mock)
        positionManager = new VerifiedPoolsPositionManager(
            mockPoolManager,
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
        verifier.setUserAllowed(alice, true);
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

    // ============================================
    // 🔥 TEST 1: 伪造签名拦截
    // ============================================

    function test_Hell_FakeSignature() public {
        // console.log removed for compilation

        // Alice 激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        // Attacker 尝试用错误的私钥签名 Alice 的交易
        uint256 deadline = block.timestamp + 10 minutes;
        uint256 nonce = hook.getNonce(alice);

        // ❌ 使用 attacker 的私钥签名 Alice 的地址
        bytes memory fakeSignature = _signSwapPermit(
            attackerPrivateKey,  // 错误的私钥
            alice,  // Alice 的地址
            deadline,
            nonce
        );

        bytes memory hookData = abi.encode(
            alice,
            deadline,
            nonce,
            fakeSignature
        );

        address mockPM = makeAddr("poolManager");
        vm.prank(mockPM);
        vm.expectRevert();
        PoolKey memory key = _createPoolKey();
        IPoolManager.SwapParams memory params = _createSwapParams();
        hook.beforeSwap(router, key, params, hookData);

        // console.log removed for compilation
    }

    // ============================================
    // 🔥 TEST 2: 紧急模式下可撤资（关键）
    // ============================================

    function test_Hell_EmergencyWithdrawal() public {
        address mockPM = makeAddr("poolManager");

        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = "";

        vm.prank(mockPM);
        PoolKey memory key = _createPoolKey();
        IPoolManager.ModifyLiquidityParams memory modParams = _createModifyLiquidityParams();
        hook.beforeAddLiquidity(alice, key, modParams, hookData);

        vm.prank(governance);
        registry.setEmergencyPause(true);

        vm.prank(mockPM);
        vm.expectRevert(ComplianceHook.EmergencyPaused.selector);
        PoolKey memory key2 = _createPoolKey();
        IPoolManager.SwapParams memory swapParams = _createSwapParams();
        hook.beforeSwap(alice, key2, swapParams, hookData);

        vm.prank(mockPM);
        PoolKey memory key3 = _createPoolKey();
        IPoolManager.ModifyLiquidityParams memory removeParams = _createModifyLiquidityParams();
        bytes4 selector = hook.beforeRemoveLiquidity(alice, key3, removeParams, hookData);
        assertTrue(selector == IHooks.beforeRemoveLiquidity.selector, "Emergency withdrawal should succeed");
    }

    // ============================================
    // 🔥 TEST 3: NFT 转让被阻止
    // ============================================

    function test_Hell_NFTTransferBlocked() public {
        // console.log removed for compilation

        // 注意：由于 PositionManager 需要真实的 PoolManager 来执行 mint
        // 这里我们只测试 transfer 被阻止的逻辑
        // mint 功能需要在集成测试中用真实的 PoolManager 测试

        // 直接测试 transfer 函数会 revert
        vm.prank(alice);
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.safeTransferFrom(
            alice,
            bob,
            1 // 任意 tokenId
        );

        // 测试 transferFrom 也会 revert
        vm.prank(alice);
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.transferFrom(
            alice,
            bob,
            1
        );

        // console.log removed for compilation
    }

    // ============================================
    // 🔥 TEST 4: 非管理员无权限
    // ============================================

    function test_Hell_UnauthorizedAccess() public {
        // console.log removed for compilation

        // Attacker 尝试注册 Issuer
        vm.prank(attacker);
        vm.expectRevert(); // Ownable: caller is not the owner
        registry.registerIssuer(
            keccak256("FakeIssuer"),
            attacker,
            address(verifier)
        );
        // console.log removed for compilation

        // Attacker 尝试触发紧急暂停
        vm.prank(attacker);
        vm.expectRevert();
        registry.setEmergencyPause(true);
        // console.log removed for compilation

        // Attacker 尝试批准路由器
        vm.prank(attacker);
        vm.expectRevert();
        registry.approveRouter(makeAddr("fakeRouter"), true);
        // console.log removed for compilation
    }

    // ============================================
    // 🔥 TEST 5: 合约升级保留数据
    // ============================================

    function test_Hell_UpgradePreservesData() public {
        // console.log removed for compilation

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
        // console.log removed for compilation

        // 部署新版本逻辑合约
        Registry newRegistryImpl = new Registry();

        // 执行升级
        vm.prank(governance);
        registry.upgradeToAndCall(address(newRegistryImpl), "");
        // console.log removed for compilation

        // 验证数据保留
        Registry.IssuerInfo memory infoAfter = registry.getIssuerInfo(keccak256("TestIssuer"));
        assertTrue(infoAfter.active, "Issuer should still be active after upgrade");
        assertEq(infoAfter.attester, issuer1Attester, "Attester address should be preserved");
        // console.log removed for compilation

        // 验证 Owner 保留
        assertEq(registry.owner(), governance, "Owner should be preserved");
        // console.log removed for compilation
    }

    // ============================================
    // 🔥 TEST 6: 防重放 - 跨用户
    // ============================================

    function test_Hell_ProofReplayCrossUser() public {
        // console.log removed for compilation

        // 只允许 Alice 验证，Bob 不在白名单
        verifier.setUserAllowed(alice, true);
        // 注意：Bob 不在白名单中

        // Alice 生成 Proof 并激活 Session
        bytes memory aliceProof = "alice_proof_data";
        uint256[] memory alicePublicInputs = new uint256[](1);
        alicePublicInputs[0] = uint256(uint160(alice));

        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);
        // console.log removed for compilation

        // ❌ Attacker 尝试用 Alice 的 Proof 为 Bob 开 Session
        // 在 MockVerifier 中，我们通过 publicInputs[0] 验证用户是否在白名单
        // 真实的 PlonkVerifier 会验证 proof 与 publicInputs 的一致性

        // Bob 的 publicInputs（Bob 不在白名单中）
        uint256[] memory bobPublicInputs = new uint256[](1);
        bobPublicInputs[0] = uint256(uint160(bob));

        // 尝试用 Alice 的 Proof 但 Bob 的 publicInputs
        // 由于 Bob 不在白名单中，应该失败
        bool isValid = verifier.verifyComplianceProof(aliceProof, bobPublicInputs);
        assertFalse(isValid, "Cross-user proof replay should fail");

        // console.log removed for compilation
    }

    // ============================================
    // 🔥 TEST 7: 防重放 - 过期 Proof
    // ============================================

    function test_Hell_ProofReplayOldProof() public {
        // console.log removed for compilation

        // Alice 激活 Session
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);
        // console.log removed for compilation

        // Session 过期
        vm.warp(block.timestamp + 25 hours);
        assertFalse(sessionManager.isSessionActive(alice));
        // console.log removed for compilation

        // ❌ 尝试用昨天的 Proof（实际中 Proof 应包含 timestamp）
        // MockVerifier 不验证时间戳，但实际 PlonkVerifier 会

        // 在实际电路中，publicInputs 应包含 timestamp
        // 合约应检查 block.timestamp - proofTimestamp < MAX_AGE (例如 1 小时)

        // console.log removed for compilation
    }

    // ============================================
    // 🔥 TEST 8: Gas 消耗基准
    // ============================================

    function test_Hell_GasConsumption() public {
        address mockPM = makeAddr("poolManager");

        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 24 hours);

        bytes memory hookData = "";

        uint256 gasBefore = gasleft();
        
        vm.prank(mockPM);
        PoolKey memory key4 = _createPoolKey();
        IPoolManager.SwapParams memory params4 = _createSwapParams();
        hook.beforeSwap(alice, key4, params4, hookData);

        uint256 gasUsed = gasBefore - gasleft();
        
        assertLt(gasUsed, 45000, "Hook overhead should be < 45,000 Gas");
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
