import winston from 'winston';
import { config } from './config.js';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // 文件输出
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: parseInt(config.logging.maxSize) * 1024 * 1024,
      maxFiles: config.logging.maxFiles,
    }),
  ],
});

// 便捷方法
export const log = {
  debug: (message: string, meta?: object) => logger.debug(message, meta),
  info: (message: string, meta?: object) => logger.info(message, meta),
  warn: (message: string, meta?: object) => logger.warn(message, meta),
  error: (message: string, meta?: object) => logger.error(message, meta),
};
