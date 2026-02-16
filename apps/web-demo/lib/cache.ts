/**
 * 简单的内存缓存工具
 * 用于缓存价格数据、Gas估算等，减少重复的链上查询
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 数据
   * @param ttlSeconds TTL（秒）
   */
  set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 数据或 null（如果过期或不存在）
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // 检查是否过期
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取或设置缓存（如果不存在则调用 fetcher）
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param ttlSeconds TTL（秒）
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 30
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 调用 fetcher 获取新数据
    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * 清理过期的缓存条目
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }
}

// 导出单例
export const cache = new MemoryCache();

// 定期清理过期缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    const cleaned = cache.cleanup();
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  }, 5 * 60 * 1000);
}

// 缓存键生成器
export const CacheKeys = {
  poolPrice: (token0: string, token1: string, fee: number) =>
    `price:${token0}:${token1}:${fee}`,
  
  tokenBalance: (token: string, user: string) =>
    `balance:${token}:${user}`,
  
  gasEstimate: (method: string, params: string) =>
    `gas:${method}:${params}`,
  
  sessionStatus: (user: string) =>
    `session:${user}`,
  
  poolLiquidity: (poolId: string) =>
    `liquidity:${poolId}`,
};
