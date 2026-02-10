/**
 * Demo 演示模式
 * 
 * 在合约未部署时，使用 Mock 数据演示完整流程
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true';

/**
 * 模拟 ZK Proof 生成
 */
export async function mockGenerateProof(address: string): Promise<{
  proof: any;
  publicSignals: string[];
}> {
  // 模拟不同阶段的延迟
  await sleep(1000); // 10%
  await sleep(2000); // 30%
  await sleep(3000); // 60%
  await sleep(2000); // 100%

  return {
    proof: {
      pi_a: ['mock_proof_a'],
      pi_b: [['mock_proof_b']],
      pi_c: ['mock_proof_c'],
    },
    publicSignals: [
      BigInt(address).toString(),
      '987654321098765432109876543210',
      '111111111111111111111111111111',
    ],
  };
}

/**
 * 模拟 Session 状态
 */
export const mockSessionData = {
  isActive: false, // 初始未激活
  expiry: 0,
  timeRemaining: 0,
};

/**
 * 激活 Demo Session
 */
export function activateDemoSession() {
  const now = Math.floor(Date.now() / 1000);
  mockSessionData.isActive = true;
  mockSessionData.expiry = now + 24 * 60 * 60; // 24 小时
  mockSessionData.timeRemaining = 24 * 60 * 60;

  // 保存到 localStorage
  localStorage.setItem('demo_session', JSON.stringify(mockSessionData));
}

/**
 * 检查 Demo Session 状态
 */
export function getDemoSessionStatus() {
  if (!DEMO_MODE) return null;

  try {
    const stored = localStorage.getItem('demo_session');
    if (!stored) return mockSessionData;

    const data = JSON.parse(stored);
    const now = Math.floor(Date.now() / 1000);

    if (data.expiry > now) {
      data.isActive = true;
      data.timeRemaining = data.expiry - now;
      return data;
    } else {
      data.isActive = false;
      data.timeRemaining = 0;
      return data;
    }
  } catch {
    return mockSessionData;
  }
}

/**
 * 清除 Demo Session
 */
export function clearDemoSession() {
  mockSessionData.isActive = false;
  mockSessionData.expiry = 0;
  mockSessionData.timeRemaining = 0;
  localStorage.removeItem('demo_session');
}

// 工具函数
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
