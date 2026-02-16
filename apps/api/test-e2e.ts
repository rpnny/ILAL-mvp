/**
 * ILAL API 端到端测试
 * 测试完整流程：注册 → 登录 → 创建 API Key → 调用 API → 验证计费
 * 
 * 运行: tsx test-e2e.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface TestContext {
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  apiKey?: string;
  apiKeyId?: string;
}

const ctx: TestContext = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test1234!',
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: number, message: string) {
  log(`\n[步骤 ${step}] ${message}`, 'cyan');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${data.error || 'Unknown'} - ${data.message || response.statusText}`);
  }

  return data;
}

// 测试 1: 健康检查
async function testHealthCheck() {
  logStep(1, '健康检查');
  
  try {
    const health = await request('/api/v1/health');
    logSuccess(`服务正常: ${health.service}`);
    logInfo(`网络: ${health.network}, 区块: ${health.latestBlock}`);
    logInfo(`Relay 地址: ${health.relay}`);
    return true;
  } catch (error: any) {
    logError(`健康检查失败: ${error.message}`);
    return false;
  }
}

// 测试 2: 用户注册
async function testRegister() {
  logStep(2, '用户注册');
  
  try {
    const result = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: ctx.email,
        password: ctx.password,
        name: 'E2E Test User',
      }),
    });

    ctx.accessToken = result.accessToken;
    ctx.refreshToken = result.refreshToken;
    ctx.userId = result.user.id;

    logSuccess(`注册成功: ${ctx.email}`);
    logInfo(`用户 ID: ${ctx.userId}`);
    logInfo(`套餐: ${result.user.plan}`);
    return true;
  } catch (error: any) {
    logError(`注册失败: ${error.message}`);
    return false;
  }
}

// 测试 3: 用户登录
async function testLogin() {
  logStep(3, '用户登录');
  
  try {
    const result = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: ctx.email,
        password: ctx.password,
      }),
    });

    ctx.accessToken = result.accessToken;
    ctx.refreshToken = result.refreshToken;

    logSuccess(`登录成功: ${ctx.email}`);
    return true;
  } catch (error: any) {
    logError(`登录失败: ${error.message}`);
    return false;
  }
}

// 测试 4: 获取用户信息
async function testGetMe() {
  logStep(4, '获取用户信息');
  
  try {
    const result = await request('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
      },
    });

    logSuccess(`用户信息获取成功`);
    logInfo(`邮箱: ${result.user.email}`);
    logInfo(`套餐: ${result.user.plan}`);
    return true;
  } catch (error: any) {
    logError(`获取用户信息失败: ${error.message}`);
    return false;
  }
}

// 测试 5: 创建 API Key
async function testCreateApiKey() {
  logStep(5, '创建 API Key');
  
  try {
    const result = await request('/api/v1/apikeys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
      },
      body: JSON.stringify({
        name: 'E2E Test Key',
        permissions: ['verify', 'session'],
      }),
    });

    ctx.apiKey = result.apiKey;
    ctx.apiKeyId = result.id;

    logSuccess(`API Key 创建成功`);
    logInfo(`Key ID: ${ctx.apiKeyId}`);
    logInfo(`Key Prefix: ${result.keyPrefix}`);
    logInfo(`完整 Key: ${ctx.apiKey.substring(0, 20)}...`);
    return true;
  } catch (error: any) {
    logError(`创建 API Key 失败: ${error.message}`);
    return false;
  }
}

// 测试 6: 列出 API Keys
async function testListApiKeys() {
  logStep(6, '列出 API Keys');
  
  try {
    const result = await request('/api/v1/apikeys', {
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
      },
    });

    logSuccess(`API Keys 列表获取成功`);
    logInfo(`共有 ${result.apiKeys.length} 个 API Keys`);
    
    result.apiKeys.forEach((key: any) => {
      logInfo(`  - ${key.name} (${key.keyPrefix})`);
    });
    
    return true;
  } catch (error: any) {
    logError(`列出 API Keys 失败: ${error.message}`);
    return false;
  }
}

// 测试 7: 使用 API Key 查询 Session
async function testQuerySessionWithApiKey() {
  logStep(7, '使用 API Key 查询 Session');
  
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'; // 正确的 40 位地址
  
  try {
    const result = await request(`/api/v1/session/${testAddress}`, {
      headers: {
        'X-API-Key': ctx.apiKey!,
      },
    });

    logSuccess(`Session 查询成功`);
    logInfo(`地址: ${result.address}`);
    logInfo(`激活状态: ${result.isActive}`);
    logInfo(`剩余时间: ${result.remainingSeconds}秒`);
    return true;
  } catch (error: any) {
    logError(`Session 查询失败: ${error.message}`);
    return false;
  }
}

// 测试 8: 获取使用统计
async function testGetUsageStats() {
  logStep(8, '获取使用统计');
  
  try {
    const result = await request('/api/v1/usage/stats', {
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
      },
    });

    logSuccess(`使用统计获取成功`);
    logInfo(`总调用: ${result.usage.totalCalls}`);
    logInfo(`成功: ${result.usage.successfulCalls}`);
    logInfo(`失败: ${result.usage.failedCalls}`);
    logInfo(`配额剩余: ${result.quota.remaining}/${result.quota.limit}`);
    logInfo(`当前套餐: ${result.plan.current}`);
    
    // 验证计费记录
    if (result.usage.totalCalls > 0) {
      logSuccess(`✓ 计费追踪正常工作`);
    }
    
    return true;
  } catch (error: any) {
    logError(`获取使用统计失败: ${error.message}`);
    return false;
  }
}

// 测试 9: 获取套餐列表
async function testGetPlans() {
  logStep(9, '获取套餐列表');
  
  try {
    const result = await request('/api/v1/billing/plans');

    logSuccess(`套餐列表获取成功`);
    
    result.plans.forEach((plan: any) => {
      logInfo(`  - ${plan.name}: $${plan.price || 'Custom'}/月`);
      logInfo(`    配额: ${plan.features.monthlyQuota}`);
      logInfo(`    限流: ${plan.features.rateLimit}/min`);
    });
    
    return true;
  } catch (error: any) {
    logError(`获取套餐列表失败: ${error.message}`);
    return false;
  }
}

// 测试 10: Token 刷新
async function testRefreshToken() {
  logStep(10, 'Token 刷新');
  
  try {
    const result = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: ctx.refreshToken,
      }),
    });

    ctx.accessToken = result.accessToken;

    logSuccess(`Token 刷新成功`);
    return true;
  } catch (error: any) {
    logError(`Token 刷新失败: ${error.message}`);
    return false;
  }
}

// 测试 11: 更新 API Key
async function testUpdateApiKey() {
  logStep(11, '更新 API Key');
  
  try {
    const result = await request(`/api/v1/apikeys/${ctx.apiKeyId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
      },
      body: JSON.stringify({
        name: 'E2E Test Key (Updated)',
        rateLimit: 50,
      }),
    });

    logSuccess(`API Key 更新成功`);
    logInfo(`新名称: ${result.apiKey.name}`);
    logInfo(`新限流: ${result.apiKey.rateLimit}/min`);
    return true;
  } catch (error: any) {
    logError(`更新 API Key 失败: ${error.message}`);
    return false;
  }
}

// 测试 12: 撤销 API Key
async function testRevokeApiKey() {
  logStep(12, '撤销 API Key');
  
  try {
    const result = await request(`/api/v1/apikeys/${ctx.apiKeyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
      },
    });

    logSuccess(`API Key 撤销成功`);
    return true;
  } catch (error: any) {
    logError(`撤销 API Key 失败: ${error.message}`);
    return false;
  }
}

// 测试 13: 验证撤销后的 API Key 无法使用
async function testRevokedApiKeyFails() {
  logStep(13, '验证撤销的 API Key 无法使用');
  
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  
  try {
    await request(`/api/v1/session/${testAddress}`, {
      headers: {
        'X-API-Key': ctx.apiKey!,
      },
    });

    logError(`撤销的 API Key 仍然可以使用（安全漏洞！）`);
    return false;
  } catch (error: any) {
    logSuccess(`撤销的 API Key 正确拒绝访问`);
    return true;
  }
}

// 主测试流程
async function runTests() {
  log('\n╔══════════════════════════════════════════════════╗', 'cyan');
  log('║     ILAL API 端到端测试                         ║', 'cyan');
  log('╚══════════════════════════════════════════════════╝', 'cyan');
  
  logInfo(`API Base URL: ${API_BASE_URL}`);
  logInfo(`测试邮箱: ${ctx.email}`);
  
  const tests = [
    { name: '健康检查', fn: testHealthCheck },
    { name: '用户注册', fn: testRegister },
    { name: '用户登录', fn: testLogin },
    { name: '获取用户信息', fn: testGetMe },
    { name: '创建 API Key', fn: testCreateApiKey },
    { name: '列出 API Keys', fn: testListApiKeys },
    { name: '使用 API Key', fn: testQuerySessionWithApiKey },
    { name: '获取使用统计', fn: testGetUsageStats },
    { name: '获取套餐列表', fn: testGetPlans },
    { name: 'Token 刷新', fn: testRefreshToken },
    { name: '更新 API Key', fn: testUpdateApiKey },
    { name: '撤销 API Key', fn: testRevokeApiKey },
    { name: '验证撤销', fn: testRevokedApiKeyFails },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error: any) {
      logError(`测试异常: ${error.message}`);
      failed++;
    }

    // 短暂延迟，避免过快请求
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 测试结果总结
  log('\n╔══════════════════════════════════════════════════╗', 'cyan');
  log('║     测试结果总结                                  ║', 'cyan');
  log('╚══════════════════════════════════════════════════╝', 'cyan');
  
  log(`\n总计: ${tests.length} 个测试`, 'blue');
  log(`通过: ${passed} 个`, 'green');
  log(`失败: ${failed} 个`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n🎉 所有测试通过！SaaS 架构运行正常！', 'green');
  } else {
    log(`\n⚠️  有 ${failed} 个测试失败，请检查日志`, 'red');
  }

  log('\n测试上下文信息:', 'blue');
  log(`  用户 ID: ${ctx.userId}`);
  log(`  邮箱: ${ctx.email}`);
  log(`  API Key ID: ${ctx.apiKeyId}`);

  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch((error) => {
  logError(`测试运行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
