# ILAL 新手入门指南

欢迎使用 ILAL！本指南将帮助你快速上手。

## 什么是 ILAL？

ILAL (Institutional Liquidity Access Layer) 是一个合规的去中心化交易平台，专为机构用户设计。通过零知识证明技术，ILAL 在保护隐私的同时确保合规性。

**核心特点**:
- ✅ 隐私保护的 KYC 验证
- ✅ 低成本交易（Base L2）
- ✅ 机构级流动性
- ✅ 24小时验证缓存

## 前置条件

### 1. 准备钱包

你需要一个支持以太坊的钱包：
- [MetaMask](https://metamask.io/) (推荐)
- [Rainbow](https://rainbow.me/)
- [Coinbase Wallet](https://wallet.coinbase.com/)

### 2. 添加 Base Sepolia 测试网

在 MetaMask 中添加网络：

**网络信息**:
- 网络名称: Base Sepolia
- RPC URL: https://sepolia.base.org
- Chain ID: 84532
- 货币符号: ETH
- 区块浏览器: https://sepolia.basescan.org

### 3. 获取测试币

访问 [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) 领取测试 ETH。

### 4. 获取测试 Token

参考 [GET_TEST_USDC.md](../guides/GET_TEST_USDC.md) 获取测试 USDC 和 WETH。

## 快速开始

### 第一步：连接钱包

1. 访问 https://ilal.app (或本地运行 `npm run dev`)
2. 点击右上角 **"连接钱包"**
3. 选择你的钱包并确认连接
4. 确认网络切换到 Base Sepolia

### 第二步：完成身份验证

首次使用需要完成 KYC 验证：

1. 点击 **"开始验证"**
2. 选择验证提供商（如 Coinbase）
3. 完成 KYC 流程
4. 生成 ZK 证明（约需 10-30 秒）
5. 签名交易开启 Session

**注意**: 
- ZK 证明生成需要一些时间，请耐心等待
- Session 有效期为 24 小时
- 验证一次后 24 小时内无需重复验证

### 第三步：开始交易

#### Swap (兑换)

1. 导航到 **"交易"** 页面
2. 选择要兑换的 Token 对（如 USDC → WETH）
3. 输入金额
4. 查看预估输出和价格影响
5. 点击 **"交易"**
6. 在钱包中确认交易

**提示**:
- 首次交易需要授权 Token
- 设置合理的滑点（推荐 0.5-1%）
- 注意 Gas 费用

#### 添加流动性

1. 导航到 **"流动性"** 页面
2. 点击 **"添加流动性"**
3. 选择 Token 对
4. 设置价格范围（当前价格 ±5% 为佳）
5. 输入要添加的 Token 数量
6. 点击 **"确认"**

**收益来源**:
- 交易手续费分成
- 做市价差收益

#### 移除流动性

1. 在 **"流动性"** 页面查看你的持仓
2. 选择要移除的仓位
3. 点击 **"移除"**
4. 选择移除比例（25%, 50%, 75%, 100%）
5. 确认交易

## 常见问题

### Q1: 为什么需要 KYC 验证？

A: ILAL 专为机构用户设计，需要满足合规要求。通过零知识证明，我们在验证身份的同时保护你的隐私。

### Q2: ZK 证明生成失败怎么办？

A: 
1. 检查网络连接
2. 确认浏览器支持 WebAssembly
3. 清除缓存后重试
4. 如果问题持续，联系技术支持

### Q3: Session 过期了怎么办？

A: Session 有效期为 24 小时。过期后只需重新生成一次 ZK 证明即可，无需重新完成 KYC。

### Q4: 交易失败的常见原因？

1. **Session 过期**: 重新验证
2. **余额不足**: 充值或减少交易金额
3. **滑点过大**: 增加滑点容忍度
4. **Gas 不足**: 增加 Gas Limit

### Q5: 如何查看交易历史？

访问 **"历史"** 页面查看：
- 所有 Swap 记录
- 流动性操作记录
- Session 状态历史

## 安全提示

1. **保护私钥**: 永远不要分享你的助记词或私钥
2. **验证地址**: 交易前仔细检查合约地址
3. **小额测试**: 首次使用建议小额测试
4. **定期检查**: 定期检查 Session 状态和持仓
5. **官方渠道**: 只从官方渠道下载钱包和访问 DApp

## 高级功能

### 自动做市

如果你想自动管理流动性：

1. 参考 [做市机器人文档](../api/BOT_API.md)
2. 配置策略参数
3. 运行机器人程序

### GraphQL 查询

使用 The Graph 查询历史数据：

```graphql
query MySwaps {
  swapAttempts(where: { user: "0x..." }) {
    timestamp
    allowed
    txHash
  }
}
```

## 下一步

- 📖 阅读 [合约 API 文档](../api/CONTRACTS_API.md)
- 🎯 学习 [高级交易策略](./TRADING_GUIDE.md)
- 💧 了解 [流动性管理最佳实践](./LIQUIDITY_GUIDE.md)
- 🤖 配置 [做市机器人](./BOT_SETUP.md)

## 获取帮助

- **文档**: https://docs.ilal.app
- **Discord**: https://discord.gg/ilal
- **GitHub**: https://github.com/ilal-project
- **Email**: support@ilal.io

## 反馈

你的反馈对我们很重要！

- 发现 Bug？[提交 Issue](https://github.com/ilal-project/issues)
- 有建议？在 Discord 告诉我们
- 喜欢 ILAL？给我们点个 Star ⭐

---

**祝你交易愉快！** 🚀
