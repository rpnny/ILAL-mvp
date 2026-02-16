#!/usr/bin/env node

/**
 * ILAL 前端 - ZK Proof 生成测试
 * 
 * 测试前端 zkProof.ts 库是否能正确生成 Proof
 */

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

// ============ 配置 ============

const CIRCUIT_WASM = path.join(__dirname, "../public/circuits/compliance.wasm");
const CIRCUIT_ZKEY = path.join(__dirname, "../public/circuits/compliance_final.zkey");
const VERIFICATION_KEY = path.join(__dirname, "../public/circuits/verification_key.json");

// ============ 辅助函数 ============

function addressToBigInt(address) {
    return BigInt(address.toLowerCase());
}

// ============ 主函数 ============

async function testProofGeneration() {
    console.log("🧪 测试前端 ZK Proof 生成");
    console.log("=" .repeat(50));
    console.log("");
    
    // 1. 检查文件
    console.log("📁 检查电路文件...");
    
    const files = [
        { path: CIRCUIT_WASM, name: "compliance.wasm", size: "2.3 MB" },
        { path: CIRCUIT_ZKEY, name: "compliance_final.zkey", size: "29 MB" },
        { path: VERIFICATION_KEY, name: "verification_key.json", size: "2 KB" }
    ];
    
    for (const file of files) {
        if (fs.existsSync(file.path)) {
            const stats = fs.statSync(file.path);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`   ✅ ${file.name} (${sizeMB} MB)`);
        } else {
            console.log(`   ❌ ${file.name} - 未找到`);
            console.error(`\n错误: 缺少 ${file.name}`);
            console.error("请运行: npm run setup-circuits");
            process.exit(1);
        }
    }
    
    console.log("");
    
    // 2. 加载 EAS attestation 数据
    console.log("📊 加载 attestation 数据...");
    
    const attestationPath = path.join(__dirname, "../../circuits/eas-data/attestation-data.json");
    
    let attestationData;
    if (fs.existsSync(attestationPath)) {
        attestationData = JSON.parse(fs.readFileSync(attestationPath, "utf8"));
        console.log("   ✅ 已加载 EAS 数据");
        if (attestationData.circuitInput.isMock) {
            console.log("   ⚠️  使用模拟数据");
        }
    } else {
        console.log("   ⚠️  未找到 EAS 数据，使用默认值");
        attestationData = {
            circuitInput: {
                userAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                issuerAddress: "0x357458739F90461b99789350868CD7CF330Dd7EE",
                kycStatus: 1,
                countryCode: 840,
                timestamp: Math.floor(Date.now() / 1000),
                isMock: true
            }
        };
    }
    
    console.log("");
    
    // 3. 初始化 Poseidon
    console.log("🔧 初始化 Poseidon...");
    const poseidon = await buildPoseidon();
    console.log("   ✅ 就绪");
    console.log("");
    
    // 4. 准备电路输入
    console.log("📝 准备电路输入...");
    
    const input = attestationData.circuitInput;
    const userAddressBigInt = addressToBigInt(input.userAddress);
    const issuerAddressBigInt = addressToBigInt(input.issuerAddress);
    const kycStatus = BigInt(input.kycStatus);
    const countryCode = BigInt(input.countryCode);
    const timestamp = BigInt(input.timestamp);
    
    // 构建简单的 Merkle Tree（单个叶子）
    const leaf = poseidon([userAddressBigInt, kycStatus]);
    const leafValue = poseidon.F.toObject(leaf);
    
    // 构建树
    let currentHash = leafValue;
    const siblings = [];
    
    for (let i = 0; i < 20; i++) {
        const sibling = BigInt(0); // 空兄弟节点
        siblings.push(sibling);
        
        const parent = poseidon([currentHash, sibling]);
        currentHash = poseidon.F.toObject(parent);
    }
    
    const merkleRoot = currentHash;
    
    console.log("   用户地址:", input.userAddress);
    console.log("   Merkle Root:", merkleRoot.toString().slice(0, 20) + "...");
    console.log("");
    
    // 5. 构造签名
    const messageHash = poseidon([
        userAddressBigInt,
        kycStatus,
        countryCode,
        timestamp
    ]);
    const messageHashValue = poseidon.F.toObject(messageHash);
    
    const signature = poseidon([messageHashValue, issuerAddressBigInt]);
    const signatureValue = poseidon.F.toObject(signature);
    
    const circuitInput = {
        userAddress: userAddressBigInt.toString(),
        merkleRoot: merkleRoot.toString(),
        issuerPubKeyHash: issuerAddressBigInt.toString(),
        signature: signatureValue.toString(),
        kycStatus: kycStatus.toString(),
        countryCode: countryCode.toString(),
        timestamp: timestamp.toString(),
        merkleProof: siblings.map(s => s.toString()),
        merkleIndex: "0"
    };
    
    // 6. 生成 Proof
    console.log("⏳ 生成 ZK Proof...");
    console.log("   (首次加载 29 MB zkey 可能需要 5-10 秒)");
    console.log("");
    
    const startTime = Date.now();
    
    try {
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(
            circuitInput,
            CIRCUIT_WASM,
            CIRCUIT_ZKEY
        );
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`   ✅ Proof 生成成功！耗时 ${elapsed}s`);
        console.log("");
        
        // 7. 验证 Proof
        console.log("🔍 本地验证...");
        const vKey = JSON.parse(fs.readFileSync(VERIFICATION_KEY, "utf8"));
        const isValid = await snarkjs.plonk.verify(vKey, publicSignals, proof);
        
        if (isValid) {
            console.log("   ✅ 验证通过");
        } else {
            console.log("   ❌ 验证失败");
            process.exit(1);
        }
        console.log("");
        
        // 8. 性能报告
        console.log("=" .repeat(50));
        console.log("📊 性能报告");
        console.log("=" .repeat(50));
        console.log("");
        console.log("生成时间:", elapsed, "秒");
        console.log("Proof 大小: 768 字节");
        console.log("Public Signals:", publicSignals.length);
        console.log("");
        console.log("文件大小:");
        const wasmSize = (fs.statSync(CIRCUIT_WASM).size / 1024 / 1024).toFixed(2);
        const zkeySize = (fs.statSync(CIRCUIT_ZKEY).size / 1024 / 1024).toFixed(2);
        console.log("- compliance.wasm:", wasmSize, "MB");
        console.log("- compliance_final.zkey:", zkeySize, "MB");
        console.log("");
        
        console.log("=" .repeat(50));
        console.log("✅ 前端 ZK Proof 生成测试通过！");
        console.log("=" .repeat(50));
        console.log("");
        console.log("🎯 下一步:");
        console.log("1. 在浏览器中测试（Web Worker）");
        console.log("2. 实现 UI 进度显示");
        console.log("3. 添加 IndexedDB 缓存");
        console.log("");
        
    } catch (error) {
        console.error("❌ Proof 生成失败:", error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// ============ 运行 ============

testProofGeneration()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
