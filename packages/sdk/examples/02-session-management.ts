/**
 * Example 2: Session Management
 * 展示如何激活和管理 Session
 */

import { ILALClient } from '@ilal/sdk';

// 假设已初始化 client
declare const client: ILALClient;

async function sessionExample() {
  // 1. 激活 Session（24 小时有效期）
  console.log('Activating session...');
  const hash = await client.session.activate({
    expiry: 24 * 3600, // 24 hours in seconds
  });
  console.log('Session activated:', hash);

  // 2. 检查 Session 状态
  const isActive = await client.session.isActive();
  console.log('Session active:', isActive);

  // 3. 获取剩余时间
  const remaining = await client.session.getRemainingTime();
  console.log('Remaining time:', remaining, 'seconds');

  // 4. 获取完整信息
  const info = await client.session.getInfo();
  console.log('Session info:', {
    isActive: info.isActive,
    expiry: new Date(Number(info.expiry) * 1000).toISOString(),
    remainingHours: Number(info.remainingTime) / 3600,
  });

  // 5. 确保 Session 激活（如果未激活则抛出错误）
  try {
    await client.session.ensureActive();
    console.log('✅ Session is active');
  } catch (error) {
    console.error('❌ Session expired or inactive');
  }

  // 6. 智能激活：仅在需要时激活
  const result = await client.session.activateIfNeeded();
  if (result.activated) {
    console.log('Session was activated:', result.hash);
  } else {
    console.log('Session already active');
  }

  // 7. 获取状态文本描述
  const statusText = await client.session.getStatusText();
  console.log('Status:', statusText); // "Active (23h remaining)"
}

sessionExample().catch(console.error);
