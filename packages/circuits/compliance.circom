pragma circom 2.1.0;

include "poseidon.circom";
include "comparators.circom";
include "bitify.circom";
include "eddsaposeidon.circom";

/**
 * ILAL Compliance Verification Circuit (PLONK)
 *
 * 1. Verify Issuer EdDSA-Poseidon signature over user data
 * 2. Check KYC status (must be 1 = passed)
 * 3. Verify user membership via Merkle proof
 * 4. Bind proof to user address (prevent proof transfer)
 */

/**
 * Merkle tree verifier
 * @param levels - tree depth (20 = up to 2^20 = 1,048,576 users)
 */
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component poseidons[levels];
    component selectors[levels];

    signal computedHash[levels + 1];
    computedHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== computedHash[i];
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        poseidons[i] = Poseidon(2);
        poseidons[i].inputs[0] <== selectors[i].out[0];
        poseidons[i].inputs[1] <== selectors[i].out[1];

        computedHash[i + 1] <== poseidons[i].out;
    }

    root === computedHash[levels];
}

/**
 * Dual mux selector for Merkle path direction
 */
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;

    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

/**
 * EdDSA-Poseidon signature verifier (wraps circomlib EdDSAPoseidonVerifier)
 */
template IssuerSignatureVerifier() {
    signal input message;
    signal input Ax;
    signal input Ay;
    signal input S;
    signal input R8x;
    signal input R8y;

    component verifier = EdDSAPoseidonVerifier();
    verifier.enabled <== 1;
    verifier.Ax <== Ax;
    verifier.Ay <== Ay;
    verifier.S <== S;
    verifier.R8x <== R8x;
    verifier.R8y <== R8y;
    verifier.M <== message;
}

/**
 * Main compliance verification circuit
 */
template ComplianceVerifier(merkleTreeLevels) {
    // ============ Public inputs ============

    signal input userAddress;
    signal input merkleRoot;
    signal input issuerAx;
    signal input issuerAy;
    signal input timestamp;

    // ============ Private inputs ============

    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;
    signal input kycStatus;
    signal input countryCode;

    signal input merkleProof[merkleTreeLevels];
    signal input merkleIndex;

    // ============ Constraint 1: KYC status must be 1 ============

    component kycCheck = IsEqual();
    kycCheck.in[0] <== kycStatus;
    kycCheck.in[1] <== 1;
    kycCheck.out === 1;

    // ============ Constraint 2: EdDSA signature verification ============

    component messageHasher = Poseidon(4);
    messageHasher.inputs[0] <== userAddress;
    messageHasher.inputs[1] <== kycStatus;
    messageHasher.inputs[2] <== countryCode;
    messageHasher.inputs[3] <== timestamp;

    component sigVerifier = IssuerSignatureVerifier();
    sigVerifier.message <== messageHasher.out;
    sigVerifier.Ax <== issuerAx;
    sigVerifier.Ay <== issuerAy;
    sigVerifier.S <== sigS;
    sigVerifier.R8x <== sigR8x;
    sigVerifier.R8y <== sigR8y;

    // ============ Constraint 3: Merkle tree membership ============

    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== userAddress;
    leafHasher.inputs[1] <== kycStatus;

    component merkleChecker = MerkleTreeChecker(merkleTreeLevels);
    merkleChecker.leaf <== leafHasher.out;
    merkleChecker.root <== merkleRoot;

    for (var i = 0; i < merkleTreeLevels; i++) {
        merkleChecker.pathElements[i] <== merkleProof[i];
    }

    component indexBits = Num2Bits(merkleTreeLevels);
    indexBits.in <== merkleIndex;

    for (var i = 0; i < merkleTreeLevels; i++) {
        merkleChecker.pathIndices[i] <== indexBits.out[i];
    }
}

// Public inputs: [userAddress, merkleRoot, issuerAx, issuerAy, timestamp]
component main {public [userAddress, merkleRoot, issuerAx, issuerAy, timestamp]} = ComplianceVerifier(20);
