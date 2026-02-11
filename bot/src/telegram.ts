import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { log } from './logger.js';

// ============ 类型 ============

export type AlertLevel = 'error' | 'warning' | 'info';

export interface Alert {
  level: AlertLevel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============ Telegram Bot ============

let bot: TelegramBot | null = null;

/**
 * 初始化 Telegram Bot
 */
export function initTelegram(): void {
  if (!config.telegram.enabled) {
    log.info('Telegram 告警已禁用');
    return;
  }

  if (!config.telegram.botToken || !config.telegram.chatId) {
    log.warn('Telegram 配置不完整，告警功能已禁用');
    return;
  }

  try {
    bot = new TelegramBot(config.telegram.botToken, { polling: false });
    log.info('Telegram Bot 初始化成功');
  } catch (error) {
    log.error('Telegram Bot 初始化失败', { error: String(error) });
  }
}

/**
 * 发送告警
 */
export async function sendAlert(alert: Alert): Promise<void> {
  // 检查告警级别
  const levels: AlertLevel[] = ['error', 'warning', 'info'];
  const configLevel = levels.indexOf(config.telegram.alertLevel);
  const alertLevel = levels.indexOf(alert.level);

  if (alertLevel > configLevel) {
    log.debug('告警级别低于配置，跳过发送', { 
      alertLevel: alert.level, 
      configLevel: config.telegram.alertLevel 
    });
    return;
  }

  // 构造消息
  const emoji = {
    error: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  }[alert.level];

  let text = `${emoji} *${alert.title}*\n\n${alert.message}`;

  if (alert.data) {
    text += '\n\n```\n';
    for (const [key, value] of Object.entries(alert.data)) {
      text += `${key}: ${JSON.stringify(value)}\n`;
    }
    text += '```';
  }

  // 发送消息
  if (bot) {
    try {
      await bot.sendMessage(config.telegram.chatId, text, {
        parse_mode: 'Markdown',
      });
      log.debug('Telegram 告警已发送', { title: alert.title });
    } catch (error) {
      log.error('发送 Telegram 告警失败', { error: String(error) });
    }
  } else {
    // 如果 bot 未初始化，只记录日志
    log.info(`[告警] ${alert.title}: ${alert.message}`, alert.data);
  }
}

// ============ 便捷方法 ============

export const alerts = {
  /**
   * 发送错误告警
   */
  error: (title: string, message: string, data?: Record<string, unknown>) =>
    sendAlert({ level: 'error', title, message, data }),

  /**
   * 发送警告告警
   */
  warning: (title: string, message: string, data?: Record<string, unknown>) =>
    sendAlert({ level: 'warning', title, message, data }),

  /**
   * 发送信息告警
   */
  info: (title: string, message: string, data?: Record<string, unknown>) =>
    sendAlert({ level: 'info', title, message, data }),

  /**
   * Session 过期告警
   */
  sessionExpiring: (remainingMinutes: number) =>
    sendAlert({
      level: 'warning',
      title: 'Session 即将过期',
      message: `Session 将在 ${remainingMinutes} 分钟后过期，正在自动续期...`,
    }),

  /**
   * Session 续期成功
   */
  sessionRenewed: (txHash: string) =>
    sendAlert({
      level: 'info',
      title: 'Session 续期成功',
      message: 'Session 已成功续期',
      data: { txHash },
    }),

  /**
   * 交易执行告警
   */
  tradeExecuted: (type: 'swap' | 'addLiquidity' | 'removeLiquidity', txHash: string, details: Record<string, unknown>) =>
    sendAlert({
      level: 'info',
      title: `交易执行: ${type}`,
      message: '交易已成功执行',
      data: { txHash, ...details },
    }),

  /**
   * 再平衡告警
   */
  rebalanceTriggered: (tokenId: string, reason: string) =>
    sendAlert({
      level: 'info',
      title: '触发再平衡',
      message: `Position #${tokenId} 触发再平衡`,
      data: { reason },
    }),

  /**
   * 错误告警
   */
  operationFailed: (operation: string, error: string) =>
    sendAlert({
      level: 'error',
      title: `操作失败: ${operation}`,
      message: error,
    }),

  /**
   * 启动告警
   */
  botStarted: () =>
    sendAlert({
      level: 'info',
      title: 'Bot 启动',
      message: 'ILAL Market Maker Bot 已启动',
    }),

  /**
   * 停止告警
   */
  botStopped: (reason?: string) =>
    sendAlert({
      level: 'warning',
      title: 'Bot 停止',
      message: reason || 'Bot 已停止运行',
    }),
};
