import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM build for browsers and modern bundlers
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: {
      resolve: true,  // 解析外部类型
      compilerOptions: {
        skipLibCheck: true,  // 跳过库类型检查
        noEmitOnError: false,  // 即使有类型错误也继续生成
      },
    },
    outDir: 'dist',
    splitting: true,
    sourcemap: true,
    clean: true,
    platform: 'neutral',
    target: 'es2020',
    external: ['snarkjs', 'circomlibjs', 'fs', 'path', 'viem/accounts'],  // 外部化 ZK 依赖和 Node.js 模块
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";',  // Next.js App Router 兼容
      };
    },
  },
  // CJS build for Node.js backends
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    outDir: 'dist',
    platform: 'node',
    target: 'node16',
    external: ['snarkjs', 'circomlibjs', 'viem/accounts'],
    sourcemap: true,
    dts: false,  // 只在 ESM 构建中生成类型定义
  },
]);
