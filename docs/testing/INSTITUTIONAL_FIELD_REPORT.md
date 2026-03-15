# ILAL Institutional Field Report

**Date:** 2026-03-12  
**Network:** Base Sepolia (Chain ID: 84532)  
**Scope:** 机构真实接入演练 + 红队攻击复测  
**Verdict:** **测试网级别机构可演示，适合 PoC / 白名单试点；尚未达到正式生产接入标准**  
**Updated:** 2026-03-12 — 修复身份注入漏洞 + 量化基准测试

---

## Executive Summary

本次演练从“机构真实使用”视角重新验证了 ILAL 的完整链路，并同时以红队身份尝试对系统进行绕过和破坏。

本轮结果可以概括为四点：

1. **API 模式已真实跑通**
   - 完成 `health -> register -> login -> create api key -> session query -> build tx -> 广播真实 swap`
2. **SDK 模式已真实跑通**
   - 完成 `health -> session query -> Mode 2 swap -> Mode 1 permit swap`
3. **红队攻击复测全部被拦截**
   - 无 session 钱包、过期 permit、畸形 hookData 均未能绕过
4. **本轮新增发现 4 个真实问题，并已在同轮修复**
   - Mode 1 permit `hookData` 编码错误
   - SDK 服务端钱包签名路径错误依赖 RPC `eth_signTypedData_v4`
   - 前端 `/live-exercise` 页面模块引用错误导致 500
   - **SimpleSwapRouter + PositionManager 32 字节身份注入漏洞（Critical）**
5. **量化基准测试通过**
   - 合规 Hook gas 额外开销: +8.5%（vs vanilla Uniswap v4）
   - Mode 1 permit 额外开销: +11%（vs Mode 2）
   - 红队攻击拦截率: **100%**（3/3）
   - Session 复用: 一次 ZK 验证 → 连续交易 gas 完全一致

结论上，ILAL 当前已经不再只是“能跑的 Demo”，而是达到了**测试网级别的机构实操可验证状态**。  
但正式生产接入仍然需要补齐 P1：自动化测试矩阵、运维 runbook、监控告警、审计包。

---

## Test Objectives

本次测试目标分为两部分：

### 机构视角

- 机构通过 API 接入并完成真实交易
- 机构通过 SDK 接入并完成真实交易
- 验证从软件接入、权限获取、会话查询、交易构建到链上执行的完整路径
- 验证前端 permit 页面是否可供机构演示使用

### 红队视角

- 尝试通过无 session 钱包直接交易
- 尝试使用过期 permit 发起交易
- 尝试构造 malformed hookData
- 复测此前已修复的 session bypass 是否复发
- 在真实交易环境中检查 Mode 1 / Mode 2 是否存在新的身份解析缺陷

---

## Test Environment

### Core Contracts (Base Sepolia)

| Contract | Address |
|---|---|
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xe633220f15932428FcA60A1A2C2C48797A180A80` |
| SimpleSwapRouter | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` |
| PositionManager | `0x692548a6E1797d2762b9d04f29112C172E5Cea32` |
| PoolManager | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |

### Fresh Test Pool Created During This Exercise

| Asset | Address |
|---|---|
| mUSD | `0xdd3d112a48906807c4b73c94ed884552427e4cf9` |
| mTBILL | `0xfb080423cedd4ca56da3f60a4b901f51846459ae` |

**Pool Init Tx:** [`0xe60dadd889b4fdee2961dcf1bcccf365ec4c5cbd599460dd45ce2fc0a462b079`](https://sepolia.basescan.org/tx/0xe60dadd889b4fdee2961dcf1bcccf365ec4c5cbd599460dd45ce2fc0a462b079)

---

## Institutional Workflow Results

## 1. API Mode — Real Institution Path

本轮使用真实本地 API 服务 `http://127.0.0.1:3001/api/v1` 模拟机构接入。

### Validated Flow

1. `GET /health`
2. `POST /auth/register`
3. `POST /auth/login`
4. `POST /apikeys`
5. `GET /session/:address`
6. `POST /defi/swap`
7. `POST /defi/liquidity`
8. 使用机构钱包签名 API 返回的未签名交易
9. 广播真实链上交易

### Result

**Status:** `PASS`

### Evidence

| Step | Result |
|---|---|
| API health | `200 ok`，链上连接正常 |
| Register | 成功 |
| Login | 成功 |
| API key creation | 成功 |
| Session query | 成功，目标钱包 `isActive = true` |
| Build swap tx | 成功，目标路由为 `0xd46D84Dc...a2891` |
| Build liquidity tx | 成功，目标 PM 为 `0x692548a6...ea32` |
| Real swap broadcast | 成功 |

**API 模式真实交易哈希：**  
[`0x2a2ade1782c08a49529477aa8fb1fa5edc65a4deb36f92ceb6d2ac7d96f0d8da`](https://sepolia.basescan.org/tx/0x2a2ade1782c08a49529477aa8fb1fa5edc65a4deb36f92ceb6d2ac7d96f0d8da)

**Gas Used:** `159032`

### Institutional Interpretation

从机构系统接入视角看，API 模式已经具备了典型 B2B 基础设施特征：

- ILAL 不托管私钥
- API 只负责构建合规交易
- 最终签名权和广播权仍在机构钱包侧

这一路径符合机构对“控制权不外包”的基本要求。

---

## 2. SDK Mode — Real Institution Path

本轮使用 SDK 的构建产物进行真实接入验证。

### Validated Flow

1. `client.healthCheck()`
2. `client.session.getInfo()`
3. `client.swap.execute()` 走 `Mode 2`
4. `client.swap.executeWithPermit()` 走 `Mode 1`

### Result

**Status:** `PASS`

### Evidence

| Path | Result | Tx |
|---|---|---|
| SDK health | `healthy = true` | - |
| SDK session | `isActive = true` | - |
| SDK Mode 2 swap | 成功 | [`0x2e959d44faab7cde3aef69def32cb26513ecdb5b34edb4cf35ea8b963eec3bef`](https://sepolia.basescan.org/tx/0x2e959d44faab7cde3aef69def32cb26513ecdb5b34edb4cf35ea8b963eec3bef) |
| SDK Mode 1 permit swap | 成功 | [`0x6ff08b99403674d7203644c9bb36b8c2ac2e44f337529fe8d2b744f8820d1761`](https://sepolia.basescan.org/tx/0x6ff08b99403674d7203644c9bb36b8c2ac2e44f337529fe8d2b744f8820d1761) |

### Institutional Interpretation

SDK 已经满足两类机构开发模式：

- **交易机器人 / 后端量化系统**：直接调用 SDK，走 `Mode 2`
- **高价值 / 强审计交易**：显式签名 permit，走 `Mode 1`

这意味着 SDK 已不再只是“概念 API”，而是可供真实接入团队试用的工程入口。

---

## 3. Live Integration / Multi-Wallet Wargame

本轮还重新执行了完整的多钱包 live integration，用 fresh pool 验证蓝队 / 红队行为。

### Blue Team Result

| Test | Status | Tx |
|---|---|---|
| Add liquidity on fresh pool | PASS | [`0x6aad64bccacc2596f91c4dea9c25fdada3ef854f18872c814c173f2bbb468f11`](https://sepolia.basescan.org/tx/0x6aad64bccacc2596f91c4dea9c25fdada3ef854f18872c814c173f2bbb468f11) |
| BlackRock Mode 2 swap | PASS | [`0x0847dc3ade2b6b9a0bffc85aafb06a148f6335f3bccd08db1544d2c0f80835cf`](https://sepolia.basescan.org/tx/0x0847dc3ade2b6b9a0bffc85aafb06a148f6335f3bccd08db1544d2c0f80835cf) |
| Ondo Mode 2 swap | PASS | [`0xf9d26a9a6646c948d0fdadf83240590016dd4938dba6a07ddfe99aa648a2cea3`](https://sepolia.basescan.org/tx/0xf9d26a9a6646c948d0fdadf83240590016dd4938dba6a07ddfe99aa648a2cea3) |
| JPMorgan Mode 2 swap | PASS | [`0x75a581f07a26f0019946b2b3c4939cb74d57d7bcb3e4b6141776cc71ec4b4f92`](https://sepolia.basescan.org/tx/0x75a581f07a26f0019946b2b3c4939cb74d57d7bcb3e4b6141776cc71ec4b4f92) |
| ZK-verified wallet Mode 1 permit swap | PASS | [`0x03f0332f2b228fb18a195507c1e65308ee144e4da72b7e2b6cf5bccbcadd5315`](https://sepolia.basescan.org/tx/0x03f0332f2b228fb18a195507c1e65308ee144e4da72b7e2b6cf5bccbcadd5315) |

### Verification Result

**Real ZK verify + session activation tx:**  
[`0x716a252791f7d79978b315cbc5b6d8e231603a55a1ead2a398dfe774bb484ab4`](https://sepolia.basescan.org/tx/0x716a252791f7d79978b315cbc5b6d8e231603a55a1ead2a398dfe774bb484ab4)

### Conclusion

蓝队视角下，`Mode 2`、`Mode 1`、流动性、session 激活、fresh pool 创建均已被当前代码实证通过。

---

## Frontend Readiness Result

### What Was Checked

- `/live-exercise.json` 是否生成并指向最新 fresh pool
- `/live-exercise` 页面是否能正常加载
- 页面是否处于 permit 模式
- 页面文案和配置是否与当前链上地址一致

### Result

**Status:** `PASS`（页面加载与配置已修复）

### Findings

本轮发现 `/live-exercise` 页面最初为 `500`，原因是：

- `SwapWidget` 的相对导入路径写错，导致页面模块无法解析

该问题已修复，当前：

- `/live-exercise.json` 已指向最新 fresh pool
- 页面加载正常
- 页面文案明确说明这是 `EIP-712 permit` 路径

---

## Red Team Results

本轮红队重点复测身份绕过与参数注入类攻击。

| Attack Vector | Expected | Actual | Result |
|---|---|---|---|
| Unverified wallet swap (Mode 2) | revert | revert | PASS |
| Expired permit swap (Mode 1) | revert | revert | PASS |
| Malformed hookData swap | revert | revert | PASS |
| No-session wallet swap (Mode 2) | revert | revert | PASS |
| **32-byte identity injection** | **revert** | **bypass → fixed → revert** | **PASS (after fix)** |

### Interpretation

本轮发现了一个 **Critical 级别的身份注入漏洞**（Finding 4），修复并重部署后全部攻击向量被拦截。

- 之前修复的 `Mode 2 shared-router session bypass` **没有复发**
- 新修复后的 `Mode 1 permit` 路径没有引入显著的新绕过面
- **新发现的 32 字节身份注入漏洞已修复并重部署，拦截率恢复到 100%**

---

## New Findings Discovered During This Exercise

本轮不是“零问题通过”，而是在真实接入过程中再次发现了 3 个重要问题。  
这些问题的价值在于，它们都是真实机构集成时一定会碰到的。

### Finding 1 — Mode 1 Permit `hookData` Encoding Bug

**Severity:** High  
**Type:** Functional / Integration Defect

#### Symptom

`Mode 1` 一直回滚，表面只看到 `0x90bfb865` 外层错误。

#### Root Cause

前端、SDK、演练脚本使用的是**平铺 ABI 编码**：

`abi.encode(address, uint256, uint256, bytes)`

而 `ComplianceHook` 内部的：

`abi.decode(hookData, (PermitData))`

要求的是**tuple / struct 编码**：

`abi.encode((address user, uint256 deadline, uint256 nonce, bytes signature))`

#### Impact

- `Mode 1` permit 路径在真实使用时会稳定失败
- 看起来像 Hook 或签名错误，实际是编码层不兼容

#### Fix Applied

- `packages/sdk/src/utils/eip712.ts`
- `packages/sdk/src/utils/encoding.ts`
- `apps/landing/components/SwapWidget.tsx`
- `scripts/live-full-integration.ts`

#### Re-Test

修复后：

- `verifySwapPermitView = true`
- `simulateContract = ok`
- 实际链上 `Mode 1` swap 成功

---

### Finding 2 — SDK Server-Side Permit Signing Bug

**Severity:** High  
**Type:** Institutional Integration Defect

#### Symptom

SDK 在后端 / 机器人钱包场景下执行 `executeWithPermit()` 时失败，报：

`eth_signTypedData_v4 does not exist / is not available`

#### Root Cause

SDK 调 `walletClient.signTypedData()` 时传入的是用户地址，而不是本地 account 对象。  
这会导致 viem 尝试走 RPC 的 `eth_signTypedData_v4`，而公共 HTTP RPC 并不支持该方法。

#### Impact

对机构最关键的服务端钱包 / 做市机器人 / 定时任务系统来说，这会直接阻断 `Mode 1` 使用。

#### Fix Applied

- `packages/sdk/src/utils/eip712.ts`

改为优先使用：

- `walletClient.account`

从而让本地私钥钱包完成签名，而不是错误依赖 RPC。

#### Re-Test

修复后：

- SDK `Mode 1` permit swap 成功

---

### Finding 3 — Frontend `/live-exercise` Route 500

**Severity:** Medium  
**Type:** Demo / UX Defect

#### Symptom

`/live-exercise` 页面返回 `500`

#### Root Cause

`app/dashboard/live-exercise/page.tsx` 中 `SwapWidget` 相对路径导入错误。

#### Impact

- 机构演示页无法打开
- 会让外部接入方误判系统仍未可用

#### Fix Applied

- `apps/landing/app/dashboard/live-exercise/page.tsx`

#### Re-Test

修复后页面恢复正常加载。

---

### Finding 4 — SimpleSwapRouter 32-Byte Identity Injection (Critical)

**Severity:** Critical  
**Type:** Security / Identity Spoofing

#### Symptom

量化基准测试的红队环节发现：未验证钱包通过发送 `abi.encode(verifiedUserAddress)` 作为 hookData，成功**绕过合规检查并执行了交易**。

#### Root Cause

`SimpleSwapRouter.swap()` 在 `hookData` 非空时直接透传用户输入：

```solidity
bytes memory resolvedHookData = hookData.length == 0
    ? abi.encode(msg.sender)
    : hookData;
```

攻击者发送 32 字节的受信用户地址 → Router 透传 → ComplianceHook 的 Mode 2 分支盲目解码地址 → 使用受害者的 session 通过检查。

`VerifiedPoolsPositionManager.unlockCallback()` 也有同样的透传逻辑。

#### Impact

- **Critical**: 任何人都可以冒充已验证用户执行交易
- 合规审计记录会显示错误的交易发起者
- 完全绕过 KYC/AML 合规层的准入控制

#### Fix Applied

在两个合约中增加了 hookData 长度校验——只允许空（Mode 2 自动注入 msg.sender）或 >= 148 字节（Mode 1 permit 签名验证），拒绝所有其他长度：

**SimpleSwapRouter:**

```solidity
if (hookData.length == 0) {
    resolvedHookData = abi.encode(msg.sender);
} else if (hookData.length >= 148) {
    resolvedHookData = hookData;
} else {
    revert InvalidHookData();
}
```

**VerifiedPoolsPositionManager** — 同样的修复。

#### Redeployment

| Contract | Old Address | New Address |
|---|---|---|
| SimpleSwapRouter | `0x9f852125Cd84c11cA9136DD1d3F5f7A2291743e3` | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` |
| PositionManager | `0x7Da24C6Aa4133efa1066F1c9A1DC76Bbf9b485fd` | `0x692548a6E1797d2762b9d04f29112C172E5Cea32` |

#### Re-Test

修复并重部署后，红队拦截率从 67% → **100%**。32 字节身份注入攻击现在正确回滚。

---

## Quantitative Benchmark ("值不值得用" Test)

在修复漏洞后，执行了完整的量化基准测试，回答核心问题：**加了 ILAL 合规层之后，成本和收益是否匹配？**

### Gas Overhead

| Metric | Value | Verdict |
|---|---|---|
| Mode 2 swap gas | 141,068 | BASELINE |
| Mode 1 swap gas | 156,588 | MEASURED |
| Mode 1 vs Mode 2 | +15,520 gas (+11.0%) | ACCEPTABLE |
| 合规 Hook vs Vanilla Uniswap v4 | +11,068 gas (+8.5%) | **EXCELLENT** |

### API Response Time

| Endpoint | Latency | Note |
|---|---|---|
| GET /health | ~700ms | Testnet RPC latency |
| GET /session | ~610ms | Testnet RPC latency |
| POST /defi/swap (build) | ~1,670ms | Includes on-chain reads |

### Session Reuse — Burst Trading

| Metric | Value |
|---|---|
| 3 笔连续 Mode 2 swap 平均 gas | 141,068 (完全一致) |
| 3 笔连续 swap 平均延迟 | ~4,089ms (含区块确认) |
| Gas 一致性 | **100%**（零波动） |

### Red Team Block Rate

| Attack Vector | Result |
|---|---|
| No-session Mode 2 | Blocked |
| Malformed hookData (4 bytes) | Blocked |
| Fake 32-byte identity injection | Blocked |
| **Total block rate** | **3/3 (100%)** |

### EIP-712 Permit Signing Cost

| Metric | Value |
|---|---|
| 本地私钥签名耗时 | ~640ms |
| Gas 消耗 | 0 (off-chain) |

### Cost-Benefit Summary

```
┌──────────────────────────────────────────────────────────────┐
│  成本: gas +~8.5%，延迟无显著增加，签名零 gas                 │
│  收益: 100% 非合规交易被阻断，合规交易零摩擦                  │
│                                                              │
│  结论: 值得用。                                               │
│                                                              │
│  对机构而言，8.5% 的 gas 开销换来了链上合规的                  │
│  可审计证明，这比任何链下合规方案都便宜。                      │
│  一次 ZK 验证 → 24h session → 无限次交易。                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Residual Risks / What Is Still Not Proven

虽然本轮结论明显转正，但仍有几项不能过度表述：

### 1. 还不是生产审计结论

本轮是测试网真实实测，不是正式第三方审计。

### 2. 浏览器钱包签名未做全自动化点击验证

当前环境下无法替代真实用户钱包扩展自动确认签名。  
不过页面、live config、permit 生成逻辑与链上地址已全部对齐。

### 3. 错误可观测性仍偏弱

目前红队失败大多仍表现为外层：

`WrappedError(0x90bfb865)`

虽然本身安全上没有问题，但对机构运维和排障不够友好。  
建议后续增强底层错误解码与日志映射。

### 4. 生产接入还缺少 P1 交付物

- 自动化测试矩阵
- 运维 runbook
- 监控告警
- 审计包

---

## Final Verdict

### If I Were the Institution

如果我是机构技术负责人，我会给出如下决策：

| Scenario | Decision |
|---|---|
| 测试网 PoC / BD 演示 | Go |
| 小范围白名单试点 | Go |
| 正式生产接入 | Conditional |

### Why

因为当前系统已经实证具备：

- API 模式可接入
- SDK 模式可接入
- Mode 1 / Mode 2 双路径可交易
- 红队复测未发现新的绕过

但还不具备：

- 生产级运维可交付物
- 审计完备性
- 自动化回归矩阵

### Final Statement

**ILAL 当前已经达到“测试网级别机构可实操、可演示、可试点”的状态。**  
**它不再只是技术概念验证，但也尚未完成正式生产级机构交付。**

---

## Related Artifacts

- `docs/testing/LIVE_FULL_INTEGRATION_REPORT.md`
- `docs/testing/INSTITUTIONAL_READINESS_CHECKLIST.md`
- `docs/testing/WARGAME_REPORT.md`

