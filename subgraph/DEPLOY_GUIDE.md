# ILAL 子图部署指南

## 前置条件

1. **The Graph Studio 账户**
   - 访问 https://thegraph.com/studio/
   - 使用钱包连接
   - 创建新的 Subgraph

2. **Graph CLI 安装**
   ```bash
   npm install -g @graphprotocol/graph-cli
   ```

3. **子图已构建**
   ```bash
   npm run build
   ```

## 部署步骤

### 1. 获取 Deploy Key

1. 在 The Graph Studio 中创建新的 Subgraph
   - 名称: `ilal-base-sepolia`
   - 网络: Base Sepolia

2. 复制显示的 Deploy Key

### 2. 认证

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
```

### 3. 部署子图

```bash
graph deploy --studio ilal-base-sepolia
```

系统会提示输入版本标签，例如：
- `v0.1.0` - 初始版本
- `v0.1.1` - Bug 修复
- `v0.2.0` - 功能更新

### 4. 等待同步

部署后，The Graph 会开始同步区块链数据。这可能需要几分钟到几小时，取决于：
- 起始区块（startBlock）
- 历史事件数量
- 网络拥堵情况

### 5. 查询测试

同步完成后，可以在 Subgraph Studio 中测试查询：

```graphql
# 查询所有 Issuer
query GetIssuers {
  issuers(first: 10) {
    id
    admin
    easAddress
    isActive
    registeredAt
  }
}

# 查询活跃 Session
query GetActiveSessions {
  sessions(where: { isActive: true }, first: 20) {
    id
    user
    expiry
    startedAt
    issuer {
      id
    }
  }
}

# 查询 Swap 尝试
query GetSwapAttempts {
  swapAttempts(first: 50, orderBy: timestamp, orderDirection: desc) {
    id
    user
    allowed
    timestamp
    txHash
  }
}

# 查询全局统计
query GetGlobalStats {
  globalStats(id: "0x00") {
    totalIssuers
    activeIssuers
    totalSessions
    activeSessions
    totalSwapAttempts
    allowedSwaps
  }
}

# 查询日统计
query GetDailyStats {
  dailyStats(first: 30, orderBy: timestamp, orderDirection: desc) {
    id
    date
    dailySwapAttempts
    dailyLiquidityAttempts
    newSessions
  }
}
```

## 前端集成

### 安装依赖

```bash
npm install @apollo/client graphql
```

### 配置 Apollo Client

```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/<YOUR_ID>/ilal-base-sepolia/<VERSION>';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: SUBGRAPH_URL,
  }),
  cache: new InMemoryCache(),
});
```

### 使用示例

```typescript
// hooks/useSubgraphData.ts
import { useQuery, gql } from '@apollo/client';

const GET_USER_SESSIONS = gql`
  query GetUserSessions($user: Bytes!) {
    sessions(where: { user: $user }) {
      id
      expiry
      isActive
      swapAttempts {
        id
        allowed
        timestamp
      }
    }
  }
`;

export function useUserSessions(userAddress: string) {
  const { data, loading, error } = useQuery(GET_USER_SESSIONS, {
    variables: { user: userAddress.toLowerCase() },
    pollInterval: 30000, // 每30秒刷新
  });

  return {
    sessions: data?.sessions || [],
    loading,
    error,
  };
}
```

## 更新子图

当合约或 Schema 发生变化时：

### 1. 更新代码

```bash
# 修改 schema.graphql 或 src/*.ts
# 重新构建
npm run build
```

### 2. 部署新版本

```bash
graph deploy --studio ilal-base-sepolia
# 输入新的版本号，如 v0.2.0
```

### 3. 更新前端配置

更新前端中的 Subgraph URL 到新版本。

## 监控和维护

### 1. 检查同步状态

在 The Graph Studio Dashboard 中监控：
- 同步进度
- 索引错误
- 查询性能
- 查询费用

### 2. 处理错误

如果索引失败：

1. 检查日志找出错误原因
2. 修复代码
3. 部署新版本
4. 从失败的区块重新同步

### 3. 性能优化

- 合理设置 `startBlock`（避免索引过早的无用数据）
- 优化查询（避免嵌套过深）
- 使用分页（`first`, `skip`）

## 成本估算

The Graph Studio 提供：
- **免费额度**: 每月 100,000 查询
- **超出后**: 按查询付费（约 $0.0001/查询）

对于中小型 DApp，免费额度通常足够。

## 故障排除

### 问题 1: 构建失败

```
Error: Could not load mapping for data source
```

**解决方案**:
- 检查 `subgraph.yaml` 中的文件路径
- 确保 `src/*.ts` 文件存在
- 运行 `npm run codegen` 重新生成类型

### 问题 2: 部署失败

```
Error: Failed to deploy to Studio
```

**解决方案**:
- 检查 Deploy Key 是否正确
- 确保网络连接正常
- 重新运行 `graph auth`

### 问题 3: 同步卡住

**解决方案**:
- 检查 RPC 端点是否正常
- 查看 Dashboard 日志
- 考虑降低 `startBlock`

### 问题 4: 查询返回空

**解决方案**:
- 确认合约已经有事件发生
- 检查 `startBlock` 是否太晚
- 验证合约地址正确

## 高级配置

### 自定义起始区块

编辑 `subgraph.yaml`:

```yaml
dataSources:
  - kind: ethereum/contract
    name: Registry
    source:
      startBlock: 21500000  # 调整到合约部署区块
```

### 添加新的数据源

如果部署了新合约：

```yaml
dataSources:
  - kind: ethereum/contract
    name: NewContract
    network: base-sepolia
    source:
      address: "0x..."
      abi: NewContract
      startBlock: 22000000
```

## 参考资源

- [The Graph 文档](https://thegraph.com/docs/)
- [AssemblyScript 语法](https://www.assemblyscript.org/)
- [GraphQL 查询语法](https://graphql.org/learn/)

## 支持

遇到问题？
- 查看 The Graph Discord
- 提交 GitHub Issue
- 查阅官方文档
