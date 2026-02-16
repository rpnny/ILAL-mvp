# ILAL Web Demo

> SDK 参考实现 - 展示如何使用 @ilal/sdk

## 🎯 定位

这个前端应用是 **ILAL SDK 的参考实现**，用于：

- ✅ 展示 SDK 使用模式
- ✅ 快速测试和调试
- ✅ 开发者参考

**⚠️ 注意**: 这不是生产级前端，而是 SDK 的示例和测试工具。

## 🚀 快速开始

### 在 Monorepo 中开发（推荐）

```bash
# 根目录安装依赖
npm install

# 并行启动 SDK + Demo（热更新）
npm run dev

# 或单独启动 Demo
cd apps/web-demo
npm run dev
```

### 独立开发

```bash
cd apps/web-demo
npm install
npm run dev
```

访问: http://localhost:3000

## 📦 使用 SDK

### 基础设置

```typescript
'use client';

import { ILALClient } from '@ilal/sdk';
import { useWalletClient, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';

export default function Page() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [client, setClient] = useState<ILALClient | null>(null);

  useEffect(() => {
    if (walletClient && publicClient) {
      const ilalClient = new ILALClient({
        walletClient,
        publicClient,
        chainId: 84532,
      });
      setClient(ilalClient);
    }
  }, [walletClient, publicClient]);

  return <div>ILAL Demo</div>;
}
```

### Session 管理

```typescript
// 激活 Session
const handleActivateSession = async () => {
  if (!client) return;
  const hash = await client.session.activate();
  console.log('Session activated:', hash);
};

// 检查状态
const info = await client.session.getInfo();
console.log('Session active:', info.isActive);
```

### 执行 Swap

```typescript
import { parseUnits } from 'viem';
import { BASE_SEPOLIA_TOKENS } from '@ilal/sdk';

const handleSwap = async () => {
  if (!client) return;
  
  const result = await client.swap.execute({
    tokenIn: BASE_SEPOLIA_TOKENS.USDC,
    tokenOut: BASE_SEPOLIA_TOKENS.WETH,
    amountIn: parseUnits('100', 6),
    slippageTolerance: 0.5,
  });
  
  console.log('Swap successful:', result.hash);
};
```

## 🏗️ 项目结构

```
apps/web-demo/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 主页
│   └── layout.tsx         # 布局
├── components/            # UI 组件（保留）
├── lib/                   # 工具库
│   ├── wagmi.ts          # Wagmi 配置
│   ├── cache.ts          # 缓存工具
│   ├── demo-mode.ts      # Demo 模式
│   └── performance.ts    # 性能监控
└── public/               # 静态资源
```

**已移除的文件**（现在使用 SDK）:
- ~~`lib/contracts.ts`~~ → 使用 `@ilal/sdk` 的 `getContractAddresses()`
- ~~`lib/eas.ts`~~ → 使用 `client.eas`
- ~~`lib/eip712-signing.ts`~~ → 使用 SDK 的 `eip712` 工具
- ~~`lib/zkProof.ts`~~ → 使用 `client.zkproof`

## 📚 SDK 文档

完整的 SDK 文档: [`../../packages/sdk/README.md`](../../packages/sdk/README.md)

## 🔗 相关链接

- **SDK 文档**: [packages/sdk/README.md](../../packages/sdk/README.md)
- **SDK 示例**: [packages/sdk/examples/](../../packages/sdk/examples/)
- **Monorepo 根**: [../../README.md](../../README.md)

---

**Made with ❤️ using @ilal/sdk**
