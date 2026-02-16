// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title EIP712Verifier
 * @notice EIP-712 签名验证库，用于 ComplianceHook
 * @dev 实现用户身份的加密验证，防止 hookData 伪造
 */
contract EIP712Verifier is EIP712 {
    using ECDSA for bytes32;

    // ============ 类型哈希 ============

    /// @notice SwapPermit 类型哈希
    bytes32 public constant SWAP_PERMIT_TYPEHASH = keccak256(
        "SwapPermit(address user,uint256 deadline,uint256 nonce)"
    );

    /// @notice LiquidityPermit 类型哈希
    bytes32 public constant LIQUIDITY_PERMIT_TYPEHASH = keccak256(
        "LiquidityPermit(address user,uint256 deadline,uint256 nonce,bool isAdd)"
    );

    // ============ 状态变量 ============

    /// @notice 用户 nonce 映射（防重放）
    mapping(address => uint256) public nonces;

    // ============ 事件 ============

    event NonceUsed(address indexed user, uint256 nonce);

    // ============ Errors ============

    error InvalidSignature();
    error SignatureExpired();
    error InvalidNonce();

    // ============ 构造函数 ============

    constructor() EIP712("ILAL ComplianceHook", "1") {}

    // ============ 验证函数 ============

    /**
     * @notice 验证 Swap 许可签名
     * @param user 用户地址
     * @param deadline 签名过期时间
     * @param nonce 用户 nonce
     * @param signature EIP-712 签名
     * @return 验证是否通过
     */
    function verifySwapPermit(
        address user,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) public returns (bool) {
        // 检查过期
        if (block.timestamp > deadline) {
            revert SignatureExpired();
        }

        // 检查 nonce
        if (nonce != nonces[user]) {
            revert InvalidNonce();
        }

        // 构造结构体哈希
        bytes32 structHash = keccak256(
            abi.encode(SWAP_PERMIT_TYPEHASH, user, deadline, nonce)
        );

        // 计算 EIP-712 哈希
        bytes32 digest = _hashTypedDataV4(structHash);

        // 恢复签名者
        address signer = digest.recover(signature);

        // 验证签名者是否为用户本人
        if (signer != user) {
            revert InvalidSignature();
        }

        // 使用 nonce（防重放）
        nonces[user]++;
        emit NonceUsed(user, nonce);

        return true;
    }

    /**
     * @notice 验证流动性许可签名
     * @param user 用户地址
     * @param deadline 签名过期时间
     * @param nonce 用户 nonce
     * @param isAdd 是否为添加流动性
     * @param signature EIP-712 签名
     * @return 验证是否通过
     */
    function verifyLiquidityPermit(
        address user,
        uint256 deadline,
        uint256 nonce,
        bool isAdd,
        bytes memory signature
    ) public returns (bool) {
        if (block.timestamp > deadline) {
            revert SignatureExpired();
        }

        if (nonce != nonces[user]) {
            revert InvalidNonce();
        }

        bytes32 structHash = keccak256(
            abi.encode(LIQUIDITY_PERMIT_TYPEHASH, user, deadline, nonce, isAdd)
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (signer != user) {
            revert InvalidSignature();
        }

        nonces[user]++;
        emit NonceUsed(user, nonce);

        return true;
    }

    /**
     * @notice 仅验证签名（不消耗 nonce，用于预检查）
     * @param user 用户地址
     * @param deadline 签名过期时间
     * @param nonce 用户 nonce
     * @param signature EIP-712 签名
     * @return 签名是否有效
     */
    function verifySwapPermitView(
        address user,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) public view returns (bool) {
        if (block.timestamp > deadline) {
            return false;
        }

        if (nonce != nonces[user]) {
            return false;
        }

        bytes32 structHash = keccak256(
            abi.encode(SWAP_PERMIT_TYPEHASH, user, deadline, nonce)
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        return signer == user;
    }

    // ============ 工具函数 ============

    /**
     * @notice 获取用户当前 nonce
     * @param user 用户地址
     * @return 当前 nonce
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @notice 获取域分隔符（用于前端签名）
     * @return EIP-712 域分隔符
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
