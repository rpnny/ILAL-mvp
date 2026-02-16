/**
 * 本地 Session 管理
 *
 * ZK 证明在浏览器中生成、链上只读验证通过后，
 * 在 localStorage 保存 Session 状态。
 *
 * 这是因为链上 Session 激活需要 VERIFIER_ROLE 权限（后端服务负责），
 * 前端暂时使用 localStorage 作为本地 Session 存储。
 */

const SESSION_KEY = 'ilal_session';

export interface LocalSession {
  isActive: boolean;
  expiry: number;
  timeRemaining: number;
  activatedAt?: number;
}

const emptySession: LocalSession = {
  isActive: false,
  expiry: 0,
  timeRemaining: 0,
};

/**
 * 激活本地 Session（验证通过后调用）
 */
export function activateDemoSession(): void {
  const now = Math.floor(Date.now() / 1000);
  const session: LocalSession = {
    isActive: true,
    expiry: now + 24 * 60 * 60, // 24 小时
    timeRemaining: 24 * 60 * 60,
    activatedAt: now,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 获取本地 Session 状态
 * 始终可用，不依赖任何环境变量
 * 
 * 注意：在极端测试模式（expired/revoked）下会自动清空本地 session
 */
export function getLocalSessionStatus(): LocalSession {
  try {
    // 极端测试模式：自动清空本地 session，确保测试准确性
    const testMode = process.env.NEXT_PUBLIC_MOCK_TEST_MODE;
    if (testMode === 'expired' || testMode === 'revoked') {
      console.warn('[Session] Extreme test mode active, clearing local session');
      localStorage.removeItem(SESSION_KEY);
      return emptySession;
    }
    
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return emptySession;

    const data: LocalSession = JSON.parse(stored);
    const now = Math.floor(Date.now() / 1000);

    if (data.expiry > now) {
      return {
        ...data,
        isActive: true,
        timeRemaining: data.expiry - now,
      };
    } else {
      // 已过期，清除
      localStorage.removeItem(SESSION_KEY);
      return emptySession;
    }
  } catch {
    return emptySession;
  }
}

/**
 * 清除本地 Session
 */
export function clearDemoSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ============ 兼容旧代码的导出 ============

/** @deprecated 使用 getLocalSessionStatus */
export const getDemoSessionStatus = getLocalSessionStatus;

/** 是否启用了完全 Mock 模式（环境变量控制） */
export const DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true';
