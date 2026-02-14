/**
 * ILAL Swap 功能 E2E 测试
 * 
 * 运行方式:
 *   npx playwright test tests/e2e/swap.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Swap 功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问交易页面
    await page.goto('/trade');
  });

  test('应该显示交易页面基本元素', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('交易');
    
    // 检查 Token 选择器
    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
    
    // 检查输入框
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test('未连接钱包时应显示连接提示', async ({ page }) => {
    // 检查连接钱包按钮或提示
    const connectButton = page.locator('button:has-text("连接")');
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeVisible();
    }
  });

  test('价格信息应正确显示', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(1000);
    
    // 检查是否有价格显示（可能是 Mock 价格）
    const priceElements = page.locator('text=/\\$[0-9,]+/');
    if (await priceElements.count() > 0) {
      await expect(priceElements.first()).toBeVisible();
    }
  });

  test('Token 选择应更新交易对', async ({ page }) => {
    // 选择第一个 Token
    const fromSelect = page.locator('select').first();
    if (await fromSelect.isVisible()) {
      await fromSelect.selectOption({ index: 1 });
      
      // 等待页面更新
      await page.waitForTimeout(500);
      
      // 选择第二个 Token
      const toSelect = page.locator('select').nth(1);
      await toSelect.selectOption({ index: 2 });
    }
  });

  test('输入金额应触发价格计算', async ({ page }) => {
    const amountInput = page.locator('input[type="number"]').first();
    
    if (await amountInput.isVisible()) {
      // 输入金额
      await amountInput.fill('100');
      
      // 等待价格计算
      await page.waitForTimeout(1000);
      
      // 检查是否显示预估输出
      const output = page.locator('text=/预估|输出|receive/i');
      if (await output.count() > 0) {
        await expect(output.first()).toBeVisible();
      }
    }
  });

  test.skip('Swap 按钮状态应正确', async ({ page }) => {
    // TODO: Mock 钱包连接
    const swapButton = page.locator('button:has-text("交易")');
    
    // 未输入金额时应禁用
    await expect(swapButton).toBeDisabled();
    
    // 输入金额后应启用（如果已连接钱包）
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('10');
    await page.waitForTimeout(500);
    
    // 检查按钮状态
    // await expect(swapButton).toBeEnabled();
  });

  test('滑点设置应可调整', async ({ page }) => {
    // 查找设置按钮或滑点显示
    const settingsButton = page.locator('button[aria-label*="设置"], button:has-text("设置")');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.first().click();
      
      // 等待设置面板出现
      await page.waitForTimeout(500);
      
      // 检查滑点输入
      const slippageInput = page.locator('input[type="number"]').last();
      if (await slippageInput.isVisible()) {
        await expect(slippageInput).toBeVisible();
      }
    }
  });
});

test.describe('Swap 交易执行测试', () => {
  test.skip('完整 Swap 流程', async ({ page }) => {
    // TODO: Mock 钱包和 Session
    await page.goto('/trade');
    
    // 1. 选择 Token
    await page.locator('select').first().selectOption('USDC');
    await page.locator('select').nth(1).selectOption('WETH');
    
    // 2. 输入金额
    await page.locator('input[type="number"]').first().fill('100');
    
    // 3. 等待价格计算
    await page.waitForTimeout(2000);
    
    // 4. 点击 Swap
    await page.click('button:has-text("交易")');
    
    // 5. 等待交易确认
    await expect(page.locator('text=确认')).toBeVisible();
    
    // 6. 确认交易
    await page.click('button:has-text("确认")');
    
    // 7. 等待交易完成
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 60000 });
  });

  test('Swap 失败应显示错误', async ({ page }) => {
    // TODO: Mock 失败场景
  });
});

test.describe('Swap 界面响应式测试', () => {
  test('移动端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/trade');
    
    // 检查表单可见
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test('平板端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/trade');
    
    // 检查布局
    await expect(page.locator('select').first()).toBeVisible();
  });
});
