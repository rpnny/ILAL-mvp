# ILAL 机构化整改路线图

**日期:** 2026-03-15  
**目标:** 将 ILAL 从“测试网级别机构可演示”推进到“可进入正式机构试点，再推进至生产级接入”  
**适用对象:** 项目负责人、协议工程、API 团队、产品与 BD、运维 / 安全负责人

---

## 1. 总原则

当前 ILAL 最大的问题不是“技术做不出来”，而是“机构不敢放心接”。  
因此整改顺序不应只围绕功能开发，而应围绕**信任建设**展开。

建议遵循以下优先级：

1. 先统一对外口径，消除明显不一致。
2. 再补齐试点所需的运维、审计和控制面交付物。
3. 最后推进真正的生产级治理、品牌、SLA 和主网能力。

---

## 2. 当前阶段定义

根据现有材料，ILAL 当前最准确的对外定位应为：

**“测试网级别、已完成真实链路验证的机构 DeFi 合规基础设施，可用于 PoC 和受控白名单试点准备。”**

当前不建议继续公开使用以下表述：

- `production-ready for institutional DeFi`
- `fully audited`
- `mainnet-ready`
- `enterprise-grade SLA available`

原因见：

- `docs/testing/INSTITUTIONAL_READINESS_CHECKLIST.md`
- `SECURITY.md`
- `README.md`
- `docs/outreach/ILAL_ONE_PAGER.md`
- `docs/outreach/ILAL_EXECUTIVE_BRIEF.md`

---

## 3. P0：立即修复的信任问题

P0 目标不是提升功能，而是**消除机构首次尽调就会发现的红旗**。  
这一层应在最短时间内完成，建议 2-5 天内收口。

### P0-1. 统一合约地址与网络状态

#### 问题

- `README.md` 和 `docs/outreach/ILAL_EXECUTIVE_BRIEF.md` 仍展示旧地址
- `packages/sdk/src/constants/addresses.ts` 与 `apps/api/src/config/constants.ts` 已切换到 v2
- `packages/sdk/src/constants/addresses.ts` 中 Base Mainnet 仍是全零地址，占位状态明显

#### 目标

- 所有公开材料统一指向同一套 Base Sepolia v2 地址
- 明确标注 Base Mainnet 尚未部署，不再给人“默认主网可用”的印象

#### 需处理文件

- `README.md`
- `docs/outreach/ILAL_EXECUTIVE_BRIEF.md`
- `docs/outreach/ILAL_ONE_PAGER.md`
- `packages/sdk/README.md`
- `docs/guides/saas/SAAS_QUICKSTART.md`
- `apps/landing` 下对外 docs 页面

#### 完成标准

- 所有地址文档只保留一个权威来源
- 所有示例 `chainId` 与部署状态一致
- 所有“mainnet ready”误导表达下线

### P0-2. 统一域名、API 入口和认证方式

#### 问题

仓库内混用：

- `api.ilal.tech`
- `api.ilal.tech`
- `dashboard.ilal.tech`
- Railway 临时域名

同时认证说明也存在 `X-API-Key` 与 `Authorization: Bearer YOUR_API_KEY` 混用。

#### 目标

- 只保留一个正式 API 基础域名
- 只保留一个正式 dashboard / docs 域名
- API 认证方式只保留一个标准写法

#### 需处理文件

- `apps/api/docs/API.md`
- `docs/guides/saas/SAAS_QUICKSTART.md`
- `docs/guides/saas/API_REFERENCE.md`
- `apps/landing/app/docs/*`
- `examples/institutional-demo/*`

#### 完成标准

- 所有 curl 示例可直接复制执行
- 所有 docs 页面与 README 一致
- 不再出现临时域名和备用入口混写

### P0-3. 清理占位信息与“半成品信号”

#### 问题

以下内容会显著拉低机构信任：

- `your-org`
- `yourdomain.com`
- `@[your handle]`
- `coming soon`
- 个人 `qq.com` 邮箱作为唯一公开联络方式

#### 需处理文件

- `SECURITY.md`
- `packages/sdk/package.json`
- `packages/sdk/README.md`
- `apps/api/README.md`
- `apps/api/docs/DEPLOYMENT_GUIDE.md`
- `apps/api/RAILWAY_DEPLOYMENT_GUIDE.md`
- `docs/guides/saas/SAAS_QUICKSTART.md`

#### 完成标准

- 所有 README、package metadata、官网页面都换成真实仓库链接和联络方式
- 明确官方支持邮箱
- 若某功能未开放，改为“planned / private beta”，不要写“coming soon”

### P0-4. 统一安全与成熟度表述

#### 问题

- `docs/outreach/ILAL_ONE_PAGER.md` 写“7 audited smart contracts”
- `SECURITY.md` 写 external audit pending
- readiness 文档又明确写当前不应宣称 production-ready

#### 目标

建立单一成熟度口径：

- 测试网实证已完成
- 外部审计未完成
- 适合 PoC / 白名单试点
- 暂不适合正式生产接入

#### 完成标准

- 所有对外材料采用同一成熟度模板
- 对“审计”“生产就绪”“主网状态”的表述不再相互冲突

---

## 4. P1：进入机构试点前必须交付

P1 是从“能演示”走向“能试点”的决定性阶段。  
建议 2-4 周内完成最小闭环。

### P1-1. 输出正式 runbook

当前项目有控制原语，但缺乏机构需要的操作手册。

#### 必需 runbook

- emergency pause runbook
- session revocation runbook
- router allowlist change runbook
- verifier key rotation runbook
- Merkle root rotation runbook
- deployment rollback runbook

#### 建议落盘位置

- `docs/ops/EMERGENCY_PAUSE_RUNBOOK.md`
- `docs/ops/SESSION_REVOCATION_RUNBOOK.md`
- `docs/ops/ROUTER_ALLOWLIST_RUNBOOK.md`
- `docs/ops/VERIFIER_KEY_ROTATION_RUNBOOK.md`
- `docs/ops/MERKLE_ROOT_ROTATION_RUNBOOK.md`
- `docs/ops/ROLLBACK_RUNBOOK.md`

#### 每份 runbook 至少包含

- 触发条件
- 操作前检查
- 执行步骤
- 验证步骤
- 回滚步骤
- 升级路径与通知对象

### P1-2. 建立最小监控与告警体系

当前可确认的基础是日志与可选 Sentry，但对于机构试点远远不够。

#### 最小监控集

- API 可用性
- `/health` 成功率
- verify 成功率 / 失败率
- session activation latency
- swap revert rate
- router approval 变更
- pause / unpause 事件
- per-wallet 异常失败峰值

#### 最小告警集

- API 服务不可达
- verify 失败率激增
- session activation 超时
- on-chain pause 被触发
- allowlist / verifier / root 被修改

#### 建议实现方向

- 先上最小 Prometheus 或托管监控
- Sentry 保留作为错误追踪
- 增加值班联系人和告警路由

### P1-3. 补齐机构试点测试矩阵

虽然测试材料很多，但应把“机构看得懂的测试矩阵”单独整理出来。

#### 至少纳入这些用例

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

#### 建议产物

- 一个面向机构的测试矩阵文档
- 一个与文档对应的自动化命令清单
- 一个失败场景到监控告警的映射表

### P1-4. 审计材料包

外部审计不只是“拿到一份 PDF”，机构更看重能否形成闭环。

#### 必需材料

- 最新架构图
- threat model
- 权限矩阵
- 升级权限说明
- 已修复问题清单
- known limitations
- 外部审计报告
- finding closure report

### P1-5. 限制试点边界

在 P1 完成之前，试点不应开放式推进。

#### 建议限制

- 固定钱包白名单
- 固定交易对
- 固定池子
- 固定金额上限
- 变更冻结窗口
- 人工值守

---

## 5. P2：正式生产前补齐

P2 才是从“可试点”走向“可采购”的阶段。

### P2-1. 密钥治理与生产安全升级

#### 当前问题

- `VERIFIER_PRIVATE_KEY` 仍基于环境变量管理
- 未见 KMS / HSM / 多签审批流
- 密钥轮换策略未制度化

#### 目标

- verifier / admin 权限纳入更高等级密钥管理体系
- 敏感操作有审批与审计留痕
- 关键权限去单点

### P2-2. 数据与恢复能力

#### 当前问题

- `apps/api/DEPLOYMENT_CHECKLIST.md` 主要是待办清单
- 未见恢复演练、备份恢复测试记录、RTO / RPO 定义

#### 目标

- 建立数据库备份恢复演练
- 建立环境级回滚演练
- 定义并对外说明恢复目标

### P2-3. 品牌与供应商界面升级

机构接不接，不只看代码，也看“你像不像一个能签合同的供应商”。

#### 建议动作

- 统一官方邮箱与域名
- 建立正式 support / security / sales 入口
- 官网补齐 status page、incident policy、legal / privacy / terms
- package metadata、GitHub 仓库、官网 docs 统一品牌信息

### P2-4. 主网前真实运营闭环

当前 ZK 链路已验证，但真实机构运营还需要补全：

- issuer onboarding 流程
- root rotation 流程
- revocation 流程
- 例外审批流
- 审计留痕与客户查询接口

### P2-5. 正式 SLA 与客户支持

若要面对银行、资管、托管方，应准备：

- 可量化 SLA
- 支持级别定义
- 事故响应时限
- 升级沟通机制
- 发布与变更窗口制度

---

## 6. 建议时间表

## 第一阶段：1 周内

- 完成所有 P0 文档收口
- 统一地址、域名、认证方式、主网状态
- 清除占位信息和冲突表述

## 第二阶段：2-4 周内

- 输出 P1 runbook
- 落地最小监控与告警
- 整理机构试点测试矩阵
- 准备审计材料包

## 第三阶段：4-8 周内

- 完成外部审计
- 形成 finding closure
- 补齐密钥治理、恢复演练、值班机制
- 明确白名单试点边界并启动试点

## 第四阶段：8 周后

- 在通过试点后推进主网和正式生产接入准备
- 建立 SLA、支持体系、状态页和正式客户交付界面

---

## 7. 建议对外口径

在整改完成前，建议统一使用以下表述：

> ILAL is a testnet-validated compliance infrastructure for institutional DeFi.  
> The system has completed end-to-end validation across ZK verification, session activation, and hook enforcement, and is currently suitable for PoC and controlled pilot evaluation.  
> External audit, production monitoring, and institutional operations packages are in progress before formal production onboarding.

对应中文口径：

> ILAL 已完成测试网级别的真实链路验证，当前适合 PoC 和受控白名单试点评估。  
> 正式生产接入前，仍需完成外部审计、生产监控与机构化运维交付。

---

## 8. 最终目标状态

当以下条件全部满足时，ILAL 才更接近“机构可采购”：

- 对外口径完全统一
- 外部审计完成并闭环
- runbook 与权限矩阵齐全
- 监控、告警、值班、恢复体系上线
- 主网状态与品牌界面清晰
- 真实 issuer / root / revocation 运营闭环可演示

---

## 9. 一句话路线建议

**先修“让人不信任的地方”，再补“让人敢试点的能力”，最后再讲“让人敢上生产的故事”。**
