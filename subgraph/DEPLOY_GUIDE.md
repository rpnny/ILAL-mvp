# ILAL 子图部署指南

## 前置条件

1. 前往 [The Graph Studio](https://thegraph.com/studio/) 注册
2. 创建新子图，名称为 `ilal-subgraph`
3. 获取 Deploy Key

## 部署步骤

```bash
cd subgraph

# 1. 认证
npx graph auth --studio <YOUR_DEPLOY_KEY>

# 2. 构建（已完成）
npx graph build

# 3. 部署
npx graph deploy --studio ilal-subgraph

# 部署成功后，Studio 控制台会显示查询 URL
```

## 验证查询

部署成功后，可以在 Studio Playground 中测试：

```graphql
# 查询全局统计
{
  globalStats(id: "0x00") {
    totalSessions
    activeSessions
    totalSwapAttempts
    allowedSwaps
    totalLiquidityAttempts
    allowedLiquidityOps
  }
}

# 查询最近的 Swap 尝试
{
  swapAttempts(first: 10, orderBy: timestamp, orderDirection: desc) {
    user
    allowed
    timestamp
    txHash
  }
}

# 查询用户 Session
{
  sessions(where: { isActive: true }) {
    user
    expiry
    startedAt
  }
}
```

## 配置说明

- 网络: Base Sepolia
- Registry: `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD`
- SessionManager: `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2`
- ComplianceHook: `0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80`
- 起始区块: 19000000
