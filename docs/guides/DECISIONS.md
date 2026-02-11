# ILAL 关键技术决策记录

**决策日期**: 2026-02-10  
**决策人**: 项目技术团队

---

## Phase 0: 架构决策 ✅

### 决策 1: ZK 算法选择

**选定方案**: ✅ **PLONK**

#### 评估对比

| 维度 | Groth16 | PLONK | 决策依据 |
|------|---------|-------|----------|
| 验证 Gas | ~280k | ~350k (+25%) | Base L2 上差异可忽略 |
| 证明大小 | ~128 bytes | ~384 bytes | 网络传输影响小 |
| Setup | 需要每个电路独立 Trusted Setup | Universal Setup (一次性) | **关键优势** |
| 电路迭代 | 每次修改需重新仪式 (灾难性) | 修改后重新编译即可 | **关键优势** |
| 成熟度 | 高 (生产验证) | 中 (快速成熟中) | 可接受 |

#### 选择理由

1. **运维灵活性**:
   - 合规逻辑可能随监管要求变化（如增加新的国家黑名单检查）
   - PLONK 允许快速迭代电路而无需重新进行多方 Trusted Setup
   - 避免了 Groth16 的"一次性定死"风险

2. **Gas 成本可接受**:
   - 在 Base L2 上，~70k gas 差异约等于 $0.001-0.01
   - 用户体验影响微乎其微
   - 相比运维噩梦，这点成本完全值得

3. **技术趋势**:
   - 以太坊生态正在向 Universal Setup 方向演进
   - PlonK 家族（包括 UltraPlonk）技术持续改进
   - 长期来看是更好的选择

#### 实施路线

- Phase 3: 使用 Circom + SnarkJS 实现 PLONK 电路
- 采用 Hermez 的公共 Powers of Tau（一次性 Universal Setup）
- 验证器使用 SnarkJS 导出的 PLONK Solidity Verifier

---

### 决策 2: Hook 身份解析方案

**选定方案**: ✅ **hookData + EIP-712 签名验证**

#### 评估对比

| 方案 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| msgSender() 接口 | 简洁 | 依赖 Router 实现，兼容性差 | ❌ |
| 纯 hookData | 简单 | 可被伪造，安全性差 | ❌ |
| **hookData + EIP-712** | **安全、兼容、灵活** | 需前端签名 | ✅ |

#### 方案设计

**数据结构**:
```solidity
// hookData = abi.encode(user, deadline, signature)
struct SwapPermit {
    address user;        // 实际用户地址
    uint256 deadline;    // 签名有效期
    bytes signature;     // EIP-712 签名
}
```

**签名域**:
```typescript
const domain = {
  name: "ILAL ComplianceHook",
  version: "1",
  chainId: 8453, // Base Mainnet
  verifyingContract: HOOK_ADDRESS
}

const types = {
  SwapPermit: [
    { name: "user", type: "address" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
}
```

#### 安全机制

1. **防重放攻击**: 包含 nonce 和 deadline
2. **防伪造**: 签名必须由用户私钥生成
3. **兼容性**: 不依赖 Router 实现，任何合约可调用
4. **灵活性**: 支持 EOA 直接调用（签名可选）

#### 实施细节

- ComplianceHook 增加 EIP-712 验证逻辑
- 前端使用 ethers.js 的 `_signTypedData`
- 支持降级：EOA 直接调用时可跳过签名验证

---

### 决策 3: 合约升级策略

**选定方案**: ✅ **UUPS 代理模式**

#### 已实现

- ✅ Registry 合约使用 UUPS
- ✅ SessionManager 合约使用 UUPS
- ✅ 升级权限由多签控制
- ✅ 包含版本管理函数

#### 升级流程

1. 部署新实现合约
2. 通过多签调用 `upgradeToAndCall()`
3. 验证升级后状态正确
4. 更新前端 ABI

#### 安全考虑

- 升级需要多签批准（3/5 或更高）
- 可选：增加 Timelock（如 48 小时）
- 每次升级前进行完整测试
- 保留回滚能力

---

## 决策影响分析

### 对开发时间线的影响

| 阶段 | 原计划 | 调整后 | 变化 |
|------|--------|--------|------|
| Phase 3 (ZK) | 2-3 周 (Groth16) | 2-3 周 (PLONK) | 无变化 |
| Phase 2 (Hook) | - | +3 天 (EIP-712) | 略增 |
| Phase 6 (测试) | 2-3 周 | 2-3 周 | 无变化 |

**总体影响**: +3 天 (可接受)

### 对技术架构的影响

**正面影响** ✅:
- 更灵活的电路迭代能力
- 更安全的身份验证机制
- 更好的长期可维护性

**需要额外工作**:
- ComplianceHook 增加 EIP-712 验证
- 前端增加签名生成逻辑
- 文档更新

---

## 后续行动项

### 立即执行

- [x] 更新 TODO 列表标记决策完成
- [ ] 实现 ComplianceHook 的 EIP-712 验证
- [ ] 准备 PLONK 电路框架
- [ ] 更新开发文档

### 本周完成

- [ ] 编写 EIP-712 签名测试
- [ ] 创建 PLONK 电路模板
- [ ] 更新前端签名示例代码

### Phase 3 启动前

- [ ] 安装 Circom 和 SnarkJS
- [ ] 下载 Hermez Powers of Tau
- [ ] 编写电路逻辑

---

## 决策批准

**技术负责人**: ✅ 已批准  
**产品负责人**: ✅ 已批准  
**安全审计**: ⏳ 待审计时进行  

**决策状态**: ✅ **最终确定，可进入实施阶段**

---

**文档版本**: 1.0  
**最后更新**: 2026-02-10
