# 钱包连接问题诊断指南

## 问题：连接钱包后仍显示"请先连接钱包"

### 快速修复步骤

#### 1. 刷新页面（强制刷新）

**Mac**: `Cmd + Shift + R`
**Windows/Linux**: `Ctrl + Shift + R`

#### 2. 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 点击 **Console** 标签
3. 查找日志：
   ```
   Trade page - isConnected: true, isActive: false, address: 0x...
   ```

**期望结果**：
- `isConnected: true` ✅
- `address: 0x742d...` ✅

**如果显示**：
- `isConnected: false` ❌ → 钱包未正确连接
- `address: undefined` ❌ → Wagmi 未初始化

#### 3. 重新连接钱包

##### 在首页：
1. 访问 http://localhost:3002
2. 点击 **Connect Wallet**
3. 选择 **MetaMask**
4. 在 MetaMask 弹窗中点击 **连接**
5. 等待 3 秒（让 Wagmi 同步状态）

##### 在交易页：
1. 如果看到"请先连接钱包"
2. 点击 **"返回首页连接钱包"** 按钮
3. 按上述步骤连接

#### 4. 验证连接状态

连接成功后，您应该看到：

**首页**：
- ✅ 右上角显示您的钱包地址（如：`0x742d...bEb1`）
- ✅ SessionStatus 组件显示"未验证"
- ✅ 显示"验证您的身份"页面

**交易页**（http://localhost:3002/trade）：
- ✅ 显示"需要验证身份"（而不是"请先连接钱包"）
- ✅ 显示"立即验证"按钮

---

## 技术诊断

### 在浏览器控制台运行以下命令

#### 检查 1: Wagmi 状态

```javascript
// 打开控制台（F12）运行
console.log('Demo Mode:', process.env.NEXT_PUBLIC_ENABLE_MOCK);
console.log('LocalStorage Session:', localStorage.getItem('demo_session'));
```

**期望输出**：
```
Demo Mode: "true"
LocalStorage Session: null  // 如果尚未验证
```

#### 检查 2: 钱包连接

在 MetaMask 中：
1. 点击 MetaMask 图标
2. 点击右上角三个点
3. 选择 "已连接的网站"
4. 确认 `localhost:3002` 在列表中

如果不在列表中：
1. 在 http://localhost:3002 首页重新连接
2. MetaMask 会弹出授权请求

---

## 常见问题

### Q1: 连接后立即跳转到交易页显示"请先连接钱包"

**原因**: Wagmi 需要 500ms 初始化

**解决方案**: 
- 已添加加载状态（显示 "加载中..."）
- 刷新浏览器应该修复

### Q2: 首页连接后看不到钱包地址

**原因**: RainbowKit 按钮可能被遮挡或样式问题

**解决方案**:
```bash
# 清除缓存并重启
cd /Users/ronny/Desktop/ilal/frontend
rm -rf .next
npm run dev
```

### Q3: 控制台显示 `isConnected: false`

**原因**: MetaMask 未授权或已断开

**解决方案**:
1. 打开 MetaMask
2. 确认当前网络是 **Base** 或 **Base Sepolia**
3. 点击 "已连接的网站"
4. 移除 localhost
5. 重新连接

---

## 完整测试流程

### Step 1: 清空状态（完全重置）

```bash
# 1. 停止服务器（Ctrl+C）

# 2. 清除所有缓存
cd /Users/ronny/Desktop/ilal/frontend
rm -rf .next
rm -rf node_modules/.cache

# 3. 重启
npm run dev
```

### Step 2: 清除浏览器缓存

1. 打开 Chrome/Brave
2. F12 打开开发者工具
3. 右键点击刷新按钮
4. 选择 "清空缓存并硬性重新加载"

### Step 3: 断开并重新连接 MetaMask

1. 打开 MetaMask
2. 设置 → 已连接的网站
3. 断开 localhost
4. 刷新页面
5. 重新连接

### Step 4: 按顺序测试

1. ✅ 访问 http://localhost:3002
2. ✅ 看到 "欢迎使用 ILAL"
3. ✅ 点击 "Connect Wallet"
4. ✅ 选择 MetaMask
5. ✅ 确认连接
6. ✅ **等待 3 秒**（重要！）
7. ✅ 查看右上角是否显示地址
8. ✅ 在控制台输入：
   ```javascript
   console.log('Connected:', document.querySelector('[data-testid="rk-account-button"]') !== null);
   ```
9. ✅ 访问 http://localhost:3002/trade
10. ✅ 应该看到 "需要验证身份"（而非 "请先连接钱包"）

---

## 预期页面状态对照表

| 页面 | 未连接钱包 | 已连接但未验证 | 已验证 |
|------|-----------|--------------|--------|
| 首页 `/` | "欢迎使用 ILAL"<br>"Connect Wallet" 按钮 | "验证您的身份"<br>"开始验证" 按钮 | "身份验证成功"<br>"开始交易" 按钮 |
| 交易页 `/trade` | "ILAL 交易"<br>"请先连接钱包" | "需要验证身份"<br>"立即验证" 按钮 | 交易表单（已启用） |

---

## 如果问题依然存在

请提供以下信息：

### 1. 浏览器控制台截图
- 包含所有日志（尤其是红色错误）

### 2. 控制台输出
```javascript
// 在控制台运行并截图
console.log({
  isConnected: document.querySelector('[data-testid="rk-account-button"]') !== null,
  pathname: window.location.pathname,
  demoMode: process.env.NEXT_PUBLIC_ENABLE_MOCK,
  localStorage: localStorage.getItem('demo_session')
});
```

### 3. MetaMask 状态
- 当前网络名称
- 已连接的网站列表

### 4. 操作步骤
详细描述您的操作顺序，例如：
1. 访问首页
2. 点击 Connect Wallet
3. 选择 MetaMask
4. ...

---

## 快速验证连接成功

**在首页连接成功后**，运行此检查：

```javascript
// 在浏览器控制台
const checkConnection = () => {
  const button = document.querySelector('[data-testid="rk-account-button"]');
  if (button) {
    console.log('✅ 钱包已连接！地址:', button.textContent);
  } else {
    console.log('❌ 钱包未连接');
  }
};
checkConnection();
```

**期望输出**：
```
✅ 钱包已连接！地址: 0x742d...bEb1
```
