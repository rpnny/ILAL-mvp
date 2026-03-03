#!/usr/bin/env node

/**
 * ILAL - Test Proof Generation Script
 *
 * Generates a valid ZK proof using EdDSA-Poseidon signatures (circomlib).
 * The Issuer signs user data with an EdDSA key, and the circuit verifies it.
 */

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon, buildEddsa } = require("circomlibjs");

// ============ Paths ============

const CIRCUIT_WASM = path.join(__dirname, "../build/compliance_js/compliance.wasm");
const CIRCUIT_ZKEY = path.join(__dirname, "../keys/compliance.zkey");
const VERIFICATION_KEY = path.join(__dirname, "../keys/verification_key.json");
const OUTPUT_DIR = path.join(__dirname, "../test-data");

// ============ Helpers ============

function bigIntToHex(num) {
    return "0x" + num.toString(16).padStart(64, "0");
}

function addressToBigInt(address) {
    return BigInt(address.toLowerCase());
}

function indexToPathIndices(index, levels) {
    const pathIndices = [];
    for (let i = 0; i < levels; i++) {
        pathIndices.push(index & 1);
        index >>= 1;
    }
    return pathIndices;
}

async function buildMerkleTree(leaves, levels, poseidon) {
    const treeSize = 2 ** levels;
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < treeSize) {
        paddedLeaves.push(BigInt(0));
    }

    const tree = [paddedLeaves];
    let currentLevel = paddedLeaves;

    for (let level = 0; level < levels; level++) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const parent = poseidon([currentLevel[i], currentLevel[i + 1]]);
            nextLevel.push(poseidon.F.toObject(parent));
        }
        tree.push(nextLevel);
        currentLevel = nextLevel;
    }

    return { root: tree[tree.length - 1][0], tree };
}

function getMerkleProof(tree, leafIndex, levels) {
    const siblings = [];
    const pathIndices = indexToPathIndices(leafIndex, levels);
    let currentIndex = leafIndex;

    for (let level = 0; level < levels; level++) {
        const isRightNode = (currentIndex & 1) === 1;
        const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
        siblings.push(tree[level][siblingIndex] || BigInt(0));
        currentIndex = currentIndex >> 1;
    }

    return { siblings, pathIndices };
}

// ============ Main ============

async function generateTestProof() {
    console.log("ILAL Test Proof Generation (EdDSA-Poseidon)");
    console.log("=".repeat(50));
    console.log("");

    // 1. Check required files
    console.log("Checking required files...");
    const files = [
        { path: CIRCUIT_WASM, name: "Circuit WASM" },
        { path: CIRCUIT_ZKEY, name: "zkey" },
        { path: VERIFICATION_KEY, name: "Verification key" }
    ];
    for (const file of files) {
        if (!fs.existsSync(file.path)) {
            console.error(`Missing ${file.name}: ${file.path}`);
            process.exit(1);
        }
    }
    console.log("All files present.");
    console.log("");

    // 2. Initialize crypto primitives
    console.log("Initializing Poseidon and EdDSA...");
    const poseidon = await buildPoseidon();
    const eddsa = await buildEddsa();
    console.log("Ready.");
    console.log("");

    // 3. Generate Issuer EdDSA keypair (deterministic for testing)
    console.log("Generating Issuer EdDSA keypair...");
    const issuerPrivKey = Buffer.from(
        "0001020304050607080900010203040506070809000102030405060708090001",
        "hex"
    );
    const issuerPubKey = eddsa.prv2pub(issuerPrivKey);
    const issuerAx = eddsa.F.toObject(issuerPubKey[0]);
    const issuerAy = eddsa.F.toObject(issuerPubKey[1]);
    console.log("  Issuer Ax:", issuerAx.toString().slice(0, 20) + "...");
    console.log("  Issuer Ay:", issuerAy.toString().slice(0, 20) + "...");
    console.log("");

    // 4. Prepare user data
    const testUser = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const userAddressBigInt = addressToBigInt(testUser);
    const kycStatus = BigInt(1);
    const countryCode = BigInt(840);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    console.log("Test user:", testUser);
    console.log("");

    // 5. Build Merkle tree
    console.log("Building Merkle tree (depth 20)...");
    const TREE_DEPTH = 20;
    const leaf = poseidon([userAddressBigInt, kycStatus]);
    const leafValue = poseidon.F.toObject(leaf);

    const { root, tree } = await buildMerkleTree([leafValue], TREE_DEPTH, poseidon);
    console.log("  Merkle Root:", root.toString().slice(0, 20) + "...");

    const leafIndex = 0;
    const { siblings, pathIndices } = getMerkleProof(tree, leafIndex, TREE_DEPTH);
    console.log("");

    // 6. Sign the message with EdDSA
    console.log("Signing user data with EdDSA...");
    const messageHash = poseidon([userAddressBigInt, kycStatus, countryCode, BigInt(currentTimestamp)]);
    const messageHashValue = poseidon.F.toObject(messageHash);

    const signature = eddsa.signPoseidon(issuerPrivKey, eddsa.F.e(messageHashValue));
    const sigR8x = eddsa.F.toObject(signature.R8[0]);
    const sigR8y = eddsa.F.toObject(signature.R8[1]);
    const sigS = signature.S;

    // Verify locally before generating proof
    const localValid = eddsa.verifyPoseidon(eddsa.F.e(messageHashValue), signature, issuerPubKey);
    console.log("  Local EdDSA verification:", localValid ? "PASS" : "FAIL");
    if (!localValid) {
        console.error("Local signature verification failed!");
        process.exit(1);
    }
    console.log("");

    // 7. Prepare circuit input
    const circuitInput = {
        userAddress: userAddressBigInt.toString(),
        merkleRoot: root.toString(),
        issuerAx: issuerAx.toString(),
        issuerAy: issuerAy.toString(),
        timestamp: currentTimestamp.toString(),

        sigR8x: sigR8x.toString(),
        sigR8y: sigR8y.toString(),
        sigS: sigS.toString(),
        kycStatus: kycStatus.toString(),
        countryCode: countryCode.toString(),
        merkleProof: siblings.map(s => s.toString()),
        merkleIndex: leafIndex.toString()
    };

    // 8. Generate ZK Proof
    console.log("Generating ZK Proof (may take 10-30s)...");
    const startTime = Date.now();

    try {
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(
            circuitInput, CIRCUIT_WASM, CIRCUIT_ZKEY
        );
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Proof generated in ${elapsed}s`);
        console.log("");

        // 9. Local verification
        console.log("Verifying proof locally...");
        const vKey = JSON.parse(fs.readFileSync(VERIFICATION_KEY, "utf8"));
        const isValid = await snarkjs.plonk.verify(vKey, publicSignals, proof);
        console.log("  Proof valid:", isValid ? "YES" : "NO");
        if (!isValid) { process.exit(1); }
        console.log("");

        // 10. Format for on-chain verification
        const proofArray = [
            proof.A[0], proof.A[1],
            proof.B[0], proof.B[1],
            proof.C[0], proof.C[1],
            proof.Z[0], proof.Z[1],
            proof.T1[0], proof.T1[1],
            proof.T2[0], proof.T2[1],
            proof.T3[0], proof.T3[1],
            proof.Wxi[0], proof.Wxi[1],
            proof.Wxiw[0], proof.Wxiw[1],
            proof.eval_a, proof.eval_b, proof.eval_c,
            proof.eval_s1, proof.eval_s2, proof.eval_zw
        ];

        const proofHex = proofArray.map(x => bigIntToHex(BigInt(x)));
        const proofBytes = "0x" + proofHex.map(h => h.slice(2)).join("");

        // 11. Save outputs
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(
            path.join(OUTPUT_DIR, "test-input.json"),
            JSON.stringify(circuitInput, null, 2)
        );

        fs.writeFileSync(
            path.join(OUTPUT_DIR, "test-proof.json"),
            JSON.stringify({ proof, publicSignals }, null, 2)
        );

        fs.writeFileSync(
            path.join(OUTPUT_DIR, "contract-call-data.json"),
            JSON.stringify({
                proofBytes,
                publicSignals,
                userAddress: testUser,
                merkleRoot: bigIntToHex(root),
                issuerAx: bigIntToHex(issuerAx),
                issuerAy: bigIntToHex(issuerAy),
                timestamp: currentTimestamp,
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(OUTPUT_DIR, "foundry-test-data.json"),
            JSON.stringify({
                proof: proofHex,
                publicInputs: publicSignals.map(s => s.toString())
            }, null, 2)
        );

        console.log("Output files saved to test-data/");
        console.log("");
        console.log("Public signals (" + publicSignals.length + "):");
        console.log("  [0] userAddress:", publicSignals[0]);
        console.log("  [1] merkleRoot:", publicSignals[1]);
        console.log("  [2] issuerAx:", publicSignals[2]);
        console.log("  [3] issuerAy:", publicSignals[3]);
        console.log("  [4] timestamp:", publicSignals[4]);
        console.log("");
        console.log("Done.");

    } catch (error) {
        console.error("Proof generation failed:", error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    generateTestProof()
        .then(() => process.exit(0))
        .catch(error => { console.error("Fatal:", error); process.exit(1); });
}

module.exports = { generateTestProof };
