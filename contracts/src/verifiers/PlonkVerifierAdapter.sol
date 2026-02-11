// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {PlonkVerifier} from "./PlonkVerifier.sol";

/**
 * @title PlonkVerifierAdapter
 * @notice 适配器：将 PlonkVerifier 适配到 IVerifier 接口
 * @dev 将 bytes 和 uint256[] 转换为 PlonkVerifier 期望的固定大小数组
 */
contract PlonkVerifierAdapter is IVerifier {
    // ============ 状态变量 ============

    /// @notice PLONK 验证器合约
    PlonkVerifier public immutable plonkVerifier;

    // ============ 错误定义 ============

    error InvalidProofLength();
    error InvalidPublicInputsLength();
    error ProofVerificationFailed();

    // ============ 构造函数 ============

    /**
     * @notice 构造函数
     * @param _plonkVerifier PLONK 验证器地址
     */
    constructor(address _plonkVerifier) {
        plonkVerifier = PlonkVerifier(_plonkVerifier);
    }

    // ============ IVerifier 实现 ============

    /**
     * @notice 验证合规证明
     * @param proof 证明数据 (768 bytes = 24 * 32)
     * @param publicInputs 公共输入数组 (长度必须为 3)
     * @return 验证是否通过
     */
    function verifyComplianceProof(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        // 验证输入长度
        if (proof.length != 768) revert InvalidProofLength(); // 24 * 32 bytes
        if (publicInputs.length != 3) revert InvalidPublicInputsLength();

        // 将 bytes 转换为 uint256[24]
        uint256[24] memory proofArray;
        for (uint256 i = 0; i < 24; i++) {
            proofArray[i] = abi.decode(proof[i * 32:(i + 1) * 32], (uint256));
        }

        // 将 uint256[] 转换为 uint256[3]
        uint256[3] memory pubSignalsArray = [
            publicInputs[0],
            publicInputs[1],
            publicInputs[2]
        ];

        // 调用 PLONK 验证器
        return plonkVerifier.verifyProof(proofArray, pubSignalsArray);
    }

    /**
     * @notice 验证证明并解析用户地址
     * @param proof 证明数据
     * @param publicInputs 公共输入数组
     *        [0] = userAddress (低 160 位)
     *        [1] = merkleRoot
     *        [2] = issuerPubKeyHash
     * @return user 用户地址
     * @return isValid 是否验证通过
     */
    function verifyAndExtractUser(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (address user, bool isValid) {
        // 验证输入长度
        if (proof.length != 768) revert InvalidProofLength();
        if (publicInputs.length != 3) revert InvalidPublicInputsLength();

        // 从第一个公共输入提取用户地址
        user = address(uint160(publicInputs[0]));

        // 验证证明
        isValid = this.verifyComplianceProof(proof, publicInputs);

        return (user, isValid);
    }

    // ============ 辅助函数 ============

    /**
     * @notice 将 calldata bytes 转换为 uint256[24] memory
     * @param data 输入数据
     * @return result 转换后的数组
     */
    function _bytesToUint256Array24(bytes calldata data)
        internal
        pure
        returns (uint256[24] memory result)
    {
        require(data.length == 768, "Invalid length");

        for (uint256 i = 0; i < 24; i++) {
            result[i] = uint256(bytes32(data[i * 32:(i + 1) * 32]));
        }

        return result;
    }

    /**
     * @notice 获取验证器版本信息
     * @return 版本字符串
     */
    function version() external pure returns (string memory) {
        return "PlonkVerifierAdapter v1.0.0 - PLONK + BN254";
    }
}
