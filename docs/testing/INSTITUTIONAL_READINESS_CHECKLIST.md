# ILAL Institutional Readiness Checklist

**Date:** 2026-03-12  
**Last Updated:** 2026-03-12 (P0 fixes applied)  
**Scope:** Base Sepolia / 机构接入成熟度评估  
**Current Verdict:** **P0 已全部修复，进入 P1 阶段**

---

## Executive Verdict

ILAL 已完成以下关键里程碑：

1. `ComplianceHook + Uniswap v4` 的核心架构已验证可运行
2. 已发现并修复一个真实的高危绕过漏洞（Mode 2 shared-router session bypass）
3. **P0 全部修复完成**：地址全量对齐、SDK 权限模型修正、Mode 1 permit 路径打通

系统已达到**测试网级别机构可演示状态**。下一步需完成 P1（测试矩阵、运维 runbook、监控告警、审计包）才能进入正式机构生产接入。

---

## Overall Status

| Area | Status | Verdict |
|---|---|---|
| Fresh pool / hook / liquidity live test | Ready | 已验证 |
| Real ZK proof -> API -> session activation | Ready | 已验证 |
| Mode 2 router-mediated identity | Ready on testnet | 已修复并验证 |
| Red-team block coverage (Mode 2) | Ready on testnet | 已验证 |
| Mode 1 EIP-712 permit trading | Ready | SDK + 前端已支持，地址已对齐 |
| SDK institutional flow accuracy | Ready | session.activateViaApi() 已对齐权限模型 |
| API / SDK address consistency | Ready | 全量更新到 v2 合约地址 |
| Mainnet deployment readiness | Not ready | 需完成 P1 |
| Audit / monitoring / ops controls | Not ready | 需完成 P1 |

---

## P0 Fix Summary (All Completed)

### P0-1. Mode 1 EIP-712 Permit -- FIXED

**Root Cause**

Mode 1 permit swap 之前失败的根本原因是两个：
1. 前端和 SDK 使用旧的 ComplianceHook 地址作为 EIP-712 `verifyingContract`，导致签名验证失败
2. 测试时 v2 SimpleSwapRouter 尚未在 Registry 中注册为 approved router

**Applied Fix**

- 全量更新 `verifyingContract` 地址至 v2 ComplianceHook (`0xe633...0A80`)
- SDK 新增 `swap.executeWithPermit()` 方法，完整支持 Mode 1 签名 + 交易流程
- 前端 `SwapWidget` permit 模式自动使用正确的 v2 地址
- v2 `SimpleSwapRouter` 在 hookData 非空时直接透传（不注入 msg.sender），确保 permit bytes 完整到达 ComplianceHook

**Files Changed**

- `packages/sdk/src/modules/swap.ts` -- 新增 `executeWithPermit()`
- `packages/sdk/src/constants/addresses.ts` -- v2 地址
- `apps/landing/lib/contracts.ts` -- v2 地址
- `apps/landing/components/SwapWidget.tsx` -- permit 签名自动使用正确 Hook 地址

### P0-2. SDK Session 激活模型 -- FIXED

**Root Cause**

`SessionManager.startSession()` 链上要求 `VERIFIER_ROLE`，但 SDK 的 `session.activate()` 使用用户钱包直接调用，永远会 revert。

**Applied Fix**

- 新增 `session.activateViaApi()` 方法：通过 ILAL API `/api/v1/verify` 提交 ZK proof，由 API（拥有 VERIFIER_ROLE）代为激活
- 新增 `session.configureApi()` 用于设置 API 连接
- 保留 `session.activate()` 但明确标注仅供管理钱包（VERIFIER_ROLE）使用
- SDK 示例 (`examples/institutional-demo/sdk-mode`) 已改用 `activateViaApi()` 流程

**Files Changed**

- `packages/sdk/src/modules/session.ts` -- 新增 `activateViaApi()` / `configureApi()`
- `examples/institutional-demo/sdk-mode/trading-system.ts` -- 改用 API 激活流程

### P0-3. 地址一致性 -- FIXED

**Root Cause**

SDK / API / 前端 / 示例的默认地址和 fallback 仍指向 v1 合约。

**Applied Fix**

v2 合约地址已全量更新到以下 6 个位置：

| 文件 | 更新内容 |
|---|---|
| `packages/sdk/src/constants/addresses.ts` | complianceHook / simpleSwapRouter / positionManager |
| `apps/api/src/config/constants.ts` | 全部 5 个合约 fallback |
| `apps/api/.env` | 已在之前的 wargame 中更新 |
| `apps/landing/lib/contracts.ts` | SWAP_ROUTER / COMPLIANCE_HOOK |
| `examples/institutional-demo/api-mode/trading-system.ts` | 示例响应中的 router 地址 |
| `apps/api/src/services/defi.service.ts` | 注释更新为 v2 三模式架构 |

**V2 Contract Addresses (Base Sepolia)**

| Contract | Address |
|---|---|
| Registry | `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` |
| SessionManager | `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` |
| ComplianceHook | `0xe633220f15932428FcA60A1A2C2C48797A180A80` |
| SimpleSwapRouter | `0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891` |
| PositionManager | `0x692548a6E1797d2762b9d04f29112C172E5Cea32` |
| PlonkVerifier | `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` |
| PoolManager (Uniswap) | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |

### P0-4. 推荐机构路径 -- DEFINED

**当前推荐路径（测试网阶段）**

```
Mode 2 (Router-Mediated Identity):
  用户 → API 验证 ZK proof → session 激活 → 调用 SimpleSwapRouter.swap(hookData=0x)
  Router 自动注入 abi.encode(msg.sender)，ComplianceHook 解码并验证 session
```

**高安全路径（Mode 1 EIP-712 Permit）**

```
Mode 1 (EIP-712 Permit):
  用户签名 SwapPermit → hookData = abi.encode(user, deadline, nonce, sig)
  ComplianceHook 链上验证签名 + nonce → 无需预激活 session
  SDK: client.swap.executeWithPermit()
  前端: SwapWidget mode="permit"
```

**生产阶段推荐路径**

Mode 1 + Mode 2 并行提供：
- Mode 1 用于高价值、需要显式授权审计的交易
- Mode 2 用于日常合规交易（session 已激活的情况下更高效）

---

## P1 Should Complete Before Production Launch

### P1-1. 完整的集成测试矩阵

至少补齐以下自动化用例：

- verified user swap success
- unverified user swap revert
- expired session revert
- expired permit revert
- malformed hookData revert
- router not approved revert
- replay nonce revert
- liquidity add success
- liquidity add reject when session inactive
- liquidity remove allowed under pause

### P1-2. 运营与治理控制

机构不会只看功能，还会看异常处置能力。

需要补齐：

- emergency pause runbook
- session revocation runbook
- router allowlist change runbook
- verifier key rotation runbook
- Merkle root rotation runbook

### P1-3. 监控与告警

至少应具备：

- swap revert rate
- verify success / failure rate
- session activation latency
- router approval changes
- pause / unpause events
- unusual per-wallet failure spikes

### P1-4. 审计包

机构上线通常至少要有：

- 最新架构图
- threat model
- external audit report
- fixed findings list
- known limitations list
- upgrade / admin permission matrix

---

## P2 Recommended For Institutional Confidence

### P2-1. 前端与示例系统一致性

- `/live-exercise` 说明当前到底走 `Mode 1` 还是 `Mode 2`
- 示例代码和真实生产推荐路径保持一致
- 所有 demo 移除"概念可行但实际不可用"的描述

### P2-2. 风控与策略层

- per-wallet limits
- per-pool limits
- per-issuer risk flags
- country / product restrictions
- institution-level allow / deny policy

### P2-3. 主网前演练

- fork rehearsal
- chaos testing
- verifier downtime drill
- RPC failover drill
- session expiry surge test

---

## What Can Be Claimed Now

当前可以对外表述为：

- ILAL 已完成测试网级别的真实集成验证，所有 P0 已修复
- ZK verification -> session activation -> hook enforcement 链路已跑通
- 已发现并修复一个关键的 router/session 架构漏洞
- Mode 1 (EIP-712 permit) 和 Mode 2 (router-mediated) 双路径均已可用
- SDK、API、前端三端地址一致，权限模型对齐

---

## What Should Not Be Claimed Yet

当前不应表述为：

- "production-ready for institutional DeFi"（缺少 P1 审计/运维交付物）
- "机构已可直接接入上线"（需完成测试矩阵和监控）

---

## Recommended Go / No-Go Decision

| Scenario | Decision |
|---|---|
| 测试网 PoC / BD 演示 / 技术验证 | **Go** |
| 小范围技术试点（受控白名单） | **Go** (P0 已修复) |
| 正式机构生产接入 | **Conditional** (需完成 P1) |

**Conditional root causes**

- 缺少机构级运维、审计、监控交付物（P1）
- 未做完整自动化测试矩阵（P1-1）

---

## Fastest Path To Institutional-Ready

按最短路径建议这样推进：

1. ~~完成 PermitSwapRouter~~ -> **已通过 v2 SimpleSwapRouter 原生支持 Mode 1**
2. ~~修正 SDK session activation 流程~~ -> **已完成 activateViaApi()**
3. ~~全量更新地址与示例~~ -> **已完成**
4. 补自动化测试矩阵
5. 补运维 runbook + 监控告警
6. 再做一次完整红蓝演练并出最终审计口径报告

---

## Final Verdict

**P0 全部修复完成。系统已从"技术可行"升级为"测试网级别机构可演示"。**

下一阶段重点是 P1：

- 补自动化测试矩阵
- 补运维 runbook 和监控告警
- 准备审计材料包
- 完成后可进入正式机构试点
