/**
 * 配置验证和测试脚本
 * 验证机器人配置是否正确，无需真实私钥
 */

import { config } from './config.js';
import { log } from './logger.js';

async function testConfiguration() {
  log.info('========================================');
  log.info('ILAL Market Maker Bot - 配置测试');
  log.info('========================================\n');

  let hasErrors = false;

  // 1. 检查网络配置
  log.info('1️⃣ 网络配置检查');
  if (!config.network.chainId) {
    log.error('  ❌ chainId 未配置');
    hasErrors = true;
  } else {
    log.info(`  ✅ Chain ID: ${config.network.chainId}`);
  }

  if (!config.network.rpcUrl || config.network.rpcUrl.includes('${')) {
    log.warn('  ⚠️ RPC URL 未配置（需要设置环境变量 RPC_URL）');
  } else {
    log.info(`  ✅ RPC URL: ${config.network.rpcUrl.substring(0, 30)}...`);
  }

  // 2. 检查合约地址
  log.info('\n2️⃣ 合约地址检查');
  const contracts = [
    { name: 'Registry', address: config.contracts.registry },
    { name: 'SessionManager', address: config.contracts.sessionManager },
    { name: 'ComplianceHook', address: config.contracts.complianceHook },
    { name: 'PositionManager', address: config.contracts.positionManager },
    { name: 'PoolManager', address: config.contracts.poolManager },
    { name: 'SimpleSwapRouter', address: config.contracts.simpleSwapRouter },
  ];

  for (const contract of contracts) {
    if (!contract.address || contract.address === '0x0000000000000000000000000000000000000000') {
      log.error(`  ❌ ${contract.name}: 未配置`);
      hasErrors = true;
    } else if (!contract.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      log.error(`  ❌ ${contract.name}: 地址格式无效`);
      hasErrors = true;
    } else {
      log.info(`  ✅ ${contract.name}: ${contract.address.substring(0, 10)}...`);
    }
  }

  // 3. 检查钱包配置
  log.info('\n3️⃣ 钱包配置检查');
  if (!config.wallet.privateKey || config.wallet.privateKey.includes('${')) {
    log.warn('  ⚠️ 私钥未配置（需要设置环境变量 PRIVATE_KEY）');
    log.info('  ℹ️ 提示: 在 .env 文件中设置 PRIVATE_KEY');
  } else if (config.wallet.privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    log.warn('  ⚠️ 使用占位符私钥（请替换为真实私钥）');
  } else {
    log.info('  ✅ 私钥已配置');
  }

  // 4. 检查策略配置
  log.info('\n4️⃣ 策略配置检查');
  if (!config.strategy.pools || config.strategy.pools.length === 0) {
    log.error('  ❌ 未配置交易池');
    hasErrors = true;
  } else {
    log.info(`  ✅ 配置了 ${config.strategy.pools.length} 个交易池:`);
    for (const pool of config.strategy.pools) {
      log.info(`     - ${pool.id} (fee: ${pool.fee})`);
      
      // 验证 token 地址
      if (!pool.token0.match(/^0x[a-fA-F0-9]{40}$/)) {
        log.error(`       ❌ token0 地址无效: ${pool.token0}`);
        hasErrors = true;
      }
      if (!pool.token1.match(/^0x[a-fA-F0-9]{40}$/)) {
        log.error(`       ❌ token1 地址无效: ${pool.token1}`);
        hasErrors = true;
      }
      
      // 验证 token0 < token1（Uniswap v4 要求）
      if (pool.token0.toLowerCase() >= pool.token1.toLowerCase()) {
        log.error(`       ❌ token0 必须小于 token1 (按地址排序)`);
        hasErrors = true;
      }
    }
  }

  if (config.strategy.priceRange) {
    log.info(`  ✅ 价格范围: ${config.strategy.priceRange.lower} - ${config.strategy.priceRange.upper}`);
  }

  if (config.strategy.rebalance) {
    log.info(`  ✅ 再平衡阈值: ${config.strategy.rebalance.priceDeviationThreshold * 100}%`);
    log.info(`  ✅ 最小间隔: ${config.strategy.rebalance.minInterval}s`);
  }

  // 5. 检查 Session 配置
  log.info('\n5️⃣ Session 配置检查');
  log.info(`  ✅ 续期阈值: ${config.session.renewThreshold}s`);
  log.info(`  ✅ Session 时长: ${config.session.duration}s`);

  // 6. 检查监控配置
  log.info('\n6️⃣ 监控配置检查');
  log.info(`  ✅ 健康检查间隔: ${config.monitoring.healthCheckInterval}s`);
  log.info(`  ✅ 价格检查间隔: ${config.monitoring.priceCheckInterval}s`);

  // 7. 检查 Telegram 配置
  log.info('\n7️⃣ Telegram 告警配置');
  if (config.telegram.enabled) {
    if (!config.telegram.botToken || config.telegram.botToken.includes('${')) {
      log.warn('  ⚠️ Telegram Bot Token 未配置');
    } else {
      log.info('  ✅ Bot Token 已配置');
    }
    
    if (!config.telegram.chatId || config.telegram.chatId.includes('${')) {
      log.warn('  ⚠️ Telegram Chat ID 未配置');
    } else {
      log.info('  ✅ Chat ID 已配置');
    }
  } else {
    log.info('  ℹ️ Telegram 告警未启用');
  }

  // 8. 检查日志配置
  log.info('\n8️⃣ 日志配置检查');
  log.info(`  ✅ 日志级别: ${config.logging.level}`);
  log.info(`  ✅ 日志文件: ${config.logging.file}`);

  // 总结
  log.info('\n========================================');
  if (hasErrors) {
    log.error('❌ 配置验证失败！请修复上述错误后重试。');
    process.exit(1);
  } else {
    log.info('✅ 配置验证通过！');
    log.info('\n提示: 配置好 RPC_URL 和 PRIVATE_KEY 后即可运行:');
    log.info('  npm run start');
  }
  log.info('========================================');
}

// 运行测试
testConfiguration().catch((error) => {
  log.error('配置测试失败:', error);
  process.exit(1);
});
