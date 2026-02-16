// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ISessionManager
 * @notice 会话缓存管理接口，记录用户验证状态和过期时间
 */
interface ISessionManager {
    // ============ Events ============

    event SessionStarted(address indexed user, uint256 expiry);

    event SessionEnded(address indexed user);

    // ============ 会话管理 ============

    /**
     * @notice 开启用户会话
     * @param user 用户地址
     * @param expiry 过期时间戳
     */
    function startSession(address user, uint256 expiry) external;

    /**
     * @notice 检查用户会话是否有效
     * @param user 用户地址
     * @return 是否有效
     */
    function isSessionActive(address user) external view returns (bool);

    /**
     * @notice 获取用户会话过期时间
     * @param user 用户地址
     * @return 过期时间戳
     */
    function sessionExpiry(address user) external view returns (uint256);

    /**
     * @notice 手动结束用户会话 (仅治理)
     * @param user 用户地址
     */
    function endSession(address user) external;

    /**
     * @notice 批量结束会话
     * @param users 用户地址数组
     */
    function endSessionBatch(address[] calldata users) external;
}
