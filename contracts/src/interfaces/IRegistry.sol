// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IRegistry
 * @notice 配置中心接口，管理 Issuer、路由器白名单和全局参数
 */
interface IRegistry {
    // ============ Structs ============

    struct IssuerInfo {
        address attester;    // Issuer 的 attester 地址 (如 EAS attester)
        address verifier;    // 对应的 Verifier 合约地址
        bool active;         // 是否启用
    }

    // ============ Events ============

    event IssuerRegistered(
        bytes32 indexed issuerId,
        address indexed attester,
        address indexed verifier
    );

    event IssuerUpdated(
        bytes32 indexed issuerId,
        address newVerifier
    );

    event IssuerRevoked(bytes32 indexed issuerId);

    event RouterApproved(address indexed router, bool approved);

    event SessionTTLUpdated(uint256 oldTTL, uint256 newTTL);

    event EmergencyPauseToggled(bool paused);

    // ============ Issuer 管理 ============

    function registerIssuer(
        bytes32 issuerId,
        address attester,
        address verifier
    ) external;

    function updateIssuer(
        bytes32 issuerId,
        address newVerifier
    ) external;

    function revokeIssuer(bytes32 issuerId) external;

    function getVerifier(bytes32 issuerId) external view returns (address);

    function isIssuerActive(address attester) external view returns (bool);

    function getIssuerInfo(bytes32 issuerId) external view returns (IssuerInfo memory);

    // ============ 路由器管理 ============

    function approveRouter(address router, bool approved) external;

    function isRouterApproved(address router) external view returns (bool);

    // ============ 参数管理 ============

    function setSessionTTL(uint256 newTTL) external;

    function getSessionTTL() external view returns (uint256);

    // ============ 紧急控制 ============

    function setEmergencyPause(bool pause) external;

    function emergencyPaused() external view returns (bool);
}
