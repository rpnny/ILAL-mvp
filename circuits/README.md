# ILAL ZK 电路 (PLONK)

**算法选择**: PLONK (Phase 0 决策)  
**实现工具**: Circom + SnarkJS  
**Setup**: Hermez Universal Powers of Tau

---

## 目录结构

```
circuits/
├── compliance.circom         # 主合规电路
├── lib/                     # 依赖库
│   ├── eddsa.circom         # EdDSA 签名验证
│   ├── merkle.circom        # Merkle 树验证
│   └── comparators.circom   # 比较器
├── scripts/
│   ├── compile.sh           # 编译脚本
│   ├── setup.sh             # Setup 脚本
│   ├── generate-proof.js    # 证明生成
│   └── verify.js            # 本地验证
├── build/                   # 编译输出
│   ├── compliance.r1cs
│   ├── compliance_js/
│   └── compliance.wasm
└── keys/                    # 密钥文件
    ├── pot_final.ptau       # Powers of Tau (下载)
    ├── compliance.zkey      # 验证密钥
    └── verification_key.json
```

---

## 电路设计

### 公共输入 (Public Inputs)

```circom
// 所有人可见的输入
signal input userAddress;        // 用户地址 (uint256)
signal input merkleRoot;         // 允许列表 Merkle 根
signal input issuerPubKeyHash;   // Issuer 公钥哈希
```

### 私有输入 (Private Inputs)

```circom
// 仅证明者知道的输入
signal input signature[3];       // Issuer EdDSA 签名 (R, S, A)
signal input kycPassed;          // KYC 是否通过 (1 = 通过)
signal input countryCode;        // 用户国家代码
signal input merkleProof[20];    // Merkle 路径 (最多 2^20 用户)
signal input merkleIndex;        // 用户在树中的索引
```

### 电路约束

1. **Issuer 签名验证**
   ```circom
   // 验证 Issuer 对用户数据的 EdDSA 签名
   component verifySignature = EdDSAMiMCVerifier();
   verifySignature.enabled <== 1;
   verifySignature.Ax <== issuerPubKey[0];
   verifySignature.Ay <== issuerPubKey[1];
   verifySignature.R8x <== signature[0];
   verifySignature.R8y <== signature[1];
   verifySignature.S <== signature[2];
   verifySignature.M <== Poseidon([userAddress, kycPassed, countryCode]);
   ```

2. **KYC 状态检查**
   ```circom
   // 确保 KYC 已通过
   component kycCheck = IsEqual();
   kycCheck.in[0] <== kycPassed;
   kycCheck.in[1] <== 1;
   kycCheck.out === 1; // 必须通过
   ```

3. **Merkle 树验证**
   ```circom
   // 验证用户在允许列表中
   component merkleVerifier = MerkleTreeChecker(20);
   merkleVerifier.leaf <== Poseidon([userAddress, kycPassed]);
   merkleVerifier.root <== merkleRoot;
   for (var i = 0; i < 20; i++) {
       merkleVerifier.pathElements[i] <== merkleProof[i];
   }
   merkleVerifier.pathIndices <== merkleIndex;
   ```

4. **国家代码检查** (可选)
   ```circom
   // 确保国家不在黑名单 (如需要)
   // 可以通过检查 countryCode 是否在预定义列表
   ```

---

## 安装依赖

### 1. 安装 Circom

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 克隆 Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# 验证
circom --version  # 应该显示 2.1.x
```

### 2. 安装 SnarkJS

```bash
npm install -g snarkjs@latest

# 验证
snarkjs --version  # 应该显示 0.7.x
```

### 3. 下载 Powers of Tau

```bash
cd circuits/keys

# 使用 Hermez 的公共 Powers of Tau (PLONK Universal Setup)
# 下载 pot20_final.ptau (~100 MB)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau \
     -O pot20_final.ptau

# 或使用更大的 pot21 (支持更复杂电路)
# wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_21.ptau
```

---

## 编译电路

```bash
cd circuits

# 1. 编译电路生成 R1CS 和 WASM
circom compliance.circom \
    --r1cs --wasm --sym \
    -o build

# 输出:
# - build/compliance.r1cs
# - build/compliance_js/compliance.wasm
# - build/compliance.sym
```

---

## PLONK Setup

```bash
cd circuits

# 1. 生成 PLONK 验证密钥 (使用 Universal Powers of Tau)
snarkjs plonk setup \
    build/compliance.r1cs \
    keys/pot20_final.ptau \
    keys/compliance.zkey

# 2. 导出验证密钥 (用于链上验证)
snarkjs zkey export verificationkey \
    keys/compliance.zkey \
    keys/verification_key.json

# 3. 导出 Solidity 验证器
snarkjs zkey export solidityverifier \
    keys/compliance.zkey \
    ../contracts/src/core/PlonkVerifier.sol

# 4. (可选) 验证 zkey
snarkjs zkey verify \
    build/compliance.r1cs \
    keys/pot20_final.ptau \
    keys/compliance.zkey
```

**关键优势**: PLONK 不需要针对每个电路的 Trusted Setup！只需要一次性的 Universal Setup (Powers of Tau)。

---

## 生成和验证证明

### 准备输入

```javascript
// scripts/input.json
{
  "userAddress": "12345678901234567890", // uint256 格式
  "merkleRoot": "1234...5678",
  "issuerPubKeyHash": "abcd...ef",
  "signature": ["111", "222", "333"],
  "kycPassed": "1",
  "countryCode": "840", // 美国
  "merkleProof": ["...", "..."], // 20 个节点
  "merkleIndex": "42"
}
```

### 生成证明

```bash
# 使用 SnarkJS 生成证明
snarkjs plonk prove \
    keys/compliance.zkey \
    build/compliance_js/compliance.wasm \
    scripts/input.json \
    scripts/proof.json \
    scripts/public.json

# 输出:
# - proof.json: 证明数据
# - public.json: 公共输入
```

### 本地验证

```bash
# 验证证明
snarkjs plonk verify \
    keys/verification_key.json \
    scripts/public.json \
    scripts/proof.json

# 输出: "OK!" 表示验证通过
```

### 导出为合约调用格式

```bash
# 生成 Solidity calldata
snarkjs zkey export soliditycalldata \
    scripts/public.json \
    scripts/proof.json

# 输出可直接用于合约调用的参数
```

---

## 集成到前端

### Web Worker 方式 (推荐)

```typescript
// frontend/workers/zkProof.worker.ts
importScripts('/snarkjs.min.js');

self.onmessage = async (e) => {
  const { input } = e.data;
  
  // 加载 WASM 和 zkey
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(
    input,
    '/circuits/compliance.wasm',
    '/circuits/compliance.zkey'
  );
  
  self.postMessage({ proof, publicSignals });
};
```

### 前端调用

```typescript
const worker = new Worker('/workers/zkProof.worker.js');

worker.postMessage({
  input: {
    userAddress: userAddressBigInt,
    merkleRoot: merkleRootBigInt,
    // ... 其他输入
  }
});

worker.onmessage = (e) => {
  const { proof, publicSignals } = e.data;
  // 调用合约验证
  await verifier.verifyComplianceProof(proof, publicSignals);
};
```

---

## Gas 估算

### PLONK vs Groth16 对比

| 算法 | 验证 Gas | 证明大小 | Setup |
|------|----------|----------|-------|
| Groth16 | ~280k | ~128 bytes | 每电路需 Trusted Setup |
| **PLONK** | **~350k** | **~384 bytes** | **Universal Setup (一次性)** |

**Base L2 环境成本**:
- Gas 差异: ~70k
- 成本差异: $0.001 - 0.01 (可忽略)
- **运维优势**: 无价！

---

## 电路迭代流程

### PLONK 的灵活性

```bash
# 修改电路后的流程 (相比 Groth16 简化 90%)

# 1. 重新编译
circom compliance.circom --r1cs --wasm -o build

# 2. 重新生成 zkey (使用相同的 Powers of Tau)
snarkjs plonk setup build/compliance.r1cs keys/pot20_final.ptau keys/compliance_new.zkey

# 3. 导出新的 Solidity 验证器
snarkjs zkey export solidityverifier keys/compliance_new.zkey ../contracts/src/core/PlonkVerifier.sol

# 4. 重新部署 Verifier 合约
forge script script/Deploy.s.sol --broadcast

# 5. 通过 Registry 更新 Verifier 地址
# (使用多签调用 Registry.updateIssuer)

# ✅ 完成！无需重新进行 Trusted Setup Ceremony！
```

---

## 安全注意事项

1. **Powers of Tau 安全性**
   - 使用 Hermez 公共 Powers of Tau（经过充分验证）
   - 或参与自己的 Powers of Tau 仪式

2. **电路审计**
   - 所有约束必须经过审计
   - 确保没有恶意后门

3. **输入验证**
   - 合约端验证公共输入格式
   - Merkle 根必须与链上最新根匹配

4. **密钥管理**
   - zkey 文件需要安全存储
   - 定期备份

---

## 测试清单

- [ ] 编译电路成功
- [ ] Setup 生成 zkey
- [ ] 生成测试证明
- [ ] 本地验证通过
- [ ] 部署 Solidity Verifier
- [ ] 链上验证成功
- [ ] Gas 成本在预期范围
- [ ] 前端集成测试

---

## 资源链接

- [Circom 文档](https://docs.circom.io/)
- [SnarkJS 文档](https://github.com/iden3/snarkjs)
- [PLONK 论文](https://eprint.iacr.org/2019/953.pdf)
- [Hermez Powers of Tau](https://github.com/hermeznetwork/phase2ceremony)

---

**下一步**: 开始实现 `compliance.circom` 电路逻辑
