import { 
  publicClient, 
  walletClient, 
  botAddress, 
  contracts,
  SESSION_MANAGER_ABI,
  REGISTRY_ABI,
} from './contracts.js';
import { config } from './config.js';
import { log } from './logger.js';

// ============ Session 状态 ============

export interface SessionStatus {
  isActive: boolean;
  expiry: bigint;
  remainingSeconds: number;
  needsRenewal: boolean;
}

// ============ Session 管理 ============

/**
 * 检查当前 Session 状态
 */
export async function checkSession(): Promise<SessionStatus> {
  try {
    const [isActive, expiry] = await Promise.all([
      publicClient.readContract({
        address: contracts.sessionManager,
        abi: SESSION_MANAGER_ABI,
        functionName: 'isSessionActive',
        args: [botAddress],
      }),
      publicClient.readContract({
        address: contracts.sessionManager,
        abi: SESSION_MANAGER_ABI,
        functionName: 'getSessionExpiry',
        args: [botAddress],
      }),
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const remainingSeconds = isActive ? Number(expiry - now) : 0;
    const needsRenewal = remainingSeconds < config.session.renewThreshold;

    log.debug('Session 状态检查', {
      isActive,
      expiry: expiry.toString(),
      remainingSeconds,
      needsRenewal,
    });

    return {
      isActive,
      expiry,
      remainingSeconds,
      needsRenewal,
    };
  } catch (error) {
    log.error('检查 Session 状态失败', { error: String(error) });
    throw error;
  }
}

/**
 * 检查是否已验证
 */
export async function checkVerification(): Promise<boolean> {
  try {
    const isVerified = await publicClient.readContract({
      address: contracts.registry,
      abi: REGISTRY_ABI,
      functionName: 'isVerified',
      args: [botAddress],
    });

    log.debug('验证状态检查', { isVerified });
    return isVerified;
  } catch (error) {
    log.error('检查验证状态失败', { error: String(error) });
    throw error;
  }
}

/**
 * 启动或续期 Session
 */
export async function renewSession(): Promise<string> {
  try {
    // 首先检查是否已验证
    const isVerified = await checkVerification();
    if (!isVerified) {
      throw new Error('Bot 地址未通过验证，无法启动 Session');
    }

    const expiry = BigInt(Math.floor(Date.now() / 1000) + config.session.duration);

    log.info('正在续期 Session', { 
      address: botAddress,
      expiry: expiry.toString(),
      duration: config.session.duration,
    });

    const hash = await walletClient.writeContract({
      address: contracts.sessionManager,
      abi: SESSION_MANAGER_ABI,
      functionName: 'startSession',
      args: [botAddress, expiry],
    });

    log.info('Session 续期交易已提交', { hash });

    // 等待确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      log.info('Session 续期成功', { hash, blockNumber: receipt.blockNumber });
      return hash;
    } else {
      throw new Error('Session 续期交易失败');
    }
  } catch (error) {
    log.error('Session 续期失败', { error: String(error) });
    throw error;
  }
}

/**
 * 确保 Session 有效
 */
export async function ensureActiveSession(): Promise<void> {
  const status = await checkSession();

  if (!status.isActive || status.needsRenewal) {
    log.info('Session 需要续期', {
      isActive: status.isActive,
      remainingSeconds: status.remainingSeconds,
    });
    await renewSession();
  } else {
    log.debug('Session 有效', {
      remainingSeconds: status.remainingSeconds,
    });
  }
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '已过期';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}
