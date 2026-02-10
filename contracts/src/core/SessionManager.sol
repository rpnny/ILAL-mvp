// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {ISessionManager} from "../interfaces/ISessionManager.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

/**
 * @title SessionManager
 * @notice 会话缓存管理 - 记录用户验证状态和过期时间
 * @dev 使用 UUPS 代理模式，支持未来验证逻辑升级
 */
contract SessionManager is
    ISessionManager,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ 角色定义 ============

    /// @notice Verifier 角色 (可以开启会话)
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ============ 状态变量 ============

    /// @notice Registry 合约引用
    IRegistry public registry;

    /// @notice 用户会话过期时间映射
    mapping(address => uint256) private _sessionExpiry;

    // ============ Errors ============

    error SessionNotActive();
    error InvalidExpiry();
    error ZeroAddress();

    // ============ 初始化 ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice 初始化 SessionManager 合约
     * @param _registry Registry 合约地址
     * @param _verifier Verifier 合约地址
     * @param _admin 管理员地址 (多签)
     */
    function initialize(
        address _registry,
        address _verifier,
        address _admin
    ) public initializer {
        if (_registry == address(0) || _verifier == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        registry = IRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _verifier);
    }

    // ============ 会话管理 ============

    /// @inheritdoc ISessionManager
    function startSession(address user, uint256 expiry)
        external
        override
        onlyRole(VERIFIER_ROLE)
        nonReentrant
    {
        if (user == address(0)) revert ZeroAddress();
        if (expiry <= block.timestamp) revert InvalidExpiry();

        _sessionExpiry[user] = expiry;

        emit SessionStarted(user, expiry);
    }

    /// @inheritdoc ISessionManager
    function isSessionActive(address user) external view override returns (bool) {
        return _isSessionActive(user);
    }

    /// @inheritdoc ISessionManager
    function sessionExpiry(address user) external view override returns (uint256) {
        return _sessionExpiry[user];
    }

    /// @inheritdoc ISessionManager
    function endSession(address user)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_isSessionActive(user)) revert SessionNotActive();

        delete _sessionExpiry[user];

        emit SessionEnded(user);
    }

    /// @inheritdoc ISessionManager
    function endSessionBatch(address[] calldata users)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint256 i = 0; i < users.length; i++) {
            if (_isSessionActive(users[i])) {
                delete _sessionExpiry[users[i]];
                emit SessionEnded(users[i]);
            }
        }
    }

    // ============ 内部函数 ============

    /**
     * @notice 检查会话是否有效 (内部)
     * @param user 用户地址
     * @return 是否有效
     */
    function _isSessionActive(address user) internal view returns (bool) {
        return block.timestamp <= _sessionExpiry[user];
    }

    // ============ 升级授权 ============

    /**
     * @notice 授权升级 (仅管理员可调用)
     * @param newImplementation 新实现合约地址
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    // ============ 工具函数 ============

    /**
     * @notice 批量查询用户会话状态
     * @param users 用户地址数组
     * @return statuses 对应的会话状态
     */
    function batchIsSessionActive(address[] calldata users)
        external
        view
        returns (bool[] memory statuses)
    {
        statuses = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            statuses[i] = _isSessionActive(users[i]);
        }
    }

    /**
     * @notice 获取剩余会话时间
     * @param user 用户地址
     * @return 剩余秒数 (0 表示已过期)
     */
    function getRemainingTime(address user) external view returns (uint256) {
        uint256 expiry = _sessionExpiry[user];
        if (expiry <= block.timestamp) {
            return 0;
        }
        return expiry - block.timestamp;
    }

    /**
     * @notice 获取当前合约版本
     * @return 版本字符串
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
