# ILAL — Institutional Liquidity Access Layer

> ZK-powered compliance infrastructure for Uniswap v4.  
> Verify once. Trade freely.

---

## 一、我们在解决什么问题

机构进入 DeFi 面临一个根本矛盾：

**合规要求是持续的，但每笔交易都做链上合规检查成本太高。**

目前主流的"合规 DeFi"方案有两条路：

1. **链下白名单** — 由中心化机构维护地址列表，存在单点故障，无法抗审查
2. **每笔交易链上验证** — gas 消耗巨大（数十万 gas/笔），延迟无法接受，机构不可能采用

两种方案都没有真正解决问题：要么牺牲去中心化，要么牺牲效率。

ILAL 提出第三条路：**把合规逻辑从"每笔交易"移到"会话层"。**

---

## 二、ILAL 是什么

ILAL 是一个构建在 **Uniswap v4** 上的合规基础设施层，核心是一个 **ComplianceHook**。

它的工作方式很简单：

```
机构完成一次 ZK 身份验证
        ↓
链上激活一个 24 小时合规会话
        ↓
此后每次 swap，Hook 只做一次 SLOAD 读取会话状态
        ↓
有会话 → 交易通过 ✅
无会话 → 数学层面拒绝，revert NotCompliant() ❌
```

**核心设计原则：合规属于会话启动，而非每笔交易。**

一次 ZK 证明，解锁 24 小时内无摩擦的合规交易。

---

## 三、技术实现

### 零知识证明层

ILAL 使用 **PLONK** 证明系统（Circom 2.0，19,763 约束）。证明内容包含两个部分：

- **EdDSA-Poseidon 签名验证** — 机构持有由 Issuer 签发的身份证明（Attestation），证明其通过了 KYC/AML 审核
- **Merkle Tree 成员证明** — 证明该机构钱包地址存在于合规地址集合中，但不泄露具体是哪个地址

**关键特性：ZK 证明在链上只验证数学正确性，不暴露机构任何身份信息。**

| 指标 | 数值 |
|------|------|
| 链下证明生成时间 | ~15 秒（WASM，snarkjs） |
| 链下 ZK 验证时间 | 8.2 ms（中位数） |
| 链上 PLONK 验证 gas | 683,986 gas（~$0.016，一次性） |
| 每笔 swap 合规开销 | ~15,000 gas（~$0.0003，单次 SLOAD） |
| 与逐笔链上验证相比 | **节省约 97% gas** |

### 协议层

ComplianceHook 实现了 Uniswap v4 的以下 Hook 入口：

- `beforeSwap` — 检查 swap 发起者是否有活跃合规会话
- `beforeAddLiquidity` — 检查流动性提供者合规状态
- `beforeRemoveLiquidity` — 同上

不合规地址在数学层面被拒绝 —— **不需要任何管理员操作，不存在人工干预的可能性**。

### 会话管理

- 每个 ZK 证明绑定一个钱包地址，有效期 24 小时
- 最多可续期 6 次（同一 ZK 证明）
- SessionManager 采用 UUPS 可升级代理
- 支持紧急暂停（Registry 所有者可瞬时暂停所有操作）

---

## 四、产品形态

ILAL 以 **SaaS API** 的形式向机构提供服务：

```
机构客户
    ↓
ilal.tech 注册账号 → 获取 API Key
    ↓
HTTP REST API 或 @ilal/sdk
    ↓
完成 KYC 入驻 → ZK 会话激活 → 直接连接 Uniswap v4 池进行合规交易
```

提供两种集成模式：

| 模式 | 适合对象 | 控制权 |
|------|----------|--------|
| **API 模式** | 传统机构、不熟悉 Web3 的团队 | ILAL 代理广播交易 |
| **SDK 模式** | DeFi 基金、量化团队 | 机构自持私钥，完全控制 |

---

## 五、当前开发状态

**ILAL 目前处于 Base Sepolia 测试网 MVP 阶段。**

### 已上线并可用

| 模块 | 状态 | 说明 |
|------|------|------|
| 智能合约套件 | ✅ 已部署 | ComplianceHook、SessionManager、Registry、SwapRouter |
| ZK 电路（PLONK） | ✅ 可用 | 19,763 约束，本地 ~15s 生成 |
| ZK 链上验证 | ✅ 可用 | PlonkVerifierAdapter v2 |
| 机构入驻 API | ✅ 可用 | 注册、签名 Attestation、Merkle Tree 管理 |
| ZK 会话激活 | ✅ 可用 | 服务端生成证明 + Relayer 上链 |
| Swap 交易构建 | ✅ 可用 | 返回 calldata，机构自签或 SDK 广播 |
| Add Liquidity 构建 | ✅ 可用 | 同上 |
| 机构仪表板 | ✅ 可用 | ilal.tech，API Key 管理、Playground |
| TypeScript SDK | ✅ 可用 | `@ilal/sdk`，会话、swap、流动性模块 |
| REST API | ✅ 可用 | Railway，连接 Base Sepolia |

### 占位符（设计完成，未实现）

| 模块 | 说明 |
|------|------|
| 使用量计费 | 计划已定义（Free/Pro/Enterprise），无支付逻辑 |
| 使用量追踪 | 返回占位零值，数据库未接入 |
| 做市机器人 | `apps/bot` 原型，未部署 |

### 尚未开始

| 模块 | 说明 |
|------|------|
| 主网部署 | 待独立安全审计 |
| 真实 KYC 对接 | 当前为 Mock 自动审批（适合演示和开发） |
| 多链支持 | 当前仅 Base；设计支持扩展到任何 EVM + Uniswap v4 链 |

---

## 六、测试覆盖

| 层级 | 数量 | 覆盖内容 |
|------|------|----------|
| Solidity（Foundry） | **356 个测试** | ComplianceHook、SessionManager、Registry、PLONK 集成、模糊测试、攻击向量 |
| API（Vitest） | **102 个测试** | 认证、API Key、入驻、ZK 验证、DeFi 端点 |
| 前端（Vitest + RTL） | **20 个测试** | SwapWidget、SessionStatusCard、UserMenu |
| E2E（Base Sepolia 真实链） | **15 步** | 完整流程：注册 → ZK 激活 → 链上 Swap → 余额验证 |

---

## 七、愿景

**ILAL 的长期目标是成为合规 DeFi 的基础设施层。**

就像 Uniswap 解决了链上流动性问题，ILAL 解决的是：**如何让受监管资产和机构资金安全、高效、私密地进入 DeFi 协议。**

未来的路线：

1. **主网上线** — Base 主网部署，对接真实机构资产
2. **多链扩展** — 任何部署了 Uniswap v4 的 EVM 链（Ethereum、Arbitrum、Optimism）
3. **合规资产池** — 与 RWA（真实世界资产）项目合作，为代币化债券、国债、房产基金提供合规交易基础设施
4. **多监管辖区** — 支持不同国家/地区的 KYC 标准（MiCA、MAS、SEC 豁免等）
5. **ZK 身份互操作** — 接入 Coinbase Verifications、Polygon ID、EAS 等链上身份协议

**终极目标：让全球任何一家持牌机构，能在 1 天内完成 KYC，在 DeFi 的任何流动性池中合规交易——不牺牲隐私，不牺牲效率，不依赖中心化机构的善意。**

---

## 八、在线资源

| 资源 | 地址 |
|------|------|
| 前端仪表板 | https://ilal.tech |
| API 后端 | https://ilal-mvp-production.up.railway.app |
| API 健康检查 | https://ilal-mvp-production.up.railway.app/api/v1/health |
| GitHub | https://github.com/rpnny/ILAL-mvp |
| 联系方式 | 2867755637@qq.com |

---

*ILAL — Institutional Liquidity Access Layer*  
*Apache-2.0 License · Base Sepolia Testnet · 2026*
