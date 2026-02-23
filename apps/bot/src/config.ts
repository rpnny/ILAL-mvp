import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { config as dotenvConfig } from 'dotenv';
import type { Address } from 'viem';

// 加载环境变量
dotenvConfig();

// ============ 类型定义 ============

export interface PoolConfig {
  id: string;
  token0: Address;
  token1: Address;
  fee: number;
  tickSpacing: number;
}

export interface Config {
  network: {
    chainId: number;
    rpcUrl: string;
  };
  contracts: {
    registry: Address;
    sessionManager: Address;
    complianceHook: Address;
    positionManager: Address;
    poolManager: Address;
    simpleSwapRouter: Address;
  };
  wallet: {
    privateKey: `0x${string}`;
  };
  strategy: {
    pools: PoolConfig[];
    priceRange: {
      lower: number;
      upper: number;
    };
    rebalance: {
      priceDeviationThreshold: number;
      minInterval: number;
    };
    liquidity: {
      targetPerPool: number;
      maxSingleOperation: number;
    };
    referencePrice?: Record<string, number>;
    arbitrageThreshold?: number;
  };
  session: {
    renewThreshold: number;
    duration: number;
  };
  monitoring: {
    healthCheckInterval: number;
    priceCheckInterval: number;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    alertLevel: 'error' | 'warning' | 'info';
  };
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: number;
  };
}

// ============ 配置加载 ============

function replaceEnvVars(str: string): string {
  return str.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '');
}

function processConfig(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return replaceEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(processConfig);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processConfig(value);
    }
    return result;
  }
  return obj;
}

export function loadConfig(configPath: string = './config.yaml'): Config {
  try {
    const content = readFileSync(configPath, 'utf8');
    const rawConfig = parse(content);
    const config = processConfig(rawConfig) as Config;
    
    // 验证必要配置
    if (!config.wallet.privateKey || (config.wallet.privateKey as string) === '') {
      throw new Error('PRIVATE_KEY 环境变量未设置');
    }
    
    if (!config.network.rpcUrl || config.network.rpcUrl === '') {
      throw new Error('RPC_URL 环境变量未设置');
    }
    
    return config;
  } catch (error) {
    console.error('加载配置失败:', error);
    throw error;
  }
}

// 导出默认配置
export const config = loadConfig();
