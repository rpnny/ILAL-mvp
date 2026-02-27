// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../../src/core/Registry.sol";
import "../../src/core/SessionManager.sol";
import "../../src/core/MockVerifier.sol";
import "../../src/core/ComplianceHook.sol";
import "../../src/core/VerifiedPoolsPositionManager.sol";

import {PoolManager} from "@uniswap/v4-core/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/types/PoolId.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_, uint8) ERC20(name_, symbol_) {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract VerifiedPoolsPositionManagerTest is Test {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    Registry public registry;
    SessionManager public sessionManager;
    MockVerifier public verifier;
    ComplianceHook public hook;
    PoolManager public poolManager;
    VerifiedPoolsPositionManager public positionManager;

    MockERC20 public token0;
    MockERC20 public token1;
    Currency public currency0;
    Currency public currency1;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    bytes32 constant COINBASE_ID = keccak256("Coinbase");

    PoolKey key;

    function setUp() public {
        // --- 1. Uniswap V4 核心 ---
        poolManager = new PoolManager(address(this));

        // --- 2. 部署代币并准备金 ---
        token0 = new MockERC20("Token0", "TK0", 18);
        token1 = new MockERC20("Token1", "TK1", 18);

        // 确保 token0 的地址小于 token1，这是 V4 的要求
        if (address(token0) > address(token1)) {
            MockERC20 temp = token0;
            token0 = token1;
            token1 = temp;
        }

        currency0 = Currency.wrap(address(token0));
        currency1 = Currency.wrap(address(token1));

        token0.mint(alice, 1000000 ether);
        token1.mint(alice, 1000000 ether);

        // --- 3. 部署 ILAL 核心合规组件 ---
        Registry registryImpl = new Registry();
        registry = Registry(address(new ERC1967Proxy(address(registryImpl), abi.encodeWithSelector(Registry.initialize.selector, admin))));

        verifier = new MockVerifier();

        SessionManager sessionImpl = new SessionManager();
        sessionManager = SessionManager(address(new ERC1967Proxy(address(sessionImpl), abi.encodeWithSelector(SessionManager.initialize.selector, address(registry), address(verifier), admin))));

        // Admin 配置
        vm.startPrank(admin);
        sessionManager.grantRole(sessionManager.VERIFIER_ROLE(), address(verifier));
        registry.registerIssuer(COINBASE_ID, makeAddr("attester"), address(verifier));
        vm.stopPrank();

        // 验证 Mock
        verifier.setUserAllowed(alice, true);

        // --- 4. 部署 Hook 与 Position Manager ---
        
        // 我们利用 vm.etch 给 Hook 在适当的前缀上放置代码，以满足 Hook 标志掩码（AddLiquidity 等标志）
        // 简单起见，这里直接 new （因为这个测试不测 Hook 挂载标志匹配，或我们直接给 hook address label)
        // 注意：如果要使 modifyLiquidity 成功，Hook 必须响应正确的 selector
        uint160 flags = uint160(
            // IHooks.BEFORE_SWAP_FLAG | IHooks.BEFORE_ADD_LIQUIDITY_FLAG | IHooks.BEFORE_REMOVE_LIQUIDITY_FLAG
            0x3c00 // 近似，具体需要结合 V4 算力
        );
        // 这里为了简化 PositionManager 单位测试绕过 Hook 地狱限制，我们使用不带 hook 的池子或者 Mock Hook
        // 虽然业务需要 hook，但 position manager 本质与 hook 解耦
        
        hook = new ComplianceHook(address(registry), address(sessionManager));

        positionManager = new VerifiedPoolsPositionManager(
            address(poolManager),
            address(registry),
            address(sessionManager)
        );

        // 池子参数初始化
        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0)) // 在这个测试中，我们不关注 Hook 逻辑，仅测试 PositionManager 的封装。
        });
        
        // 初始价格
        poolManager.initialize(key, 79228162514264337593543950336);
    }

    modifier aliceVerified() {
        vm.prank(address(verifier));
        sessionManager.startSession(alice, block.timestamp + 1 days);
        _;
    }

    function test_MintPosition() public aliceVerified {
        vm.startPrank(alice);
        // ERC20 授权给 PositionManager 也就是 poolManager 处理
        token0.approve(address(positionManager), type(uint256).max);
        token1.approve(address(positionManager), type(uint256).max);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);

        // 尝试 Mint 增加流动性
        uint256 tokenId = positionManager.mint(
            key,
            -120, // tickLower
            120,  // tickUpper
            100 ether,  // liquidity
            new bytes(0) // hookData
        );
        vm.stopPrank();

        assertEq(tokenId, 1);
        assertEq(positionManager.ownerOf(tokenId), alice);
        
        VerifiedPoolsPositionManager.Position memory pos = positionManager.getPosition(tokenId);
        assertEq(pos.liquidity, 100 ether);
        assertEq(pos.tickLower, -120);
        assertEq(pos.tickUpper, 120);
    }

    function test_RevertWhen_MintUnverified() public {
        vm.startPrank(bob); // Bob is unverified
        vm.expectRevert(abi.encodeWithSelector(VerifiedPoolsPositionManager.NotVerified.selector, bob));
        positionManager.mint(key, -120, 120, 100 ether, new bytes(0));
        vm.stopPrank();
    }
    
    function test_IncreaseLiquidity() public aliceVerified {
        vm.startPrank(alice);
        token0.approve(address(positionManager), type(uint256).max);
        token1.approve(address(positionManager), type(uint256).max);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);

        uint256 tokenId = positionManager.mint(key, -120, 120, 100 ether, new bytes(0));

        // 增加 50
        positionManager.increaseLiquidity(tokenId, 50 ether, new bytes(0));
        vm.stopPrank();

        VerifiedPoolsPositionManager.Position memory pos = positionManager.getPosition(tokenId);
        assertEq(pos.liquidity, 150 ether);
    }

    function test_DecreaseLiquidity() public aliceVerified {
        vm.startPrank(alice);
        token0.approve(address(positionManager), type(uint256).max);
        token1.approve(address(positionManager), type(uint256).max);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);

        uint256 tokenId = positionManager.mint(key, -120, 120, 100 ether, new bytes(0));

        // 减少 40
        positionManager.decreaseLiquidity(tokenId, 40 ether, new bytes(0));
        vm.stopPrank();

        VerifiedPoolsPositionManager.Position memory pos = positionManager.getPosition(tokenId);
        assertEq(pos.liquidity, 60 ether);
    }

    function test_BurnPosition() public aliceVerified {
        vm.startPrank(alice);
        token0.approve(address(positionManager), type(uint256).max);
        token1.approve(address(positionManager), type(uint256).max);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);

        uint256 tokenId = positionManager.mint(key, -120, 120, 100 ether, new bytes(0));

        // 必须先抽空
        vm.expectRevert(VerifiedPoolsPositionManager.InvalidPosition.selector);
        positionManager.burn(tokenId);

        positionManager.decreaseLiquidity(tokenId, 100 ether, new bytes(0));

        // 现在可以烧毁
        positionManager.burn(tokenId);
        vm.stopPrank();

        assertEq(positionManager.ownerOf(tokenId), address(0));
    }

    function test_TransfersBlocked() public aliceVerified {
        vm.startPrank(alice);
        token0.approve(address(positionManager), type(uint256).max);
        token1.approve(address(positionManager), type(uint256).max);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);

        positionManager.mint(key, -120, 120, 100 ether, new bytes(0));

        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.transferFrom(alice, bob, 1);
        
        vm.expectRevert(VerifiedPoolsPositionManager.TransferNotAllowed.selector);
        positionManager.safeTransferFrom(alice, bob, 1);
        vm.stopPrank();
    }
}
