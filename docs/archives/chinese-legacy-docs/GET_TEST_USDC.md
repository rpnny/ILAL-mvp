# 获取 Base Sepolia 测试 USDC 指南

## 方法 1: Circle 官方 Faucet（推荐）⭐

### Circle USDC Faucet
- **网址**: https://faucet.circle.com/
- **步骤**:
  1. 连接钱包 (0x1b869CaC69Df23Ad9D727932496AEb3605538c8D)
  2. 选择 "Base Sepolia"
  3. 点击 "Get Test USDC"
  4. 等待 1-2 分钟到账

### 预期结果
- 每次可获取: 10-100 USDC (6 decimals)
- 冷却时间: 24 小时

---

## 方法 2: QuickNode Multi-Chain Faucet

### QuickNode Faucet
- **网址**: https://faucet.quicknode.com/base/sepolia
- **步骤**:
  1. 输入地址: `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`
  2. 选择 "USDC"
  3. 完成 captcha
  4. 提交请求

---

## 方法 3: Base Discord 社区请求

### Base Discord
- **Discord**: https://discord.gg/base
- **步骤**:
  1. 加入 Base Discord
  2. 前往 `#faucet` 或 `#testnet-support` 频道
  3. 发送请求:
     ```
     需要 Base Sepolia USDC 测试代币
     地址: 0x1b869CaC69Df23Ad9D727932496AEb3605538c8D
     用于 ILAL 合规层测试
     ```

---

## 方法 4: Coinbase 开发者 Faucet

### Coinbase Faucet
- **网址**: https://portal.cdp.coinbase.com/products/faucet
- **要求**: 需要 Coinbase 开发者账号
- **步骤**:
  1. 登录 Coinbase Developer Portal
  2. 选择 Base Sepolia
  3. 请求 USDC

---

## 方法 5: Alchemy Faucet

### Alchemy
- **网址**: https://www.alchemy.com/faucets/base-sepolia
- **步骤**:
  1. 注册 Alchemy 账号
  2. 选择 Base Sepolia
  3. 输入地址并请求 USDC

---

## 方法 6: 通过 Uniswap Testnet 交换

如果以上方法都失败，可以尝试：

### 步骤
1. 获取 Base Sepolia ETH (从标准 faucet)
2. Wrap 成 WETH
3. 在 Base Sepolia Uniswap 上交换 WETH → USDC

**注意**: 这需要 testnet 上有足够的流动性。

---

## 验证到账

运行以下命令检查 USDC 余额：

```bash
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0x1b869CaC69Df23Ad9D727932496AEb3605538c8D \
  --rpc-url https://base-sepolia-rpc.publicnode.com
```

预期输出（示例）:
```
100000000  # 100 USDC (6 decimals)
```

转换为人类可读:
```bash
# 方法1: 使用 cast
cast --to-unit 100000000 6

# 方法2: 手动计算
# 100000000 / 10^6 = 100 USDC
```

---

## 如果所有方法都失败

### 临时解决方案: Mock USDC

部署一个测试 ERC20 代币作为 USDC 替代：

```solidity
// contracts/src/mocks/MockUSDC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

部署并使用：
```bash
cd contracts/
forge create src/mocks/MockUSDC.sol:MockUSDC \
  --private-key $PRIVATE_KEY \
  --rpc-url https://base-sepolia-rpc.publicnode.com

# 获取部署地址，然后铸造
cast send <MOCK_USDC_ADDRESS> \
  "mint(address,uint256)" \
  0x1b869CaC69Df23Ad9D727932496AEb3605538c8D \
  100000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://base-sepolia-rpc.publicnode.com
```

---

## 联系信息（紧急）

如果所有方法都失败，可以联系：

- **Base 团队**: support@base.org
- **Circle 支持**: https://support.circle.com/
- **ILAL 项目**: 项目负责人可以从其他测试网桥接 USDC

---

## 当前合约信息

| 信息 | 值 |
|------|-----|
| USDC 合约 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| 目标地址 | `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D` |
| 网络 | Base Sepolia |
| Chain ID | 84532 |
| RPC | https://base-sepolia-rpc.publicnode.com |
| 区块浏览器 | https://sepolia.basescan.org/ |

---

## 推荐优先级

1. ⭐⭐⭐ **Circle Faucet** — 最可靠
2. ⭐⭐⭐ **QuickNode** — 快速
3. ⭐⭐ **Base Discord** — 社区支持
4. ⭐ **Coinbase Portal** — 需要注册
5. ⭐ **Alchemy** — 需要注册

---

*创建时间: 2026-02-11*  
*更新: 测试所有 faucet 后更新状态*
