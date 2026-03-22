# ILAL 测试验证补充说明

**日期:** 2026-03-15  
**目的:** 为 `INSTITUTIONAL_DUE_DILIGENCE_REPORT.md` 与 `INSTITUTIONAL_REMEDIATION_ROADMAP.md` 提供运行层面的补充证据  
**范围:** 本次会话内可复用的运行结果 + 本次新增触发的轻量测试

---

## 1. 结论摘要

本次补充验证表明，ILAL 当前的“测试网级别机构可演示”判断与运行证据是一致的。

可以确认的事实：

- 本地 API 服务处于可用状态，健康检查返回正常。
- SDK 单元测试通过。
- API 单元测试通过。
- 现有终端中已有一轮更重的机构 E2E，且结果为 `15/15` 通过，并伴随真实链上交易。

同时也可以确认：

- 当前环境存在多个重复启动的 API dev 进程，其中至少一个因 `EADDRINUSE` 失败。
- 这进一步印证了“功能链路能跑通”与“运维控制面仍需收口”并存的状态。

---

## 2. 本次直接执行的验证

### 2.1 API 健康检查

执行命令：

```bash
curl -s http://localhost:3001/api/v1/health
```

结果：

- HTTP 请求成功
- 返回 `status: ok`
- 数据库状态为 `connected`
- 区块链状态为 `connected: true`
- 网络识别为 `base-sepolia`

关键返回内容：

```json
{
  "status": "ok",
  "service": "ILAL API",
  "database": "connected",
  "blockchain": {
    "connected": true,
    "network": "base-sepolia"
  }
}
```

### 2.2 SDK 单元测试

执行命令：

```bash
pnpm --filter ilal-sdk test -- --run
```

结果：

- `6` 个测试文件通过
- `29` 个测试通过
- `0` 失败

覆盖面包括：

- client 初始化
- session 模块
- swap 模块
- 编码工具
- 参数校验
- 错误处理

### 2.3 API 单元测试

执行命令：

```bash
pnpm --filter @ilal/api test
```

结果：

- `7` 个测试通过
- `0` 失败

覆盖点包括：

- duplicate proof hash 拦截
- verifier reject 时 proof reservation 回滚
- startSession 失败时回滚
- renewSession 的权限与计数逻辑
- relay write whitelist 限制

---

## 3. 复用到的现有重型验证证据

在本地已有终端输出中，可确认存在一轮已执行完成的机构 E2E：

- 脚本：`scripts/institutional-e2e.ts`
- 结果：`15 / 15` 通过
- 运行时长：约 `47-48s`
- 包含真实链上交易：`2` 笔

该轮验证覆盖了：

- `GET /health`
- `POST /auth/register`
- `POST /apikeys`
- `POST /onboarding/register`
- `GET /onboarding/status`
- `GET /onboarding/attestation`
- 本地 ZK proof 生成
- `POST /verify`
- `POST /defi/swap`
- `POST /defi/liquidity`
- 两笔真实链上交易广播
- session 查询
- API key 清理

终端中记录的交易链接包括：

- `https://sepolia.basescan.org/tx/0x379c7a34f1097322ee3ee78e079cf94691c881a14d94f2dbd344b280c47b8288`
- `https://sepolia.basescan.org/tx/0xc33f7c70b5fa1158cb07daa33724b3cf611e1d69ecd61b809d2e16d2b9715b60`

以及另一轮重复成功的记录：

- `https://sepolia.basescan.org/tx/0x3a4d7ea1d71c02456eb85ea7535451cc6d80b5b4c9a946bc042c236fe890b77b`
- `https://sepolia.basescan.org/tx/0xf0ab532c37c1bce411c9e8992d089d2a72e9a34e794d837a3020c13c004eb947`

---

## 4. 运行层面的补充观察

### 4.1 正向观察

- 本地 API 与数据库、链上 RPC 在当前环境下确实可联通。
- SDK 和 API 的核心单测都能在当前环境稳定跑通。
- 机构 E2E 已经不只是“构建 payload”，而是完成了 session 激活与真实交易广播。

### 4.2 负向观察

- 当前环境中存在多个重复启动的 `@ilal/api dev` 进程。
- 至少一个 dev 终端明确报出 `EADDRINUSE: address already in use :::3001`。

这说明：

- 系统功能并未失效
- 但本地运行与运维纪律还不够收口
- 这与尽调报告中的“生产控制面不足”结论相互印证

---

## 5. 这份补充说明对尽调结论的影响

本补充不会改变主结论，只会增强其可信度：

- 对 `PoC / 技术验证`：进一步支持 `Go`
- 对 `白名单试点`：进一步支持 `Conditional Go`
- 对 `正式生产`：仍维持 `No-Go for now`

原因是：

- 运行层面的功能证据已经足够强
- 阻碍正式生产的主要问题并不是“代码跑不起来”，而是审计、监控、runbook、恢复、密钥治理和对外一致性仍未达标

---

## 6. 最终说明

这份补充说明证明，ILAL 当前最真实的状态不是“概念项目”，而是：

**“一套已经具备真实测试网实操能力的系统，但仍需要完成机构化生产交付收口。”**
