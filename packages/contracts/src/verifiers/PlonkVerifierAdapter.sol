// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {PlonkVerifier} from "./PlonkVerifier.sol";

/**
 * @title PlonkVerifierAdapter
 * @notice Adapts the generated PlonkVerifier to the IVerifier interface
 * @dev Converts bytes + uint256[] to the fixed-size arrays PlonkVerifier expects.
 *      Public inputs: [userAddress, merkleRoot, issuerAx, issuerAy, timestamp] (5 elements)
 */
contract PlonkVerifierAdapter is IVerifier {
    PlonkVerifier public immutable plonkVerifier;

    error InvalidProofLength();
    error InvalidPublicInputsLength();

    constructor(address _plonkVerifier) {
        plonkVerifier = PlonkVerifier(_plonkVerifier);
    }

    /**
     * @notice Verify a compliance proof
     * @param proof Proof data (768 bytes = 24 * 32)
     * @param publicInputs Public inputs array (length must be 5)
     */
    function verifyComplianceProof(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        if (proof.length != 768) revert InvalidProofLength();
        if (publicInputs.length != 5) revert InvalidPublicInputsLength();

        uint256[24] memory proofArray;
        for (uint256 i = 0; i < 24; i++) {
            proofArray[i] = abi.decode(proof[i * 32:(i + 1) * 32], (uint256));
        }

        uint256[5] memory pubSignalsArray = [
            publicInputs[0],
            publicInputs[1],
            publicInputs[2],
            publicInputs[3],
            publicInputs[4]
        ];

        return plonkVerifier.verifyProof(proofArray, pubSignalsArray);
    }

    /**
     * @notice Verify proof and extract user address
     * @param proof Proof data
     * @param publicInputs Public inputs:
     *        [0] = userAddress (low 160 bits)
     *        [1] = merkleRoot
     *        [2] = issuerAx
     *        [3] = issuerAy
     *        [4] = timestamp
     */
    function verifyAndExtractUser(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (address user, bool isValid) {
        if (proof.length != 768) revert InvalidProofLength();
        if (publicInputs.length != 5) revert InvalidPublicInputsLength();

        user = address(uint160(publicInputs[0]));
        isValid = this.verifyComplianceProof(proof, publicInputs);
    }

    function version() external pure returns (string memory) {
        return "PlonkVerifierAdapter v2.0.0 - EdDSA-Poseidon + BN254";
    }
}
