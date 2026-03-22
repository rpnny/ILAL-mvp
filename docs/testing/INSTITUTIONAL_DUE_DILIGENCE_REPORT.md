# ILAL 机构尽调意见书

**日期:** 2026-03-15  
**评估对象:** ILAL (Institutional Liquidity Access Layer)  
**评估视角:** 机构客户技术尽调 / 风控预审 / 采购前评估  
**结论摘要:** **适合 PoC 与受控试点，不建议直接进入正式生产接入**

---

## 1. 执行摘要

从机构客户视角看，ILAL 已经不是单纯的概念 Demo，而是一个具备真实技术验证、测试网实证和初步产品化能力的项目。其核心价值主张清晰：将 DeFi 合规验证从“逐笔验证”前移为“会话级验证”，通过 ZK proof + session caching 显著降低机构交易的边际合规成本。

但本项目当前更接近**强技术 PoC / 测试网试点候选**，尚未达到机构生产采购标准。决定性原因不在于“功能不可用”，而在于以下生产级控制面仍明显不足：

- 缺少外部安全审计和审计闭环材料
- 缺少机构级 runbook、回滚恢复、监控告警和值班机制
- 对外地址、域名、认证方式、主网状态等口径不一致
- 真实合规运营闭环仍带有 demo 化痕迹

**综合判断：**

- `PoC / BD 演示`: `Go`
- `白名单试点`: `Conditional Go`
- `正式生产接入`: `No-Go for now`

---

## 2. 评估方法

本次评估基于仓库内文档、代码和测试材料交叉验证，不仅参考对外宣传文案，也参考底层实现与报告材料。

### 核心评估文件

- 总览与对外材料：`README.md`、`docs/outreach/ILAL_EXECUTIVE_BRIEF.md`、`docs/outreach/ILAL_ONE_PAGER.md`
- 架构与接入面：`docs/guides/ARCHITECTURE_EN.md`、`docs/guides/saas/SAAS_ARCHITECTURE.md`、`docs/guides/saas/SAAS_QUICKSTART.md`、`apps/api/docs/API.md`
- 实测与成熟度：`docs/testing/INSTITUTIONAL_READINESS_CHECKLIST.md`、`docs/testing/INSTITUTIONAL_FIELD_REPORT.md`、`docs/testing/INSTITUTIONAL_BENCHMARK.md`、`docs/testing/LIVE_FULL_INTEGRATION_REPORT.md`、`docs/testing/LIVE_STRESS_REPORT.md`
- 安全与运维材料：`SECURITY.md`、`apps/api/DEPLOYMENT_CHECKLIST.md`、`apps/api/TEST_GUIDE.md`
- 代码侧成熟度信号：`apps/api/src/index.ts`、`apps/api/src/routes/verify.routes.ts`、`apps/api/src/middleware/usage.middleware.ts`、`apps/api/src/config/constants.ts`、`packages/sdk/src/constants/addresses.ts`

说明：本报告在初版中以**文档与代码尽调**为主；运行测试结果将以补充说明方式追加。

---

## 3. 总体判断

### 3.1 可取之处

- 项目解决的问题真实，且切中机构进入 DeFi 的核心阻力。
- 技术架构完整，覆盖合约、API、SDK、前端和 ZK circuits。
- 测试网实证较强，存在真实链上交易哈希、红蓝演练、压力测试和多模式接入报告。
- API 与 SDK 已体现一定产品化意识，例如 API Key、限流、配额、usage tracking、Sentry、日志等。
- 团队对问题披露较坦诚，明确记录了此前发现并修复的关键漏洞。

### 3.2 核心结论

ILAL 已证明“方案可行”和“链路可跑通”，但尚未证明“机构生产可托底”。  
对于机构客户而言，这两者的差别非常大。

---

## 4. 主要优点

### 4.1 市场切口和价值主张成立

`README.md` 与 `docs/outreach/ILAL_EXECUTIVE_BRIEF.md` 对价值主张描述一致：以 session 为单位缓存合规状态，把逐笔合规成本转化为一次性验证成本。这一逻辑对高频交易、做市、RWA 流动性场景具有明显吸引力。

### 4.2 测试网实证强于一般 Demo

以下材料给出了真实测试网链路证据：

- `docs/testing/INSTITUTIONAL_FIELD_REPORT.md`
- `docs/testing/INSTITUTIONAL_BENCHMARK.md`
- `docs/testing/LIVE_FULL_INTEGRATION_REPORT.md`
- `docs/testing/LIVE_STRESS_REPORT.md`

这些报告覆盖了：

- API 模式接入
- SDK 模式接入
- Mode 1 permit 与 Mode 2 session 路径
- 红队绕过测试
- emergency pause / router de-approve / session end/restart
- 压力和多轮交易验证

这说明项目已进入“工程验证阶段”，而不是停留在概念验证阶段。

### 4.3 API 产品化信号真实存在

代码侧可以确认 API 服务并非只是 mock：

- `apps/api/src/routes/verify.routes.ts` 实现了 API key、权限校验、限流、quota 与 verify 流程接入
- `apps/api/src/middleware/usage.middleware.ts` 实现了 usage 记录和配额检查
- `apps/api/src/index.ts` 初始化了 Sentry，并具备基础服务启动与 graceful shutdown 逻辑

这类实现对于机构 PoC 很重要，因为它决定对接方式是否接近真实 B2B 基础设施。

---

## 5. 关键问题与机构风险

以下问题按“对机构信任与生产接入影响”排序。

### 5.1 高风险：对外口径不一致

这是本项目当前最影响机构信任的问题之一。

#### 5.1.1 地址不一致

- `README.md` 与 `docs/outreach/ILAL_EXECUTIVE_BRIEF.md` 仍展示旧版 `ComplianceHook / SimpleSwapRouter / PositionManager` 地址
- `packages/sdk/src/constants/addresses.ts`、`apps/api/src/config/constants.ts`、`docs/testing/INSTITUTIONAL_READINESS_CHECKLIST.md`、`docs/testing/INSTITUTIONAL_FIELD_REPORT.md` 已切到 v2 地址

**机构解读：** 对外主文档与实际接入常量未完全对齐，说明发布流程和变更管理还不稳定。

#### 5.1.2 域名和入口不一致

仓库内同时出现：

- `api.ilal.tech`
- `api.ilal.tech`
- `dashboard.ilal.tech`
- `ilal.tech`
- Railway 临时域名

相关文件包括：

- `README.md`
- `apps/api/docs/API.md`
- `docs/guides/saas/SAAS_QUICKSTART.md`
- `apps/landing` 下多个 docs 页面

**机构解读：** 无法快速识别哪个是正式生产入口，影响采购、法务和安全审查。

#### 5.1.3 认证方式文案不一致

- `apps/api/docs/API.md` 指向 `X-API-Key`
- 其他 docs 页面存在 `Authorization: Bearer YOUR_API_KEY` 的写法

**机构解读：** 一旦首次接入失败，机构会自然怀疑文档可靠性和平台成熟度。

#### 5.1.4 主网状态表述不一致

- `docs/guides/saas/SAAS_QUICKSTART.md` 中示例默认 `chainId: 8453`
- `packages/sdk/src/constants/addresses.ts` 中 Base Mainnet 地址仍为全零占位，且标注未部署
- `packages/sdk/README.md` 也明确 Base Mainnet 为 `Coming soon`
- 官网文案和路线图又在不同位置表达“live on Base Sepolia”与“主网上线在未来”

**机构解读：** “测试网活跃”与“主网准备好”是两回事，当前对外口径尚未划清。

### 5.2 高风险：安全与审计成熟度不足

#### 5.2.1 缺少外部审计

- `SECURITY.md` 明确写明 external audit pending
- `docs/archives/SLITHER_AUDIT_REPORT_2026-02-11.md` 属于自跑静态分析，不等同于第三方安全审计

**机构解读：** 没有外部审计，基本无法进入正式生产评审。

#### 5.2.2 曾出现关键漏洞

`docs/testing/INSTITUTIONAL_FIELD_REPORT.md` 和 `docs/testing/INSTITUTIONAL_READINESS_CHECKLIST.md` 都明确记录过真实关键漏洞及修复。

**机构解读：**

- 正面：团队确实在发现并修复问题
- 负面：系统仍处于快速打磨阶段，不适合直接托管关键业务流量

### 5.3 高风险：运维与控制面不够机构级

`docs/testing/INSTITUTIONAL_READINESS_CHECKLIST.md` 已明确列出 P1 缺口：

- emergency pause runbook
- session revocation runbook
- router allowlist change runbook
- verifier key rotation runbook
- Merkle root rotation runbook

同时，`apps/api/DEPLOYMENT_CHECKLIST.md` 更多是检查表，而非真正可执行的生产 runbook。

**机构解读：** 当前有“控制原语”，缺少“控制流程”。

### 5.4 中高风险：监控告警更多停留在计划层

代码中可确认：

- `apps/api/src/index.ts` 已接入可选 Sentry
- 日志体系存在

但尚未看到充分落地的：

- Prometheus / Grafana
- `/metrics`
- 统一告警规则
- 值班与升级路径
- 恢复演练与 RTO / RPO

`docs/guides/saas/SAAS_ARCHITECTURE.md` 写了理想监控栈，但 readiness 文档和代码状态都表明这些仍未完整落地。

### 5.5 中风险：真实身份体系仍有 demo 化痕迹

`docs/testing/LIVE_FULL_INTEGRATION_REPORT.md` 写明 zk-proof 路径仍使用固定 demo 输入 `packages/circuits/test-data/test-input.json`。

**机构解读：** 这足以证明密码学和合约链路可行，但还不足以证明真实机构 issuer、root rotation、revocation、例外处理和审计留痕已经闭环。

### 5.6 中风险：品牌与供应商成熟度信号偏弱

以下迹象会影响机构采购信心：

- 联系方式仍大量使用个人 `qq.com` 邮箱
- `SECURITY.md` 里残留 `Twitter: @[your handle]`、`Discord: [coming soon]`
- `packages/sdk/package.json`、`packages/sdk/README.md`、`apps/api/README.md` 等仍有 `your-org` 占位信息
- `docs/guides/saas/SAAS_QUICKSTART.md` 里 dashboard 仍是 `coming soon`

**机构解读：** 技术团队很强，但供应商形象和对外交付面还未收口。

---

## 6. 分项评分

| 维度 | 评分 | 说明 |
|---|---:|---|
| 市场切口与价值主张 | 8.5/10 | 方向明确，痛点真实 |
| 技术方案可信度 | 8.0/10 | 架构完整，设计逻辑成立 |
| 测试网实证强度 | 8.5/10 | 真实交易、对抗与压力材料较充分 |
| API / SDK 产品化能力 | 7.0/10 | 已有实装，但仍不稳定 |
| 安全成熟度 | 5.5/10 | 有修复能力，但缺第三方审计 |
| 运维与可观测性 | 5.0/10 | 有基础设施意识，缺生产闭环 |
| 对外材料一致性 | 4.5/10 | 地址、域名、认证、网络状态不统一 |
| 供应商成熟度 | 4.5/10 | 品牌、支持渠道、生产口径不够机构化 |
| **综合** | **6.4/10** | 强技术 PoC，弱生产交付 |

---

## 7. Go / No-Go 判断

### 7.1 PoC / 技术验证 / BD 演示

**结论：`Go`**

理由：

- 核心架构和测试网链路已经跑通
- 技术叙事和实测证据足够支持技术评审会
- 适合展示“方案为什么成立”

### 7.2 白名单试点 / 受控环境试运行

**结论：`Conditional Go`**

条件：

- 仅限白名单参与方
- 固定钱包与固定池子
- 低金额或测试网 / 准生产环境
- 明确值守与人工应急
- 冻结地址、域名与文档口径

### 7.3 正式生产接入

**结论：`No-Go for now`**

原因：

- 缺少外部安全审计
- 缺少机构级监控告警和 runbook
- 缺少回滚恢复、密钥轮换、事故响应交付物
- 对外文档与实际状态存在不一致

---

## 8. 机构客户建议

如果我是机构客户，我会给出以下建议：

1. 允许进入技术 PoC，但不签正式生产接入。
2. 要求项目方先统一地址、域名、认证方式和主网状态口径。
3. 要求补齐第三方审计、runbook、告警、权限矩阵和升级控制说明。
4. 要求项目方提交真实 issuer / root rotation / revocation 的运营闭环设计。

---

## 9. 最终结论

ILAL 是一个**值得继续尽调**的项目，不是一个可以直接忽略的黑客松样品。  
它已经证明了技术路径真实可行，也已经具备测试网级别的机构试点价值。

但从机构采购和生产风控视角看，当前还不能定义为“已准备好接入正式生产”。  
它最强的是**技术可信度**，最弱的是**生产化交付与供应商成熟度**。

**一句话结论：**

**可以试，可以谈，可以做白名单试点；但现在还不该直接上生产。**
