/**
 * ══════════════════════════════════════════════════════════════
 *  SDK 模式 — 机构交易系统
 *  适合有 Web3 开发能力的做市商 / DeFi 基金 / 量化团队
 * ══════════════════════════════════════════════════════════════
 *
 *  机构通过 @ilal/sdk 直连 Base 链，完整控制钱包和交易。
 *  本文件演示一个真实交易系统的结构：
 *    1. 系统初始化 & 健康检查
 *    2. Session 管理（激活 / 查询 / 续期）
 *    3. 交易执行（Swap）
 *    4. 流动性管理（加仓 / 查仓 / 减仓）
 *    5. 风控 & 监控
 */

import {
  ILALClient,
  BASE_SEPOLIA_TOKENS,
  type SwapResult,
  type SessionInfo,
} from '@ilal/sdk';
import {
  createPublicClient, createWalletClient, http,
  formatEther, formatUnits, parseUnits, parseEther,
  type Address,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { assertTrustedApiBaseUrl } from '../shared/transaction-guard';

// ═══════════════════════════════════════
//  配置
// ═══════════════════════════════════════

interface TradingConfig {
  privateKey: `0x${string}`;
  rpcUrl: string;
  apiBaseUrl: string;
  apiKey: string;
  maxPositionMUSD: bigint;
  maxSlippage: number;
  sessionAutoRenewThreshold: number;
}

const CONFIG: TradingConfig = {
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  apiBaseUrl: process.env.ILAL_API_URL || 'https://ilal-mvp-production.up.railway.app',
  apiKey: process.env.ILAL_API_KEY!,
  maxPositionMUSD: parseEther('1000'),
  maxSlippage: 0.5,
  sessionAutoRenewThreshold: 3600,
};

function validateConfig(config: TradingConfig) {
  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY is required');
  }
  if (!config.apiKey) {
    throw new Error('ILAL_API_KEY is required');
  }
  if (config.maxSlippage <= 0 || config.maxSlippage > 5) {
    throw new Error(`Refusing unsafe slippage setting: ${config.maxSlippage}`);
  }
  assertTrustedApiBaseUrl(config.apiBaseUrl);
}

// ═══════════════════════════════════════
//  交易系统核心类
// ═══════════════════════════════════════

class InstitutionalTradingSystem {
  private client: ILALClient;
  private tradeLog: TradeRecord[] = [];

  constructor(client: ILALClient) {
    this.client = client;
  }

  // ─── 1. 系统初始化 ───

  static async create(config: TradingConfig): Promise<InstitutionalTradingSystem> {
    validateConfig(config);
    const account = privateKeyToAccount(config.privateKey);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(config.rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(config.rpcUrl),
    });

    const rpcChainId = await publicClient.getChainId();
    if (rpcChainId !== baseSepolia.id) {
      throw new Error(`Unexpected RPC chainId ${rpcChainId}; expected ${baseSepolia.id}`);
    }

    const client = new ILALClient({
      walletClient,
      publicClient: publicClient as any,
      chainId: 84532,
    });

    // 配置 API 连接（session 激活需要通过 API）
    client.session.configureApi({
      apiBaseUrl: config.apiBaseUrl,
      apiKey: config.apiKey,
    });

    const health = await client.healthCheck();
    if (!health.healthy) {
      throw new Error(`System unhealthy: ${health.errors.join(', ')}`);
    }

    console.log('✅ System initialized');
    console.log(`   Wallet: ${account.address}`);
    console.log(`   Chain:  ${client.getChainInfo().name}`);
    console.log(`   API:    ${config.apiBaseUrl}`);

    return new InstitutionalTradingSystem(client);
  }

  // ─── 2. Session 管理 ───
  //
  // SessionManager.startSession() 需要 VERIFIER_ROLE 权限。
  // 正确的激活流程：
  //   1. 生成 ZK proof
  //   2. 提交 proof 到 ILAL API (POST /api/v1/verify)
  //   3. API 验证通过后自动激活 session

  async ensureSession(): Promise<SessionInfo> {
    const info = await this.client.session.getInfo();

    if (!info.isActive) {
      console.log('⚠️  Session inactive — activating via ILAL API...');
      const proof = await this.client.zkproof.generate();
      await this.client.session.activateViaApi({
        proof: proof.proof,
        publicInputs: proof.publicInputs,
      });
      console.log('✅ Session activated via API');
      return this.client.session.getInfo();
    }

    const remaining = Number(info.remainingTime);
    if (remaining < CONFIG.sessionAutoRenewThreshold) {
      console.log(`⚠️  Session expiring in ${Math.floor(remaining / 60)}m, renewing via API...`);
      const proof = await this.client.zkproof.generate();
      await this.client.session.activateViaApi({
        proof: proof.proof,
        publicInputs: proof.publicInputs,
      });
      console.log('✅ Session renewed via API');
      return this.client.session.getInfo();
    }

    console.log(`✅ Session active (${Math.floor(remaining / 3600)}h remaining)`);
    return info;
  }

  // ─── 3. 交易执行 ───

  async swap(params: {
    direction: 'buy_mTBILL' | 'sell_mTBILL';
    amount: bigint;
    reason: string;
  }): Promise<SwapResult> {
    if (params.amount <= 0n) {
      throw new Error('Swap amount must be positive');
    }
    await this.ensureSession();

    const { mUSD, mTBILL } = BASE_SEPOLIA_TOKENS;
    const isBuy = params.direction === 'buy_mTBILL';

    const tokenIn = isBuy ? mUSD : mTBILL;
    const tokenOut = isBuy ? mTBILL : mUSD;

    if (isBuy && params.amount > CONFIG.maxPositionMUSD) {
      throw new Error(
        `Buy amount ${formatEther(params.amount)} mUSD exceeds configured maxPositionMUSD`
      );
    }
    const label = isBuy
      ? `Buy mTBILL (${formatEther(params.amount)} mUSD)`
      : `Sell mTBILL (${formatEther(params.amount)} mTBILL)`;

    console.log(`\n📊 Executing: ${label}`);
    console.log(`   Reason: ${params.reason}`);

    const startTime = Date.now();

    const result = await this.client.swap.execute({
      tokenIn,
      tokenOut,
      amountIn: params.amount,
      slippageTolerance: CONFIG.maxSlippage,
    });

    const elapsed = Date.now() - startTime;

    const record: TradeRecord = {
      timestamp: new Date().toISOString(),
      direction: params.direction,
      amount: params.amount.toString(),
      hash: result.hash,
      gasUsed: result.gasUsed.toString(),
      latencyMs: elapsed,
      reason: params.reason,
    };
    this.tradeLog.push(record);

    console.log(`   ✅ Done in ${elapsed}ms`);
    console.log(`   Hash: ${result.hash}`);
    console.log(`   Gas:  ${result.gasUsed}`);

    return result;
  }

  // ─── 4. 流动性管理 ───

  async addLiquidity(params: {
    usdcAmount: bigint;
    wethAmount: bigint;
    tickLower: number;
    tickUpper: number;
  }) {
    await this.ensureSession();

    const { mUSD, mTBILL } = BASE_SEPOLIA_TOKENS;

    console.log(`\n💧 Adding liquidity:`);
    console.log(`   mUSD:   ${formatEther(params.usdcAmount)}`);
    console.log(`   mTBILL: ${formatEther(params.wethAmount)}`);
    console.log(`   Range: [${params.tickLower}, ${params.tickUpper}]`);

    const result = await this.client.liquidity.add({
      poolKey: {
        currency0: mUSD,
        currency1: mTBILL,
        fee: 500,
        tickSpacing: 10,
        hooks: this.client.addresses.complianceHook,
      },
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired: params.usdcAmount,
      amount1Desired: params.wethAmount,
    });

    console.log(`   ✅ Position #${result.tokenId} created`);
    console.log(`   Hash: ${result.hash}`);

    return result;
  }

  async getPositions() {
    const positions = await this.client.liquidity.getUserPositions();
    console.log(`\n📋 Positions: ${positions.length}`);
    for (const pos of positions) {
      console.log(`   #${pos.tokenId}: liquidity=${pos.liquidity}, range=[${pos.tickLower}, ${pos.tickUpper}]`);
    }
    return positions;
  }

  // ─── 5. 风控 & 监控 ───

  async getBalances() {
    const { mUSD, mTBILL } = BASE_SEPOLIA_TOKENS;
    const [musdBal, mtbillBal] = await Promise.all([
      this.client.swap.getBalance(mUSD),
      this.client.swap.getBalance(mTBILL),
    ]);
    return {
      mUSD: formatEther(musdBal),
      mTBILL: formatEther(mtbillBal),
    };
  }

  async riskCheck(): Promise<boolean> {
    const { mUSD } = BASE_SEPOLIA_TOKENS;
    const musdBal = await this.client.swap.getBalance(mUSD);

    if (musdBal > CONFIG.maxPositionMUSD) {
      console.log(`⚠️  mUSD balance (${formatEther(musdBal)}) exceeds max position`);
    }

    const sessionInfo = await this.client.session.getInfo();
    if (!sessionInfo.isActive) {
      console.log('❌ Session expired — cannot trade');
      return false;
    }

    return true;
  }

  getTradeLog(): TradeRecord[] {
    return this.tradeLog;
  }

  printSummary() {
    console.log('\n═══════════════════════════════════════');
    console.log('  TRADE SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`  Total trades: ${this.tradeLog.length}`);
    const avgLatency = this.tradeLog.reduce((a, t) => a + t.latencyMs, 0) / this.tradeLog.length;
    console.log(`  Avg latency:  ${avgLatency.toFixed(0)}ms`);
    const totalGas = this.tradeLog.reduce((a, t) => a + BigInt(t.gasUsed), 0n);
    console.log(`  Total gas:    ${totalGas}`);
    console.log('═══════════════════════════════════════\n');
  }
}

interface TradeRecord {
  timestamp: string;
  direction: string;
  amount: string;
  hash: string;
  gasUsed: string;
  latencyMs: number;
  reason: string;
}

// ═══════════════════════════════════════
//  运行示例
// ═══════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  ILAL SDK Mode — Institutional Trading System    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // 1. 初始化
  const system = await InstitutionalTradingSystem.create(CONFIG);

  // 2. 检查余额
  const bal = await system.getBalances();
  console.log(`\n💰 Balances: mUSD=${bal.mUSD} | mTBILL=${bal.mTBILL}`);

  // 3. 确保 session
  await system.ensureSession();

  // 4. 执行交易序列（模拟做市商操作）
  await system.swap({
    direction: 'buy_mTBILL',
    amount: parseEther('0.02'),
    reason: 'Opening long position',
  });

  await system.swap({
    direction: 'buy_mTBILL',
    amount: parseEther('0.01'),
    reason: 'DCA — price dip',
  });

  await system.swap({
    direction: 'buy_mTBILL',
    amount: parseEther('0.03'),
    reason: 'Rebalance portfolio',
  });

  // 5. 风控检查
  await system.riskCheck();

  // 6. 查看仓位
  await system.getPositions();

  // 7. 最终余额
  const finalBal = await system.getBalances();
  console.log(`\n💰 Final: mUSD=${finalBal.mUSD} | mTBILL=${finalBal.mTBILL}`);

  // 8. 打印总结
  system.printSummary();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
