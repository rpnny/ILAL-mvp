/**
 * ══════════════════════════════════════════════════════════════
 *  API 模式 — 机构交易系统
 *  适合传统金融机构 / 资管公司 / 不直接碰链的团队
 * ══════════════════════════════════════════════════════════════
 *
 *  机构通过 Railway API (ilal-mvp-production.up.railway.app) 接入 DeFi 端点。
 *
 *  ⚠️ 重要：ILAL DeFi API 返回的是【未签名交易数据】，
 *     机构需要用自己的钱包签名后广播。
 *     这是安全设计：ILAL 不托管私钥，机构完全自主控制资金。
 *
 *  完整流程：
 *    1. 注册 → 登录 → 获取 API Key
 *    2. 提交 ZK Proof → 激活 Session
 *    3. 调 API 获取未签名交易 → 自行签名 → 广播
 *    4. 查询 session / 用量 / 计费
 */

import {
  createWalletClient, http,
  type Address, type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  assertTrustedApiBaseUrl,
  assertUnsignedLiquidityTxMatchesRequest,
  assertUnsignedSwapTxMatchesRequest,
} from '../shared/transaction-guard';

// ═══════════════════════════════════════
//  配置
// ═══════════════════════════════════════

// Auth + DeFi endpoints all live on the Railway API backend.
// ilal.tech (Vercel) only serves the frontend dashboard and its own Next.js auth routes.
const ILAL_API = process.env.ILAL_API_URL || 'https://ilal-mvp-production.up.railway.app';
const API_KEY = process.env.ILAL_API_KEY!;
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const DEMO_EMAIL = process.env.ILAL_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.ILAL_DEMO_PASSWORD;

// ═══════════════════════════════════════
//  API 客户端
// ═══════════════════════════════════════

class ILALApiClient {
  private apiKey: string;
  private baseUrl: string;
  private jwt: string | null = null;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
    if (this.jwt) headers['Authorization'] = `Bearer ${this.jwt}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`${method} ${path} → ${res.status}: ${(err as any).error || res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  // ─── Auth ───

  async register(email: string, password: string, org: string) {
    return this.request('POST', '/api/v1/auth/register', { email, password, organizationName: org });
  }

  async login(email: string, password: string) {
    const res = await this.request<{ accessToken: string }>('POST', '/api/v1/auth/login', { email, password });
    this.jwt = res.accessToken;
    return res;
  }

  // ─── Session ───

  async verifyAndActivate(userAddress: string, proof: Hex, publicInputs: string[]) {
    return this.request<{
      success: boolean; txHash?: string; sessionExpiry?: string; gasUsed?: string;
    }>('POST', '/api/v1/verify', { userAddress, proof, publicInputs });
  }

  async getSessionStatus(address: string) {
    return this.request<{
      active: boolean; remainingSeconds: number; expiresAt: number | null;
    }>('GET', `/api/v1/verify/session?address=${address}`);
  }

  async renewSession() {
    return this.request('POST', '/api/v1/verify/renew');
  }

  // ─── DeFi（返回未签名交易） ───

  /**
   * 获取 Swap 的未签名交易数据。
   * 返回 { transaction: { to, data, value, chainId, gas }, instructions, params }
   * 机构需要自行签名并广播。
   */
  async buildSwapTx(params: {
    tokenIn: Address; tokenOut: Address;
    amount: string; zeroForOne?: boolean; userAddress: Address;
  }) {
    return this.request<{
      success: boolean;
      transaction: { to: string; data: Hex; value: string; chainId: number; gas: string };
      instructions: { description: string; network: string; rpcUrl: string };
      params: any;
    }>('POST', '/api/v1/defi/swap', params);
  }

  /**
   * 获取 Add Liquidity 的未签名交易数据。
   */
  async buildLiquidityTx(params: {
    token0: Address; token1: Address;
    amount0: string; amount1: string;
    tickLower?: number; tickUpper?: number; userAddress: Address;
  }) {
    return this.request<{
      success: boolean;
      transaction: { to: string; data: Hex; value: string; chainId: number; gas: string };
      instructions: any; params: any;
    }>('POST', '/api/v1/defi/liquidity', params);
  }

  // ─── Billing ───

  async getUsageStats() {
    return this.request('GET', '/api/v1/billing/stats');
  }

  async healthCheck() {
    return this.request('GET', '/api/v1/health');
  }
}

// ═══════════════════════════════════════
//  机构交易系统
// ═══════════════════════════════════════

class InstitutionalApiTradingSystem {
  private api: ILALApiClient;
  private wallet;

  constructor(api: ILALApiClient, privateKey: Hex) {
    this.api = api;
    assertTrustedApiBaseUrl(ILAL_API);
    const account = privateKeyToAccount(privateKey);
    this.wallet = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });
  }

  get address(): Address {
    return this.wallet.account!.address;
  }

  /**
   * 完整的 swap 流程：
   * 1. 调 ILAL API 获取未签名交易
   * 2. 用机构钱包签名
   * 3. 广播到链上
   */
  async swap(params: {
    tokenIn: Address; tokenOut: Address;
    amount: string; zeroForOne?: boolean;
  }) {
    console.log(`\n📊 Swap: ${params.amount} (zeroForOne=${params.zeroForOne ?? 'auto'})`);

    // Step 1: 从 ILAL API 获取未签名交易
    console.log('   [1/3] Fetching unsigned TX from ILAL API...');
    const { transaction } = await this.api.buildSwapTx({
      ...params,
      userAddress: this.address,
    });

    // Never sign a server-returned transaction blindly.
    assertUnsignedSwapTxMatchesRequest(transaction, params);

    console.log(`   [2/3] Signing with institutional wallet...`);
    console.log(`         to:   ${transaction.to}`);
    console.log(`         data: ${transaction.data.slice(0, 20)}...`);

    // Step 2: 用机构钱包签名并发送
    const hash = await this.wallet.sendTransaction({
      to: transaction.to as Address,
      data: transaction.data,
      value: BigInt(transaction.value),
      chain: baseSepolia,
    });

    console.log(`   [3/3] Broadcast! TX: ${hash}`);
    console.log(`         📎 https://sepolia.basescan.org/tx/${hash}`);

    return hash;
  }

  async addLiquidity(params: {
    token0: Address; token1: Address;
    amount0: string; amount1: string;
    tickLower?: number; tickUpper?: number;
  }) {
    console.log('\n💧 Add liquidity');
    const { transaction } = await this.api.buildLiquidityTx({
      ...params,
      userAddress: this.address,
    });

    // Apply the same trust-minimization to liquidity operations.
    assertUnsignedLiquidityTxMatchesRequest(transaction, params);

    const hash = await this.wallet.sendTransaction({
      to: transaction.to as Address,
      data: transaction.data,
      value: BigInt(transaction.value),
      chain: baseSepolia,
    });

    console.log(`   Broadcast! TX: ${hash}`);
    return hash;
  }
}

// ═══════════════════════════════════════
//  演示流程
// ═══════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  ILAL API Mode — Institutional Trading System        ║');
  console.log('║  https://ilal-mvp-production.up.railway.app         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  if (!API_KEY || !PRIVATE_KEY) {
    console.log('⚠️  This demo requires environment variables:');
    console.log('   ILAL_API_KEY  — Your ILAL API Key');
    console.log('   PRIVATE_KEY   — Institutional wallet private key');
    console.log('   ILAL_API_URL  — (optional) defaults to https://ilal-mvp-production.up.railway.app\n');
    console.log('The flow would be:\n');
    showFlow();
    return;
  }

  const api = new ILALApiClient(API_KEY, ILAL_API);
  const system = new InstitutionalApiTradingSystem(api, PRIVATE_KEY);

  // 1. 健康检查
  console.log('── Step 1: Health Check ──');
  const health = await api.healthCheck();
  console.log('   API:', JSON.stringify(health));

  // 2. Session 状态（该端点需要 JWT；未提供演示账号则跳过）
  console.log('\n── Step 2: Session Status ──');
  if (DEMO_EMAIL && DEMO_PASSWORD) {
    await api.login(DEMO_EMAIL, DEMO_PASSWORD);
    const session = await api.getSessionStatus(system.address);
    console.log(`   Active: ${session.active}`);
    console.log(`   Expires: ${session.expiresAt}`);
  } else {
    console.log('   Skipped: set ILAL_DEMO_EMAIL / ILAL_DEMO_PASSWORD to test JWT-only session endpoints');
  }

  // 3. 获取未签名交易 → 签名 → 广播
  console.log('\n── Step 3: Execute Swap (API → Sign → Broadcast) ──');
  // WETH/tUSDC — the current ILAL compliance pool on Base Sepolia
  const hash = await system.swap({
    tokenIn:  '0x4200000000000000000000000000000000000006' as Address, // WETH
    tokenOut: '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D' as Address, // tUSDC
    amount: '1000000000000000', // 0.001 WETH
  });
  console.log(`\n   ✅ Swap completed: ${hash}`);
}

function showFlow() {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  ILAL API 模式 — 机构操作流程                                │
│  API: https://ilal-mvp-production.up.railway.app           │
│  Dashboard: https://ilal.tech                               │
└─────────────────────────────────────────────────────────────┘

Step 1: 注册 & 认证
  POST /api/v1/auth/register     → 注册机构账户
  POST /api/v1/auth/login        → 登录，获取 JWT
  POST /api/v1/apikeys           → 创建 API Key

Step 2: 身份验证 & Session
  POST /api/v1/verify            → 提交 ZK Proof，激活 Session
  GET  /api/v1/session/:address  → 查询 Session 状态
  POST /api/v1/verify/renew      → 续期 Session

Step 3: 交易（API 返回未签名交易，机构自行签名广播）

  // 请求 (WETH → tUSDC, Base Sepolia testnet pools)
  POST /api/v1/defi/swap
  {
    "tokenIn":  "0x4200000000000000000000000000000000000006",
    "tokenOut": "0xa486Fb51ED09B970A23F7Fe910bc90089f78424D",
    "amount":   "1000000000000000",
    "userAddress": "0x..."
  }

  // 响应（未签名交易数据）
  {
    "success": true,
    "transaction": {
      "to":      "0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891",
      "data":    "0x41c0e1b5...",
      "value":   "0x0",
      "chainId": 84532,
      "gas":     "0x1E8480"
    },
    "instructions": {
      "description": "Sign and broadcast this transaction with your wallet",
      "network": "Base Sepolia (chainId: 84532)",
      "rpcUrl": "https://sepolia.base.org"
    }
  }

  // 机构自行签名并广播
  const hash = await signer.sendTransaction(response.transaction);

Step 4: 监控
  GET  /api/v1/billing/stats     → 使用量统计
  GET  /api/v1/billing/plans     → 计费方案
  GET  /api/v1/health            → 系统健康检查

核心设计：
  • ILAL 不托管私钥 — API 只构建交易，签名权在机构
  • 机构用自己的钱包（MPC / HSM / 硬件）签名广播
  • 这是 B2B 基础设施模式，不是托管模式
`);
}

main().catch(err => console.error('Error:', err.message));
