'use client';

import { DEMO_MODE } from '@/lib/demo-mode';

/**
 * Demo 模式横幅提示
 */
export function DemoModeBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center z-50 shadow-md">
      <p className="text-sm font-semibold">
        🎭 Demo Mode - Contracts not deployed, using mock data to showcase features
      </p>
    </div>
  );
}
