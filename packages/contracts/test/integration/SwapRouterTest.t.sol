// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/helpers/SimpleSwapRouter.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/MockVerifier.sol";
import "@uniswap/v4-core/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/types/PoolKey.sol";
import "@uniswap/v4-core/types/Currency.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice 测试用 ERC20 代币
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}

/**
 * @title SwapRouterTest
 * @notice SimpleSwapRouter 和 VerifiedPoolsPositionManager 集成测试
 * 
 * 测试场景:
 *   1. SimpleSwapRouter 部署和基础验证
 *   2. VerifiedPoolsPositionManager 与 PoolManager 的集成
 *   3. 完整的合规性验证流程
 *   4. 端到端 Swap 和流动性管理
 */
contract SwapRouterTest is Test {
    // ============ 合约实例 ============

    SimpleSwapRouter public router;
    VerifiedPoolsPositionManager public positionManager;
    Registry public registry;
    SessionManager public sessionManager;
    ComplianceHook public hook;
    MockVerifier public verifier;

    // 测试代币
    MockERC20 public token0;
    MockERC20 public token1;

    // ============ 测试账户 ============

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    uint256 public aliceKey;
    uint256 public bobKey;

    // ============ 常量 ============

    // 使用零地址作为 PoolManager mock（本地测试不需要真实的 PoolManager）
    address constant MOCK_POOL_MANAGER = address(0xdead);

    // ============ 设置 ============

    function setUp() public {
        // 生成测试密钥
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

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
        hook = new ComplianceHook(
            address(registry),
            address(sessionManager)
        );

        // 5. 部署 SimpleSwapRouter
        router = new SimpleSwapRouter(MOCK_POOL_MANAGER);

        // 6. 部署 VerifiedPoolsPositionManager
        positionManager = new VerifiedPoolsPositionManager(
            MOCK_POOL_MANAGER,
            address(registry),
            address(sessionManager)
        );

        // 7. 部署测试代币
        token0 = new MockERC20("Token A", "TKA", 18);
        token1 = new MockERC20("Token B", "TKB", 6);

        // 8. 配置 - 注册 Issuer
        vm.startPrank(admin);
        registry.registerIssuer(
            keccak256("test_issuer"),
            address(0x1),
            address(verifier)
        );
        vm.stopPrank();

        // 9. 给测试账户铸造代币
        token0.mint(alice, 1000 ether);
        token1.mint(alice, 1000000e6);
        token0.mint(bob, 1000 ether);
        token1.mint(bob, 1000000e6);

        // 10. 给测试账户 ETH
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // ============ SimpleSwapRouter 测试 ============

    function test_RouterDeployment() public view {
        assertEq(address(router.poolManager()), MOCK_POOL_MANAGER);
    }

    function test_RouterReceivesETH() public {
        (bool success,) = address(router).call{value: 1 ether}("");
        assertTrue(success, "Router should accept ETH");
    }

    // ============ PositionManager 测试 ============

    function test_PositionManagerDeployment() public view {
        assertEq(address(positionManager.poolManager()), MOCK_POOL_MANAGER);
        assertEq(address(positionManager.registry()), address(registry));
        assertEq(address(positionManager.sessionManager()), address(sessionManager));
        assertEq(positionManager.nextTokenId(), 1);
    }

    function test_PositionManagerRejectsUnverifiedUser() public {
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        vm.prank(alice);
        vm.expectRevert();
        positionManager.mint(poolKey, -887220, 887220, 1e18, "");
    }

    function test_PositionManagerBlocksTransfer() public {
        vm.expectRevert();
        positionManager.safeTransferFrom(alice, bob, 1);

        vm.expectRevert();
        positionManager.transferFrom(alice, bob, 1);
    }

    // ============ Session 验证流程测试 ============

    /// @notice 辅助函数：使用 verifier 角色给用户启动 Session
    function _startSessionForUser(address user) internal {
        vm.prank(address(verifier));
        sessionManager.startSession(user, block.timestamp + 86400);
    }

    function test_FullVerificationFlow() public {
        // 1. Alice 还没有 Session
        assertFalse(sessionManager.isSessionActive(alice));

        // 2. 通过 verifier 角色激活 Session
        _startSessionForUser(alice);

        // 3. Session 现在应该是活跃的
        assertTrue(sessionManager.isSessionActive(alice));
    }

    function test_SessionExpiry() public {
        // 1. 激活 Session
        _startSessionForUser(alice);
        assertTrue(sessionManager.isSessionActive(alice));

        // 2. 快进超过 Session TTL (86400 秒 = 24 小时)
        vm.warp(block.timestamp + 86401);

        // 3. Session 应该已过期
        assertFalse(sessionManager.isSessionActive(alice));
    }

    function test_BobCannotUseAliceSession() public {
        // 1. Alice 激活 Session
        _startSessionForUser(alice);

        // 2. Bob 没有 Session
        assertFalse(sessionManager.isSessionActive(bob));

        // 3. Bob 尝试操作应该失败
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        vm.prank(bob);
        vm.expectRevert();
        positionManager.mint(poolKey, -887220, 887220, 1e18, "");
    }

    // ============ ComplianceHook 测试 ============

    function test_HookDeployment() public view {
        assertEq(address(hook.registry()), address(registry));
        assertEq(address(hook.sessionManager()), address(sessionManager));
    }

    // ============ EIP-712 签名测试 ============

    function test_EIP712SignatureGeneration() public view {
        // 测试签名参数计算（不实际发送交易）
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ILAL ComplianceHook"),
                keccak256("1"),
                block.chainid,
                address(hook)
            )
        );

        // 确认 domain separator 非零
        assertTrue(DOMAIN_SEPARATOR != bytes32(0), "Domain separator should not be zero");
    }

    function test_SignSwapPermit() public {
        // 构造 EIP-712 签名
        bytes32 DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ILAL ComplianceHook"),
                keccak256("1"),
                block.chainid,
                address(hook)
            )
        );

        bytes32 SWAP_PERMIT_TYPEHASH = keccak256("SwapPermit(address user,uint256 deadline,uint256 nonce)");
        uint256 deadline = block.timestamp + 600;
        uint256 nonce = 0;

        bytes32 structHash = keccak256(
            abi.encode(SWAP_PERMIT_TYPEHASH, alice, deadline, nonce)
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        // 使用 Alice 的私钥签名
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // 验证签名非空
        assertTrue(signature.length == 65, "Signature should be 65 bytes");

        // 编码 hookData
        bytes memory hookData = abi.encode(alice, deadline, nonce, signature);
        assertTrue(hookData.length > 0, "HookData should not be empty");
    }

    // ============ 紧急暂停测试 ============

    function test_EmergencyPauseBlocksMint() public {
        // 1. 先激活 Alice 的 Session
        _startSessionForUser(alice);
        assertTrue(sessionManager.isSessionActive(alice));

        // 2. 管理员触发紧急暂停
        vm.prank(admin);
        registry.setEmergencyPause(true);
        assertTrue(registry.emergencyPaused());

        // 3. Alice 尝试操作应该失败（紧急暂停）
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        vm.prank(alice);
        vm.expectRevert();
        positionManager.mint(poolKey, -887220, 887220, 1e18, "");

        // 4. 取消暂停
        vm.prank(admin);
        registry.setEmergencyPause(false);
        assertFalse(registry.emergencyPaused());
    }

    // ============ 位置销毁测试 ============

    function test_BurnRequiresZeroLiquidity() public {
        // 尝试销毁不存在的 position
        vm.prank(alice);
        vm.expectRevert();
        positionManager.burn(999);
    }

    function test_BurnRequiresOwner() public {
        // Bob 不是 position 的所有者
        vm.prank(bob);
        vm.expectRevert();
        positionManager.burn(1);
    }

    // ============ 批量测试 ============

    function test_MultipleSessionActivations() public {
        // Alice 激活
        _startSessionForUser(alice);
        assertTrue(sessionManager.isSessionActive(alice));

        // Bob 激活
        _startSessionForUser(bob);
        assertTrue(sessionManager.isSessionActive(bob));

        // 两者都应该有活跃的 Session
        assertTrue(sessionManager.isSessionActive(alice));
        assertTrue(sessionManager.isSessionActive(bob));
    }

    function test_SessionReactivation() public {
        // 第一次激活
        _startSessionForUser(alice);
        assertTrue(sessionManager.isSessionActive(alice));

        // 快进 12 小时
        vm.warp(block.timestamp + 43200);

        // 重新激活（续期）
        _startSessionForUser(alice);
        assertTrue(sessionManager.isSessionActive(alice));

        // 快进 12 小时（从重新激活算起）
        vm.warp(block.timestamp + 43200);

        // 仍然有效（因为是从续期时间开始算的）
        assertTrue(sessionManager.isSessionActive(alice));
    }
}
