/**
 * ILAL 验证流程 E2E 测试
 * 
 * 运行方式:
 *   npx playwright test tests/e2e/verification.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('验证流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/');
  });

  test('应该显示首页和连接钱包按钮', async ({ page }) => {
    // 检查标题
    await expect(page.locator('h1')).toContainText('ILAL');
    
    // 检查连接按钮（RainbowKit 按钮）
    await expect(page.locator('button:has-text("连接钱包")')).toBeVisible();
  });

  test('未连接钱包时应显示提示', async ({ page }) => {
    // 检查提示文案
    await expect(page.locator('text=请先连接您的钱包')).toBeVisible();
  });

  // 注意：以下测试需要 Mock 钱包连接
  test.skip('完整验证流程', async ({ page }) => {
    // 1. 连接钱包（需要 Mock）
    await page.click('text=连接钱包');
    // TODO: Mock MetaMask 连接
    
    // 2. 检查验证按钮显示
    await expect(page.locator('text=开始验证')).toBeVisible();
    
    // 3. 点击验证
    await page.click('text=开始验证');
    
    // 4. 等待 Loading 显示
    await expect(page.locator('text=验证中')).toBeVisible();
    
    // 5. 检查进度条
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // 6. 等待验证完成（最多 60 秒）
    await expect(page.locator('text=身份验证成功'), {
      timeout: 60000
    }).toBeVisible();
    
    // 7. 检查 Session 状态组件
    await expect(page.locator('text=已验证')).toBeVisible();
    
    // 8. 检查剩余时间显示
    await expect(page.locator('text=/剩余.*小时/')).toBeVisible();
  });

  test('验证失败应显示错误提示', async ({ page }) => {
    // TODO: Mock 验证失败场景
    
    // 应该显示错误提示
    // await expect(page.locator('text=验证失败')).toBeVisible();
    
    // 应该有重试按钮
    // await expect(page.locator('button:has-text("重试")')).toBeVisible();
  });
});

test.describe('交易界面测试', () => {
  test('未验证用户访问交易页面', async ({ page }) => {
    await page.goto('/trade');
    
    // 应该显示验证提示
    await expect(page.locator('text=需要验证身份')).toBeVisible();
    
    // 应该有验证链接
    await expect(page.locator('a:has-text("立即验证")')).toBeVisible();
  });

  test.skip('已验证用户可以看到交易表单', async ({ page }) => {
    // TODO: Mock 已验证状态
    await page.goto('/trade');
    
    // 应该显示交易表单
    await expect(page.locator('input[placeholder*="0.0"]')).toBeVisible();
    await expect(page.locator('select')).toHaveCount(2); // From 和 To 下拉菜单
    await expect(page.locator('button:has-text("交易")')).toBeVisible();
  });

  test('交易按钮在未输入金额时禁用', async ({ page }) => {
    // TODO: Mock 已验证状态
    await page.goto('/trade');
    
    const tradeButton = page.locator('button:has-text("交易")');
    await expect(tradeButton).toBeDisabled();
  });
});

test.describe('响应式设计测试', () => {
  test('移动端布局适配', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('/');
    
    // 检查布局
    const card = page.locator('.rounded-lg').first();
    await expect(card).toBeVisible();
    
    // 按钮应该足够大（易点击）
    const button = page.locator('button').first();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThan(40); // 至少 40px 高
  });

  test('平板端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    
    await page.goto('/');
    
    // 检查布局合理
    const card = page.locator('.max-w-md').first();
    await expect(card).toBeVisible();
  });

  test('桌面端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/');
    
    // 检查居中布局
    const main = page.locator('main');
    await expect(main).toHaveCSS('justify-content', 'center');
  });
});

test.describe('可访问性测试', () => {
  test('键盘导航', async ({ page }) => {
    await page.goto('/');
    
    // Tab 遍历所有可交互元素
    await page.keyboard.press('Tab');
    
    // 第一个 Tab 应该聚焦到 "连接钱包" 按钮
    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/连接/);
  });

  test('按钮应该有 aria-label', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      
      // 按钮要么有文本，要么有 aria-label
      expect(hasText || hasAriaLabel).toBeTruthy();
    }
  });
});
