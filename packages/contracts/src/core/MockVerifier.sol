// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockVerifier
 * @notice Mock ZK verifier for testing and development only.
 * @dev Admin functions are restricted to owner. Must be replaced by
 *      PlonkVerifierAdapter + PlonkVerifier in production.
 */
contract MockVerifier is IVerifier, Ownable {
    bool public forceFailure;
    mapping(address => bool) public allowedUsers;

    event VerificationAttempt(address indexed user, bool success);
    event UserAllowed(address indexed user, bool allowed);

    constructor() Ownable(msg.sender) {
        forceFailure = false;
    }

    function verifyComplianceProof(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        if (forceFailure) return false;
        if (proof.length == 0 || publicInputs.length == 0) return false;

        address user = address(uint160(publicInputs[0]));
        return allowedUsers[user];
    }

    function verifyAndExtractUser(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (address user, bool isValid) {
        if (publicInputs.length == 0) return (address(0), false);
        user = address(uint160(publicInputs[0]));
        isValid = this.verifyComplianceProof(proof, publicInputs);
    }

    function setUserAllowed(address user, bool allowed) external onlyOwner {
        allowedUsers[user] = allowed;
        emit UserAllowed(user, allowed);
    }

    function setUsersAllowed(address[] calldata users, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            allowedUsers[users[i]] = allowed;
            emit UserAllowed(users[i], allowed);
        }
    }

    function setForceFailure(bool _forceFailure) external onlyOwner {
        forceFailure = _forceFailure;
    }
}
