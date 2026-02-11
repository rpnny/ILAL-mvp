# ZK Proof 生成调试任务

**状态**: ⏸️ 暂停 - 需要深入调试  
**优先级**: P2 (不阻塞主流程)  
**预计时间**: 2-4 小时

---

## 问题描述

使用 `generate-test-proof.js` 生成真实 ZK Proof 时，Merkle Tree 验证失败。

### 错误信息

```
ERROR:  4 Error in template MerkleTreeChecker_148 line: 52
Error in template ComplianceVerifier_150 line: 155

Assert Failed: root === computedHash[levels]
```

### 失败位置

`compliance.circom` 第 52 行:
```circom
// 验证计算出的根与公共输入匹配
root === computedHash[levels];
```

---

## 根本原因分析

### 1. 电路期望的输入

**公共输入**:
- `userAddress`: uint256
- `merkleRoot`: Field element
- `issuerPubKeyHash`: Field element

**私有输入**:
- `signature`: Field element
- `kycStatus`: Field element (1 = 已通过)
- `countryCode`: Field element
- `timestamp`: Field element
- `merkleProof[20]`: Array of Field elements
- `merkleIndex`: Field element

### 2. Merkle Tree 构建规则

**Leaf Hash 计算**:
```javascript
Leaf = Poseidon(userAddress, kycStatus)
```

**Tree 构建**:
- Depth: 20 (supports 2^20 = 1,048,576 users)
- Parent = Poseidon(left, right)
- Left/right determined by pathIndices

### 3. 当前脚本的问题

**可能的问题点**:
1. **Poseidon 实现不一致**
   - JS 的 circomlibjs Poseidon
   - Circom 的 poseidon.circom
   - 可能使用不同的参数或实现

2. **Merkle Index 转换**
   - 电路使用 `Num2Bits` 将 merkleIndex 转换为 pathIndices
   - 脚本手动构造 pathIndices
   - 两者可能不一致

3. **Tree 填充策略**
   - 脚本将 tree 填充到 2^depth
   - 电路可能期望不同的填充值
   - 当前使用 BigInt(0)，可能不正确

4. **Hash 计算顺序**
   - DualMux 的 left/right 选择逻辑
   - pathIndices 的解释 (0=left, 1=right)
   - 可能有反转或错位

---

## 调试步骤

### Step 1: 验证 Poseidon 一致性

创建简单测试验证 JS Poseidon 与 Circom Poseidon 输出一致：

```javascript
// test-poseidon.js
const { buildPoseidon } = require("circomlibjs");

async function test() {
    const poseidon = await buildPoseidon();
    
    // 测试单个输入
    const input1 = BigInt(123);
    const input2 = BigInt(456);
    
    const hash = poseidon([input1, input2]);
    const hashValue = poseidon.F.toObject(hash);
    
    console.log("Hash(123, 456):", hashValue.toString());
    // 应该与 Circom 电路中相同输入的输出一致
}
```

创建对应的 Circom 测试电路验证。

### Step 2: 简化 Merkle Tree

创建最小化测试案例：
- Depth = 1 (只有 2 个叶子)
- 手动计算所有哈希
- 与电路输出对比

```javascript
// 最简单的 Merkle Tree
const leaf0 = poseidon([userAddress, kycStatus]);
const leaf1 = BigInt(0); // 空叶子

// Root = Poseidon(leaf0, leaf1)
const root = poseidon([leaf0Value, leaf1]);

// Merkle Proof for leaf0:
// - sibling = leaf1
// - pathIndex = 0 (left child)
```

### Step 3: 检查电路编译产物

查看编译后的 WASM 和 R1CS，确认约束是否正确：

```bash
cd circuits/build
# 检查符号表
cat compliance.sym | grep -A5 "MerkleTreeChecker"

# 检查约束数量
snarkjs r1cs info compliance.r1cs
```

### Step 4: 使用 Circom 测试框架

使用 `circom_tester` 进行单元测试：

```javascript
const wasm_tester = require("circom_tester").wasm;

it("Should verify Merkle proof", async () => {
    const circuit = await wasm_tester("../compliance.circom");
    
    const input = {
        userAddress: "...",
        merkleRoot: "...",
        // ... 其他输入
    };
    
    const w = await circuit.calculateWitness(input, true);
    await circuit.checkConstraints(w);
});
```

---

## 快速解决方案

### 选项 A: 使用已有的 Merkle Tree 库

不自己实现 Merkle Tree，使用现成的库：

```bash
npm install @zk-kit/incremental-merkle-tree
```

```javascript
const { IncrementalMerkleTree } = require("@zk-kit/incremental-merkle-tree");
const { poseidon2 } = require("poseidon-lite");

const tree = new IncrementalMerkleTree(poseidon2, 20, 0n, 2);
tree.insert(leafValue);

const proof = tree.createProof(0);
```

### 选项 B: 移除 Merkle Tree 验证

暂时简化电路，移除 Merkle Tree 部分：

```circom
// 简化版 ComplianceVerifier
template ComplianceVerifierSimple() {
    signal input userAddress;
    signal input issuerPubKeyHash;
    
    // ... 只保留签名验证
}
```

重新编译和部署，快速验证流程。

### 选项 C: 使用固定的测试数据

手动计算一个已知正确的 Merkle Proof：

1. 在 Circom 中添加 debug 输出
2. 使用已知输入运行电路
3. 提取电路计算的中间值
4. 将这些值硬编码到测试脚本

---

## 后续行动

### 短期 (不阻塞进度)

1. **使用 MockVerifier 继续开发**
   - 前端可以正常开发
   - 合约测试可以继续
   - 部署可以使用 Mock 模式

2. **并行调试 Proof 生成**
   - 独立任务
   - 不影响主线开发
   - 修复后一键切换到 PlonkVerifier

### 中期 (Week 2)

1. **完整的 Circom 测试覆盖**
   - 单元测试每个 template
   - 集成测试完整电路
   - 自动化测试流程

2. **文档化 Proof 生成流程**
   - 详细的 API 文档
   - 前端集成示例
   - 常见问题解答

---

## 依赖和参考

### 相关文件
- `circuits/compliance.circom` - 电路定义
- `circuits/scripts/generate-test-proof.js` - Proof 生成脚本
- `contracts/src/verifiers/PlonkVerifier.sol` - 链上验证器

### 参考资料
- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)
- [circomlibjs API](https://github.com/iden3/circomlibjs)
- [ZK-Kit Merkle Trees](https://github.com/privacy-scaling-explorations/zk-kit)

### 社区资源
- [Circom Discord](https://discord.gg/zkpytk8V)
- [0xPARC Forum](https://forum.0xparc.org/)
- [PSE Discord](https://discord.gg/sF5CT5rzrR)

---

**最后更新**: 2026-02-10 21:54  
**负责人**: 待分配  
**截止日期**: 2026-02-15 (Week 2 结束前)
