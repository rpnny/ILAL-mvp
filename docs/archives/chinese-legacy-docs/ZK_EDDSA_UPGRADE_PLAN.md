# ZK 签名升级计划：Poseidon → EdDSA

## 目标

将 ILAL 合规电路的签名验证从简化的 Poseidon 哈希升级到 EdDSA（Edwards-curve Digital Signature Algorithm），满足机构级安全要求。

---

## 为什么需要升级

| 问题 | Poseidon (当前) | EdDSA (目标) |
|------|----------------|-------------|
| 签名标准 | 自定义哈希 | 工业标准 (RFC 8032) |
| 安全审查 | 难以通过机构审计 | 可审计性强 |
| 互操作性 | 仅限 ZK 内部 | 可与现有 PKI 集成 |
| 抗攻击性 | 未经广泛验证 | 经过密码学社区验证 |

---

## 升级步骤

### Phase 1: 电路修改 (2-3 天)

#### 1.1 安装依赖
```bash
cd circuits/
npm install circomlib --save
```

#### 1.2 修改 compliance.circom

**Before:**
```circom
// 当前：简化的 Poseidon 签名
template ComplianceVerifier() {
    signal input attestationUID;
    signal input issuerSignature;  // 单个 Poseidon 哈希值
    
    component hasher = Poseidon(2);
    hasher.inputs[0] <== attestationUID;
    hasher.inputs[1] <== issuerSecret;
    hasher.out === issuerSignature;
}
```

**After:**
```circom
include "circomlib/circuits/eddsamimc.circom";
include "circomlib/circuits/bitify.circom";

template ComplianceVerifier() {
    // 公共输入：Issuer 公钥 (EdDSA)
    signal input issuerPubKeyX;
    signal input issuerPubKeyY;
    
    // 私有输入：签名
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;
    
    // 私有输入：消息（attestation UID）
    signal input attestationUID;
    
    // EdDSA 验证器
    component verifier = EdDSAMiMCSpongeVerifier();
    verifier.enabled <== 1;
    verifier.Ax <== issuerPubKeyX;
    verifier.Ay <== issuerPubKeyY;
    verifier.R8x <== sigR8x;
    verifier.R8y <== sigR8y;
    verifier.S <== sigS;
    verifier.M <== attestationUID;
}
```

#### 1.3 更新 input.json 格式
```json
{
  "attestationUID": "12345...",
  "issuerPubKeyX": "0x...",
  "issuerPubKeyY": "0x...",
  "sigR8x": "0x...",
  "sigR8y": "0x...",
  "sigS": "0x...",
  "merkleProof": [...],
  "merkleRoot": "0x...",
  "userAddress": "0x..."
}
```

#### 1.4 重新编译电路
```bash
cd circuits/
npm run compile  # 或 circom compliance.circom --r1cs --wasm --sym
```

#### 1.5 重新生成 proving key
```bash
# 如果需要新的 Powers of Tau
snarkjs powersoftau new bn128 20 pot20_0000.ptau
snarkjs powersoftau contribute pot20_0000.ptau pot20_final.ptau

# 生成 zkey
snarkjs groth16 setup compliance.r1cs pot20_final.ptau compliance_0000.zkey
snarkjs zkey contribute compliance_0000.zkey compliance_final.zkey
snarkjs zkey export verificationkey compliance_final.zkey verification_key.json

# 导出 Solidity 验证器
snarkjs zkey export solidityverifier compliance_final.zkey PlonkVerifier.sol
```

---

### Phase 2: 前端适配 (1 天)

#### 2.1 生成 EdDSA 签名（测试数据）

新建 `circuits/scripts/generate-eddsa-signature.ts`:
```typescript
import { buildEddsa, buildBabyjub } from 'circomlibjs';

async function generateEdDSASignature() {
  const eddsa = await buildEddsa();
  const babyJub = await buildBabyjub();
  
  // 生成 Issuer 密钥对
  const issuerPrivKey = Buffer.from('1'.repeat(32), 'hex');
  const issuerPubKey = eddsa.prv2pub(issuerPrivKey);
  
  // 要签名的消息（attestation UID）
  const attestationUID = BigInt('0x123456789abcdef...');
  const msg = babyJub.F.e(attestationUID);
  
  // 生成签名
  const signature = eddsa.signMiMCSponge(issuerPrivKey, msg);
  
  console.log('Issuer Public Key:');
  console.log('  X:', babyJub.F.toString(issuerPubKey[0]));
  console.log('  Y:', babyJub.F.toString(issuerPubKey[1]));
  console.log('Signature:');
  console.log('  R8x:', babyJub.F.toString(signature.R8[0]));
  console.log('  R8y:', babyJub.F.toString(signature.R8[1]));
  console.log('  S:', signature.S.toString());
  
  return {
    pubKey: issuerPubKey,
    signature,
  };
}

generateEdDSASignature();
```

#### 2.2 更新 frontend/lib/zkProof.ts

```typescript
// frontend/lib/zkProof.ts
export async function generateComplianceProof(
  attestationUID: string,
  issuerSignature: EdDSASignature,  // 新增
  merkleProof: string[],
  userAddress: string
) {
  const input = {
    attestationUID: attestationUID,
    issuerPubKeyX: issuerSignature.pubKey[0],
    issuerPubKeyY: issuerSignature.pubKey[1],
    sigR8x: issuerSignature.R8[0],
    sigR8y: issuerSignature.R8[1],
    sigS: issuerSignature.S.toString(),
    merkleProof: merkleProof,
    merkleRoot: await getMerkleRoot(),
    userAddress: userAddress,
  };
  
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/circuits/compliance.wasm',
    '/circuits/compliance_final.zkey'
  );
  
  return { proof, publicSignals };
}
```

---

### Phase 3: 后端集成 (半天)

#### 3.1 Issuer 签名服务

创建一个简单的签名服务（Relay 或独立）：

```typescript
// relay/eddsa-signer.ts
import { buildEddsa, buildBabyjub } from 'circomlibjs';

const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY!;

export async function signAttestation(attestationUID: string) {
  const eddsa = await buildEddsa();
  const babyJub = await buildBabyjub();
  
  const privKey = Buffer.from(ISSUER_PRIVATE_KEY, 'hex');
  const msg = babyJub.F.e(BigInt(attestationUID));
  
  const signature = eddsa.signMiMCSponge(privKey, msg);
  
  return {
    R8x: babyJub.F.toString(signature.R8[0]),
    R8y: babyJub.F.toString(signature.R8[1]),
    S: signature.S.toString(),
  };
}
```

#### 3.2 Registry 注册 Issuer 公钥

```solidity
// contracts/src/core/Registry.sol
struct Issuer {
    string name;
    address attester;
    uint256 pubKeyX;  // EdDSA 公钥 X 坐标
    uint256 pubKeyY;  // EdDSA 公钥 Y 坐标
    bool active;
}

function addIssuer(
    string memory name,
    address attester,
    uint256 pubKeyX,
    uint256 pubKeyY
) external onlyRole(DEFAULT_ADMIN_ROLE) {
    // ...
}
```

---

### Phase 4: 测试 (1 天)

#### 4.1 单元测试
```bash
cd circuits/
npm run test  # 测试 EdDSA 签名验证
```

#### 4.2 集成测试
```bash
cd frontend/
npm run test:e2e  # 端到端 ZK proof 生成 + 链上验证
```

#### 4.3 链上测试
```bash
cd scripts/system-test/
npx tsx e2e-swap.ts  # 用新 proof 执行合规 swap
```

---

## 成本估算

| 阶段 | 工时 | 说明 |
|------|------|------|
| Phase 1: 电路修改 | 2 天 | 包括编译、调试、key 生成 |
| Phase 2: 前端适配 | 1 天 | zkProof.ts + Web Worker |
| Phase 3: 后端集成 | 0.5 天 | 签名服务 + Registry 更新 |
| Phase 4: 测试 | 1 天 | 单元/集成/链上测试 |
| **总计** | **4.5 天** | 约 1 周工作量 |

---

## 风险与备选方案

### 风险 1: Proof 生成时间增加
- **EdDSA 约束数**: ~2000 个约束 (vs Poseidon ~150)
- **预计生成时间**: 6-8 秒 (vs 当前 4 秒)
- **缓解**: 优化电路 or 使用 WASM 多线程

### 风险 2: 电路 Bug
- **EdDSA 库成熟度**: circomlib 经过广泛验证
- **缓解**: 充分的单元测试 + fuzzing

### 备选方案: ECDSA (secp256k1)
如果 EdDSA 集成困难，可考虑 ECDSA：
- 优点: 与 Ethereum 原生签名兼容
- 缺点: 约束数更多 (~4000)，生成时间 ~10 秒

---

## 部署流程

1. 在 testnet 部署新的 PlonkVerifier
2. 更新 PlonkVerifierAdapter 的 verifier 引用
3. 前端切换到新 .wasm/.zkey
4. 全链路测试通过后，公告用户重新生成 proof

---

## 参考资料

- [EdDSA RFC 8032](https://datatracker.ietf.org/doc/html/rfc8032)
- [circomlib EdDSA](https://github.com/iden3/circomlib/blob/master/circuits/eddsamimc.circom)
- [snarkjs EdDSA 示例](https://github.com/iden3/circomlib/blob/master/test/eddsamimc.js)

---

*计划创建时间: 2026-02-11*
