#!/usr/bin/env npx tsx
/**
 * ILAL 合规运营工具 (Compliance Operations CLI)
 *
 * 用途：
 *   - 查询 Session 状态
 *   - 撤销 Session（紧急合规操作）
 *   - 批量查询/撤销
 *   - 导出合规报告
 *   - 授予/撤销 VERIFIER_ROLE
 *
 * 使用方式：
 *   npx tsx scripts/compliance-ops.ts <command> [options]
 *
 * 命令：
 *   status <address>           查询地址的 Session 状态
 *   revoke <address>           撤销地址的 Session
 *   batch-status <file>        批量查询（每行一个地址）
 *   batch-revoke <file>        批量撤销（每行一个地址）
 *   grant-verifier <address>   授予 VERIFIER_ROLE
 *   revoke-verifier <address>  撤销 VERIFIER_ROLE
 *   export-report              导出合规报告（JSON + CSV）
 *   info                       显示合约信息
 */

import { createPublicClient, createWalletClient, http, formatEther, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

// ============ 配置 ============

const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';

const ADDRESSES = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  verifier: '0x0cDcD82E5efba9De4aCc255402968397F323AFBB' as Address,
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80' as Address,
};

// SessionManager ABI（精简版，仅包含需要的函数）
const sessionManagerABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getRemainingTime', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'sessionExpiry', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'endSession', inputs: [{ name: 'user', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'endSessionBatch', inputs: [{ name: 'users', type: 'address[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'batchIsSessionActive', inputs: [{ name: 'users', type: 'address[]' }], outputs: [{ name: 'statuses', type: 'bool[]' }], stateMutability: 'view' },
  { type: 'function', name: 'hasRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'grantRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'revokeRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'VERIFIER_ROLE', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'DEFAULT_ADMIN_ROLE', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'version', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'pure' },
  { type: 'function', name: 'registry', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'event', name: 'SessionStarted', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'expiry', type: 'uint256', indexed: false }], anonymous: false },
  { type: 'event', name: 'SessionEnded', inputs: [{ name: 'user', type: 'address', indexed: true }], anonymous: false },
] as const;

// ============ 客户端 ============

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getWalletClient() {
  const envPath = path.join(process.cwd(), 'contracts', '.env');
  let privateKey: Hex | undefined;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/PRIVATE_KEY=(.+)/);
    if (match) {
      privateKey = match[1].trim() as Hex;
      if (!privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}` as Hex;
      }
    }
  }

  if (!privateKey) {
    privateKey = process.env.PRIVATE_KEY as Hex;
  }

  if (!privateKey) {
    console.error('错误：未找到 PRIVATE_KEY。请在 contracts/.env 或环境变量中设置。');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// ============ 工具函数 ============

function formatTimestamp(ts: bigint): string {
  if (ts === 0n) return '无';
  return new Date(Number(ts) * 1000).toISOString();
}

function formatDuration(seconds: bigint): string {
  if (seconds <= 0n) return '已过期';
  const h = Number(seconds / 3600n);
  const m = Number((seconds % 3600n) / 60n);
  const s = Number(seconds % 60n);
  return `${h}h ${m}m ${s}s`;
}

function readAddressesFromFile(filePath: string): Address[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('0x') && line.length === 42) as Address[];
}

// ============ 命令实现 ============

async function cmdStatus(address: Address) {
  console.log(`\n查询 Session 状态: ${address}`);
  console.log('─'.repeat(60));

  const [isActive, remaining, expiry] = await Promise.all([
    publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'isSessionActive',
      args: [address],
    }),
    publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'getRemainingTime',
      args: [address],
    }),
    publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'sessionExpiry',
      args: [address],
    }),
  ]);

  console.log(`  地址:     ${address}`);
  console.log(`  状态:     ${isActive ? '✅ 活跃' : '❌ 未激活'}`);
  console.log(`  到期时间:  ${formatTimestamp(expiry as bigint)}`);
  console.log(`  剩余时间:  ${formatDuration(remaining as bigint)}`);

  return { address, isActive, remaining, expiry };
}

async function cmdRevoke(address: Address) {
  console.log(`\n撤销 Session: ${address}`);
  console.log('─'.repeat(60));

  // 先检查状态
  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: [address],
  });

  if (!isActive) {
    console.log('  ⚠️  该地址当前无活跃 Session，无需撤销');
    return;
  }

  const walletClient = getWalletClient();
  console.log(`  操作钱包: ${walletClient.account.address}`);

  const hash = await walletClient.writeContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'endSession',
    args: [address],
  });

  console.log(`  交易发送: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  区块确认: #${receipt.blockNumber}`);
  console.log(`  Gas 消耗: ${receipt.gasUsed}`);
  console.log(`  ✅ Session 已撤销`);
}

async function cmdBatchStatus(filePath: string) {
  const addresses = readAddressesFromFile(filePath);
  console.log(`\n批量查询 ${addresses.length} 个地址的 Session 状态`);
  console.log('═'.repeat(60));

  const results: Array<{ address: string; isActive: boolean; remaining: string; expiry: string }> = [];

  // 使用 batchIsSessionActive 如果地址数量多
  if (addresses.length > 1) {
    const statuses = await publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: sessionManagerABI,
      functionName: 'batchIsSessionActive',
      args: [addresses],
    }) as boolean[];

    for (let i = 0; i < addresses.length; i++) {
      const remaining = await publicClient.readContract({
        address: ADDRESSES.sessionManager,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [addresses[i]],
      }) as bigint;

      const expiry = await publicClient.readContract({
        address: ADDRESSES.sessionManager,
        abi: sessionManagerABI,
        functionName: 'sessionExpiry',
        args: [addresses[i]],
      }) as bigint;

      const status = statuses[i] ? '✅' : '❌';
      console.log(`  ${status} ${addresses[i]}  剩余: ${formatDuration(remaining)}`);

      results.push({
        address: addresses[i],
        isActive: statuses[i],
        remaining: formatDuration(remaining),
        expiry: formatTimestamp(expiry),
      });
    }
  }

  console.log(`\n  活跃: ${results.filter(r => r.isActive).length} / ${results.length}`);
  return results;
}

async function cmdBatchRevoke(filePath: string) {
  const addresses = readAddressesFromFile(filePath);
  console.log(`\n⚠️  批量撤销 ${addresses.length} 个地址的 Session`);
  console.log('═'.repeat(60));

  const walletClient = getWalletClient();
  console.log(`  操作钱包: ${walletClient.account.address}`);

  const hash = await walletClient.writeContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'endSessionBatch',
    args: [addresses],
  });

  console.log(`  交易发送: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  区块确认: #${receipt.blockNumber}`);
  console.log(`  Gas 消耗: ${receipt.gasUsed}`);
  console.log(`  ✅ ${addresses.length} 个 Session 已批量撤销`);
}

async function cmdGrantVerifier(address: Address) {
  console.log(`\n授予 VERIFIER_ROLE: ${address}`);
  console.log('─'.repeat(60));

  const verifierRole = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'VERIFIER_ROLE',
  }) as Hex;

  const hasRole = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'hasRole',
    args: [verifierRole, address],
  });

  if (hasRole) {
    console.log('  ⚠️  该地址已拥有 VERIFIER_ROLE');
    return;
  }

  const walletClient = getWalletClient();
  const hash = await walletClient.writeContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'grantRole',
    args: [verifierRole, address],
  });

  console.log(`  交易发送: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  ✅ VERIFIER_ROLE 已授予 ${address} (block #${receipt.blockNumber})`);
}

async function cmdRevokeVerifier(address: Address) {
  console.log(`\n撤销 VERIFIER_ROLE: ${address}`);
  console.log('─'.repeat(60));

  const verifierRole = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'VERIFIER_ROLE',
  }) as Hex;

  const walletClient = getWalletClient();
  const hash = await walletClient.writeContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'revokeRole',
    args: [verifierRole, address],
  });

  console.log(`  交易发送: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  ✅ VERIFIER_ROLE 已撤销 (block #${receipt.blockNumber})`);
}

async function cmdExportReport() {
  console.log('\n导出合规报告');
  console.log('═'.repeat(60));

  // 获取最近的区块号，分批扫描（每批 40,000 区块以兼容 RPC 限制）
  const latestBlock = await publicClient.getBlockNumber();
  const SCAN_RANGE = 200000n; // 总范围约 5 天
  const BATCH_SIZE = 40000n;  // 每批大小
  const scanFrom = latestBlock > SCAN_RANGE ? latestBlock - SCAN_RANGE : 0n;
  console.log(`  扫描区块范围: ${scanFrom} → ${latestBlock} (分批 ${BATCH_SIZE} 块)`);

  const sessionStartedEvent = {
    type: 'event' as const,
    name: 'SessionStarted' as const,
    inputs: [
      { name: 'user', type: 'address' as const, indexed: true },
      { name: 'expiry', type: 'uint256' as const, indexed: false },
    ],
  };

  const sessionEndedEvent = {
    type: 'event' as const,
    name: 'SessionEnded' as const,
    inputs: [
      { name: 'user', type: 'address' as const, indexed: true },
    ],
  };

  // 分批拉取事件
  const startedLogs: any[] = [];
  const endedLogs: any[] = [];

  for (let from = scanFrom; from <= latestBlock; from += BATCH_SIZE) {
    const to = (from + BATCH_SIZE - 1n) > latestBlock ? latestBlock : (from + BATCH_SIZE - 1n);

    try {
      const [started, ended] = await Promise.all([
        publicClient.getLogs({
          address: ADDRESSES.sessionManager,
          event: sessionStartedEvent,
          fromBlock: from,
          toBlock: to,
        }),
        publicClient.getLogs({
          address: ADDRESSES.sessionManager,
          event: sessionEndedEvent,
          fromBlock: from,
          toBlock: to,
        }),
      ]);
      startedLogs.push(...started);
      endedLogs.push(...ended);
    } catch (e) {
      // 单批失败不影响整体
      console.warn(`  ⚠️  区块 ${from}-${to} 扫描失败，跳过`);
    }
  }

  console.log(`  SessionStarted 事件: ${startedLogs.length}`);
  console.log(`  SessionEnded 事件: ${endedLogs.length}`);

  // 构造报告数据
  const reportData = {
    generatedAt: new Date().toISOString(),
    network: 'Base Sepolia (84532)',
    contracts: ADDRESSES,
    sessionHistory: {
      totalStarted: startedLogs.length,
      totalEnded: endedLogs.length,
      sessions: startedLogs.map(log => ({
        user: log.args.user,
        expiry: log.args.expiry?.toString(),
        blockNumber: log.blockNumber.toString(),
        txHash: log.transactionHash,
      })),
      revocations: endedLogs.map(log => ({
        user: log.args.user,
        blockNumber: log.blockNumber.toString(),
        txHash: log.transactionHash,
      })),
    },
  };

  // 输出目录（定位到项目根目录的 docs/reports）
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const projectRoot = path.resolve(scriptDir, '..', '..');
  const reportDir = path.join(projectRoot, 'docs', 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];

  // JSON 报告
  const jsonPath = path.join(reportDir, `compliance-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
  console.log(`  ✅ JSON 报告: ${jsonPath}`);

  // CSV 报告
  const csvLines = ['user,event,expiry,blockNumber,txHash'];
  for (const s of reportData.sessionHistory.sessions) {
    csvLines.push(`${s.user},SessionStarted,${s.expiry},${s.blockNumber},${s.txHash}`);
  }
  for (const r of reportData.sessionHistory.revocations) {
    csvLines.push(`${r.user},SessionEnded,,${r.blockNumber},${r.txHash}`);
  }

  const csvPath = path.join(reportDir, `compliance-report-${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`  ✅ CSV 报告: ${csvPath}`);
}

async function cmdInfo() {
  console.log('\nILAL 合约信息');
  console.log('═'.repeat(60));

  const version = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'version',
  });

  const registry = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: sessionManagerABI,
    functionName: 'registry',
  });

  console.log(`  网络:           Base Sepolia (84532)`);
  console.log(`  RPC:            ${RPC_URL}`);
  console.log(`  SessionManager: ${ADDRESSES.sessionManager}`);
  console.log(`  Registry:       ${ADDRESSES.registry}`);
  console.log(`  ComplianceHook: ${ADDRESSES.complianceHook}`);
  console.log(`  Verifier:       ${ADDRESSES.verifier}`);
  console.log(`  版本:           ${version}`);
  console.log(`  关联 Registry:  ${registry}`);
}

// ============ 主入口 ============

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    ILAL 合规运营工具 (Compliance Operations)     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!command) {
    console.log(`
用法: npx tsx scripts/compliance-ops.ts <command> [options]

命令:
  status <address>           查询地址的 Session 状态
  revoke <address>           撤销地址的 Session（需要 ADMIN_ROLE）
  batch-status <file>        批量查询（文件每行一个地址）
  batch-revoke <file>        批量撤销（需要 ADMIN_ROLE）
  grant-verifier <address>   授予 VERIFIER_ROLE（需要 ADMIN_ROLE）
  revoke-verifier <address>  撤销 VERIFIER_ROLE（需要 ADMIN_ROLE）
  export-report              导出合规报告（JSON + CSV）
  info                       显示合约信息

示例:
  npx tsx scripts/compliance-ops.ts status 0x1234...
  npx tsx scripts/compliance-ops.ts export-report
  npx tsx scripts/compliance-ops.ts batch-status addresses.txt
`);
    return;
  }

  try {
    switch (command) {
      case 'status':
        if (!args[1]) { console.error('错误: 请提供地址'); process.exit(1); }
        await cmdStatus(args[1] as Address);
        break;

      case 'revoke':
        if (!args[1]) { console.error('错误: 请提供地址'); process.exit(1); }
        await cmdRevoke(args[1] as Address);
        break;

      case 'batch-status':
        if (!args[1]) { console.error('错误: 请提供地址文件路径'); process.exit(1); }
        await cmdBatchStatus(args[1]);
        break;

      case 'batch-revoke':
        if (!args[1]) { console.error('错误: 请提供地址文件路径'); process.exit(1); }
        await cmdBatchRevoke(args[1]);
        break;

      case 'grant-verifier':
        if (!args[1]) { console.error('错误: 请提供地址'); process.exit(1); }
        await cmdGrantVerifier(args[1] as Address);
        break;

      case 'revoke-verifier':
        if (!args[1]) { console.error('错误: 请提供地址'); process.exit(1); }
        await cmdRevokeVerifier(args[1] as Address);
        break;

      case 'export-report':
        await cmdExportReport();
        break;

      case 'info':
        await cmdInfo();
        break;

      default:
        console.error(`错误: 未知命令 "${command}"`);
        process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ 执行失败:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('\n完成。');
}

main();
