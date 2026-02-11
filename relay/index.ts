/**
 * ILAL Verifier Relay
 *
 * 轻量级 HTTP 服务：
 * 1. 接收前端提交的 ZK proof + publicInputs
 * 2. 调用链上 PlonkVerifierAdapter.verifyComplianceProof（只读验证）
 * 3. 验证通过后，用 VERIFIER_ROLE 私钥调用 SessionManager.startSession
 * 4. 返回 txHash 给前端
 *
 * 启动：npm run dev
 * 端口：3001
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============ 配置 ============

const PORT = Number(process.env.PORT) || 3001;
const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';

const ADDRESSES = {
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  verifier: '0x0cDcD82E5efba9De4aCc255402968397F323AFBB' as Address,
};

// SessionManager ABI（精简）
const sessionManagerABI = [
  { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getRemainingTime', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'VERIFIER_ROLE', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'hasRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'event', name: 'SessionStarted', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'expiry', type: 'uint256', indexed: false }], anonymous: false },
] as const;

// PlonkVerifierAdapter ABI（精简）
const verifierABI = [
  { type: 'function', name: 'verifyComplianceProof', inputs: [{ name: 'proof', type: 'bytes' }, { name: 'publicInputs', type: 'uint256[]' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const;

// ============ 加载私钥 ============

function loadPrivateKey(): Hex {
  // 优先从环境变量读取
  if (process.env.VERIFIER_PRIVATE_KEY) {
    const key = process.env.VERIFIER_PRIVATE_KEY;
    return (key.startsWith('0x') ? key : `0x${key}`) as Hex;
  }

  // fallback: 从 contracts/.env 读取部署者私钥
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(__dirname, '..', 'contracts', '.env');

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/PRIVATE_KEY=(.+)/);
    if (match) {
      const key = match[1].trim();
      return (key.startsWith('0x') ? key : `0x${key}`) as Hex;
    }
  }

  console.error('错误：未找到 VERIFIER_PRIVATE_KEY 或 contracts/.env PRIVATE_KEY');
  process.exit(1);
}

// ============ 初始化客户端 ============

const privateKey = loadPrivateKey();
const account = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ============ 请求处理 ============

interface VerifyRequest {
  userAddress: string;
  proof: string;       // hex-encoded proof bytes
  publicInputs: string[]; // decimal string array
}

interface VerifyResponse {
  success: boolean;
  txHash?: string;
  sessionExpiry?: string;
  gasUsed?: string;
  error?: string;
  alreadyActive?: boolean;
}

async function handleVerify(body: VerifyRequest): Promise<VerifyResponse> {
  const { userAddress, proof, publicInputs } = body;

  // 1. 参数校验
  if (!userAddress || !proof || !publicInputs) {
    return { success: false, error: '缺少必要参数: userAddress, proof, publicInputs' };
  }

  if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
    return { success: false, error: '无效的以太坊地址' };
  }

  const user = userAddress as Address;

  console.log(`[Relay] 收到验证请求: ${user}`);

  // 2. 检查是否已有活跃 Session
  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: [user],
  });

  if (isActive) {
    const remaining = await publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'getRemainingTime',
      args: [user],
    });

    console.log(`[Relay] ${user} 已有活跃 Session，剩余 ${remaining} 秒`);
    return {
      success: true,
      alreadyActive: true,
      sessionExpiry: (Math.floor(Date.now() / 1000) + Number(remaining)).toString(),
    };
  }

  // 3. 链上验证 ZK Proof
  console.log(`[Relay] 链上验证 Proof...`);
  const proofHex = (proof.startsWith('0x') ? proof : `0x${proof}`) as Hex;
  const inputs = publicInputs.map(s => BigInt(s));

  let isValid: boolean;
  try {
    isValid = await publicClient.readContract({
      address: ADDRESSES.verifier,
      abi: verifierABI,
      functionName: 'verifyComplianceProof',
      args: [proofHex, inputs],
    }) as boolean;
  } catch (err) {
    console.error(`[Relay] 链上验证调用失败:`, err);
    return { success: false, error: '链上 Proof 验证调用失败' };
  }

  if (!isValid) {
    console.log(`[Relay] Proof 验证失败: 被 PlonkVerifier 拒绝`);
    return { success: false, error: 'ZK Proof 验证未通过' };
  }

  console.log(`[Relay] Proof 验证通过 ✓`);

  // 4. 激活链上 Session
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60); // 24h

  console.log(`[Relay] 调用 startSession(${user}, ${expiry})...`);

  try {
    const hash = await walletClient.writeContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'startSession',
      args: [user, expiry],
    });

    console.log(`[Relay] TX 发送: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`[Relay] 确认! Block #${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);

    return {
      success: true,
      txHash: hash,
      sessionExpiry: expiry.toString(),
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (err: any) {
    console.error(`[Relay] startSession 失败:`, err);
    return {
      success: false,
      error: `Session 激活失败: ${err.shortMessage || err.message}`,
    };
  }
}

async function handleStatus(userAddress: string): Promise<any> {
  if (!userAddress || !userAddress.startsWith('0x')) {
    return { error: '无效地址' };
  }

  const user = userAddress as Address;

  const [isActive, remaining] = await Promise.all([
    publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'isSessionActive',
      args: [user],
    }),
    publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'getRemainingTime',
      args: [user],
    }),
  ]);

  return { user, isActive, remainingSeconds: Number(remaining) };
}

// ============ HTTP 服务器 ============

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  try {
    // POST /api/verify — 验证 ZK proof 并激活 Session
    if (req.method === 'POST' && url.pathname === '/api/verify') {
      const body = JSON.parse(await readBody(req));
      const result = await handleVerify(body);
      sendJSON(res, result.success ? 200 : 400, result);
      return;
    }

    // GET /api/status?address=0x... — 查询 Session 状态
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const address = url.searchParams.get('address');
      if (!address) {
        sendJSON(res, 400, { error: '需要 address 参数' });
        return;
      }
      const result = await handleStatus(address);
      sendJSON(res, 200, result);
      return;
    }

    // GET /api/health — 健康检查
    if (url.pathname === '/api/health') {
      const block = await publicClient.getBlockNumber();
      sendJSON(res, 200, {
        status: 'ok',
        relay: account.address,
        network: 'base-sepolia',
        latestBlock: block.toString(),
      });
      return;
    }

    // 404
    sendJSON(res, 404, { error: 'Not found' });
  } catch (err: any) {
    console.error('[Relay] 错误:', err);
    sendJSON(res, 500, { error: err.message });
  }
});

// ============ 启动 ============

async function start() {
  // 验证 VERIFIER_ROLE
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     ILAL Verifier Relay                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Relay 钱包: ${account.address}`);
  console.log(`  RPC:        ${RPC_URL}`);
  console.log(`  端口:       ${PORT}`);

  // 检查角色
  const verifierRole = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'VERIFIER_ROLE',
  });

  const hasRole = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'hasRole',
    args: [verifierRole as Hex, account.address],
  });

  if (hasRole) {
    console.log(`  VERIFIER_ROLE: ✅ 已授予`);
  } else {
    console.log(`  VERIFIER_ROLE: ❌ 未授予`);
    console.log(`  需要 admin 调用: grantRole(VERIFIER_ROLE, ${account.address})`);
    console.log(`  正在自动授权...`);

    // 尝试自动授权（如果当前钱包是 admin）
    try {
      const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
      const isAdmin = await publicClient.readContract({
        address: ADDRESSES.sessionManager,
        abi: [{ type: 'function', name: 'hasRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' }],
        functionName: 'hasRole',
        args: [adminRole, account.address],
      });

      if (isAdmin) {
        const grantABI = [{ type: 'function', name: 'grantRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' }] as const;
        const hash = await walletClient.writeContract({
          address: ADDRESSES.sessionManager,
          abi: grantABI,
          functionName: 'grantRole',
          args: [verifierRole as Hex, account.address],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`  ✅ VERIFIER_ROLE 自动授予成功 (tx: ${hash})`);
      }
    } catch (e) {
      console.warn(`  ⚠️  自动授权失败，请手动授权`);
    }
  }

  server.listen(PORT, () => {
    console.log(`\n  🚀 Relay 已启动: http://localhost:${PORT}`);
    console.log(`\n  API 端点:`);
    console.log(`    POST /api/verify   — 验证 ZK proof + 激活 Session`);
    console.log(`    GET  /api/status   — 查询 Session 状态`);
    console.log(`    GET  /api/health   — 健康检查`);
    console.log('');
  });
}

start();
