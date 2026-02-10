// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

/**
 * @title Registry
 * @notice ILAL 配置中心 - 管理 Issuer、路由器白名单和全局参数
 * @dev 使用 UUPS 代理模式实现可升级，确保未来可以调整合规逻辑
 */
contract Registry is IRegistry, UUPSUpgradeable, OwnableUpgradeable {
    // ============ 状态变量 ============

    /// @notice Issuer 信息映射 (issuerId => IssuerInfo)
    mapping(bytes32 => IssuerInfo) private _issuers;

    /// @notice Attester 地址到 issuerId 的反向映射
    mapping(address => bytes32) private _attesterToIssuer;

    /// @notice 受信路由器白名单
    mapping(address => bool) private _routerWhitelist;

    /// @notice 会话有效期 (默认 24 小时)
    uint256 private _sessionTTL;

    /// @notice 紧急暂停标志
    bool private _emergencyPaused;

    // ============ 常量 ============

    uint256 private constant MIN_TTL = 1 hours;
    uint256 private constant MAX_TTL = 7 days;
    uint256 private constant DEFAULT_TTL = 24 hours;

    // ============ Errors ============

    error InvalidIssuer();
    error IssuerAlreadyExists();
    error IssuerNotActive();
    error InvalidTTL();
    error ZeroAddress();

    // ============ 初始化 ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice 初始化 Registry 合约
     * @param governanceMultisig 治理多签地址
     */
    function initialize(address governanceMultisig) public initializer {
        if (governanceMultisig == address(0)) revert ZeroAddress();

        __Ownable_init(governanceMultisig);
        __UUPSUpgradeable_init();

        _sessionTTL = DEFAULT_TTL;
        _emergencyPaused = false;
    }

    // ============ Issuer 管理 ============

    /// @inheritdoc IRegistry
    function registerIssuer(
        bytes32 issuerId,
        address attester,
        address verifier
    ) external override onlyOwner {
        if (attester == address(0) || verifier == address(0)) revert ZeroAddress();
        if (_issuers[issuerId].attester != address(0)) revert IssuerAlreadyExists();

        _issuers[issuerId] = IssuerInfo({
            attester: attester,
            verifier: verifier,
            active: true
        });

        _attesterToIssuer[attester] = issuerId;

        emit IssuerRegistered(issuerId, attester, verifier);
    }

    /// @inheritdoc IRegistry
    function updateIssuer(
        bytes32 issuerId,
        address newVerifier
    ) external override onlyOwner {
        if (newVerifier == address(0)) revert ZeroAddress();
        if (_issuers[issuerId].attester == address(0)) revert InvalidIssuer();

        _issuers[issuerId].verifier = newVerifier;

        emit IssuerUpdated(issuerId, newVerifier);
    }

    /// @inheritdoc IRegistry
    function revokeIssuer(bytes32 issuerId) external override onlyOwner {
        if (_issuers[issuerId].attester == address(0)) revert InvalidIssuer();

        _issuers[issuerId].active = false;

        emit IssuerRevoked(issuerId);
    }

    /// @inheritdoc IRegistry
    function getVerifier(bytes32 issuerId) external view override returns (address) {
        return _issuers[issuerId].verifier;
    }

    /// @inheritdoc IRegistry
    function isIssuerActive(address attester) external view override returns (bool) {
        bytes32 issuerId = _attesterToIssuer[attester];
        return _issuers[issuerId].active;
    }

    /// @inheritdoc IRegistry
    function getIssuerInfo(bytes32 issuerId)
        external
        view
        override
        returns (IssuerInfo memory)
    {
        return _issuers[issuerId];
    }

    // ============ 路由器管理 ============

    /// @inheritdoc IRegistry
    function approveRouter(address router, bool approved) external override onlyOwner {
        if (router == address(0)) revert ZeroAddress();

        _routerWhitelist[router] = approved;

        emit RouterApproved(router, approved);
    }

    /// @inheritdoc IRegistry
    function isRouterApproved(address router) external view override returns (bool) {
        return _routerWhitelist[router];
    }

    // ============ 参数管理 ============

    /// @inheritdoc IRegistry
    function setSessionTTL(uint256 newTTL) external override onlyOwner {
        if (newTTL < MIN_TTL || newTTL > MAX_TTL) revert InvalidTTL();

        uint256 oldTTL = _sessionTTL;
        _sessionTTL = newTTL;

        emit SessionTTLUpdated(oldTTL, newTTL);
    }

    /// @inheritdoc IRegistry
    function getSessionTTL() external view override returns (uint256) {
        return _sessionTTL;
    }

    // ============ 紧急控制 ============

    /// @inheritdoc IRegistry
    function setEmergencyPause(bool pause) external override onlyOwner {
        _emergencyPaused = pause;

        emit EmergencyPauseToggled(pause);
    }

    /// @inheritdoc IRegistry
    function emergencyPaused() external view override returns (bool) {
        return _emergencyPaused;
    }

    // ============ 升级授权 ============

    /**
     * @notice 授权升级 (仅 owner 可调用)
     * @param newImplementation 新实现合约地址
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // ============ 版本管理 ============

    /**
     * @notice 获取当前合约版本
     * @return 版本字符串
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
