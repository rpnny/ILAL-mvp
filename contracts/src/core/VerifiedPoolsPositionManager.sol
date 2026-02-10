// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IRegistry.sol";
import "../interfaces/ISessionManager.sol";

/**
 * @title VerifiedPoolsPositionManager
 * @notice 限制性流动性头寸管理器 - 禁止转让 LP NFT
 * 
 * ⚠️ 重要警告:
 * - 继承自 Uniswap v4 NonfungiblePositionManager
 * - 覆盖 safeTransferFrom 以阻止 NFT 转移
 * - 用户只能通过此 DApp 管理流动性
 * - 无法在 OpenSea 或其他市场交易 LP NFT
 * 
 * 设计理由:
 * - 防止未验证用户通过购买 NFT 获得流动性仓位
 * - 确保所有 LP 持有者都经过合规验证
 * - 避免监管套利
 */
contract VerifiedPoolsPositionManager {
    IRegistry public immutable registry;
    ISessionManager public immutable sessionManager;

    // 头寸所有者映射 (tokenId => owner)
    mapping(uint256 => address) public positionOwners;

    // 头寸元数据
    struct Position {
        address owner;
        address pool;
        uint128 liquidity;
        int24 tickLower;
        int24 tickUpper;
        uint256 createdAt;
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextTokenId = 1;

    // ============ 事件 ============

    event PositionMinted(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed pool,
        uint128 liquidity
    );

    event LiquidityIncreased(
        uint256 indexed tokenId,
        uint128 liquidity,
        uint128 newTotal
    );

    event LiquidityDecreased(
        uint256 indexed tokenId,
        uint128 liquidity,
        uint128 newTotal
    );

    event PositionBurned(uint256 indexed tokenId);

    // ============ 错误 ============

    error NotVerified(address user);
    error NotOwner(address caller, uint256 tokenId);
    error TransferNotAllowed();
    error EmergencyPaused();
    error InvalidPosition();

    // ============ 构造函数 ============

    constructor(address _registry, address _sessionManager) {
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

    // ============ 核心功能 ============

    /**
     * @notice 铸造新的流动性头寸
     * @dev 仅限已验证用户
     */
    function mint(
        address pool,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) external onlyVerified returns (uint256 tokenId) {
        tokenId = nextTokenId++;

        positions[tokenId] = Position({
            owner: msg.sender,
            pool: pool,
            liquidity: liquidity,
            tickLower: tickLower,
            tickUpper: tickUpper,
            createdAt: block.timestamp
        });

        positionOwners[tokenId] = msg.sender;

        emit PositionMinted(tokenId, msg.sender, pool, liquidity);

        // TODO: 实际调用 Uniswap v4 PoolManager.modifyLiquidity
        // 此处简化为仅记录头寸
    }

    /**
     * @notice 增加头寸流动性
     */
    function increaseLiquidity(
        uint256 tokenId,
        uint128 liquidityDelta
    ) external onlyVerified {
        Position storage position = positions[tokenId];

        if (position.owner != msg.sender) {
            revert NotOwner(msg.sender, tokenId);
        }

        uint128 oldLiquidity = position.liquidity;
        position.liquidity += liquidityDelta;

        emit LiquidityIncreased(tokenId, liquidityDelta, position.liquidity);

        // TODO: 调用 PoolManager
    }

    /**
     * @notice 减少头寸流动性
     */
    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidityDelta
    ) external onlyVerified {
        Position storage position = positions[tokenId];

        if (position.owner != msg.sender) {
            revert NotOwner(msg.sender, tokenId);
        }

        if (liquidityDelta > position.liquidity) {
            revert InvalidPosition();
        }

        position.liquidity -= liquidityDelta;

        emit LiquidityDecreased(tokenId, liquidityDelta, position.liquidity);

        // TODO: 调用 PoolManager
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
}
