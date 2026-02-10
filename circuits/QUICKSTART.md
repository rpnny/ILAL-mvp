# ILAL 电路快速开始

## 前置要求检查

```bash
# 检查 Rust
rustc --version  # 应该 >= 1.70

# 检查 Circom
circom --version  # 应该 >= 2.1.0

# 检查 SnarkJS
snarkjs --version  # 应该 >= 0.7.0

# 检查 Node.js
node --version  # 应该 >= 18.0
```

如果任何工具未安装，请参考 [README.md](README.md) 的安装部分。

---

## 快速流程（5 步）

### 步骤 1: 安装 npm 依赖

```bash
cd /Users/ronny/Desktop/ilal/circuits/scripts
npm install
```

### 步骤 2: 编译电路

```bash
./compile.sh

# 预期输出:
# ✅ 编译完成!
# 📊 约束数量: ~XXX
```

**预期时间**: 30 秒 - 2 分钟

### 步骤 3: PLONK Setup

```bash
./setup.sh

# 如果 Powers of Tau 未下载，会自动下载 (~100 MB)
# 预期输出:
# ✅ Setup 完成!
# 📝 导出 Solidity 验证器...
```

**预期时间**: 2-5 分钟（首次需下载 pot 文件）

### 步骤 4: 生成测试证明

```bash
node generate-proof.js

# 或使用 npm script:
npm run prove

# 预期输出:
# ✅ 证明生成完成 (耗时: XXXms)
# ✅ 证明验证通过!
```

**预期时间**: 5-30 秒

### 步骤 5: 验证 Solidity Verifier

```bash
cd ../../contracts

# 检查生成的验证器
ls -lh src/core/PlonkVerifier.sol

# 编译合约
forge build

# 运行测试
forge test --match-contract PlonkVerifier -vvv
```

---

## 文件结构

```
circuits/
├── compliance.circom          ✅ 主电路
├── build/                     📦 编译输出
│   ├── compliance.r1cs
│   ├── compliance_js/
│   │   └── compliance.wasm
│   └── compliance.sym
├── keys/                      🔑 密钥文件
│   ├── pot20_final.ptau       (下载)
│   ├── compliance.zkey
│   └── verification_key.json
└── scripts/
    ├── compile.sh             ✅
    ├── setup.sh               ✅
    ├── generate-proof.js      ✅
    ├── input-example.json     📄 测试输入
    ├── proof.json             (生成)
    ├── public.json            (生成)
    └── calldata.txt           (生成)
```

---

## 测试输入格式

查看 `scripts/input-example.json`:

```json
{
  "userAddress": "123456789012345678901234567890",
  "merkleRoot": "987654321098765432109876543210",
  "issuerPubKeyHash": "111111111111111111111111111111",
  
  "signature": "222222222222222222222222222222",
  "kycStatus": "1",
  "countryCode": "840",
  "timestamp": "1707580800",
  
  "merkleProof": ["...", "..."],  // 20 个元素
  "merkleIndex": "42"
}
```

---

## 生成真实输入

### 1. 准备用户数据

```javascript
const userAddress = ethers.toBigInt("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1");
const kycStatus = 1n;
const countryCode = 840n; // 美国
const timestamp = BigInt(Math.floor(Date.now() / 1000));
```

### 2. 生成 Issuer 签名

```javascript
const { poseidon } = require('circomlibjs');

// 计算消息哈希
const messageHash = poseidon([
  userAddress,
  kycStatus,
  countryCode,
  timestamp
]);

// Issuer 使用私钥签名 (简化版)
const signature = poseidon([messageHash, issuerPubKey]);
```

### 3. 构建 Merkle 树

```javascript
const { MerkleTree } = require('merkletreejs');

// 构造叶节点
const leaves = users.map(u => 
  poseidon([u.address, u.kycStatus])
);

// 创建 Merkle 树
const tree = new MerkleTree(leaves, poseidon);
const root = tree.getRoot();

// 获取证明
const leaf = poseidon([userAddress, kycStatus]);
const proof = tree.getProof(leaf);
const index = tree.getLeafIndex(leaf);
```

### 4. 组装输入

```javascript
const input = {
  userAddress: userAddress.toString(),
  merkleRoot: root.toString(),
  issuerPubKeyHash: issuerPubKey.toString(),
  
  signature: signature.toString(),
  kycStatus: kycStatus.toString(),
  countryCode: countryCode.toString(),
  timestamp: timestamp.toString(),
  
  merkleProof: proof.map(p => p.toString()),
  merkleIndex: index.toString()
};

// 保存为 JSON
fs.writeFileSync('input.json', JSON.stringify(input, null, 2));
```

---

## 常见问题

### Q: 编译失败 "circomlib not found"

**解决**:
```bash
npm install -g circomlib
```

或在 compile.sh 中指定路径:
```bash
circom ... -l /path/to/circomlib/circuits
```

### Q: Setup 报错 "Powers of Tau 不匹配"

**解决**:
- 确保下载的是 `pot20_final.ptau`
- 检查电路约束数 < 2^20

### Q: 证明生成很慢 (> 1 分钟)

**原因**: 电路约束数过多

**优化**:
- 减少 Merkle 树深度 (20 -> 16)
- 简化约束逻辑
- 使用更快的哈希函数

### Q: Solidity Verifier 编译失败

**解决**:
```bash
# 确保 Solidity 版本 >= 0.8.0
forge --version

# 检查生成的文件
cat ../../contracts/src/core/PlonkVerifier.sol | head -20
```

---

## 性能基准

| 操作 | 时间 | 约束数 |
|------|------|--------|
| 编译电路 | 30s - 2min | - |
| PLONK Setup | 2-5 min | - |
| 证明生成 | 5-30s | ~10k-50k |
| 链上验证 | ~350k gas | - |

**目标约束数**: < 50,000（保持证明生成快速）

---

## 调试技巧

### 1. 检查电路约束

```bash
snarkjs r1cs info build/compliance.r1cs
```

### 2. 导出约束为文本

```bash
snarkjs r1cs export json build/compliance.r1cs constraints.json
```

### 3. 查看符号表

```bash
cat build/compliance.sym | grep "userAddress"
```

### 4. 生成见证（不生成证明）

```javascript
const { wasm } = await snarkjs.wtns.calculate(
  input,
  wasmPath
);
```

---

## 下一步

1. ✅ 确认电路编译成功
2. ✅ 验证测试证明通过
3. 🔄 集成到合约测试
4. 🔄 前端 Web Worker 实现
5. 🔄 性能优化

---

**需要帮助？** 查看 [README.md](README.md) 完整文档
