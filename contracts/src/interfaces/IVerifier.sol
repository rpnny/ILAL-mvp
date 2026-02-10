// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IVerifier
 * @notice 零知识证明验证器接口
 * @dev 支持 Groth16 或 PLONK 验证
 */
interface IVerifier {
    // ============ Verification ============

    /**
     * @notice 验证合规证明
     * @param proof 证明数据 (格式取决于算法)
     * @param publicInputs 公共输入数组
     * @return 验证是否通过
     */
    function verifyComplianceProof(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool);

    /**
     * @notice 验证证明并解析公共输入
     * @param proof 证明数据
     * @param publicInputs 公共输入数组
     * @return user 用户地址
     * @return isValid 是否验证通过
     */
    function verifyAndExtractUser(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (address user, bool isValid);
}
