/**
 * 前端性能监控工具
 */

// Web Vitals 类型
export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
}

/**
 * 上报性能指标
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  // 开发环境下打印到控制台
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vitals:', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  }

  // 生产环境可以发送到分析服务
  // 例如: Google Analytics, Vercel Analytics 等
  if (process.env.NODE_ENV === 'production') {
    // TODO: 集成分析服务
    // analytics.track('web-vitals', {
    //   metric: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    // });
  }
}

/**
 * 性能标记
 */
export class PerformanceMarker {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`Performance mark "${startMark}" not found`);
      return 0;
    }

    const end = endMark ? this.marks.get(endMark) : performance.now();
    if (!end) {
      console.warn(`Performance mark "${endMark}" not found`);
      return 0;
    }

    const duration = end - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${Math.round(duration)}ms`);
    }

    return duration;
  }

  clear() {
    this.marks.clear();
  }
}

// 全局性能标记实例
export const perfMarker = new PerformanceMarker();

/**
 * 组件渲染性能监控 Hook
 */
export function useRenderPerformance(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const renderCount = React.useRef(0);
    const startTime = React.useRef(performance.now());

    React.useEffect(() => {
      renderCount.current++;
      const duration = performance.now() - startTime.current;
      
      if (duration > 16) { // 超过一帧的时间（16ms）
        console.warn(
          `⚠️ Slow render: ${componentName} took ${Math.round(duration)}ms (render #${renderCount.current})`
        );
      }
      
      startTime.current = performance.now();
    });
  }
}

/**
 * 检测长任务
 */
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('⚠️ Long task detected:', {
            duration: Math.round(entry.duration),
            name: entry.name,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // longtask 可能不被支持
  }
}

/**
 * 预加载关键资源
 */
export function preloadResource(href: string, as: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * 预连接到外部域
 */
export function preconnect(href: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  document.head.appendChild(link);
}

// 在开发环境下，React 导入会失败，但这没关系
// 因为这个文件在生产环境也会被使用
let React: any;
try {
  React = require('react');
} catch {
  // 忽略错误
}
