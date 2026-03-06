#!/usr/bin/env node

/**
 * ILAL ZK Proof Benchmark
 * 
 * Measures:
 *   1. Witness generation time
 *   2. Proof generation time (PLONK fullProve)
 *   3. Off-chain verification time (snarkjs)
 *   4. Total end-to-end time
 * 
 * Runs multiple iterations for statistical accuracy.
 */

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon, buildEddsa } = require("circomlibjs");

const CIRCUIT_WASM = path.join(__dirname, "../build/compliance_js/compliance.wasm");
const CIRCUIT_ZKEY = path.join(__dirname, "../keys/compliance.zkey");
const VERIFICATION_KEY = path.join(__dirname, "../keys/verification_key.json");

const ITERATIONS = 5;

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
  while (paddedLeaves.length < treeSize) paddedLeaves.push(BigInt(0));

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
  let currentIndex = leafIndex;
  for (let level = 0; level < levels; level++) {
    const isRight = (currentIndex & 1) === 1;
    const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
    siblings.push(tree[level][siblingIndex] || BigInt(0));
    currentIndex = currentIndex >> 1;
  }
  return siblings;
}

async function prepareInput() {
  const poseidon = await buildPoseidon();
  const eddsa = await buildEddsa();

  const issuerPrivKey = Buffer.from(
    "0001020304050607080900010203040506070809000102030405060708090001", "hex"
  );
  const issuerPubKey = eddsa.prv2pub(issuerPrivKey);
  const issuerAx = eddsa.F.toObject(issuerPubKey[0]);
  const issuerAy = eddsa.F.toObject(issuerPubKey[1]);

  const userAddress = addressToBigInt("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  const kycStatus = BigInt(1);
  const countryCode = BigInt(840);
  const timestamp = Math.floor(Date.now() / 1000);

  const TREE_DEPTH = 20;
  const leaf = poseidon([userAddress, kycStatus]);
  const leafValue = poseidon.F.toObject(leaf);
  const { root, tree } = await buildMerkleTree([leafValue], TREE_DEPTH, poseidon);
  const siblings = getMerkleProof(tree, 0, TREE_DEPTH);

  const messageHash = poseidon([userAddress, kycStatus, countryCode, BigInt(timestamp)]);
  const messageHashValue = poseidon.F.toObject(messageHash);
  const signature = eddsa.signPoseidon(issuerPrivKey, eddsa.F.e(messageHashValue));

  return {
    userAddress: userAddress.toString(),
    merkleRoot: root.toString(),
    issuerAx: issuerAx.toString(),
    issuerAy: issuerAy.toString(),
    timestamp: timestamp.toString(),
    sigR8x: eddsa.F.toObject(signature.R8[0]).toString(),
    sigR8y: eddsa.F.toObject(signature.R8[1]).toString(),
    sigS: signature.S.toString(),
    kycStatus: kycStatus.toString(),
    countryCode: countryCode.toString(),
    merkleProof: siblings.map(s => s.toString()),
    merkleIndex: "0",
  };
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       ILAL ZK Proof Benchmark (PLONK)           ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  // Verify files exist
  for (const f of [CIRCUIT_WASM, CIRCUIT_ZKEY, VERIFICATION_KEY]) {
    if (!fs.existsSync(f)) { console.error("Missing:", f); process.exit(1); }
  }

  const vKey = JSON.parse(fs.readFileSync(VERIFICATION_KEY, "utf8"));
  console.log("Preparing circuit input (EdDSA + Merkle tree)...");
  const circuitInput = await prepareInput();
  console.log("Input ready.\n");

  const results = { prove: [], verify: [], total: [] };

  for (let i = 1; i <= ITERATIONS; i++) {
    console.log(`--- Iteration ${i}/${ITERATIONS} ---`);

    // Proof generation (witness + proving)
    const t0 = performance.now();
    const { proof, publicSignals } = await snarkjs.plonk.fullProve(
      circuitInput, CIRCUIT_WASM, CIRCUIT_ZKEY
    );
    const t1 = performance.now();

    // Verification
    const isValid = await snarkjs.plonk.verify(vKey, publicSignals, proof);
    const t2 = performance.now();

    const proveMs = t1 - t0;
    const verifyMs = t2 - t1;
    const totalMs = t2 - t0;

    results.prove.push(proveMs);
    results.verify.push(verifyMs);
    results.total.push(totalMs);

    console.log(`  Prove:  ${proveMs.toFixed(2)} ms`);
    console.log(`  Verify: ${verifyMs.toFixed(2)} ms  (valid: ${isValid})`);
    console.log(`  Total:  ${totalMs.toFixed(2)} ms`);
    console.log("");
  }

  // Statistics
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);
  const median = arr => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║                  RESULTS                        ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Iterations: ${ITERATIONS}                                  ║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  PROOF GENERATION (witness + PLONK prove)       ║");
  console.log(`║    Average: ${avg(results.prove).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Median:  ${median(results.prove).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Min:     ${min(results.prove).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Max:     ${max(results.prove).toFixed(2)} ms`.padEnd(52) + "║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  OFF-CHAIN VERIFICATION (snarkjs)               ║");
  console.log(`║    Average: ${avg(results.verify).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Median:  ${median(results.verify).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Min:     ${min(results.verify).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Max:     ${max(results.verify).toFixed(2)} ms`.padEnd(52) + "║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  TOTAL (prove + verify)                         ║");
  console.log(`║    Average: ${avg(results.total).toFixed(2)} ms`.padEnd(52) + "║");
  console.log(`║    Median:  ${median(results.total).toFixed(2)} ms`.padEnd(52) + "║");
  console.log("╚══════════════════════════════════════════════════╝");

  // Save results
  const output = {
    date: new Date().toISOString(),
    iterations: ITERATIONS,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    proofGeneration: {
      avgMs: +avg(results.prove).toFixed(2),
      medianMs: +median(results.prove).toFixed(2),
      minMs: +min(results.prove).toFixed(2),
      maxMs: +max(results.prove).toFixed(2),
    },
    offChainVerification: {
      avgMs: +avg(results.verify).toFixed(2),
      medianMs: +median(results.verify).toFixed(2),
      minMs: +min(results.verify).toFixed(2),
      maxMs: +max(results.verify).toFixed(2),
    },
    total: {
      avgMs: +avg(results.total).toFixed(2),
      medianMs: +median(results.total).toFixed(2),
    },
    rawData: { prove: results.prove, verify: results.verify, total: results.total },
  };

  const outPath = path.join(__dirname, "../test-data/benchmark-results.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outPath}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
