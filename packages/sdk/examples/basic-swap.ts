/**
 * ILAL SDK 示例: 基础 Swap 操作
 * 
 * 本示例展示如何使用 ILAL SDK 执行一个简单的 Swap
 */

import { ILALClient } from '@ilal/sdk';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ 配置 ============

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// Base Sepolia 合约地址
const CONTRACTS = {
  registry: '0x104DA869aDd4f1598127F03763a755e7dDE4f988' as `0x${string}`,
  sessionManager: '0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e' as `0x${string}`,
  verifier: '0x92eF7F6440466eb2138F7d179Cf2031902eF94be' as `0x${string}`,
  complianceHook: '0xc2eD8e6F4C3a29275cC43e435795c5528BC9CF6A' as `0x${string}`,
};

// Base Sepolia 测试代币
const TOKENS = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as `0x${string}`, // Native ETH
  WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
};

// ============ 主函数 ============

async function main() {
  console.log('🚀 ILAL SDK 示例: 基础 Swap');
  console.log('='.repeat(60));
  
  // 1. 创建账户
  console.log('\n📝 步骤 1: 创建账户');
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log('   地址:', account.address);
  
  // 2. 创建客户端
  console.log('\n📝 步骤 2: 创建 Viem 客户端');
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  // 3. 创建 ILAL 客户端
  console.log('\n📝 步骤 3: 创建 ILAL 客户端');
  
  const client = new ILALClient({
    walletClient,
    publicClient,
    chainId: 84532,
    addresses: CONTRACTS,
  });
  
  console.log('   ✅ ILAL 客户端创建成功');
  
  // 4. 检查 Session 状态
  console.log('\n📝 步骤 4: 检查 Session 状态');
  
  const sessionInfo = await client.session.getInfo();
  console.log('   Session 激活:', sessionInfo.isActive);
  
  if (sessionInfo.isActive) {
    console.log('   剩余时间:', Number(sessionInfo.remainingTime), '秒');
    console.log('   过期时间:', new Date(Number(sessionInfo.expiry) * 1000).toLocaleString());
  } else {
    console.log('   ⚠️  Session 未激活，需要先激活 Session');
    console.log('   💡 提示: 运行 activate-session.ts 示例来激活 Session');
    return;
  }
  
  // 5. 检查余额
  console.log('\n📝 步骤 5: 检查账户余额');
  
  const balance = await publicClient.getBalance({
    address: account.address,
  });
  
  console.log('   ETH 余额:', Number(balance) / 1e18, 'ETH');
  
  if (balance < parseEther('0.01')) {
    console.log('   ⚠️  余额不足，至少需要 0.01 ETH');
    console.log('   💡 提示: 从水龙头获取测试 ETH');
    return;
  }
  
  // 6. 准备 Swap 参数
  console.log('\n📝 步骤 6: 准备 Swap 参数');
  
  const swapParams = {
    tokenIn: TOKENS.ETH,
    tokenOut: TOKENS.USDC,
    amountIn: parseEther('0.001'), // 0.001 ETH
    slippageTolerance: 0.5, // 0.5%
    recipient: account.address,
  };
  
  console.log('   Token In:', swapParams.tokenIn);
  console.log('   Token Out:', swapParams.tokenOut);
  console.log('   Amount In:', Number(swapParams.amountIn) / 1e18, 'ETH');
  console.log('   Slippage:', swapParams.slippageTolerance, '%');
  
  // 7. 执行 Swap
  console.log('\n📝 步骤 7: 执行 Swap');
  console.log('   ⏳ 提交交易中...');
  
  try {
    const result = await client.swap.execute(swapParams);
    
    console.log('\n   ✅ Swap 成功!');
    console.log('   交易哈希:', result.hash);
    console.log('   Amount 0:', result.amount0.toString());
    console.log('   Amount 1:', result.amount1.toString());
    
    if (result.gasUsed) {
      console.log('   Gas Used:', result.gasUsed.toString());
    }
    
    console.log('\n   🔗 查看交易:');
    console.log('   https://sepolia.basescan.org/tx/' + result.hash);
    
  } catch (error: any) {
    console.error('\n   ❌ Swap 失败:', error.message);
    
    if (error.message.includes('Session not active')) {
      console.log('\n   💡 提示: Session 可能已过期，请重新激活');
    } else if (error.message.includes('insufficient funds')) {
      console.log('\n   💡 提示: 余额不足或 Gas 费不够');
    } else if (error.message.includes('slippage')) {
      console.log('\n   💡 提示: 滑点过大，尝试增加 slippageTolerance');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 示例运行完成\n');
}

// ============ 错误处理 ============

main().catch((error) => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});

// ============ 使用说明 ============

/*
## 运行此示例

### 1. 设置环境变量

创建 `.env` 文件:
```
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

### 2. 安装依赖
```bash
npm install @ilal/sdk viem dotenv
```

### 3. 运行示例
```bash
npx tsx examples/basic-swap.ts
```

## 前置条件

1. ✅ 账户有足够的 ETH 余额（至少 0.01 ETH）
2. ✅ Session 已激活（运行 activate-session.ts）
3. ✅ 合约已部署到 Base Sepolia

## 预期输出

```
🚀 ILAL SDK 示例: 基础 Swap
============================================================

📝 步骤 1: 创建账户
   地址: 0x...

📝 步骤 2: 创建 Viem 客户端

📝 步骤 3: 创建 ILAL 客户端
   ✅ ILAL 客户端创建成功

📝 步骤 4: 检查 Session 状态
   Session 激活: true
   剩余时间: 86399 秒
   过期时间: 2026-02-17 12:00:00

📝 步骤 5: 检查账户余额
   ETH 余额: 0.05 ETH

📝 步骤 6: 准备 Swap 参数
   Token In: 0xEeee...
   Token Out: 0x036C...
   Amount In: 0.001 ETH
   Slippage: 0.5 %

📝 步骤 7: 执行 Swap
   ⏳ 提交交易中...

   ✅ Swap 成功!
   交易哈希: 0x...
   Amount 0: ...
   Amount 1: ...
   Gas Used: ...

   🔗 查看交易:
   https://sepolia.basescan.org/tx/0x...

============================================================
✅ 示例运行完成
```

## 常见问题

### Q: Session not active 错误
A: 先运行 `activate-session.ts` 激活 Session

### Q: insufficient funds 错误
A: 从水龙头获取测试 ETH: https://www.alchemy.com/faucets/base-sepolia

### Q: 滑点过大错误
A: 增加 `slippageTolerance` 参数（如 1.0 或 2.0）

## 下一步

- 尝试 `add-liquidity.ts` 示例
- 尝试 `api-mode.ts` 示例（使用 API Key）
- 查看完整 SDK 文档: `../README.md`
*/
