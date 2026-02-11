# ILAL x Ondo 集成指南

> Institutional Liquidity Access Layer — 为 Ondo Finance 定制的合规对接方案

## 1. ILAL 是什么？

ILAL 是构建在 Uniswap v4 之上的**机构级合规流动性接入层**：

- **零知识证明 KYC**：机构身份在链上验证，但 KYC 原始数据永远不上链
- **链上 Session 管理**：通过 `SessionManager` 控制谁可以在什么时间范围内交易
- **Uniswap v4 Hook 拦截**：`ComplianceHook` 在每笔 swap/LP 操作前检查合规状态
- **不可转让 LP NFT**：确保流动性份额不会流向未经验证的地址

```
Ondo 用户 → ZK Proof → PlonkVerifier → SessionManager → ComplianceHook → Uniswap v4 Pool
```

## 2. Ondo 为什么需要 ILAL？

| Ondo 痛点 | ILAL 解决方案 |
|-----------|-------------|
| OUSG/USDY 只能在白名单内转移 | ComplianceHook 在 Uniswap v4 层面实现动态白名单 |
| 需要 KYC/KYB 但不想暴露用户数据 | ZK Proof 实现链上验证+数据隐私 |
| 二级市场流动性受限 | 接入 Uniswap v4 深度流动性，仅限合规用户参与 |
| 合规审计需求 | 链上 Session 事件完全可审计（SessionStarted/SessionEnded） |

## 3. 集成架构

### 3.1 合规凭证来源（Multi-Issuer）

ILAL 支持多种合规凭证来源，Ondo 可以选择：

```
┌─────────────────────────────────────────────────┐
│              ILAL Credential Layer               │
├──────────────┬──────────────┬───────────────────┤
│ Coinbase EAS │  Ondo KYB    │  Future Providers  │
│ (已实现)     │  (接入点)    │  (Polygon ID 等)   │
└──────────────┴──────────────┴───────────────────┘
        │               │               │
        └───────┬───────┘───────────────┘
                ▼
        checkAllProviders() ← 统一查询接口
                │
                ▼
         ZK Proof Generation
                │
                ▼
         On-chain Verification
                │
                ▼
         SessionManager.startSession()
```

### 3.2 Ondo KYC Provider 接入方式

在前端注册 Ondo 的 KYC Provider：

```typescript
import { registerKYCProvider } from '@/lib/eas';

// 注册 Ondo 的 KYB 系统
registerKYCProvider({
  name: 'Ondo KYB',
  attesterAddress: '0x<ONDO_ATTESTER_ADDRESS>',

  // 自定义验证逻辑
  verify: async (userAddress) => {
    // 方案 A：查询 Ondo 的链上注册表
    const isWhitelisted = await ondoRegistry.isWhitelisted(userAddress);

    // 方案 B：查询 Ondo 的 API
    // const resp = await fetch(`https://api.ondo.finance/kyb/check/${userAddress}`);
    // const isWhitelisted = resp.ok;

    if (!isWhitelisted) return null;

    return {
      uid: `ondo-kyb-${userAddress}`,
      schemaUID: '0x<ONDO_SCHEMA>',
      attester: '0x<ONDO_ATTESTER>',
      recipient: userAddress,
      time: BigInt(Math.floor(Date.now() / 1000)),
      expirationTime: BigInt(0),
      revocationTime: BigInt(0),
      verified: true,
      isMock: false,
      issuerType: 'custom-kyc',
    };
  },
});
```

### 3.3 智能合约层面

```
SessionManager (UUPS Proxy)
├── VERIFIER_ROLE  → 谁可以激活 Session
├── ADMIN_ROLE     → 谁可以撤销 Session
├── startSession(user, expiry)  → 开启 24h 交易窗口
├── endSession(user)            → 紧急撤销
└── endSessionBatch(users[])    → 批量撤销

ComplianceHook (Uniswap v4 Hook)
├── beforeSwap     → 检查 session 有效 + EIP-712 签名
├── beforeAddLiquidity → 同上
└── beforeRemoveLiquidity → 同上
```

## 4. 安全特性

### 4.1 Fail-Closed 策略

```
生产模式：
  凭证查询失败 → 拒绝操作（不默认放行）
  Session 过期 → 拒绝交易
  签名无效    → 拒绝操作

演示模式（仅开发环境）：
  NEXT_PUBLIC_ENABLE_MOCK=true → 允许 mock 凭证
```

### 4.2 EAS Attestation 完整校验

| 校验项 | 说明 |
|--------|------|
| revocationTime | 已撤销的凭证不可用 |
| expirationTime | 已过期的凭证不可用 |
| attester | 必须为可信发行方（Coinbase/Ondo） |
| schema | 必须匹配已知 schema |

### 4.3 链上可审计性

所有 Session 操作产生链上事件：

```solidity
event SessionStarted(address indexed user, uint256 expiry);
event SessionEnded(address indexed user);
```

可通过合规运营工具导出完整审计日志：

```bash
npx tsx scripts/compliance-ops.ts export-report
# → docs/reports/compliance-report-YYYY-MM-DD.json
# → docs/reports/compliance-report-YYYY-MM-DD.csv
```

## 5. 运营工具

### 5.1 Session 管理

```bash
# 查询某地址的 Session 状态
npx tsx scripts/compliance-ops.ts status 0x1234...

# 紧急撤销某地址的 Session
npx tsx scripts/compliance-ops.ts revoke 0x1234...

# 批量查询
npx tsx scripts/compliance-ops.ts batch-status addresses.txt

# 批量撤销（合规紧急响应）
npx tsx scripts/compliance-ops.ts batch-revoke addresses.txt
```

### 5.2 权限管理

```bash
# 授予 Ondo 后端服务 VERIFIER_ROLE
npx tsx scripts/compliance-ops.ts grant-verifier 0x<ONDO_VERIFIER>

# 撤销 VERIFIER_ROLE
npx tsx scripts/compliance-ops.ts revoke-verifier 0x<ONDO_VERIFIER>
```

### 5.3 合规报告

```bash
# 导出 JSON + CSV 审计报告
npx tsx scripts/compliance-ops.ts export-report
```

输出示例：

```json
{
  "generatedAt": "2026-02-11T...",
  "network": "Base Sepolia (84532)",
  "sessionHistory": {
    "totalStarted": 42,
    "totalEnded": 3,
    "sessions": [
      {
        "user": "0x...",
        "expiry": "1739404800",
        "blockNumber": "12345678",
        "txHash": "0x..."
      }
    ]
  }
}
```

## 6. 部署信息（Base Sepolia）

| 合约 | 地址 |
|------|------|
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80` |
| PlonkVerifier | `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` |
| PlonkVerifierAdapter | `0x0cDcD82E5efba9De4aCc255402968397F323AFBB` |
| PositionManager | `0x5b460c8Bd32951183a721bdaa3043495D8861f31` |
| SimpleSwapRouter | `0x2AAF6C551168DCF22804c04DdA2c08c82031F289` |
| PoolManager (Uniswap v4) | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |

## 7. 对接路线图

### Phase 1: PoC 演示（1-2 周）

- [ ] 在 Base Sepolia 上演示完整的合规交易流程
- [ ] 用 Ondo 提供的测试地址白名单跑通 Session 激活 + Swap
- [ ] 提供审计日志导出

### Phase 2: KYB 集成（2-4 周）

- [ ] 接入 Ondo 的 KYB Provider API
- [ ] 自定义 ZK Circuit 输入（支持 Ondo 的凭证格式）
- [ ] 部署 Ondo 专属 SessionManager 实例

### Phase 3: 主网部署（4-8 周）

- [ ] 合约审计
- [ ] Base 主网部署
- [ ] OUSG/USDY 池创建
- [ ] 做市机器人对接

## 8. 技术联系

- 代码仓库：`/Users/ronny/Desktop/ilal`
- 前端演示：`http://localhost:3000`
- 合规工具：`scripts/compliance-ops.ts`

---

*ILAL — 让合规机构也能享受 DeFi 流动性*
