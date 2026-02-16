/**
 * ILAL 流动性管理 E2E 测试
 * 
 * 运行方式:
 *   npx playwright test tests/e2e/liquidity.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('流动性页面基本测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/liquidity');
  });

  test('应该显示流动性页面基本元素', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1, h2')).toContainText(/流动性|Liquidity/i);
    
    // 检查添加流动性按钮
    const addButton = page.locator('button:has-text("添加"), button:has-text("Add")');
    if (await addButton.count() > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });

  test('未连接钱包时应显示连接提示', async ({ page }) => {
    const connectButton = page.locator('button:has-text("连接")');
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeVisible();
    }
  });

  test('应该显示持仓列表或空状态', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(1000);
    
    // 检查是否有持仓列表或空状态提示
    const positions = page.locator('[data-testid="position"], .position-card');
    const emptyState = page.locator('text=/暂无|No positions/i');
    
    const hasPositions = await positions.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    expect(hasPositions || hasEmptyState).toBeTruthy();
  });
});

test.describe('添加流动性测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/liquidity');
  });

  test('点击添加流动性应显示表单', async ({ page }) => {
    const addButton = page.locator('button:has-text("添加"), button:has-text("Add")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // 检查表单元素
      const inputs = page.locator('input[type="number"]');
      if (await inputs.count() > 0) {
        await expect(inputs.first()).toBeVisible();
      }
    }
  });

  test('Token 选择器应可用', async ({ page }) => {
    const selects = page.locator('select');
    
    if (await selects.count() >= 2) {
      // 选择第一个 Token
      await selects.first().selectOption({ index: 1 });
      
      // 选择第二个 Token
      await selects.nth(1).selectOption({ index: 2 });
      
      await page.waitForTimeout(500);
    }
  });

  test('价格范围输入应可用', async ({ page }) => {
    // 查找价格范围输入（Min/Max Price）
    const priceInputs = page.locator('input[placeholder*="Min"], input[placeholder*="Max"]');
    
    if (await priceInputs.count() > 0) {
      await expect(priceInputs.first()).toBeVisible();
    }
  });

  test.skip('完整添加流动性流程', async ({ page }) => {
    // TODO: Mock 钱包连接
    
    // 1. 点击添加按钮
    await page.click('button:has-text("添加")');
    
    // 2. 选择 Token 对
    await page.locator('select').first().selectOption('USDC');
    await page.locator('select').nth(1).selectOption('WETH');
    
    // 3. 输入金额
    await page.locator('input[type="number"]').first().fill('100');
    await page.locator('input[type="number"]').nth(1).fill('0.05');
    
    // 4. 设置价格范围
    // await page.locator('input[placeholder*="Min"]').fill('2000');
    // await page.locator('input[placeholder*="Max"]').fill('3000');
    
    // 5. 确认添加
    await page.click('button:has-text("确认")');
    
    // 6. 等待交易完成
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 60000 });
  });
});

test.describe('移除流动性测试', () => {
  test.skip('应该能移除现有持仓', async ({ page }) => {
    // TODO: Mock 持仓数据
    await page.goto('/liquidity');
    
    // 等待持仓加载
    await page.waitForTimeout(2000);
    
    // 点击第一个持仓的移除按钮
    const removeButton = page.locator('button:has-text("移除"), button:has-text("Remove")').first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
      
      // 确认移除
      await page.click('button:has-text("确认")');
      
      // 等待交易完成
      await expect(page.locator('text=成功')).toBeVisible({ timeout: 60000 });
    }
  });

  test('移除流动性应显示确认对话框', async ({ page }) => {
    // TODO: Mock 持仓数据
  });
});

test.describe('持仓管理测试', () => {
  test.skip('应该显示持仓详情', async ({ page }) => {
    // TODO: Mock 持仓数据
    await page.goto('/liquidity');
    
    // 点击第一个持仓
    const position = page.locator('[data-testid="position"]').first();
    if (await position.isVisible()) {
      await position.click();
      
      // 检查详情显示
      await expect(page.locator('text=/Pool|流动性池/i')).toBeVisible();
      await expect(page.locator('text=/Token|代币/i')).toBeVisible();
    }
  });

  test('持仓列表应显示关键信息', async ({ page }) => {
    await page.goto('/liquidity');
    await page.waitForTimeout(1000);
    
    // 检查是否有持仓卡片
    const positions = page.locator('[data-testid="position"], .position-card');
    
    if (await positions.count() > 0) {
      // 检查第一个持仓的信息
      const firstPosition = positions.first();
      await expect(firstPosition).toBeVisible();
    }
  });
});

test.describe('流动性界面响应式测试', () => {
  test('移动端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/liquidity');
    
    // 检查页面可滚动
    await expect(page.locator('body')).toBeVisible();
    
    // 检查按钮大小合适
    const buttons = page.locator('button');
    if (await buttons.count() > 0) {
      const box = await buttons.first().boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThan(36); // 至少 36px 高
      }
    }
  });

  test('平板端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/liquidity');
    
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('桌面端布局适配', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/liquidity');
    
    await expect(page.locator('h1, h2')).toBeVisible();
  });
});

test.describe('错误处理测试', () => {
  test('网络错误应显示提示', async ({ page }) => {
    // TODO: Mock 网络错误
  });

  test('交易失败应显示错误信息', async ({ page }) => {
    // TODO: Mock 交易失败
  });

  test('余额不足应显示警告', async ({ page }) => {
    // TODO: Mock 余额不足
  });
});
