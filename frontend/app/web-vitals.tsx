'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

/**
 * Web Vitals 报告组件
 * 监控核心 Web 性能指标
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // 在开发环境打印到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vitals:', {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
      });
    }

    // 生产环境可以发送到分析服务
    if (process.env.NODE_ENV === 'production') {
      // TODO: 集成分析服务（如 Vercel Analytics, Google Analytics 等）
      // Example:
      // window.gtag?.('event', metric.name, {
      //   value: Math.round(metric.value),
      //   metric_rating: metric.rating,
      //   metric_delta: metric.delta,
      // });
    }
  });

  // 监控资源加载
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // 监控长任务
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('⚠️ Long task detected:', {
              duration: Math.round(entry.duration),
              name: entry.name,
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      return () => longTaskObserver.disconnect();
    } catch (e) {
      // longtask 可能不被支持
    }
  }, []);

  return null;
}
