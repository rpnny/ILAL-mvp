#!/usr/bin/env node

/**
 * ILAL - 测试 Proof 生成脚本
 * 
 * 功能：
 * 1. 生成测试输入数据
 * 2. 使用 snarkjs 生成 PLONK Proof
 * 3. 验证 Proof 本地有效
 * 4. 导出合约调用格式
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

function hexToBigInt(hex) {
    return BigInt(hex);
}

function addressToBigInt(address) {
    // 移除 0x 并转换为 BigInt
    return BigInt(address.toLowerCase());
}

function createMockAttestation(userAddress) {
    // 模拟 EAS Attestation 数据
    const attestationUID = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    // Coinbase KYC Schema (示例)
    const schema = "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9";
    const issuer = "0x357458739F90461b99789350868CD7CF330Dd7EE"; // Coinbase Attester
    
    return {
        uid: attestationUID,
        schema: schema,
        issuer: issuer,
        recipient: userAddress,
        time: Math.floor(Date.now() / 1000) - 86400, // 1 天前
        expirationTime: 0, // 永不过期
        revocationTime: 0,
        data: "0x00" // 空数据
    };
}

// ============ Merkle Tree 函数 ============

async function buildMerkleTree(leaves, poseidon) {
    // 简化的 Merkle Tree 构建
    // 实际应用中应该使用完整的 Merkle Tree 库
    
    if (leaves.length === 0) {
        throw new Error("No leaves provided");
    }
    
    // 确保是 2 的幂
    const treeSize = Math.pow(2, Math.ceil(Math.log2(leaves.length)));
    const paddedLeaves = [...leaves];
    
    // 填充到 2 的幂
    while (paddedLeaves.length < treeSize) {
        paddedLeaves.push(BigInt(0));
    }
    
    // 构建树
    let currentLevel = paddedLeaves;
    const tree = [currentLevel];
    
    while (currentLevel.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1];
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

function getMerkleProof(tree, leafIndex, depth) {
    const proof = [];
    const pathIndices = [];
    
    let currentIndex = leafIndex;
    
    for (let level = 0; level < depth; level++) {
        if (!tree[level] || tree[level].length === 0) {
            // 如果树的层级不足，用 0 填充
            proof.push(BigInt(0));
            pathIndices.push(0);
            currentIndex = Math.floor(currentIndex / 2);
            continue;
        }
        
        const isRightNode = currentIndex % 2 === 1;
        const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
        
        const sibling = (siblingIndex < tree[level].length) 
            ? tree[level][siblingIndex] 
            : BigInt(0);
        
        proof.push(sibling);
        pathIndices.push(isRightNode ? 1 : 0);
        
        currentIndex = Math.floor(currentIndex / 2);
    }
    
    return { proof, pathIndices };
}

// ============ 主函数 ============

async function generateTestProof() {
    console.log("🚀 ILAL 测试 Proof 生成");
    console.log("=" .repeat(50));
    console.log("");
    
    // 1. 检查文件
    console.log("📁 检查必要文件...");
    
    if (!fs.existsSync(CIRCUIT_WASM)) {
        console.error("❌ 未找到电路 WASM 文件:", CIRCUIT_WASM);
        console.error("   请先运行: cd scripts && ./compile.sh");
        process.exit(1);
    }
    
    if (!fs.existsSync(CIRCUIT_ZKEY)) {
        console.error("❌ 未找到 zkey 文件:", CIRCUIT_ZKEY);
        console.error("   请先运行: cd scripts && ./setup.sh");
        process.exit(1);
    }
    
    if (!fs.existsSync(VERIFICATION_KEY)) {
        console.error("❌ 未找到验证密钥:", VERIFICATION_KEY);
        console.error("   请先运行: cd scripts && ./setup.sh");
        process.exit(1);
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
    
    const testUser = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Anvil 测试账户
    const userAddressBigInt = addressToBigInt(testUser);
    
    console.log("   测试用户:", testUser);
    console.log("   用户地址 (BigInt):", userAddressBigInt.toString());
    
    // 创建模拟 Attestation
    const attestation = createMockAttestation(testUser);
    console.log("   Attestation UID:", attestation.uid);
    
    // 4. 构建 Merkle Tree
    console.log("");
    console.log("🌳 构建 Merkle Tree...");
    
    // 创建一些叶子节点（包含测试用户）
    const issuerAddress = addressToBigInt(attestation.issuer);
    
    // Leaf = Hash(userAddress, kycStatus)
    // 注意：必须与电路中的 leafHasher 定义一致
    const kycStatusValue = BigInt(1); // 1 = 已通过
    const leaf = poseidon([userAddressBigInt, kycStatusValue]);
    const leafValue = poseidon.F.toObject(leaf);
    
    console.log("   Leaf Hash:", leafValue.toString());
    
    // 构建包含多个叶子的树（模拟多个用户）
    const leaves = [
        leafValue,
        BigInt("123456789"),  // 其他用户
        BigInt("987654321"),
        BigInt("555555555")
    ];
    
    const TREE_DEPTH = 20; // 必须与电路一致
    const { root, tree } = await buildMerkleTree(leaves, poseidon);
    
    console.log("   Merkle Root:", root.toString());
    console.log("   Tree Depth:", TREE_DEPTH);
    
    // 5. 获取 Merkle Proof
    console.log("");
    console.log("🔐 生成 Merkle Proof...");
    
    const leafIndex = 0; // 测试用户在第一个位置
    const { proof: merkleProof, pathIndices } = getMerkleProof(tree, leafIndex, TREE_DEPTH);
    
    console.log("   Leaf Index:", leafIndex);
    console.log("   Path Indices:", pathIndices.slice(0, 5).join(", "), "...");
    console.log("   Siblings:", merkleProof.length);
    
    // 6. 准备电路输入
    console.log("");
    console.log("📝 准备电路输入...");
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // 根据实际电路定义准备输入
    // 公共输入: userAddress, merkleRoot, issuerPubKeyHash
    // 私有输入: signature, kycStatus, countryCode, timestamp, merkleProof, merkleIndex
    
    const kycStatus = kycStatusValue; // 使用之前定义的值
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
    const signature = poseidon([messageHashValue, issuerAddress]);
    const signatureValue = poseidon.F.toObject(signature);
    
    console.log("   Message Hash:", messageHashValue.toString());
    console.log("   Signature:", signatureValue.toString());
    
    const circuitInput = {
        // 公共输入
        userAddress: userAddressBigInt.toString(),
        merkleRoot: root.toString(),
        issuerPubKeyHash: issuerAddress.toString(),
        
        // 私有输入
        signature: signatureValue.toString(),
        kycStatus: kycStatus.toString(),
        countryCode: countryCode.toString(),
        timestamp: currentTimestamp.toString(),
        merkleProof: merkleProof.map(s => s.toString()),
        merkleIndex: leafIndex.toString()
    };
    
    console.log("   公共输入: userAddress, merkleRoot, issuerPubKeyHash");
    console.log("   私有输入: signature, kycStatus, countryCode, timestamp, merkleProof, merkleIndex");
    
    // 7. 生成 Proof
    console.log("");
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
        
        console.log("   Proof 长度:", proofBytes.length - 2, "字符 (", (proofBytes.length - 2) / 2, "字节)");
        console.log("   Public Signals:", publicSignals.length);
        
        // 10. 保存输出
        console.log("");
        console.log("💾 保存输出文件...");
        
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        // 保存电路输入
        const inputFile = path.join(OUTPUT_DIR, "test-input.json");
        fs.writeFileSync(inputFile, JSON.stringify(circuitInput, null, 2));
        console.log("   ✅", inputFile);
        
        // 保存原始 Proof
        const proofFile = path.join(OUTPUT_DIR, "test-proof.json");
        fs.writeFileSync(proofFile, JSON.stringify({ proof, publicSignals }, null, 2));
        console.log("   ✅", proofFile);
        
        // 保存合约调用格式
        const contractCallData = {
            proofBytes: proofBytes,
            publicSignals: publicSignals,
            userAddress: testUser,
            merkleRoot: bigIntToHex(root),
            timestamp: currentTimestamp
        };
        
        const contractFile = path.join(OUTPUT_DIR, "contract-call-data.json");
        fs.writeFileSync(contractFile, JSON.stringify(contractCallData, null, 2));
        console.log("   ✅", contractFile);
        
        // 保存 Foundry 测试格式
        const foundryData = {
            proof: proofHex,
            publicInputs: publicSignals.map(s => s.toString())
        };
        
        const foundryFile = path.join(OUTPUT_DIR, "foundry-test-data.json");
        fs.writeFileSync(foundryFile, JSON.stringify(foundryData, null, 2));
        console.log("   ✅", foundryFile);
        
        // 11. 打印使用说明
        console.log("");
        console.log("=" .repeat(50));
        console.log("🎉 测试 Proof 生成完成！");
        console.log("=" .repeat(50));
        console.log("");
        console.log("📋 使用方法:");
        console.log("");
        console.log("1️⃣  Foundry 测试:");
        console.log("   cd contracts");
        console.log("   forge test --match-test test_RealProof -vvv");
        console.log("");
        console.log("2️⃣  Cast 调用:");
        console.log("   cast send $SESSION_MANAGER \\");
        console.log("     'verifyAndStartSession(bytes,uint256[])' \\");
        console.log(`     ${proofBytes} \\`);
        console.log(`     '[${publicSignals.join(",")}]' \\`);
        console.log("     --private-key $PRIVATE_KEY");
        console.log("");
        console.log("3️⃣  前端使用:");
        console.log("   import proofData from './test-data/contract-call-data.json'");
        console.log("   await sessionManager.verifyAndStartSession(");
        console.log("     proofData.proofBytes,");
        console.log("     proofData.publicSignals");
        console.log("   )");
        console.log("");
        console.log("📊 关键数据:");
        console.log("   User:", testUser);
        console.log("   Merkle Root:", bigIntToHex(root));
        console.log("   Timestamp:", currentTimestamp);
        console.log("   Proof Size:", (proofBytes.length - 2) / 2, "bytes");
        console.log("");
        
    } catch (error) {
        console.error("❌ Proof 生成失败:", error.message);
        console.error(error);
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
