// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IRegistry.sol";
import "../interfaces/ISessionManager.sol";
import "@uniswap/v4-core/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import "@uniswap/v4-core/types/PoolKey.sol";
import "@uniswap/v4-core/types/Currency.sol";
import "@uniswap/v4-core/types/BalanceDelta.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VerifiedPoolsPositionManager
 * @notice 限制性流动性头寸管理器 - 禁止转让 LP NFT
 * 
 * ⚠️ 重要警告:
 * - 实现 IUnlockCallback 与 Uniswap v4 PoolManager 交互
 * - 覆盖 safeTransferFrom 以阻止 NFT 转移
 * - 用户只能通过此 DApp 管理流动性
 * - 无法在 OpenSea 或其他市场交易 LP NFT
 * 
 * 设计理由:
 * - 防止未验证用户通过购买 NFT 获得流动性仓位
 * - 确保所有 LP 持有者都经过合规验证
 * - 避免监管套利
 */
contract VerifiedPoolsPositionManager is IUnlockCallback, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;

    IPoolManager public immutable poolManager;
    IRegistry public immutable registry;
    ISessionManager public immutable sessionManager;

    // 头寸所有者映射 (tokenId => owner)
    mapping(uint256 => address) public positionOwners;

    // 头寸元数据 - 使用 PoolKey 而非 address
    struct Position {
        address owner;
        PoolKey poolKey;
        uint128 liquidity;
        int24 tickLower;
        int24 tickUpper;
        uint256 createdAt;
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextTokenId = 1;

    // 操作类型枚举
    enum OperationType {
        MINT,
        INCREASE_LIQUIDITY,
        DECREASE_LIQUIDITY
    }

    // 回调数据结构
    struct CallbackData {
        OperationType operationType;
        address sender;
        uint256 tokenId;
        PoolKey poolKey;
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
        bytes hookData;
    }

    // ============ 事件 ============

    event PositionMinted(
        uint256 indexed tokenId,
        address indexed owner,
        Currency currency0,
        Currency currency1,
        uint128 liquidity,
        int24 tickLower,
        int24 tickUpper
    );

    event LiquidityIncreased(
        uint256 indexed tokenId,
        uint128 liquidityDelta,
        uint128 newTotal
    );

    event LiquidityDecreased(
        uint256 indexed tokenId,
        uint128 liquidityDelta,
        uint128 newTotal
    );

    event PositionBurned(uint256 indexed tokenId);

    // ============ 错误 ============

    error NotVerified(address user);
    error NotOwner(address caller, uint256 tokenId);
    error TransferNotAllowed();
    error EmergencyPaused();
    error InvalidPosition();
    error UnauthorizedCallback();
    error InsufficientLiquidity();

    // ============ 构造函数 ============

    constructor(address _poolManager, address _registry, address _sessionManager) {
        poolManager = IPoolManager(_poolManager);
        registry = IRegistry(_registry);
        sessionManager = ISessionManager(_sessionManager);
    }

    // ============ 修饰器 ============

    modifier onlyVerified() {
        if (registry.emergencyPaused()) revert EmergencyPaused();
        if (!sessionManager.isSessionActive(msg.sender)) {
            revert NotVerified(msg.sender);
        }
        _;
    }

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert UnauthorizedCallback();
        _;
    }

    // ============ 核心功能 ============

    /**
     * @notice 铸造新的流动性头寸
     * @dev 仅限已验证用户
     * @param poolKey Uniswap v4 池标识
     * @param tickLower 价格范围下限
     * @param tickUpper 价格范围上限
     * @param liquidity 流动性数量
     * @param hookData 传递给 Hook 的数据（EIP-712 签名等）
     */
    function mint(
        PoolKey calldata poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        bytes calldata hookData
    ) external onlyVerified nonReentrant returns (uint256 tokenId) {
        tokenId = nextTokenId++;

        // 存储头寸信息
        positions[tokenId] = Position({
            owner: msg.sender,
            poolKey: poolKey,
            liquidity: 0, // 将在回调中更新
            tickLower: tickLower,
            tickUpper: tickUpper,
            createdAt: block.timestamp
        });

        positionOwners[tokenId] = msg.sender;

        // 准备回调数据
        CallbackData memory callbackData = CallbackData({
            operationType: OperationType.MINT,
            sender: msg.sender,
            tokenId: tokenId,
            poolKey: poolKey,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: int256(uint256(liquidity)),
            hookData: hookData
        });

        // 调用 PoolManager.unlock 触发回调
        poolManager.unlock(abi.encode(callbackData));

        // 更新流动性
        positions[tokenId].liquidity = liquidity;

        emit PositionMinted(
            tokenId,
            msg.sender,
            poolKey.currency0,
            poolKey.currency1,
            liquidity,
            tickLower,
            tickUpper
        );
    }

    /**
     * @notice 增加头寸流动性
     * @param tokenId 头寸 ID
     * @param liquidityDelta 增加的流动性数量
     * @param hookData 传递给 Hook 的数据
     */
    function increaseLiquidity(
        uint256 tokenId,
        uint128 liquidityDelta,
        bytes calldata hookData
    ) external onlyVerified nonReentrant {
        Position storage position = positions[tokenId];

        if (position.owner != msg.sender) {
            revert NotOwner(msg.sender, tokenId);
        }

        // 准备回调数据
        CallbackData memory callbackData = CallbackData({
            operationType: OperationType.INCREASE_LIQUIDITY,
            sender: msg.sender,
            tokenId: tokenId,
            poolKey: position.poolKey,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            liquidityDelta: int256(uint256(liquidityDelta)),
            hookData: hookData
        });

        // 调用 PoolManager.unlock 触发回调
        poolManager.unlock(abi.encode(callbackData));

        // 更新流动性
        position.liquidity += liquidityDelta;

        emit LiquidityIncreased(tokenId, liquidityDelta, position.liquidity);
    }

    /**
     * @notice 减少头寸流动性
     * @param tokenId 头寸 ID
     * @param liquidityDelta 减少的流动性数量
     * @param hookData 传递给 Hook 的数据
     */
    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidityDelta,
        bytes calldata hookData
    ) external nonReentrant {
        Position storage position = positions[tokenId];

        if (position.owner != msg.sender) {
            revert NotOwner(msg.sender, tokenId);
        }

        if (liquidityDelta > position.liquidity) {
            revert InsufficientLiquidity();
        }

        // 紧急暂停时允许移除流动性（但不允许增加）
        // 这是为了保护用户资金

        // 准备回调数据
        CallbackData memory callbackData = CallbackData({
            operationType: OperationType.DECREASE_LIQUIDITY,
            sender: msg.sender,
            tokenId: tokenId,
            poolKey: position.poolKey,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            liquidityDelta: -int256(uint256(liquidityDelta)), // 负数表示移除
            hookData: hookData
        });

        // 调用 PoolManager.unlock 触发回调
        poolManager.unlock(abi.encode(callbackData));

        // 更新流动性
        position.liquidity -= liquidityDelta;

        emit LiquidityDecreased(tokenId, liquidityDelta, position.liquidity);
    }

    /**
     * @notice 销毁头寸（流动性必须为 0）
     */
    function burn(uint256 tokenId) external {
        Position storage position = positions[tokenId];

        if (position.owner != msg.sender) {
            revert NotOwner(msg.sender, tokenId);
        }

        if (position.liquidity > 0) {
            revert InvalidPosition();
        }

        delete positions[tokenId];
        delete positionOwners[tokenId];

        emit PositionBurned(tokenId);
    }

    // ============ IUnlockCallback 实现 ============

    /**
     * @notice PoolManager 解锁回调
     * @dev 在此函数中执行实际的流动性操作
     */
    function unlockCallback(bytes calldata data) external onlyPoolManager returns (bytes memory) {
        CallbackData memory callbackData = abi.decode(data, (CallbackData));

        // 构建 ModifyLiquidityParams
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: callbackData.tickLower,
            tickUpper: callbackData.tickUpper,
            liquidityDelta: callbackData.liquidityDelta,
            salt: bytes32(callbackData.tokenId) // 使用 tokenId 作为 salt 确保唯一性
        });

        // 调用 PoolManager.modifyLiquidity
        (BalanceDelta callerDelta, ) = poolManager.modifyLiquidity(
            callbackData.poolKey,
            params,
            callbackData.hookData
        );

        // 处理代币结算
        _settleDelta(callbackData.sender, callbackData.poolKey, callerDelta);

        return "";
    }

    /**
     * @notice 处理代币结算
     * @dev 根据 delta 的正负进行 settle 或 take
     */
    function _settleDelta(
        address user,
        PoolKey memory poolKey,
        BalanceDelta delta
    ) internal {
        int128 delta0 = delta.amount0();
        int128 delta1 = delta.amount1();

        // 处理 currency0
        if (delta0 > 0) {
            // 用户需要支付 - take from pool
            poolManager.take(poolKey.currency0, user, uint128(delta0));
        } else if (delta0 < 0) {
            // 用户需要存入 - settle to pool
            _settleToken(user, poolKey.currency0, uint128(-delta0));
        }

        // 处理 currency1
        if (delta1 > 0) {
            // 用户需要支付 - take from pool
            poolManager.take(poolKey.currency1, user, uint128(delta1));
        } else if (delta1 < 0) {
            // 用户需要存入 - settle to pool
            _settleToken(user, poolKey.currency1, uint128(-delta1));
        }
    }

    /**
     * @notice 结算代币到 PoolManager
     */
    function _settleToken(address from, Currency currency, uint128 amount) internal {
        if (currency.isAddressZero()) {
            // 原生代币 (ETH)
            poolManager.settle{value: amount}();
        } else {
            // ERC20 代币
            poolManager.sync(currency);
            IERC20(Currency.unwrap(currency)).safeTransferFrom(from, address(poolManager), amount);
            poolManager.settle();
        }
    }

    // ============ 禁止转移 ============

    /**
     * @notice ⛔ 禁止转让 LP NFT
     * @dev 覆盖 ERC721.safeTransferFrom，始终回滚
     * 
     * 原因：
     * - 防止未验证用户通过购买 NFT 获得仓位
     * - 确保合规性不被绕过
     */
    function safeTransferFrom(
        address, /* from */
        address, /* to */
        uint256  /* tokenId */
    ) external pure {
        revert TransferNotAllowed();
    }

    /**
     * @notice ⛔ 禁止转让 LP NFT（带数据版本）
     */
    function safeTransferFrom(
        address, /* from */
        address, /* to */
        uint256, /* tokenId */
        bytes memory /* data */
    ) external pure {
        revert TransferNotAllowed();
    }

    /**
     * @notice ⛔ 禁止转让 LP NFT
     */
    function transferFrom(
        address, /* from */
        address, /* to */
        uint256  /* tokenId */
    ) external pure {
        revert TransferNotAllowed();
    }

    // ============ 查询函数 ============

    /**
     * @notice 获取头寸信息
     */
    function getPosition(uint256 tokenId) external view returns (Position memory) {
        return positions[tokenId];
    }

    /**
     * @notice 检查用户是否拥有头寸
     */
    function ownerOf(uint256 tokenId) external view returns (address) {
        return positionOwners[tokenId];
    }

    /**
     * @notice 获取头寸的 PoolKey
     */
    function getPoolKey(uint256 tokenId) external view returns (PoolKey memory) {
        return positions[tokenId].poolKey;
    }

    /**
     * @notice 接收 ETH（用于原生代币流动性）
     */
    receive() external payable {}
}
