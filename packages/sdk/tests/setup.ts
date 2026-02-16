/**
 * Vitest 测试设置文件
 * 在所有测试运行前执行
 */

import { beforeAll, afterAll, vi } from 'vitest';

// 模拟环境变量
process.env.NODE_ENV = 'test';

// 全局设置
beforeAll(() => {
  // 设置测试超时（ZK proof 生成可能需要较长时间）
  vi.setConfig({ testTimeout: 30000 });
});

afterAll(() => {
  // 清理
});

// 模拟 localStorage（用于浏览器环境测试）
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as any;
