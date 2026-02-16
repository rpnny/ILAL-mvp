/**
 * ILAL API Service - 入口文件
 * 
 * SaaS 架构的后端服务：
 * - 用户认证（注册、登录、JWT）
 * - API Key 管理
 * - ZK Proof 验证（原 relay 功能）
 * - Session 管理
 * - 计费和配额管理
 */

import { createServer } from './server.js';
import { prisma } from './config/database.js';
import { PORT, validateConfig } from './config/constants.js';
import { logger } from './config/logger.js';

async function start() {
  try {
    // 1. 验证环境变量
    logger.info('Validating configuration...');
    validateConfig();

    // 2. 测试数据库连接
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('Database connected successfully');

    // 3. 创建 Express 服务器
    const app = createServer();

    // 4. 启动服务器
    const server = app.listen(PORT, () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info('     ILAL API Service Started                 ');
      logger.info('═══════════════════════════════════════════════');
      logger.info(`  Port:        ${PORT}`);
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`  Health:      http://localhost:${PORT}/api/v1/health`);
      logger.info(`  API Docs:    http://localhost:${PORT}/api/v1/docs`);
      logger.info('');
      logger.info('API Endpoints:');
      logger.info('  POST   /api/v1/auth/register       - 用户注册');
      logger.info('  POST   /api/v1/auth/login          - 用户登录');
      logger.info('  POST   /api/v1/auth/refresh        - 刷新 Token');
      logger.info('  GET    /api/v1/auth/me             - 获取用户信息');
      logger.info('');
      logger.info('  GET    /api/v1/apikeys             - 列出 API Keys');
      logger.info('  POST   /api/v1/apikeys             - 创建 API Key');
      logger.info('  DELETE /api/v1/apikeys/:id         - 撤销 API Key');
      logger.info('');
      logger.info('  POST   /api/v1/verify              - ZK Proof 验证');
      logger.info('  GET    /api/v1/session/:address    - Session 状态');
      logger.info('');
      logger.info('  GET    /api/v1/usage/stats         - 使用统计');
      logger.info('  GET    /api/v1/billing/plans       - 套餐列表');
      logger.info('  POST   /api/v1/billing/upgrade     - 升级套餐');
      logger.info('═══════════════════════════════════════════════');
    });

    // 5. 优雅关闭
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      await prisma.$disconnect();
      logger.info('Database disconnected');

      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// 启动服务器
start();
