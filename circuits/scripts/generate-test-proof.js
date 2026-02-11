#!/usr/bin/env node

/**
 * ILAL - 测试 Proof 生成脚本 (修复版)
 * 
 * 修复要点：
 * 1. 使用与 Circom 一致的 Merkle Tree 构建逻辑
 * 2. 正确计算 pathIndices（从 merkleIndex 的二进制表示）
 * 3. 确保 Poseidon 哈希顺序与电路一致
 */

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

// ============ 配置 ============

const CIRCUIT_WASM = path.join(__dirname, "../build/compliance_js/compliance.wasm");
const CIRCUIT_ZKEY = path.join(__dirname, "../keys/compliance.zkey");
const VERIFICATION_KEY = path.join(__dirname, "../keys/verification_key.json");

const OUTPUT_DIR = path.join(__dirname, "../test-data");

// ============ 辅助函数 ============

function bigIntToHex(num) {
    return "0x" + num.toString(16).padStart(64, "0");
}

function addressToBigInt(address) {
    return BigInt(address.toLowerCase());
}

/**
 * 将索引转换为二进制路径索引
 * @param {number} index - 叶子索引
 * @param {number} levels - 树深度
 * @returns {number[]} - 二进制路径 (LSB first)
 */
function indexToPathIndices(index, levels) {
    const pathIndices = [];
    for (let i = 0; i < levels; i++) {
        pathIndices.push(index & 1);
        index >>= 1;
    }
    return pathIndices;
}

/**
 * 构建简化的 Merkle Tree（与 Circom 逻辑一致）
 * @param {BigInt[]} leaves - 叶子节点
 * @param {number} levels - 树深度
 * @param {Object} poseidon - Poseidon 哈希函数
 * @returns {Object} - {root, tree}
 */
async function buildMerkleTree(leaves, levels, poseidon) {
    const treeSize = 2 ** levels;
    
    // 填充叶子到 2^levels
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < treeSize) {
        paddedLeaves.push(BigInt(0));
    }
    
    // 构建树（从底层到顶层）
    const tree = [paddedLeaves];
    
    let currentLevel = paddedLeaves;
    for (let level = 0; level < levels; level++) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1];
            
            // 重要: 使用 Poseidon(2) 哈希，确保与 Circom 一致
            const parent = poseidon([left, right]);
            nextLevel.push(poseidon.F.toObject(parent));
        }
        tree.push(nextLevel);
        currentLevel = nextLevel;
    }
    
    return {
        root: tree[tree.length - 1][0],
        tree: tree
    };
}

/**
 * 获取 Merkle Proof（与 Circom 逻辑一致）
 * @param {BigInt[][]} tree - Merkle 树
 * @param {number} leafIndex - 叶子索引
 * @param {number} levels - 树深度
 * @returns {Object} - {siblings, pathIndices}
 */
function getMerkleProof(tree, leafIndex, levels) {
    const siblings = [];
    const pathIndices = indexToPathIndices(leafIndex, levels);
    
    let currentIndex = leafIndex;
    
    for (let level = 0; level < levels; level++) {
        // 计算兄弟节点索引
        const isRightNode = (currentIndex & 1) === 1;
        const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
        
        // 获取兄弟节点
        const sibling = tree[level][siblingIndex] || BigInt(0);
        siblings.push(sibling);
        
        // 移到父层
        currentIndex = currentIndex >> 1;
    }
    
    return {
        siblings,
        pathIndices
    };
}

/**
 * 本地验证 Merkle Proof（调试用）
 */
function verifyMerkleProof(leaf, siblings, pathIndices, expectedRoot, poseidon) {
    let currentHash = leaf;
    
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        const isRight = pathIndices[i];
        
        // 根据 pathIndex 决定左右顺序
        let left, right;
        if (isRight === 0) {
            // 当前节点在左，兄弟节点在右
            left = currentHash;
            right = sibling;
        } else {
            // 当前节点在右，兄弟节点在左
            left = sibling;
            right = currentHash;
        }
        
        const parent = poseidon([left, right]);
        currentHash = poseidon.F.toObject(parent);
    }
    
    return currentHash.toString() === expectedRoot.toString();
}

// ============ 主函数 ============

async function generateTestProof() {
    console.log("🚀 ILAL 测试 Proof 生成 (修复版)");
    console.log("=" .repeat(50));
    console.log("");
    
    // 1. 检查文件
    console.log("📁 检查必要文件...");
    
    const files = [
        { path: CIRCUIT_WASM, name: "电路 WASM" },
        { path: CIRCUIT_ZKEY, name: "zkey" },
        { path: VERIFICATION_KEY, name: "验证密钥" }
    ];
    
    for (const file of files) {
        if (!fs.existsSync(file.path)) {
            console.error(`❌ 未找到${file.name}文件:`, file.path);
            process.exit(1);
        }
    }
    
    console.log("✅ 所有文件就绪");
    console.log("");
    
    // 2. 初始化 Poseidon
    console.log("🔧 初始化 Poseidon 哈希...");
    const poseidon = await buildPoseidon();
    console.log("✅ Poseidon 就绪");
    console.log("");
    
    // 3. 生成测试数据
    console.log("📊 生成测试数据...");
    
    const testUser = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const userAddressBigInt = addressToBigInt(testUser);
    
    console.log("   测试用户:", testUser);
    console.log("   用户地址 (BigInt):", userAddressBigInt.toString());
    
    const issuerAddress = "0x357458739F90461b99789350868CD7CF330Dd7EE";
    const issuerAddressBigInt = addressToBigInt(issuerAddress);
    
    console.log("   Issuer:", issuerAddress);
    console.log("");
    
    // 4. 构建 Merkle Tree
    console.log("🌳 构建 Merkle Tree...");
    
    const TREE_DEPTH = 20; // 必须与电路一致
    
    // 创建叶子节点: Hash(userAddress, kycStatus)
    const kycStatus = BigInt(1); // 1 = 已通过
    const leaf = poseidon([userAddressBigInt, kycStatus]);
    const leafValue = poseidon.F.toObject(leaf);
    
    console.log("   Leaf = Poseidon(userAddress, kycStatus)");
    console.log("   Leaf Hash:", leafValue.toString());
    
    // 构建只包含一个叶子的树（最简单情况）
    const leaves = [leafValue];
    
    console.log("   构建深度 20 的 Merkle Tree（包含 1 个叶子）...");
    const { root, tree } = await buildMerkleTree(leaves, TREE_DEPTH, poseidon);
    
    console.log("   ✅ Merkle Root:", root.toString());
    console.log("");
    
    // 5. 获取 Merkle Proof
    console.log("🔐 生成 Merkle Proof...");
    
    const leafIndex = 0;
    const { siblings, pathIndices } = getMerkleProof(tree, leafIndex, TREE_DEPTH);
    
    console.log("   Leaf Index:", leafIndex);
    console.log("   Path Indices (前5个):", pathIndices.slice(0, 5).join(", "), "...");
    console.log("   Siblings (前5个):", siblings.slice(0, 5).map(s => s.toString().slice(0, 10) + "...").join(", "));
    
    // 本地验证
    const isValidLocal = verifyMerkleProof(leafValue, siblings, pathIndices, root, poseidon);
    console.log("   本地 Merkle Proof 验证:", isValidLocal ? "✅ 通过" : "❌ 失败");
    
    if (!isValidLocal) {
        console.error("❌ 本地 Merkle Proof 验证失败！电路输入错误。");
        process.exit(1);
    }
    console.log("");
    
    // 6. 准备电路输入
    console.log("📝 准备电路输入...");
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const countryCode = BigInt(840); // 840 = 美国
    
    // 构造消息: Hash(userAddress, kycStatus, countryCode, timestamp)
    const messageHash = poseidon([
        userAddressBigInt,
        kycStatus,
        countryCode,
        BigInt(currentTimestamp)
    ]);
    const messageHashValue = poseidon.F.toObject(messageHash);
    
    // 生成签名: signature = Poseidon(message, issuerPubKey)
    const signature = poseidon([messageHashValue, issuerAddressBigInt]);
    const signatureValue = poseidon.F.toObject(signature);
    
    console.log("   Message Hash:", messageHashValue.toString().slice(0, 20) + "...");
    console.log("   Signature:", signatureValue.toString().slice(0, 20) + "...");
    
    const circuitInput = {
        // 公共输入
        userAddress: userAddressBigInt.toString(),
        merkleRoot: root.toString(),
        issuerPubKeyHash: issuerAddressBigInt.toString(),
        
        // 私有输入
        signature: signatureValue.toString(),
        kycStatus: kycStatus.toString(),
        countryCode: countryCode.toString(),
        timestamp: currentTimestamp.toString(),
        merkleProof: siblings.map(s => s.toString()),
        merkleIndex: leafIndex.toString()
    };
    
    console.log("   ✅ 电路输入已准备");
    console.log("");
    
    // 7. 生成 Proof
    console.log("⏳ 生成 ZK Proof (可能需要 10-30 秒)...");
    
    const startTime = Date.now();
    
    try {
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(
            circuitInput,
            CIRCUIT_WASM,
            CIRCUIT_ZKEY
        );
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Proof 生成成功！(${elapsed}s)`);
        console.log("");
        
        // 8. 本地验证
        console.log("🔍 本地验证 Proof...");
        
        const vKey = JSON.parse(fs.readFileSync(VERIFICATION_KEY, "utf8"));
        const isValid = await snarkjs.plonk.verify(vKey, publicSignals, proof);
        
        if (isValid) {
            console.log("✅ Proof 验证通过！");
        } else {
            console.log("❌ Proof 验证失败！");
            process.exit(1);
        }
        console.log("");
        
        // 9. 格式化为合约调用格式
        console.log("📦 格式化为合约调用格式...");
        
        // PLONK Proof 有 24 个字段
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
        
        console.log("   Proof 长度:", (proofBytes.length - 2) / 2, "bytes");
        console.log("   Public Signals:", publicSignals.length);
        console.log("");
        
        // 10. 保存输出
        console.log("💾 保存输出文件...");
        
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        // 保存电路输入
        const inputFile = path.join(OUTPUT_DIR, "test-input.json");
        fs.writeFileSync(inputFile, JSON.stringify(circuitInput, null, 2));
        console.log("   ✅ test-input.json");
        
        // 保存原始 Proof
        const proofFile = path.join(OUTPUT_DIR, "test-proof.json");
        fs.writeFileSync(proofFile, JSON.stringify({ proof, publicSignals }, null, 2));
        console.log("   ✅ test-proof.json");
        
        // 保存合约调用格式
        const contractCallData = {
            proofBytes: proofBytes,
            publicSignals: publicSignals,
            userAddress: testUser,
            merkleRoot: bigIntToHex(root),
            issuerAddress: issuerAddress,
            timestamp: currentTimestamp,
            kycStatus: kycStatus.toString(),
            countryCode: countryCode.toString()
        };
        
        const contractFile = path.join(OUTPUT_DIR, "contract-call-data.json");
        fs.writeFileSync(contractFile, JSON.stringify(contractCallData, null, 2));
        console.log("   ✅ contract-call-data.json");
        
        // 保存 Foundry 测试格式
        const foundryData = {
            proof: proofHex,
            publicInputs: publicSignals.map(s => s.toString())
        };
        
        const foundryFile = path.join(OUTPUT_DIR, "foundry-test-data.json");
        fs.writeFileSync(foundryFile, JSON.stringify(foundryData, null, 2));
        console.log("   ✅ foundry-test-data.json");
        
        // 11. 打印使用说明
        console.log("");
        console.log("=" .repeat(50));
        console.log("🎉 测试 Proof 生成完成！");
        console.log("=" .repeat(50));
        console.log("");
        console.log("📋 使用方法:");
        console.log("");
        console.log("1️⃣  Foundry 测试:");
        console.log("   cd ../contracts");
        console.log("   forge test --match-test testRealPlonkProof -vvv");
        console.log("");
        console.log("2️⃣  前端使用:");
        console.log("   const data = require('./test-data/contract-call-data.json')");
        console.log("   await verifier.verifyComplianceProof(");
        console.log("     data.proofBytes,");
        console.log("     data.publicSignals");
        console.log("   )");
        console.log("");
        console.log("📊 关键数据:");
        console.log("   User:", testUser);
        console.log("   Merkle Root:", bigIntToHex(root));
        console.log("   Issuer:", issuerAddress);
        console.log("   Timestamp:", currentTimestamp);
        console.log("   Proof Size:", (proofBytes.length - 2) / 2, "bytes");
        console.log("");
        console.log("🎯 下一步:");
        console.log("   1. 在 Foundry 测试中验证此 Proof");
        console.log("   2. 在前端集成 ZK Proof 生成");
        console.log("   3. 端到端测试完整流程");
        console.log("");
        
    } catch (error) {
        console.error("❌ Proof 生成失败:", error.message);
        if (error.stack) {
            console.error("\n详细错误:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// ============ 运行 ============

if (require.main === module) {
    generateTestProof()
        .then(() => process.exit(0))
        .catch(error => {
            console.error("Fatal error:", error);
            process.exit(1);
        });
}

module.exports = { generateTestProof };
