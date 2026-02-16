/**
 * useILAL Hook - ILAL SDK 集成
 * 
 * 一行代码替代所有合约调用逻辑 🚀
 */

'use client';

import { useMemo, useEffect, useState } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { ILALClient } from '@ilal/sdk';
import type { WalletClient, PublicClient } from 'viem';

export function useILAL() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [client, setClient] = useState<ILALClient | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 初始化 SDK 客户端
  useEffect(() => {
    if (!walletClient || !publicClient || !chainId || !address) {
      setClient(null);
      setIsReady(false);
      return;
    }

    try {
      // 🎉 一行代码初始化整个 SDK！
      const ilalClient = new ILALClient({
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        chainId,
      });

      setClient(ilalClient);
      setIsReady(true);
      
      console.log('✅ ILAL SDK initialized:', {
        address: ilalClient.getUserAddress(),
        chainId: ilalClient.getChainInfo(),
        contracts: ilalClient.addresses,
      });
    } catch (error) {
      console.error('❌ Failed to initialize ILAL SDK:', error);
      setClient(null);
      setIsReady(false);
    }
  }, [walletClient, publicClient, chainId, address]);

  return {
    /** ILAL SDK 客户端实例 */
    client,
    
    /** SDK 是否已就绪 */
    isReady,
    
    /** 用户地址 */
    address: client?.getUserAddress(),
    
    /** 链信息 */
    chainInfo: client?.getChainInfo(),
    
    /** 合约地址 */
    addresses: client?.addresses,
    
    // 🚀 所有模块直接暴露，一行调用！
    /** Session 管理 */
    session: client?.session,
    
    /** 代币交换 */
    swap: client?.swap,
    
    /** 流动性管理 */
    liquidity: client?.liquidity,
    
    /** ZK 证明 */
    zkproof: client?.zkproof,
    
    /** EAS 验证 */
    eas: client?.eas,
  };
}

/**
 * 使用示例：
 * 
 * ```tsx
 * const { client, isReady, session, swap } = useILAL();
 * 
 * // Session 管理 - 一行代码！
 * await session.activate();
 * const isActive = await session.isActive(address);
 * 
 * // 代币交换 - 一行代码！
 * await swap.execute({
 *   tokenIn: USDC_ADDRESS,
 *   tokenOut: WETH_ADDRESS,
 *   amountIn: parseUnits('100', 6),
 *   slippageTolerance: 0.5,
 * });
 * 
 * // 添加流动性 - 一行代码！
 * await liquidity.add({
 *   poolKey: { ... },
 *   amount0: parseUnits('100', 6),
 *   amount1: parseUnits('0.04', 18),
 *   tickLower: -887200,
 *   tickUpper: 887200,
 * });
 * ```
 */
