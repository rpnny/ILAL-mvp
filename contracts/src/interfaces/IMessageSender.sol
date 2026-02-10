// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IMessageSender
 * @notice 路由器身份接口，用于获取实际的交易发起者
 * @dev 受信路由器必须实现此接口，供 Hook 查询真实用户地址
 */
interface IMessageSender {
    /**
     * @notice 获取当前交易的实际发起者地址
     * @return 实际用户地址
     * @dev 路由器需要维护调用上下文，返回最终用户而非路由器自身
     */
    function msgSender() external view returns (address);
}
