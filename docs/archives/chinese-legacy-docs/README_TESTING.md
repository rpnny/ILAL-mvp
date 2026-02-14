# ILAL 合约测试文档

## 📊 测试架构

```
contracts/test/
├── unit/                      # 单元测试
│   ├── Registry.t.sol         ✅ Registry 测试
│   ├── SessionManager.t.sol   ✅ SessionManager 测试
│   ├── ComplianceHook.t.sol   ✅ Hook 测试
│   └── EIP712Verifier.t.sol   ✅ EIP-712 测试
├── integration/               # 集成测试
│   └── E2E.t.sol             ✅ 端到端测试
├── invariant/                 # 不变性测试
│   └── ComplianceInvariant.t.sol ✅ Fuzz 测试
└── hell/                      # 🔥 地狱级测试
    ├── HellMode.t.sol         ✅ 安全极端场景
    └── ForkTest.t.sol         ✅ Fork 测试
```

## 🎯 测试覆盖目标

| 组件 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| **Registry** | 100% | ✅ 100% |
| **SessionManager** | 100% | ✅ 100% |
| **ComplianceHook** | 100% | ✅ 100% |
| **EIP712Verifier** | 100% | ✅ 100% |
| **PositionManager** | 90% | 🟡 80% |

## 🔥 地狱级测试清单

详见：[HELL_MODE_TESTING.md](../HELL_MODE_TESTING.md)

### 快速检查

- [ ] 22 项测试全部通过
- [ ] Gas 消耗 < 215,000 per Swap
- [ ] 紧急模式下可撤资 ✅
- [ ] LP NFT 无法转让 ✅
- [ ] Invariant 测试通过 ✅

## 🚀 快速开始

### 1. 安装依赖

```bash
chmod +x install-deps.sh
./install-deps.sh
```

### 2. 编译合约

```bash
forge build
```

### 3. 运行测试

```bash
# 所有测试
forge test -vvv

# 地狱模式
chmod +x run-hell-tests.sh
./run-hell-tests.sh

# Gas 报告
forge test --gas-report
```

## 📝 测试命令速查

### 按类别运行

```bash
# 单元测试
forge test --match-path test/unit/*.sol -vvv

# 集成测试
forge test --match-path test/integration/*.sol -vvv

# Invariant 测试
forge test --match-contract Invariant -vvv

# 地狱级测试
forge test --match-path test/hell/*.sol -vvv
```

### 按合约运行

```bash
forge test --match-contract Registry -vvv
forge test --match-contract SessionManager -vvv
forge test --match-contract ComplianceHook -vvv
```

### 按函数运行

```bash
forge test --match-test test_Hell_FakeSignature -vvvv
```

## 🐛 调试技巧

### 显示详细日志

```bash
forge test --match-test YOUR_TEST -vvvv
```

输出级别：
- `-v`: 显示测试名称
- `-vv`: 显示失败的断言
- `-vvv`: 显示所有日志
- `-vvvv`: 显示 trace

### 查看 Gas 消耗

```bash
forge test --gas-report --match-contract ComplianceHook
```

### 查看存储布局

```bash
forge inspect ComplianceHook storage --pretty
```

## ⚠️ 关键测试要点

### 1. 紧急撤资机制 🔥

**关键修复**: `ComplianceHook.beforeRemoveLiquidity()` 不检查 `emergencyPaused`

```solidity
function beforeRemoveLiquidity(address sender, bytes calldata hookData)
    external
    returns (bool)
{
    // ⚠️ 注意：这里不检查 emergencyPaused
    // 确保紧急情况下可以撤资（机构最看重）
    
    address user = _resolveUser(sender, hookData);
    require(sessionManager.isSessionActive(user), "Not verified");
    
    return true;
}
```

**测试**: `test_Hell_EmergencyWithdrawal()`

### 2. EIP-712 签名防伪造

**验证**:
- 错误的私钥签名 → Revert
- 过期的 deadline → Revert
- 重放的 nonce → Revert

**测试**: `test_Hell_FakeSignature()`

### 3. LP NFT 转让限制

**实现**: `VerifiedPoolsPositionManager`

```solidity
function safeTransferFrom(...) external pure {
    revert TransferNotAllowed();
}
```

**测试**: `test_Hell_NFTTransferBlocked()`

### 4. UUPS 升级数据保留

**验证**:
- Issuer 列表保留
- Owner 权限保留
- Session 数据保留

**测试**: `test_Hell_UpgradePreservesData()`

## 📊 性能基准

| 操作 | Gas 消耗 | 目标 | 状态 |
|------|---------|------|------|
| beforeSwap | ~12,000 | < 15,000 | ✅ |
| startSession | ~48,000 | < 50,000 | ✅ |
| isSessionActive | ~5,000 | < 10,000 | ✅ |
| EIP-712 验证 | ~8,000 | < 10,000 | ✅ |

## 🌐 Fork 测试

需要 Base 主网 RPC：

```bash
export BASE_RPC_URL="https://mainnet.base.org"
forge test --fork-url $BASE_RPC_URL --match-contract ForkTest -vvv
```

测试内容：
- 真实 Universal Router 集成
- Coinbase Verifications 集成
- 主网环境 Gas 消耗

## 📈 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Install dependencies
        run: cd contracts && ./install-deps.sh
      - name: Run tests
        run: cd contracts && forge test -vvv
      - name: Gas report
        run: cd contracts && forge test --gas-report
```

## 🔍 代码覆盖率

```bash
forge coverage
```

目标：> 95% 语句覆盖率

## 📚 参考资料

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Testing Best Practices](https://github.com/crytic/building-secure-contracts)
- [Uniswap v4 Hook Testing](https://docs.uniswap.org/contracts/v4/guides/testing)

---

**维护者**: ILAL 开发团队  
**最后更新**: 2026-02-10
