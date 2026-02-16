/**
 * Express 服务器配置
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './config/logger.js';

// 导入路由
import authRoutes from './routes/auth.routes.js';
import apikeyRoutes from './routes/apikey.routes.js';
import verifyRoutes from './routes/verify.routes.js';
import billingRoutes from './routes/billing.routes.js';

// 导入控制器
import * as verifyController from './controllers/verify.controller.js';

export function createServer(): express.Application {
  const app = express();

  // ============ 中间件 ============

  // 安全headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // JSON body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 请求日志
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });
    next();
  });

  // ============ 路由 ============

  // 健康检查（无需认证）
  app.get('/api/v1/health', verifyController.healthCheck);
  app.get('/health', verifyController.healthCheck);

  // 认证路由
  app.use('/api/v1/auth', authRoutes);

  // API Key 管理路由
  app.use('/api/v1/apikeys', apikeyRoutes);

  // 验证路由（ZK Proof）
  app.use('/api/v1/verify', verifyRoutes);
  
  // Session 查询路由（单独挂载）
  app.get('/api/v1/session/:address', verifyController.getSessionStatus);

  // 使用统计路由
  app.use('/api/v1/usage', billingRoutes);

  // 计费路由
  app.use('/api/v1/billing', billingRoutes);

  // 根路径
  app.get('/', (req: Request, res: Response) => {
    res.json({
      service: 'ILAL API',
      version: '1.0.0',
      documentation: '/api/v1/docs',
      health: '/api/v1/health',
    });
  });

  // ============ 错误处理 ============

  // 404 处理
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: req.path,
    });
  });

  // 全局错误处理
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
    });

    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
  });

  return app;
}
