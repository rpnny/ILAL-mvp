#!/usr/bin/env node

/**
 * ILAL - 获取 Coinbase EAS Attestation
 * 
 * 功能：
 * 1. 从 Base Sepolia 获取用户的 Coinbase 验证 attestation
 * 2. 解析 attestation 数据
 * 3. 准备用于 ZK Proof 生成的输入
 */

const { ethers } = require("ethers");

// ============ 配置 ============

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021"; // Base Sepolia EAS

// Coinbase Verification Schemas
// Source: https://github.com/coinbase/verifications
const SCHEMAS = {
    // Base Sepolia (Development)
    SEPOLIA: {
        VERIFIED_ACCOUNT: "0x2f34a2ffe5f87b2f45fbc7c784896b768d77261e2f24f77341ae43751c765a69",
        VERIFIED_COUNTRY: "0xef54ae90f47a187acc050ce631c55584fd4273c0ca9456ab21750921c3a84028",
        COINBASE_ONE:     "0xef8a28852c57170eafe8745aff8b47e22d36b8fb05476cc9ade66637974a1e8c",
    },
    // Base Mainnet (Production)
    MAINNET: {
        VERIFIED_ACCOUNT: "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9",
        VERIFIED_COUNTRY: "0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065",
        COINBASE_ONE:     "0x254bd1b63e0591fefa66818ca054c78627306f253f86be6023725a67ee6bf9f4",
    },
};

// Attester addresses
const COINBASE_ATTESTER_SEPOLIA = "0xB5644397a9733f86Cacd928478B29b4cD6041C45"; // Base Sepolia
const COINBASE_ATTESTER_MAINNET = "0x357458739F90461b99789350868CD7CF330Dd7EE"; // Base Mainnet

// Coinbase Indexer (use this for efficient lookups instead of scanning events)
const COINBASE_INDEXER_SEPOLIA  = "0xd147a19c3B085Fb9B0c15D2EAAFC6CB086ea849B";
const COINBASE_INDEXER_MAINNET  = "0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C";

// Use testnet by default; set NETWORK=mainnet env var for production
const IS_MAINNET = process.env.NETWORK === "mainnet";
const ACTIVE_SCHEMAS  = IS_MAINNET ? SCHEMAS.MAINNET  : SCHEMAS.SEPOLIA;
const COINBASE_ATTESTER = IS_MAINNET ? COINBASE_ATTESTER_MAINNET : COINBASE_ATTESTER_SEPOLIA;
const COINBASE_INDEXER  = IS_MAINNET ? COINBASE_INDEXER_MAINNET  : COINBASE_INDEXER_SEPOLIA;

// EAS ABI (简化版)
const EAS_ABI = [
    "function getAttestation(bytes32 uid) external view returns (tuple(bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))",
    "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)"
];

// ============ 主函数 ============

// Coinbase Indexer ABI (getAttestationUid)
const COINBASE_INDEXER_ABI = [
    "function getAttestationUid(address recipient, bytes32 schemaUID) external view returns (bytes32)",
];

async function fetchAttestations(userAddress) {
    const network = IS_MAINNET ? "Base Mainnet" : "Base Sepolia";
    console.log("🔍 ILAL - 获取 EAS Attestations");
    console.log("=" .repeat(50));
    console.log("");
    
    console.log("用户地址:", userAddress);
    console.log("网络:", network);
    console.log("Coinbase Attester:", COINBASE_ATTESTER);
    console.log("");
    
    console.log("📡 连接到", network + "...");
    const rpc = IS_MAINNET ? "https://mainnet.base.org" : BASE_SEPOLIA_RPC;
    const provider = new ethers.JsonRpcProvider(rpc);
    const eas = new ethers.Contract(EAS_CONTRACT_ADDRESS, EAS_ABI, provider);
    const indexer = new ethers.Contract(COINBASE_INDEXER, COINBASE_INDEXER_ABI, provider);
    
    console.log("✅ 已连接");
    console.log("");
    
    // 优先通过 Coinbase Indexer 查询（高效，不需要扫 events）
    console.log("🔎 通过 Coinbase Indexer 查询...");

    // 按优先级尝试各 schema: Verified Account > Coinbase One > Verified Country
    const schemasToTry = [
        { name: "Verified Account", uid: ACTIVE_SCHEMAS.VERIFIED_ACCOUNT },
        { name: "Coinbase One",     uid: ACTIVE_SCHEMAS.COINBASE_ONE },
        { name: "Verified Country", uid: ACTIVE_SCHEMAS.VERIFIED_COUNTRY },
    ];

    for (const schema of schemasToTry) {
        try {
            const attestationUID = await indexer.getAttestationUid(userAddress, schema.uid);

            if (attestationUID === ethers.ZeroHash) {
                console.log(`   [${schema.name}] 未找到 attestation`);
                continue;
            }

            console.log(`   [${schema.name}] UID: ${attestationUID}`);

            const attestation = await eas.getAttestation(attestationUID);

            if (attestation.revocationTime.toString() !== "0") {
                console.log(`   [${schema.name}] 已被撤销，跳过`);
                continue;
            }

            console.log("");
            console.log("📄 Attestation 详情:");
            console.log("   Schema:", schema.name, `(${schema.uid})`);
            console.log("   UID:", attestationUID);
            console.log("   Time:", new Date(Number(attestation.time) * 1000).toISOString());
            console.log("   Expiration:", attestation.expirationTime.toString() === "0"
                ? "永不过期"
                : new Date(Number(attestation.expirationTime) * 1000).toISOString());
            console.log("   Data length:", attestation.data.length);

            const parsedData = parseAttestationData(attestation, schema.uid);

            return {
                uid: attestationUID,
                schema: schema.uid,
                schemaName: schema.name,
                attester: attestation.attester,
                recipient: attestation.recipient,
                time: attestation.time,
                expirationTime: attestation.expirationTime,
                revocationTime: attestation.revocationTime,
                data: attestation.data,
                parsed: parsedData,
                isReal: true,
            };

        } catch (error) {
            console.log(`   [${schema.name}] 查询失败: ${error.message}`);
        }
    }

    console.log("");
    console.log("⚠️  未找到任何有效的 Coinbase attestation");
    console.log("");
    console.log("可能的原因:");
    console.log("1. 用户尚未完成 Coinbase 验证");
    console.log("2. 账户不满足验证条件");
    console.log("");
    console.log("建议:");
    console.log("- 访问 https://www.coinbase.com/onchain-verify");
    console.log("- 完成身份验证");
    console.log("");

    return createMockAttestation(userAddress);
}

/**
 * 解析 attestation data
 */
function parseAttestationData(attestation, schemaUID) {
    console.log("");
    console.log("🔍 解析 attestation data...");
    
    // 根据不同的 schema 解析数据
    if (schemaUID === ACTIVE_SCHEMAS.VERIFIED_ACCOUNT) {
        // Coinbase Verified Account schema: bool verifiedAccount
        try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["bool"],
                attestation.data
            );
            console.log("   Verified Account:", decoded[0]);
            return { type: "VERIFIED_ACCOUNT", verifiedAccount: decoded[0] };
        } catch (error) {
            console.log("   解析失败，原始数据:", attestation.data);
            return { type: "UNKNOWN", raw: attestation.data };
        }
    } else if (schemaUID === ACTIVE_SCHEMAS.COINBASE_ONE) {
        // Coinbase One schema: bool hasActiveCoinbaseOne
        try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["bool"],
                attestation.data
            );
            console.log("   Coinbase One Active:", decoded[0]);
            return { type: "COINBASE_ONE", hasActiveCoinbaseOne: decoded[0] };
        } catch (error) {
            console.log("   解析失败，原始数据:", attestation.data);
            return { type: "UNKNOWN", raw: attestation.data };
        }
    } else if (schemaUID === ACTIVE_SCHEMAS.VERIFIED_COUNTRY) {
        // Coinbase Verified Country schema: string countryCode (ISO 3166-1 alpha-2)
        try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["string"],
                attestation.data
            );
            console.log("   Country Code:", decoded[0]);
            return { type: "VERIFIED_COUNTRY", countryCode: decoded[0] };
        } catch (error) {
            // Fallback: try uint16 encoding (legacy format)
            try {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                    ["uint16"],
                    attestation.data
                );
                console.log("   Country Code (uint16):", decoded[0]);
                return { type: "VERIFIED_COUNTRY", countryCode: decoded[0] };
            } catch {
                console.log("   解析失败，原始数据:", attestation.data);
                return { type: "UNKNOWN", raw: attestation.data };
            }
        }
    } else {
        console.log("   未知 schema，原始数据:", attestation.data);
        return { type: "UNKNOWN", raw: attestation.data };
    }
}

/**
 * 创建模拟 attestation（用于开发）
 */
function createMockAttestation(userAddress) {
    console.log("");
    console.log("🎭 创建模拟 Attestation (开发用)");
    console.log("");
    console.log("注意: 这是模拟数据，不是真实的链上 attestation");
    console.log("");
    
    return {
        uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        schema: SCHEMAS.VERIFIED_ACCOUNT,
        attester: COINBASE_ATTESTER,
        recipient: userAddress,
        time: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1 天前
        expirationTime: BigInt(0), // 永不过期
        revocationTime: BigInt(0), // 未撤销
        data: ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]),
        parsed: {
            type: "VERIFIED_ACCOUNT",
            verifiedAccount: true
        },
        isReal: false,
        isMock: true
    };
}

/**
 * 将 attestation 转换为 ZK 电路输入格式
 */
function attestationToCircuitInput(attestation, userAddress) {
    console.log("");
    console.log("🔄 转换为电路输入格式...");
    
    // 提取 KYC 状态
    let kycStatus = 1; // 默认已通过
    if (attestation.parsed && attestation.parsed.type === "VERIFIED_ACCOUNT") {
        kycStatus = attestation.parsed.verifiedAccount ? 1 : 0;
    }
    
    // 提取国家代码
    let countryCode = 840; // 默认美国
    if (attestation.parsed && attestation.parsed.type === "VERIFIED_COUNTRY") {
        countryCode = attestation.parsed.countryCode;
    }
    
    // 时间戳
    const timestamp = Number(attestation.time);
    
    const result = {
        userAddress: userAddress,
        issuerAddress: attestation.attester,
        kycStatus: kycStatus,
        countryCode: countryCode,
        timestamp: timestamp,
        attestationUID: attestation.uid,
        schemaUID: attestation.schema,
        isMock: attestation.isMock || false
    };
    
    console.log("");
    console.log("电路输入:");
    console.log("- userAddress:", result.userAddress);
    console.log("- issuerAddress:", result.issuerAddress);
    console.log("- kycStatus:", result.kycStatus);
    console.log("- countryCode:", result.countryCode);
    console.log("- timestamp:", result.timestamp);
    console.log("- isMock:", result.isMock);
    
    return result;
}

// ============ CLI ============

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log("用法: node fetch-eas-attestation.js <user_address>");
        console.log("");
        console.log("示例:");
        console.log("  node fetch-eas-attestation.js 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        console.log("");
        process.exit(1);
    }
    
    const userAddress = args[0];
    
    // 验证地址格式
    if (!ethers.isAddress(userAddress)) {
        console.error("❌ 无效的以太坊地址");
        process.exit(1);
    }
    
    try {
        // 获取 attestations
        const attestation = await fetchAttestations(userAddress);
        
        // 转换为电路输入
        const circuitInput = attestationToCircuitInput(attestation, userAddress);
        
        // 保存到文件
        const fs = require("fs");
        const path = require("path");
        const outputDir = path.join(__dirname, "../eas-data");
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputFile = path.join(outputDir, "attestation-data.json");
        
        // 自定义 JSON.stringify 处理 BigInt
        const jsonString = JSON.stringify({
            attestation,
            circuitInput
        }, (key, value) => {
            // 将 BigInt 转换为字符串
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        }, 2);
        
        fs.writeFileSync(outputFile, jsonString);
        
        console.log("");
        console.log("💾 数据已保存:");
        console.log("   " + outputFile);
        console.log("");
        console.log("=" .repeat(50));
        console.log("✅ 完成！");
        console.log("");
        
        if (circuitInput.isMock) {
            console.log("⚠️  警告: 使用的是模拟数据");
            console.log("   请访问 https://www.coinbase.com/onchain-verify 完成真实验证");
            console.log("");
        }
        
    } catch (error) {
        console.error("❌ 错误:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    fetchAttestations,
    attestationToCircuitInput,
    createMockAttestation
};
