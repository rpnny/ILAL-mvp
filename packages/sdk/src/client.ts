/**
 * ILAL SDK 核心客户端
 * 统一的 API 入口
 */

import type { Address, WalletClient, PublicClient } from 'viem';
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import type { ILALConfig, ContractAddresses, ZKProofConfig } from './types';
import { SessionModule } from './modules/session';
import { SwapModule } from './modules/swap';
import { LiquidityModule } from './modules/liquidity';
import { ZKProofModule } from './modules/zkproof';
import { EASModule } from './modules/eas';
import { getContractAddresses, isDeployed } from './constants';
import { InvalidConfigError, ContractNotDeployedError } from './utils/errors';

/**
 * ILAL SDK 主客户端
 * 
 * @example
 * ```typescript
 * import { ILALClient } from '@ilal/sdk';
 * 
 * const client = new ILALClient({
 *   walletClient,
 *   publicClient,
 *   chainId: 84532,
 * });
 * 
 * // Use modules
 * await client.session.activate();
 * await client.swap.execute({ ... });
 * ```
 */
export class ILALClient {
  // 核心 clients
  public readonly walletClient: WalletClient;
  public readonly publicClient: PublicClient;
  public readonly chainId: number;

  // 合约地址
  public readonly addresses: ContractAddresses;

  // 功能模块
  public readonly session: SessionModule;
  public readonly swap: SwapModule;
  public readonly liquidity: LiquidityModule;
  public readonly zkproof: ZKProofModule;
  public readonly eas: EASModule;

  constructor(config: ILALConfig) {
    // 验证配置
    if (!config.walletClient || !config.publicClient) {
      throw new InvalidConfigError({ message: 'walletClient and publicClient are required' });
    }

    this.walletClient = config.walletClient;
    this.publicClient = config.publicClient;
    this.chainId = config.chainId;

    // 获取合约地址
    const defaultAddresses = getContractAddresses(config.chainId);
    if (!defaultAddresses && !config.addresses) {
      throw new ContractNotDeployedError({ chainId: config.chainId });
    }

    this.addresses = {
      ...(defaultAddresses || {}),
      ...(config.addresses || {}),
    } as ContractAddresses;

    // 验证必要的合约地址
    this.validateAddresses();

    // 初始化模块
    this.session = new SessionModule(
      this.walletClient,
      this.publicClient,
      this.addresses.sessionManager
    );

    this.swap = new SwapModule(
      this.walletClient,
      this.publicClient,
      this.addresses.simpleSwapRouter,
      this.addresses.complianceHook
    );

    this.liquidity = new LiquidityModule(
      this.walletClient,
      this.publicClient,
      this.addresses.positionManager,
      this.addresses.complianceHook
    );

    this.zkproof = new ZKProofModule(config.zkConfig);

    this.eas = new EASModule(this.publicClient);
  }

  /**
   * 从 EIP-1193 Provider 创建客户端（便捷工厂方法）
   * 
   * @example
   * ```typescript
   * const client = ILALClient.fromProvider({
   *   provider: window.ethereum,
   *   chainId: 84532,
   * });
   * ```
   */
  static fromProvider(params: {
    provider: any;
    chainId: number;
    zkConfig?: ZKProofConfig;
  }): ILALClient {
    const chain = params.chainId === 84532 ? baseSepolia : base;

    const walletClient = createWalletClient({
      chain,
      transport: custom(params.provider),
    });

    const publicClient = createPublicClient({
      chain,
      transport: custom(params.provider),
    }) as any as PublicClient;

    return new ILALClient({
      walletClient,
      publicClient,
      chainId: params.chainId,
      zkConfig: params.zkConfig,
    });
  }

  /**
   * 从 RPC URL 创建客户端
   */
  static async fromRPC(params: {
    rpcUrl: string;
    chainId: number;
    privateKey?: `0x${string}`;
    zkConfig?: ZKProofConfig;
  }): Promise<ILALClient> {
    const chain = params.chainId === 84532 ? baseSepolia : base;

    const publicClient = createPublicClient({
      chain,
      transport: http(params.rpcUrl),
    }) as any as PublicClient;

    // 如果提供了私钥，创建 WalletClient
    let walletClient: WalletClient;
    
    if (params.privateKey) {
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(params.privateKey);
      
      walletClient = createWalletClient({
        account,
        chain,
        transport: http(params.rpcUrl),
      });
    } else {
      // 创建只读 WalletClient
      walletClient = createWalletClient({
        chain,
        transport: http(params.rpcUrl),
      });
    }

    return new ILALClient({
      walletClient,
      publicClient,
      chainId: params.chainId,
      zkConfig: params.zkConfig,
    });
  }

  /**
   * 获取用户地址
   */
  getUserAddress(): Address | undefined {
    return this.walletClient.account?.address;
  }

  /**
   * 获取链信息
   */
  getChainInfo(): { chainId: number; name: string } {
    return {
      chainId: this.chainId,
      name: this.chainId === 84532 ? 'Base Sepolia' : this.chainId === 8453 ? 'Base' : 'Unknown',
    };
  }

  /**
   * 验证必要的合约地址
   */
  private validateAddresses(): void {
    const required = [
      'registry',
      'sessionManager',
      'complianceHook',
      'positionManager',
      'simpleSwapRouter',
    ] as const;

    for (const key of required) {
      const address = this.addresses[key];
      if (!address || !isDeployed(address)) {
        throw new ContractNotDeployedError({
          contract: key,
          address,
          chainId: this.chainId,
        });
      }
    }
  }

  /**
   * 健康检查：验证所有核心合约是否可访问
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
    errors: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const errors: string[] = [];

    try {
      // 检查 SessionManager
      const code = await this.publicClient.getBytecode({
        address: this.addresses.sessionManager,
      });
      checks.sessionManager = !!code && code !== '0x';
    } catch (error) {
      checks.sessionManager = false;
      errors.push(`SessionManager: ${error}`);
    }

    try {
      // 检查 Registry
      const code = await this.publicClient.getBytecode({
        address: this.addresses.registry,
      });
      checks.registry = !!code && code !== '0x';
    } catch (error) {
      checks.registry = false;
      errors.push(`Registry: ${error}`);
    }

    try {
      // 检查 SwapRouter
      const code = await this.publicClient.getBytecode({
        address: this.addresses.simpleSwapRouter,
      });
      checks.simpleSwapRouter = !!code && code !== '0x';
    } catch (error) {
      checks.simpleSwapRouter = false;
      errors.push(`SwapRouter: ${error}`);
    }

    const healthy = Object.values(checks).every((v) => v);

    return { healthy, checks, errors };
  }
}
