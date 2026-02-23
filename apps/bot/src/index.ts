import { CronJob } from 'cron';
import { config } from './config.js';
import { log } from './logger.js';
import { botAddress } from './contracts.js';
import { checkSession, ensureActiveSession, formatRemainingTime } from './session.js';
import { getPositions, checkRebalanceNeeded, rebalance } from './liquidity.js';
import { getCurrentTick, checkArbitrageOpportunity, executeSwap } from './swap.js';
import { initTelegram, alerts } from './telegram.js';

// ============ 主循环 ============

let isRunning = false;
let lastRebalanceTime = 0;

/**
 * 健康检查
 */
async function healthCheck(): Promise<void> {
  try {
    const sessionStatus = await checkSession();
    
    log.info('健康检查', {
      address: botAddress,
      sessionActive: sessionStatus.isActive,
      sessionRemaining: formatRemainingTime(sessionStatus.remainingSeconds),
    });

    // 如果 Session 需要续期，发送告警
    if (sessionStatus.needsRenewal) {
      const remainingMinutes = Math.floor(sessionStatus.remainingSeconds / 60);
      await alerts.sessionExpiring(remainingMinutes);
    }
  } catch (error) {
    log.error('健康检查失败', { error: String(error) });
    await alerts.operationFailed('健康检查', String(error));
  }
}

/**
 * Session 管理任务
 */
async function sessionTask(): Promise<void> {
  try {
    await ensureActiveSession();
  } catch (error) {
    log.error('Session 管理任务失败', { error: String(error) });
    await alerts.operationFailed('Session 管理', String(error));
  }
}

/**
 * 流动性管理任务
 */
async function liquidityTask(): Promise<void> {
  try {
    const positions = await getPositions();
    
    if (positions.length === 0) {
      log.debug('无持仓，跳过流动性管理');
      return;
    }

    // 检查每个持仓是否需要再平衡
    for (const position of positions) {
      // 从链上获取当前 tick
      const currentTick = await getCurrentTick(position.pool);
      
      const needsRebalance = await checkRebalanceNeeded(position, currentTick);
      
      if (needsRebalance) {
        // 检查再平衡间隔
        const now = Date.now();
        if (now - lastRebalanceTime < config.strategy.rebalance.minInterval * 1000) {
          log.debug('再平衡间隔未到，跳过', {
            tokenId: position.tokenId.toString(),
            remainingSeconds: Math.floor((config.strategy.rebalance.minInterval * 1000 - (now - lastRebalanceTime)) / 1000),
          });
          continue;
        }

        await alerts.rebalanceTriggered(
          position.tokenId.toString(),
          '价格偏离超过阈值'
        );
        
        await rebalance(position, currentTick);
        lastRebalanceTime = now;
      }
    }
  } catch (error) {
    log.error('流动性管理任务失败', { error: String(error) });
    await alerts.operationFailed('流动性管理', String(error));
  }
}

/**
 * 启动 Bot
 */
async function start(): Promise<void> {
  log.info('========================================');
  log.info('ILAL Market Maker Bot 启动中...');
  log.info('========================================');
  log.info('配置信息', {
    chainId: config.network.chainId,
    address: botAddress,
    pools: config.strategy.pools.map(p => p.id),
  });

  // 初始化 Telegram
  initTelegram();

  // 发送启动告警
  await alerts.botStarted();

  // 初始健康检查
  await healthCheck();

  // 确保 Session 有效
  try {
    await ensureActiveSession();
    log.info('Session 检查完成');
  } catch (error) {
    log.error('初始 Session 检查失败', { error: String(error) });
    // 继续运行，后续任务会重试
  }

  isRunning = true;

  // 初始检查持仓
  try {
    const positions = await getPositions();
    log.info('当前持仓', { count: positions.length });
  } catch (error) {
    log.warn('获取持仓失败', { error: String(error) });
  }

  // 设置定时任务
  // 健康检查 - 每分钟
  const healthJob = new CronJob(
    `*/${Math.floor(config.monitoring.healthCheckInterval / 60)} * * * *`,
    healthCheck,
    null,
    true
  );

  // Session 管理 - 每 5 分钟
  const sessionJob = new CronJob(
    '*/5 * * * *',
    sessionTask,
    null,
    true
  );

  // 流动性管理 - 每分钟
  const liquidityJob = new CronJob(
    '* * * * *',
    liquidityTask,
    null,
    true
  );

  log.info('定时任务已启动');
  log.info('  - 健康检查: 每 ' + config.monitoring.healthCheckInterval + ' 秒');
  log.info('  - Session 管理: 每 5 分钟');
  log.info('  - 流动性管理: 每分钟');

  // 优雅退出处理
  process.on('SIGINT', async () => {
    log.info('收到 SIGINT 信号，正在停止...');
    isRunning = false;
    healthJob.stop();
    sessionJob.stop();
    liquidityJob.stop();
    await alerts.botStopped('收到 SIGINT 信号');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log.info('收到 SIGTERM 信号，正在停止...');
    isRunning = false;
    healthJob.stop();
    sessionJob.stop();
    liquidityJob.stop();
    await alerts.botStopped('收到 SIGTERM 信号');
    process.exit(0);
  });

  // 保持进程运行
  log.info('Bot 运行中... 按 Ctrl+C 停止');
}

// 启动
start().catch((error) => {
  log.error('Bot 启动失败', { error: String(error) });
  process.exit(1);
});
