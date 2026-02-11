pragma circom 2.1.0;

include "poseidon.circom";
include "comparators.circom";
include "bitify.circom";

/**
 * ILAL 合规验证电路 (PLONK)
 * 
 * 功能：
 * 1. 验证 Issuer 对用户数据的签名
 * 2. 检查 KYC 状态（已通过）
 * 3. 验证用户在允许列表中（Merkle 证明）
 * 4. 确保地址绑定（防止证明转移）
 * 
 * 使用 Poseidon 哈希（ZK 友好）
 */

/**
 * Merkle 树验证器
 * @param levels - 树的深度（20 = 支持 2^20 = 1,048,576 用户）
 */
template MerkleTreeChecker(levels) {
    signal input leaf;           // 叶节点哈希
    signal input root;           // Merkle 根
    signal input pathElements[levels];  // Merkle 路径
    signal input pathIndices[levels];   // 路径索引 (0=左, 1=右)

    component poseidons[levels];
    component selectors[levels];

    // 从叶节点开始逐层计算
    signal computedHash[levels + 1];
    computedHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // 选择左右节点顺序
        selectors[i] = DualMux();
        selectors[i].in[0] <== computedHash[i];
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        // 计算父节点哈希
        poseidons[i] = Poseidon(2);
        poseidons[i].inputs[0] <== selectors[i].out[0];
        poseidons[i].inputs[1] <== selectors[i].out[1];

        computedHash[i + 1] <== poseidons[i].out;
    }

    // 验证计算出的根与公共输入匹配
    root === computedHash[levels];
}

/**
 * 双路选择器（用于 Merkle 路径选择）
 */
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0; // s 必须是 0 或 1

    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

/**
 * 简化的签名验证器
 * 
 * 注意：生产环境中应使用完整的 EdDSA 或 ECDSA 验证
 * 此处为简化实现，假设签名是 Issuer 对数据的 Poseidon 哈希
 */
template SignatureVerifier() {
    signal input message;         // 待验证的消息
    signal input signature;       // 签名值
    signal input issuerPubKey;    // Issuer 公钥哈希

    // 简化验证：signature = Poseidon(message, issuerPubKey)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== message;
    hasher.inputs[1] <== issuerPubKey;

    // 验证签名匹配
    signature === hasher.out;
}

/**
 * 主合规验证电路
 */
template ComplianceVerifier(merkleTreeLevels) {
    // ============ 公共输入 ============
    // 这些值在链上公开，由 Verifier 合约验证
    
    signal input userAddress;        // 用户以太坊地址 (uint256)
    signal input merkleRoot;         // 允许列表 Merkle 根
    signal input issuerPubKeyHash;   // Issuer 公钥哈希
    
    // ============ 私有输入 ============
    // 这些值仅证明者知道，不在链上公开
    
    signal input signature;          // Issuer 签名
    signal input kycStatus;          // KYC 状态 (1 = 已通过)
    signal input countryCode;        // 国家代码 (例如 840 = 美国)
    signal input timestamp;          // 签发时间戳
    
    // Merkle 证明相关
    signal input merkleProof[merkleTreeLevels];   // Merkle 路径
    signal input merkleIndex;                      // 用户在树中的索引
    
    // ============ 约束 1: KYC 状态检查 ============
    
    component kycCheck = IsEqual();
    kycCheck.in[0] <== kycStatus;
    kycCheck.in[1] <== 1;  // 必须是 1 (已通过)
    kycCheck.out === 1;
    
    // ============ 约束 2: Issuer 签名验证 ============
    
    // 构造待签名消息: Hash(userAddress, kycStatus, countryCode, timestamp)
    component messageHasher = Poseidon(4);
    messageHasher.inputs[0] <== userAddress;
    messageHasher.inputs[1] <== kycStatus;
    messageHasher.inputs[2] <== countryCode;
    messageHasher.inputs[3] <== timestamp;
    
    // 验证 Issuer 签名
    component sigVerifier = SignatureVerifier();
    sigVerifier.message <== messageHasher.out;
    sigVerifier.signature <== signature;
    sigVerifier.issuerPubKey <== issuerPubKeyHash;
    
    // ============ 约束 3: Merkle 树验证 ============
    
    // 构造叶节点: Hash(userAddress, kycStatus)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== userAddress;
    leafHasher.inputs[1] <== kycStatus;
    
    // 验证用户在允许列表中
    component merkleChecker = MerkleTreeChecker(merkleTreeLevels);
    merkleChecker.leaf <== leafHasher.out;
    merkleChecker.root <== merkleRoot;
    
    for (var i = 0; i < merkleTreeLevels; i++) {
        merkleChecker.pathElements[i] <== merkleProof[i];
    }
    
    // 将索引转换为二进制路径
    component indexBits = Num2Bits(merkleTreeLevels);
    indexBits.in <== merkleIndex;
    
    for (var i = 0; i < merkleTreeLevels; i++) {
        merkleChecker.pathIndices[i] <== indexBits.out[i];
    }
    
    // ============ 约束 4: 国家代码检查（可选）============
    
    // TODO: 如果需要黑名单检查，在此添加
    // 例如：确保 countryCode 不在禁止列表中
    
    // ============ 输出信号 ============
    
    // 无输出信号 - 如果约束全部满足，证明有效
    // userAddress 作为公共输入已隐式绑定
}

// 实例化主电路
// merkleTreeLevels = 20 支持最多 2^20 = 1,048,576 用户
component main {public [userAddress, merkleRoot, issuerPubKeyHash]} = ComplianceVerifier(20);
