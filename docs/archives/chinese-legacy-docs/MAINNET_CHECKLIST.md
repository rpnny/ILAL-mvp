# ILAL 主网部署检查清单

在部署到 Base Mainnet 之前，请确保完成以下所有检查项。

## 阶段 1: 代码审计 ✅

### 内部审计
- [ ] 所有合约代码已审查
- [ ] 所有测试用例通过
- [ ] Gas 优化已完成
- [ ] 代码覆盖率 > 95%

### 外部审计
- [ ] 已选择审计公司
- [ ] 审计报告已收到
- [ ] 所有高危和中危问题已修复
- [ ] 审计报告已公开发布

### 静态分析
- [ ] Slither 扫描无严重问题
- [ ] Mythril 扫描通过
- [ ] 手动安全检查完成

## 阶段 2: 测试验证 ✅

### 单元测试
- [ ] Registry 测试 100% 通过
- [ ] SessionManager 测试 100% 通过
- [ ] ComplianceHook 测试 100% 通过
- [ ] PlonkVerifier 测试通过
- [ ] EIP712Verifier 测试通过

### 集成测试
- [ ] E2E 流程测试通过
- [ ] 多用户并发测试通过
- [ ] 紧急暂停测试通过
- [ ] 升级流程测试通过

### 压力测试
- [ ] 高并发 Swap 测试
- [ ] 大额流动性测试
- [ ] Gas 限制测试
- [ ] 异常情况恢复测试

### 前端测试
- [ ] Playwright E2E 测试通过
- [ ] 跨浏览器兼容性测试
- [ ] 移动端适配测试
- [ ] 钱包兼容性测试

## 阶段 3: 基础设施 ✅

### 节点和 RPC
- [ ] 生产 RPC 端点已配置
- [ ] 备用 RPC 端点已配置
- [ ] RPC 限流策略已设置
- [ ] 节点监控已部署

### 多签钱包
- [ ] Gnosis Safe 已部署
- [ ] 至少 3/5 多签配置
- [ ] 所有签名者已确认
- [ ] 测试交易已执行

### 域名和 SSL
- [ ] 域名已注册
- [ ] SSL 证书已配置
- [ ] CDN 已配置
- [ ] DNS 记录已设置

### 监控和告警
- [ ] 合约事件监控
- [ ] Gas 价格监控
- [ ] 交易失败告警
- [ ] 余额低余额告警
- [ ] 24/7 值班表已建立

## 阶段 4: ZK 电路 ✅

### 电路验证
- [ ] Circom 编译无错误
- [ ] 约束数量在预期范围
- [ ] Powers of Tau 已验证
- [ ] 测试证明生成成功
- [ ] 链上验证成功

### 验证器部署
- [ ] PlonkVerifier 已生成
- [ ] Verifier Gas 消耗已验证 (~350k)
- [ ] 假证明测试失败（安全验证）
- [ ] Verification Key 已备份

## 阶段 5: 合约配置 ✅

### Registry 配置
- [ ] Coinbase Issuer 已注册
- [ ] 备用 Issuer 已注册
- [ ] Router 白名单已设置
- [ ] Session TTL 已配置 (24h)
- [ ] Emergency Admin 已设置

### SessionManager 配置
- [ ] Registry 地址正确
- [ ] Verifier 地址正确
- [ ] VERIFIER_ROLE 已授予
- [ ] Gas 优化已验证

### ComplianceHook 配置
- [ ] Hook flags 正确设置
- [ ] Registry 引用正确
- [ ] SessionManager 引用正确

## 阶段 6: 部署执行 ✅

### 准备工作
- [ ] 部署账户余额充足 (>0.1 ETH)
- [ ] 部署脚本已测试
- [ ] 合约验证 API Key 已配置
- [ ] 部署顺序已确认

### 部署步骤
```bash
# 1. 设置环境变量
export PRIVATE_KEY="0x..."
export BASE_RPC_URL="https://mainnet.base.org"
export BASESCAN_API_KEY="..."
export GOVERNANCE_MULTISIG="0x..."

# 2. 部署合约
cd contracts
forge script script/Deploy.s.sol \
    --rpc-url $BASE_RPC_URL \
    --broadcast \
    --verify \
    --slow

# 3. 记录部署地址
# 保存到 deployments/base-mainnet-YYYYMMDD.json

# 4. 验证部署
forge verify-contract <ADDRESS> <CONTRACT> \
    --chain-id 8453 \
    --compiler-version 0.8.26
```

### 部署检查清单
- [ ] Registry Proxy 已部署
- [ ] Registry Implementation 已部署
- [ ] SessionManager Proxy 已部署
- [ ] SessionManager Implementation 已部署
- [ ] ComplianceHook 已部署
- [ ] PlonkVerifier 已部署
- [ ] PlonkVerifierAdapter 已部署
- [ ] 所有合约已在 BaseScan 验证
- [ ] 部署地址已记录

## 阶段 7: 初始化配置 ✅

### 合约初始化
```bash
# 通过多签执行以下操作

# 1. 注册 Issuer
cast send $REGISTRY \
    "registerIssuer(bytes32,address,address)" \
    $COINBASE_ID \
    $COINBASE_ATTESTER \
    $PLONK_VERIFIER \
    --rpc-url $BASE_RPC_URL

# 2. 批准路由器
cast send $REGISTRY \
    "approveRouter(address,bool)" \
    $SWAP_ROUTER \
    true \
    --rpc-url $BASE_RPC_URL

# 3. 授予 VERIFIER_ROLE
cast send $SESSION_MANAGER \
    "grantRole(bytes32,address)" \
    $VERIFIER_ROLE \
    $PLONK_VERIFIER_ADAPTER \
    --rpc-url $BASE_RPC_URL
```

- [ ] Coinbase Issuer 已注册
- [ ] 路由器已批准
- [ ] 角色已正确分配
- [ ] 配置已通过测试验证

## 阶段 8: 前端部署 ✅

### 构建和部署
```bash
# 1. 更新合约地址
# 编辑 frontend/lib/contracts.ts

# 2. 构建生产版本
cd frontend
npm run build

# 3. 部署到 Vercel/Netlify
vercel --prod
# 或
netlify deploy --prod

# 4. 配置环境变量
# NEXT_PUBLIC_CHAIN_ID=8453
# NEXT_PUBLIC_ENABLE_TESTNET=false
```

- [ ] 合约地址已更新
- [ ] 生产构建成功
- [ ] 前端已部署
- [ ] 环境变量已设置
- [ ] CDN 缓存已清理
- [ ] DNS 已生效

## 阶段 9: 子图部署 ✅

```bash
cd subgraph

# 1. 更新合约地址和 startBlock
# 编辑 subgraph.yaml

# 2. 部署到 The Graph
graph auth --product hosted-service $GRAPH_DEPLOY_KEY
graph deploy --product hosted-service ilal/ilal-base

# 3. 等待同步
# 检查 https://thegraph.com/explorer/
```

- [ ] 子图配置已更新
- [ ] 子图已部署
- [ ] 同步已完成
- [ ] 查询测试通过
- [ ] 前端已集成

## 阶段 10: 做市机器人 ✅

```bash
cd bot

# 1. 配置生产环境
cp config.yaml config.prod.yaml
# 编辑 config.prod.yaml

# 2. 部署到服务器
# 使用 Docker 或 PM2

# Docker 方式
docker build -t ilal-bot .
docker run -d \
    --name ilal-bot \
    --restart always \
    -v ./config.prod.yaml:/app/config.yaml \
    -v ./logs:/app/logs \
    ilal-bot

# PM2 方式
pm2 start dist/index.js \
    --name ilal-bot \
    --time \
    --log ./logs/bot.log
```

- [ ] 生产配置已准备
- [ ] 机器人已部署
- [ ] 健康检查通过
- [ ] Telegram 告警已配置
- [ ] 自动重启已启用

## 阶段 11: 安全措施 ✅

### 访问控制
- [ ] 所有敏感操作需要多签
- [ ] Emergency Role 分配给可信地址
- [ ] 部署密钥已安全存储
- [ ] API Keys 已加密存储

### 紧急响应
- [ ] 紧急暂停流程已测试
- [ ] 紧急联系人列表已建立
- [ ] 应急响应文档已准备
- [ ] 用户通知渠道已建立

### 备份
- [ ] 私钥已备份（多地点）
- [ ] 部署配置已备份
- [ ] 合约代码已备份
- [ ] 数据库已配置自动备份

## 阶段 12: 文档和通信 ✅

### 技术文档
- [ ] API 文档已完善
- [ ] 集成指南已发布
- [ ] 故障排除指南已准备
- [ ] 架构图已更新

### 用户文档
- [ ] 用户指南已发布
- [ ] FAQ 已准备
- [ ] 视频教程已录制
- [ ] 示例代码已提供

### 公告
- [ ] 主网上线公告已准备
- [ ] 社交媒体内容已准备
- [ ] 合作伙伴已通知
- [ ] 社区已通知

## 阶段 13: 监控和维护 ✅

### 启动后监控（前24小时）
- [ ] 实时监控仪表板
- [ ] 每小时检查一次系统状态
- [ ] 记录所有交易和事件
- [ ] 准备好应急响应

### 持续监控
- [ ] 每日系统健康检查
- [ ] 每周性能报告
- [ ] 每月安全审查
- [ ] 季度升级计划

## 阶段 14: 最终确认 ✅

### 上线前最后检查
- [ ] 所有上述检查项已完成
- [ ] 团队成员已确认就绪
- [ ] 紧急响应团队已就位
- [ ] 通信渠道已激活

### Go/No-Go 决策
- [ ] 技术负责人: ✅ / ❌
- [ ] 安全负责人: ✅ / ❌
- [ ] 产品负责人: ✅ / ❌
- [ ] CEO: ✅ / ❌

### 启动
```bash
# 最后一次验证
cast call $REGISTRY "isEmergencyPaused()" --rpc-url $BASE_RPC_URL
# 应该返回 false

# 执行测试交易
# 1. 小额 Swap
# 2. 小额流动性添加
# 3. 验证所有功能正常

# 如果一切正常，向社区宣布上线！
```

---

## 紧急回滚程序

如果发现严重问题需要回滚：

1. **立即暂停**
   ```bash
   cast send $REGISTRY "setEmergencyPause(bool)" true
   ```

2. **通知用户**
   - 发布公告
   - 更新状态页面
   - Discord/Twitter 通知

3. **调查问题**
   - 收集日志
   - 分析交易
   - 确定根本原因

4. **修复和重新部署**
   - 修复代码
   - 重新审计
   - 部署修复版本

5. **恢复服务**
   - 解除暂停
   - 通知用户
   - 监控恢复情况

---

## 联系方式

**紧急联系人**:
- CTO: cto@ilal.io
- 安全主管: security@ilal.io
- 24/7 热线: +1-xxx-xxx-xxxx

**监控工具**:
- Grafana: https://metrics.ilal.io
- Sentry: https://sentry.io/ilal
- PagerDuty: https://ilal.pagerduty.com

---

**祝部署顺利！** 🚀
