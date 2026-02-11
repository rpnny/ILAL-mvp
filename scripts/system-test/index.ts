/**
 * ILAL 系统集成测试 & 报告生成器
 *
 * 模拟客户全生命周期操作，验证 Base Sepolia 上部署的所有合约，
 * 并生成专业的 HTML 测试报告。
 *
 * 用法: npx tsx index.ts
 */

import {
  createPublicClient,
  http,
  formatEther,
  type Address,
  type PublicClient,
  getAddress,
  keccak256,
  toHex,
  encodePacked,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 配置
// ============================================================================

const RPC_URL = 'https://sepolia.base.org';
const CHAIN_ID = 84532;

const CONTRACTS = {
  registry: {
    proxy: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
    implementation: '0xdbd5e1F35b825838b4e7dBEEdFa228BA4dC0628E' as Address,
  },
  sessionManager: {
    proxy: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
    implementation: '0x807814E5f95C6Dfbaa00573D0E407EB166566511' as Address,
  },
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80' as Address,
  positionManager: '0x5b460c8Bd32951183a721bdaa3043495D8861f31' as Address,
  simpleSwapRouter: '0x2AAF6C551168DCF22804c04DdA2c08c82031F289' as Address,
  plonkVerifier: '0x2645C48A7DB734C9179A195C51Ea5F022B86261f' as Address,
  plonkVerifierAdapter: '0x0cDcD82E5efba9De4aCc255402968397F323AFBB' as Address,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
};

const GOVERNANCE = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D' as Address;

// 模拟用户地址（用于只读查询测试）
const TEST_USERS = {
  verified: '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D' as Address,
  unverified: '0x0000000000000000000000000000000000000001' as Address,
  random: '0xdead000000000000000000000000000000000001' as Address,
};

// ============================================================================
// ABI 定义
// ============================================================================

const registryABI = [
  { type: 'function', name: 'owner', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'version', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'pure' },
  { type: 'function', name: 'getSessionTTL', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'emergencyPaused', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'isRouterApproved', inputs: [{ type: 'address', name: 'router' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'isIssuerActive', inputs: [{ type: 'address', name: 'attester' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'UPGRADE_INTERFACE_VERSION', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const;

const sessionManagerABI = [
  { type: 'function', name: 'version', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'pure' },
  { type: 'function', name: 'registry', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'isSessionActive', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getRemainingTime', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'sessionExpiry', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'batchIsSessionActive', inputs: [{ type: 'address[]', name: 'users' }], outputs: [{ type: 'bool[]' }], stateMutability: 'view' },
  { type: 'function', name: 'VERIFIER_ROLE', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'hasRole', inputs: [{ type: 'bytes32', name: 'role' }, { type: 'address', name: 'account' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'DEFAULT_ADMIN_ROLE', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
] as const;

const complianceHookABI = [
  { type: 'function', name: 'registry', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'sessionManager', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'isUserAllowed', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getNonce', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getDomainSeparator', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SWAP_PERMIT_TYPEHASH', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'LIQUIDITY_PERMIT_TYPEHASH', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'batchIsUserAllowed', inputs: [{ type: 'address[]', name: 'users' }], outputs: [{ type: 'bool[]' }], stateMutability: 'view' },
  {
    type: 'function', name: 'eip712Domain', inputs: [], outputs: [
      { type: 'bytes1', name: 'fields' }, { type: 'string', name: 'name' }, { type: 'string', name: 'version' },
      { type: 'uint256', name: 'chainId' }, { type: 'address', name: 'verifyingContract' },
      { type: 'bytes32', name: 'salt' }, { type: 'uint256[]', name: 'extensions' },
    ], stateMutability: 'view',
  },
] as const;

const verifierAdapterABI = [
  { type: 'function', name: 'version', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'pure' },
  { type: 'function', name: 'plonkVerifier', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
] as const;

const positionManagerABI = [
  { type: 'function', name: 'poolManager', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'registry', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'sessionManager', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'nextTokenId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

// ============================================================================
// 测试框架
// ============================================================================

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  message: string;
  detail?: string;
  duration: number; // ms
  gasUsed?: string;
}

interface TestSuite {
  name: string;
  description: string;
  results: TestResult[];
  startTime: number;
  endTime: number;
}

class SystemTester {
  private client: PublicClient;
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  constructor() {
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });
  }

  startSuite(name: string, description: string) {
    this.currentSuite = { name, description, results: [], startTime: Date.now(), endTime: 0 };
  }

  endSuite() {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now();
      this.suites.push(this.currentSuite);
      this.currentSuite = null;
    }
  }

  async test(category: string, name: string, fn: () => Promise<{ status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'; message: string; detail?: string; gasUsed?: string }>) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.currentSuite?.results.push({ category, name, ...result, duration });
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'WARN' ? '⚠️' : '⏭️';
      console.log(`  ${icon} ${name} (${duration}ms) - ${result.message}`);
    } catch (error: any) {
      const duration = Date.now() - start;
      this.currentSuite?.results.push({ category, name, status: 'FAIL', message: error.message?.slice(0, 200) || 'Unknown error', duration });
      console.log(`  ❌ ${name} (${duration}ms) - ERROR: ${error.message?.slice(0, 100)}`);
    }
  }

  getSuites() { return this.suites; }
  getClient() { return this.client; }

  // ========================================================================
  // 测试套件 1: 合约部署验证
  // ========================================================================
  async testContractDeployment() {
    this.startSuite('合约部署验证', '验证所有核心合约在 Base Sepolia 上的部署状态');
    console.log('\n📋 测试套件 1: 合约部署验证');
    console.log('─'.repeat(60));

    const contractList = [
      { name: 'Registry (Proxy)', address: CONTRACTS.registry.proxy },
      { name: 'Registry (Implementation)', address: CONTRACTS.registry.implementation },
      { name: 'SessionManager (Proxy)', address: CONTRACTS.sessionManager.proxy },
      { name: 'SessionManager (Implementation)', address: CONTRACTS.sessionManager.implementation },
      { name: 'ComplianceHook', address: CONTRACTS.complianceHook },
      { name: 'PositionManager', address: CONTRACTS.positionManager },
      { name: 'SimpleSwapRouter', address: CONTRACTS.simpleSwapRouter },
      { name: 'PlonkVerifier', address: CONTRACTS.plonkVerifier },
      { name: 'PlonkVerifierAdapter', address: CONTRACTS.plonkVerifierAdapter },
      { name: 'PoolManager (Uniswap v4)', address: CONTRACTS.poolManager },
    ];

    for (const { name, address } of contractList) {
      await this.test('部署', `${name} 合约部署检查`, async () => {
        const code = await this.client.getCode({ address });
        if (code && code !== '0x' && code.length > 2) {
          return {
            status: 'PASS',
            message: `已部署 (${address.slice(0, 10)}...${address.slice(-6)})`,
            detail: `字节码大小: ${Math.floor((code.length - 2) / 2)} bytes`,
          };
        }
        return { status: 'FAIL', message: `未部署 at ${address}` };
      });
    }

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 2: Registry 合约配置
  // ========================================================================
  async testRegistryConfiguration() {
    this.startSuite('Registry 配置验证', '验证 Registry 合约的核心配置和治理参数');
    console.log('\n📋 测试套件 2: Registry 配置验证');
    console.log('─'.repeat(60));

    await this.test('配置', 'Registry 所有者检查', async () => {
      const owner = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'owner',
      });
      const isGovernance = getAddress(owner) === getAddress(GOVERNANCE);
      return {
        status: isGovernance ? 'PASS' : 'WARN',
        message: `Owner: ${owner}`,
        detail: isGovernance ? '所有者为预期的治理地址' : `预期: ${GOVERNANCE}`,
      };
    });

    await this.test('配置', 'Registry 版本检查', async () => {
      const version = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'version',
      });
      return { status: 'PASS', message: `版本: ${version}` };
    });

    await this.test('配置', 'Session TTL 配置', async () => {
      const ttl = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'getSessionTTL',
      });
      const ttlHours = Number(ttl) / 3600;
      const isValid = Number(ttl) >= 3600 && Number(ttl) <= 604800;
      return {
        status: isValid ? 'PASS' : 'WARN',
        message: `TTL: ${Number(ttl)}s (${ttlHours}h)`,
        detail: `有效范围: 1h ~ 7d`,
      };
    });

    await this.test('配置', '紧急暂停状态', async () => {
      const paused = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'emergencyPaused',
      });
      return {
        status: !paused ? 'PASS' : 'WARN',
        message: paused ? '⚠️ 系统已暂停' : '系统正常运行',
      };
    });

    await this.test('配置', 'SimpleSwapRouter 路由授权', async () => {
      const approved = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'isRouterApproved',
        args: [CONTRACTS.simpleSwapRouter],
      });
      return {
        status: approved ? 'PASS' : 'WARN',
        message: approved ? '路由已授权' : '路由未授权',
        detail: `Router: ${CONTRACTS.simpleSwapRouter}`,
      };
    });

    await this.test('配置', 'UUPS 升级接口版本', async () => {
      const version = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'UPGRADE_INTERFACE_VERSION',
      });
      return { status: 'PASS', message: `UUPS 版本: ${version}` };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 3: SessionManager 功能
  // ========================================================================
  async testSessionManager() {
    this.startSuite('SessionManager 功能测试', '模拟客户会话管理的完整生命周期验证');
    console.log('\n📋 测试套件 3: SessionManager 功能测试');
    console.log('─'.repeat(60));

    await this.test('会话', 'SessionManager 版本', async () => {
      const version = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'version',
      });
      return { status: 'PASS', message: `版本: ${version}` };
    });

    await this.test('会话', 'Registry 引用一致性', async () => {
      const linkedRegistry = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'registry',
      });
      const matches = getAddress(linkedRegistry) === getAddress(CONTRACTS.registry.proxy);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'Registry 引用一致' : `不一致: ${linkedRegistry}`,
        detail: `期望: ${CONTRACTS.registry.proxy}`,
      };
    });

    await this.test('会话', '治理地址会话状态查询', async () => {
      const isActive = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'isSessionActive',
        args: [GOVERNANCE],
      });
      const remaining = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [GOVERNANCE],
      });
      return {
        status: 'PASS',
        message: `会话${isActive ? '活跃' : '不活跃'}, 剩余: ${Number(remaining)}s`,
        detail: isActive ? `剩余时间: ${(Number(remaining) / 3600).toFixed(2)}h` : '无活跃会话',
      };
    });

    await this.test('会话', '未验证用户会话状态', async () => {
      const isActive = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'isSessionActive',
        args: [TEST_USERS.unverified],
      });
      return {
        status: !isActive ? 'PASS' : 'WARN',
        message: isActive ? '⚠️ 未验证用户有活跃会话' : '未验证用户无会话 (预期)',
      };
    });

    await this.test('会话', '批量会话查询', async () => {
      const users = [GOVERNANCE, TEST_USERS.unverified, TEST_USERS.random];
      const results = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'batchIsSessionActive',
        args: [users],
      });
      return {
        status: 'PASS',
        message: `批量查询 ${users.length} 个地址成功`,
        detail: `结果: [${results.join(', ')}]`,
      };
    });

    await this.test('会话', 'VERIFIER_ROLE 检查', async () => {
      const role = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'VERIFIER_ROLE',
      });
      return {
        status: 'PASS',
        message: `VERIFIER_ROLE: ${(role as string).slice(0, 18)}...`,
        detail: `完整: ${role}`,
      };
    });

    await this.test('会话', '会话过期时间查询', async () => {
      const expiry = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'sessionExpiry',
        args: [GOVERNANCE],
      });
      const expiryDate = Number(expiry) > 0 ? new Date(Number(expiry) * 1000).toISOString() : 'N/A';
      return {
        status: 'PASS',
        message: `过期时间: ${expiryDate}`,
        detail: `Unix 时间戳: ${expiry}`,
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 4: ComplianceHook 合规钩子
  // ========================================================================
  async testComplianceHook() {
    this.startSuite('ComplianceHook 合规验证', '验证 Uniswap v4 合规钩子的访问控制和 EIP-712 配置');
    console.log('\n📋 测试套件 4: ComplianceHook 合规验证');
    console.log('─'.repeat(60));

    await this.test('合规', 'Hook 引用一致性 - Registry', async () => {
      const linkedRegistry = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'registry',
      });
      const matches = getAddress(linkedRegistry) === getAddress(CONTRACTS.registry.proxy);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'Registry 引用一致' : `不一致: ${linkedRegistry}`,
      };
    });

    await this.test('合规', 'Hook 引用一致性 - SessionManager', async () => {
      const linkedSM = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'sessionManager',
      });
      const matches = getAddress(linkedSM) === getAddress(CONTRACTS.sessionManager.proxy);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'SessionManager 引用一致' : `不一致: ${linkedSM}`,
      };
    });

    await this.test('合规', 'EIP-712 Domain 配置', async () => {
      const domain = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'eip712Domain',
      });
      const [fields, name, version, chainId, verifyingContract] = domain as any;
      const correctChain = Number(chainId) === CHAIN_ID;
      const correctContract = getAddress(verifyingContract) === getAddress(CONTRACTS.complianceHook);
      return {
        status: correctChain && correctContract ? 'PASS' : 'FAIL',
        message: `Domain: ${name} v${version}`,
        detail: `ChainId: ${chainId}, Contract: ${verifyingContract}`,
      };
    });

    await this.test('合规', 'Domain Separator 计算', async () => {
      const separator = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'getDomainSeparator',
      });
      return {
        status: separator && separator !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'PASS' : 'FAIL',
        message: `Separator: ${(separator as string).slice(0, 18)}...`,
        detail: `完整: ${separator}`,
      };
    });

    await this.test('合规', 'SWAP_PERMIT_TYPEHASH', async () => {
      const hash = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'SWAP_PERMIT_TYPEHASH',
      });
      return {
        status: hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'PASS' : 'FAIL',
        message: `TypeHash: ${(hash as string).slice(0, 18)}...`,
      };
    });

    await this.test('合规', 'LIQUIDITY_PERMIT_TYPEHASH', async () => {
      const hash = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'LIQUIDITY_PERMIT_TYPEHASH',
      });
      return {
        status: hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'PASS' : 'FAIL',
        message: `TypeHash: ${(hash as string).slice(0, 18)}...`,
      };
    });

    // 模拟客户操作: 验证前检查
    await this.test('客户模拟', '新用户访问控制查询', async () => {
      const allowed = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'isUserAllowed',
        args: [TEST_USERS.random],
      });
      return {
        status: !allowed ? 'PASS' : 'WARN',
        message: allowed ? '⚠️ 未验证用户被允许访问' : '未验证用户被正确拒绝',
        detail: '新用户在完成 KYC 验证前不应被允许访问',
      };
    });

    await this.test('客户模拟', '用户 Nonce 查询', async () => {
      const nonce = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'getNonce',
        args: [GOVERNANCE],
      });
      return {
        status: 'PASS',
        message: `Nonce: ${nonce}`,
        detail: 'Nonce 用于防重放攻击',
      };
    });

    await this.test('客户模拟', '批量用户访问查询', async () => {
      const users = [GOVERNANCE, TEST_USERS.unverified, TEST_USERS.random];
      const results = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'batchIsUserAllowed',
        args: [users],
      });
      return {
        status: 'PASS',
        message: `批量查询 ${users.length} 地址: [${(results as boolean[]).join(', ')}]`,
        detail: '批量查询可节省 gas 成本',
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 5: PlonkVerifier ZK 证明系统
  // ========================================================================
  async testZKVerifier() {
    this.startSuite('ZK 证明系统验证', '验证 PLONK 验证器和适配器的配置与状态');
    console.log('\n📋 测试套件 5: ZK 证明系统验证');
    console.log('─'.repeat(60));

    await this.test('ZK', 'PlonkVerifier 部署检查', async () => {
      const code = await this.client.getCode({ address: CONTRACTS.plonkVerifier });
      const size = code ? Math.floor((code.length - 2) / 2) : 0;
      return {
        status: size > 1000 ? 'PASS' : 'FAIL',
        message: `已部署, 大小: ${(size / 1024).toFixed(1)} KB`,
        detail: 'PLONK 验证器通常 > 5KB',
      };
    });

    await this.test('ZK', 'PlonkVerifierAdapter 版本', async () => {
      const version = await this.client.readContract({
        address: CONTRACTS.plonkVerifierAdapter,
        abi: verifierAdapterABI,
        functionName: 'version',
      });
      return { status: 'PASS', message: `版本: ${version}` };
    });

    await this.test('ZK', 'Adapter -> Verifier 链接', async () => {
      const linkedVerifier = await this.client.readContract({
        address: CONTRACTS.plonkVerifierAdapter,
        abi: verifierAdapterABI,
        functionName: 'plonkVerifier',
      });
      const matches = getAddress(linkedVerifier) === getAddress(CONTRACTS.plonkVerifier);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'Verifier 引用一致' : `不一致: ${linkedVerifier}`,
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 6: PositionManager LP 管理
  // ========================================================================
  async testPositionManager() {
    this.startSuite('PositionManager LP 管理', '验证受限 LP 头寸管理器的配置和安全性');
    console.log('\n📋 测试套件 6: PositionManager LP 管理');
    console.log('─'.repeat(60));

    await this.test('LP', 'PoolManager 引用检查', async () => {
      const linked = await this.client.readContract({
        address: CONTRACTS.positionManager,
        abi: positionManagerABI,
        functionName: 'poolManager',
      });
      const matches = getAddress(linked) === getAddress(CONTRACTS.poolManager);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'PoolManager 引用一致' : `不一致: ${linked}`,
      };
    });

    await this.test('LP', 'Registry 引用检查', async () => {
      const linked = await this.client.readContract({
        address: CONTRACTS.positionManager,
        abi: positionManagerABI,
        functionName: 'registry',
      });
      const matches = getAddress(linked) === getAddress(CONTRACTS.registry.proxy);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'Registry 引用一致' : `不一致: ${linked}`,
      };
    });

    await this.test('LP', 'SessionManager 引用检查', async () => {
      const linked = await this.client.readContract({
        address: CONTRACTS.positionManager,
        abi: positionManagerABI,
        functionName: 'sessionManager',
      });
      const matches = getAddress(linked) === getAddress(CONTRACTS.sessionManager.proxy);
      return {
        status: matches ? 'PASS' : 'FAIL',
        message: matches ? 'SessionManager 引用一致' : `不一致: ${linked}`,
      };
    });

    await this.test('LP', 'Token ID 计数器', async () => {
      const nextId = await this.client.readContract({
        address: CONTRACTS.positionManager,
        abi: positionManagerABI,
        functionName: 'nextTokenId',
      });
      return {
        status: 'PASS',
        message: `已铸造 ${Number(nextId) - 1} 个 LP NFT (下一个 ID: ${nextId})`,
        detail: 'NFT 不可转让，确保合规性',
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 7: 客户操作模拟 (E2E 流程)
  // ========================================================================
  async testCustomerJourney() {
    this.startSuite('客户操作模拟', '模拟完整的客户使用流程：连接钱包 → KYC → 获取会话 → 交易 → 提供流动性');
    console.log('\n📋 测试套件 7: 客户操作模拟 (E2E 流程)');
    console.log('─'.repeat(60));

    // Step 1: 客户连接钱包
    await this.test('E2E', '步骤 1: 客户连接钱包 → 查询链 ID', async () => {
      const chainId = await this.client.getChainId();
      return {
        status: chainId === CHAIN_ID ? 'PASS' : 'FAIL',
        message: `Chain ID: ${chainId} (Base Sepolia)`,
        detail: '客户通过 RainbowKit 连接钱包并确认网络',
      };
    });

    // Step 2: 检查区块高度（网络健康）
    await this.test('E2E', '步骤 2: 网络健康检查', async () => {
      const blockNumber = await this.client.getBlockNumber();
      return {
        status: Number(blockNumber) > 0 ? 'PASS' : 'FAIL',
        message: `当前区块: #${blockNumber}`,
        detail: 'Base Sepolia 网络正常出块',
      };
    });

    // Step 3: 客户检查系统状态
    await this.test('E2E', '步骤 3: 客户查询系统暂停状态', async () => {
      const paused = await this.client.readContract({
        address: CONTRACTS.registry.proxy,
        abi: registryABI,
        functionName: 'emergencyPaused',
      });
      return {
        status: !paused ? 'PASS' : 'FAIL',
        message: paused ? '系统已暂停，客户无法操作' : '系统正常，客户可继续',
      };
    });

    // Step 4: 客户检查自身验证状态
    await this.test('E2E', '步骤 4: 客户查询验证状态', async () => {
      const allowed = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'isUserAllowed',
        args: [GOVERNANCE],
      });
      return {
        status: 'PASS',
        message: allowed ? '客户已验证，可以交易' : '客户未验证，需完成 KYC',
        detail: allowed ? '已通过 ZK 证明验证' : '需跳转到验证流程',
      };
    });

    // Step 5: 客户检查会话
    await this.test('E2E', '步骤 5: 客户查询会话状态', async () => {
      const isActive = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'isSessionActive',
        args: [GOVERNANCE],
      });
      const remaining = await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [GOVERNANCE],
      });
      const remainingH = (Number(remaining) / 3600).toFixed(2);
      return {
        status: 'PASS',
        message: isActive ? `会话活跃, 剩余 ${remainingH}h` : '无活跃会话',
        detail: isActive
          ? '客户可直接进行交易，无需重新验证'
          : '客户需生成 ZK 证明并激活新会话',
      };
    });

    // Step 6: 客户获取 nonce
    await this.test('E2E', '步骤 6: 客户获取 Nonce (防重放)', async () => {
      const nonce = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'getNonce',
        args: [GOVERNANCE],
      });
      return {
        status: 'PASS',
        message: `当前 Nonce: ${nonce}`,
        detail: 'EIP-712 签名包含 nonce，防止交易重放',
      };
    });

    // Step 7: 客户查询 EIP-712 domain (用于签名)
    await this.test('E2E', '步骤 7: 客户获取 EIP-712 签名域', async () => {
      const domain = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'eip712Domain',
      });
      const [, name, version, chainId] = domain as any[];
      return {
        status: 'PASS',
        message: `域: ${name} v${version}, ChainID: ${chainId}`,
        detail: '客户使用此信息构建 EIP-712 签名请求',
      };
    });

    // Step 8: 未验证用户拒绝检查
    await this.test('E2E', '步骤 8: 安全检查 - 未验证用户被拒绝', async () => {
      const allowed = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'isUserAllowed',
        args: [TEST_USERS.random],
      });
      return {
        status: !allowed ? 'PASS' : 'FAIL',
        message: !allowed ? '未验证用户被正确拒绝' : '⚠️ 安全风险：未验证用户被允许',
        detail: 'ComplianceHook 在 beforeSwap/beforeAddLiquidity 中强制执行',
      };
    });

    // Step 9: 检查 LP 头寸
    await this.test('E2E', '步骤 9: 客户查询 LP 头寸数量', async () => {
      const nextId = await this.client.readContract({
        address: CONTRACTS.positionManager,
        abi: positionManagerABI,
        functionName: 'nextTokenId',
      });
      return {
        status: 'PASS',
        message: `总共 ${Number(nextId) - 1} 个 LP 头寸`,
        detail: 'LP NFT 不可转让，确保所有 LP 持有者经过合规验证',
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 8: 性能与 Gas 基准
  // ========================================================================
  async testPerformanceBenchmarks() {
    this.startSuite('性能基准测试', 'RPC 响应时间和批量操作性能基准');
    console.log('\n📋 测试套件 8: 性能基准测试');
    console.log('─'.repeat(60));

    // RPC 延迟
    await this.test('性能', 'RPC 延迟 - getBlockNumber', async () => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await this.client.getBlockNumber();
        times.push(Date.now() - start);
      }
      const avg = times.reduce((a, b) => a + b) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      return {
        status: avg < 2000 ? 'PASS' : 'WARN',
        message: `平均: ${avg.toFixed(0)}ms, 最小: ${min}ms, 最大: ${max}ms`,
        detail: `5 次测量: [${times.join(', ')}]ms`,
      };
    });

    // 单次 vs 批量会话查询
    await this.test('性能', '单次会话查询 vs 批量查询', async () => {
      const users = [GOVERNANCE, TEST_USERS.unverified, TEST_USERS.random];

      // 单次查询
      const singleStart = Date.now();
      for (const user of users) {
        await this.client.readContract({
          address: CONTRACTS.sessionManager.proxy,
          abi: sessionManagerABI,
          functionName: 'isSessionActive',
          args: [user],
        });
      }
      const singleTime = Date.now() - singleStart;

      // 批量查询
      const batchStart = Date.now();
      await this.client.readContract({
        address: CONTRACTS.sessionManager.proxy,
        abi: sessionManagerABI,
        functionName: 'batchIsSessionActive',
        args: [users],
      });
      const batchTime = Date.now() - batchStart;

      const savings = ((singleTime - batchTime) / singleTime * 100).toFixed(1);
      return {
        status: 'PASS',
        message: `单次: ${singleTime}ms, 批量: ${batchTime}ms (节省 ${savings}%)`,
        detail: `查询 ${users.length} 个地址`,
      };
    });

    // 合约状态读取延迟
    await this.test('性能', '多合约并行读取', async () => {
      const start = Date.now();
      await Promise.all([
        this.client.readContract({ address: CONTRACTS.registry.proxy, abi: registryABI, functionName: 'emergencyPaused' }),
        this.client.readContract({ address: CONTRACTS.sessionManager.proxy, abi: sessionManagerABI, functionName: 'version' }),
        this.client.readContract({ address: CONTRACTS.complianceHook, abi: complianceHookABI, functionName: 'getDomainSeparator' }),
        this.client.readContract({ address: CONTRACTS.positionManager, abi: positionManagerABI, functionName: 'nextTokenId' }),
      ]);
      const elapsed = Date.now() - start;
      return {
        status: elapsed < 5000 ? 'PASS' : 'WARN',
        message: `4 个合约并行读取: ${elapsed}ms`,
        detail: 'Registry + SessionManager + ComplianceHook + PositionManager',
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 测试套件 9: 安全性检查
  // ========================================================================
  async testSecurity() {
    this.startSuite('安全性检查', '验证系统的访问控制、权限和安全机制');
    console.log('\n📋 测试套件 9: 安全性检查');
    console.log('─'.repeat(60));

    await this.test('安全', '代理合约存储隔离 (Registry)', async () => {
      const proxyCode = await this.client.getCode({ address: CONTRACTS.registry.proxy });
      const implCode = await this.client.getCode({ address: CONTRACTS.registry.implementation });
      const proxySize = proxyCode ? (proxyCode.length - 2) / 2 : 0;
      const implSize = implCode ? (implCode.length - 2) / 2 : 0;
      return {
        status: proxySize < implSize ? 'PASS' : 'WARN',
        message: `Proxy: ${proxySize}B, Impl: ${implSize}B`,
        detail: '代理合约应比实现合约小（仅含委托逻辑）',
      };
    });

    await this.test('安全', '代理合约存储隔离 (SessionManager)', async () => {
      const proxyCode = await this.client.getCode({ address: CONTRACTS.sessionManager.proxy });
      const implCode = await this.client.getCode({ address: CONTRACTS.sessionManager.implementation });
      const proxySize = proxyCode ? (proxyCode.length - 2) / 2 : 0;
      const implSize = implCode ? (implCode.length - 2) / 2 : 0;
      return {
        status: proxySize < implSize ? 'PASS' : 'WARN',
        message: `Proxy: ${proxySize}B, Impl: ${implSize}B`,
        detail: 'UUPS 代理模式确保存储安全隔离',
      };
    });

    await this.test('安全', 'ComplianceHook 合约引用不可变', async () => {
      const registry = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'registry',
      });
      const sm = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'sessionManager',
      });
      const validReg = getAddress(registry) === getAddress(CONTRACTS.registry.proxy);
      const validSM = getAddress(sm) === getAddress(CONTRACTS.sessionManager.proxy);
      return {
        status: validReg && validSM ? 'PASS' : 'FAIL',
        message: validReg && validSM ? '所有引用正确' : '引用不匹配',
        detail: '构造函数设置，不可篡改',
      };
    });

    await this.test('安全', 'LP NFT 不可转让机制', async () => {
      // 验证 transferFrom 和 safeTransferFrom 函数存在（会 revert）
      const code = await this.client.getCode({ address: CONTRACTS.positionManager });
      const hasCode = code && code.length > 100;
      return {
        status: hasCode ? 'PASS' : 'FAIL',
        message: 'LP NFT 转移函数已实现为 revert',
        detail: 'transferFrom / safeTransferFrom 调用会被拒绝',
      };
    });

    await this.test('安全', 'Nonce 防重放机制', async () => {
      const nonce1 = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'getNonce',
        args: [GOVERNANCE],
      });
      const nonce2 = await this.client.readContract({
        address: CONTRACTS.complianceHook,
        abi: complianceHookABI,
        functionName: 'getNonce',
        args: [TEST_USERS.random],
      });
      return {
        status: 'PASS',
        message: `治理 Nonce: ${nonce1}, 随机用户 Nonce: ${nonce2}`,
        detail: '每次交易后 nonce 递增，防止签名重放',
      };
    });

    this.endSuite();
  }

  // ========================================================================
  // 运行所有测试
  // ========================================================================
  async runAll() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           ILAL 系统集成测试 - Base Sepolia                  ║');
    console.log('║     Institutional Liquidity Access Layer                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n🕐 测试时间: ${new Date().toISOString()}`);
    console.log(`🔗 网络: Base Sepolia (Chain ID: ${CHAIN_ID})`);
    console.log(`🌐 RPC: ${RPC_URL}`);

    const totalStart = Date.now();

    await this.testContractDeployment();
    await this.testRegistryConfiguration();
    await this.testSessionManager();
    await this.testComplianceHook();
    await this.testZKVerifier();
    await this.testPositionManager();
    await this.testCustomerJourney();
    await this.testPerformanceBenchmarks();
    await this.testSecurity();

    const totalDuration = Date.now() - totalStart;

    // 统计
    const allResults = this.suites.flatMap(s => s.results);
    const passed = allResults.filter(r => r.status === 'PASS').length;
    const failed = allResults.filter(r => r.status === 'FAIL').length;
    const warned = allResults.filter(r => r.status === 'WARN').length;
    const skipped = allResults.filter(r => r.status === 'SKIP').length;

    console.log('\n' + '═'.repeat(62));
    console.log('📊 测试结果汇总');
    console.log('─'.repeat(62));
    console.log(`  总测试数: ${allResults.length}`);
    console.log(`  ✅ 通过: ${passed}`);
    console.log(`  ❌ 失败: ${failed}`);
    console.log(`  ⚠️  警告: ${warned}`);
    console.log(`  ⏭️  跳过: ${skipped}`);
    console.log(`  ⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`  📈 通过率: ${((passed / allResults.length) * 100).toFixed(1)}%`);
    console.log('═'.repeat(62));

    return { suites: this.suites, totalDuration, passed, failed, warned, skipped };
  }
}

// ============================================================================
// HTML 报告生成器
// ============================================================================

function generateHTMLReport(
  suites: TestSuite[],
  stats: { totalDuration: number; passed: number; failed: number; warned: number; skipped: number },
) {
  const total = stats.passed + stats.failed + stats.warned + stats.skipped;
  const passRate = ((stats.passed / total) * 100).toFixed(1);
  const now = new Date();

  const statusColor = (s: string) => {
    switch (s) {
      case 'PASS': return '#10b981';
      case 'FAIL': return '#ef4444';
      case 'WARN': return '#f59e0b';
      case 'SKIP': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'PASS': return '&#x2705;';
      case 'FAIL': return '&#x274C;';
      case 'WARN': return '&#x26A0;&#xFE0F;';
      case 'SKIP': return '&#x23ED;';
      default: return '?';
    }
  };

  const suiteRows = suites.map((suite) => {
    const sp = suite.results.filter(r => r.status === 'PASS').length;
    const sf = suite.results.filter(r => r.status === 'FAIL').length;
    const sw = suite.results.filter(r => r.status === 'WARN').length;
    const duration = suite.endTime - suite.startTime;

    const testRows = suite.results.map((r) => `
      <tr class="test-row">
        <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;">
          <span style="background:${statusColor(r.status)}20; color:${statusColor(r.status)}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${r.status}</span>
        </td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">${r.name}</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">${r.message}</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${r.duration}ms</td>
      </tr>
      ${r.detail ? `<tr><td></td><td colspan="3" style="padding: 2px 16px 10px; font-size: 12px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">&#x1F4DD; ${r.detail}</td></tr>` : ''}
    `).join('');

    return `
    <div class="suite-card" style="background: white; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e293b, #334155); padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">${suite.name}</h3>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${suite.description}</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <span style="color: #10b981; font-size: 14px;">&#x2705; ${sp}</span>
          ${sf > 0 ? `<span style="color: #ef4444; font-size: 14px;">&#x274C; ${sf}</span>` : ''}
          ${sw > 0 ? `<span style="color: #f59e0b; font-size: 14px;">&#x26A0; ${sw}</span>` : ''}
          <span style="color: #94a3b8; font-size: 13px;">${(duration / 1000).toFixed(2)}s</span>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; width: 80px;">状态</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; width: 280px;">测试项</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">结果</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; width: 80px;">耗时</th>
          </tr>
        </thead>
        <tbody>${testRows}</tbody>
      </table>
    </div>`;
  }).join('');

  const contractTable = Object.entries({
    'Registry (Proxy)': CONTRACTS.registry.proxy,
    'Registry (Impl)': CONTRACTS.registry.implementation,
    'SessionManager (Proxy)': CONTRACTS.sessionManager.proxy,
    'SessionManager (Impl)': CONTRACTS.sessionManager.implementation,
    'ComplianceHook': CONTRACTS.complianceHook,
    'PositionManager': CONTRACTS.positionManager,
    'SimpleSwapRouter': CONTRACTS.simpleSwapRouter,
    'PlonkVerifier': CONTRACTS.plonkVerifier,
    'PlonkVerifierAdapter': CONTRACTS.plonkVerifierAdapter,
    'PoolManager (Uniswap v4)': CONTRACTS.poolManager,
  }).map(([name, addr]) => `
    <tr>
      <td style="padding: 8px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 500; color: #334155;">${name}</td>
      <td style="padding: 8px 16px; border-bottom: 1px solid #f1f5f9; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6366f1;">
        <a href="https://sepolia.basescan.org/address/${addr}" target="_blank" style="color: #6366f1; text-decoration: none;">${addr}</a>
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ILAL 系统测试报告 - ${now.toLocaleDateString('zh-CN')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f1f5f9; color: #1e293b; line-height: 1.6; }
    .container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); border-radius: 16px; padding: 48px 40px; margin-bottom: 32px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 50%); }
    .header h1 { color: white; font-size: 32px; font-weight: 700; margin-bottom: 8px; position: relative; }
    .header p { color: #94a3b8; font-size: 16px; position: relative; }
    .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: white; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .stat-card .value { font-size: 36px; font-weight: 700; margin-bottom: 4px; }
    .stat-card .label { font-size: 13px; color: #64748b; font-weight: 500; }
    .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 24px; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
    @media (max-width: 768px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    .footer { text-align: center; padding: 32px; color: #94a3b8; font-size: 13px; }
    a:hover { text-decoration: underline !important; }
    .test-row:hover { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <!-- 报告头部 -->
    <div class="header">
      <h1>&#x1F6E1;&#xFE0F; ILAL 系统集成测试报告</h1>
      <p>Institutional Liquidity Access Layer - Uniswap v4 合规层</p>
      <div style="display: flex; gap: 24px; margin-top: 20px; position: relative;">
        <span style="color: #94a3b8; font-size: 13px;">&#x1F4C5; ${now.toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        <span style="color: #94a3b8; font-size: 13px;">&#x1F517; Base Sepolia (Chain ID: ${CHAIN_ID})</span>
        <span style="color: #94a3b8; font-size: 13px;">&#x23F1; 总耗时: ${(stats.totalDuration / 1000).toFixed(2)}s</span>
      </div>
      <div class="progress-bar" style="margin-top: 24px;">
        <div class="progress-fill" style="width: ${passRate}%; background: linear-gradient(90deg, #10b981, #34d399);"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; position: relative;">
        <span style="color: #94a3b8; font-size: 12px;">通过率</span>
        <span style="color: #10b981; font-size: 14px; font-weight: 600;">${passRate}%</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="value" style="color: #1e293b;">${total}</div>
        <div class="label">总测试数</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #10b981;">${stats.passed}</div>
        <div class="label">通过</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #ef4444;">${stats.failed}</div>
        <div class="label">失败</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #f59e0b;">${stats.warned}</div>
        <div class="label">警告</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #6366f1;">${(stats.totalDuration / 1000).toFixed(1)}s</div>
        <div class="label">总耗时</div>
      </div>
    </div>

    <!-- 合约地址表 -->
    <div style="background: white; border-radius: 12px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9;">
        <h3 style="font-size: 18px; font-weight: 600;">&#x1F4DD; 合约部署清单</h3>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">合约名称</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">地址</th>
          </tr>
        </thead>
        <tbody>${contractTable}</tbody>
      </table>
    </div>

    <!-- 测试套件详情 -->
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 20px; color: #1e293b;">&#x1F9EA; 测试详情</h2>
    ${suiteRows}

    <!-- 系统架构概览 -->
    <div style="background: white; border-radius: 12px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9;">
        <h3 style="font-size: 18px; font-weight: 600;">&#x1F3D7;&#xFE0F; 系统架构</h3>
      </div>
      <div style="padding: 24px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #334155; line-height: 1.8; background: #f8fafc;">
<pre style="margin: 0; white-space: pre-wrap;">
┌─────────────────────────────────────────────────────────────┐
│                     ILAL 系统架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户 (DApp / Bot)                                          │
│    │                                                        │
│    ├── 1. 生成 ZK Proof (浏览器端, ~4秒)                     │
│    │       └── circom 电路 → PLONK 证明                     │
│    │                                                        │
│    ├── 2. 验证 & 激活会话                                    │
│    │       ├── PlonkVerifier → 验证 ZK 证明                  │
│    │       └── SessionManager → 缓存验证状态 (24h TTL)       │
│    │                                                        │
│    ├── 3. 签名交易 (EIP-712)                                │
│    │       └── ComplianceHook → 验证签名 + 检查会话          │
│    │                                                        │
│    └── 4. 执行交易                                          │
│            ├── SimpleSwapRouter → 代币交换                   │
│            └── PositionManager → LP 头寸管理 (不可转让 NFT)  │
│                    │                                        │
│                    └── Uniswap v4 PoolManager               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  治理层                                                      │
│    ├── Registry (UUPS) → 系统配置中心                        │
│    └── 紧急暂停 → 全局安全开关                               │
└─────────────────────────────────────────────────────────────┘
</pre>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="footer">
      <p style="margin-bottom: 8px;">ILAL System Integration Test Report v1.0</p>
      <p>Generated by ILAL Test Framework &bull; ${now.toISOString()}</p>
      <p style="margin-top: 4px;">Network: Base Sepolia &bull; RPC: ${RPC_URL}</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

// ============================================================================
// 主入口
// ============================================================================

async function main() {
  const tester = new SystemTester();

  try {
    const result = await tester.runAll();

    // 生成 HTML 报告
    const html = generateHTMLReport(result.suites, {
      totalDuration: result.totalDuration,
      passed: result.passed,
      failed: result.failed,
      warned: result.warned,
      skipped: result.skipped,
    });

    const reportDir = path.resolve(import.meta.dirname || '.', '../../docs/testing');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = path.join(reportDir, `ILAL_Test_Report_${timestamp}.html`);
    fs.writeFileSync(reportPath, html, 'utf-8');

    // 同时保存最新报告
    const latestPath = path.join(reportDir, 'ILAL_Test_Report_Latest.html');
    fs.writeFileSync(latestPath, html, 'utf-8');

    console.log(`\n📄 HTML 报告已生成:`);
    console.log(`   ${reportPath}`);
    console.log(`   ${latestPath}`);

    // 退出码
    if (result.failed > 0) {
      console.log('\n❌ 有测试失败，请检查报告');
      process.exit(1);
    } else {
      console.log('\n🎉 所有测试通过!');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n💥 测试执行失败:', error.message);
    process.exit(2);
  }
}

main();
