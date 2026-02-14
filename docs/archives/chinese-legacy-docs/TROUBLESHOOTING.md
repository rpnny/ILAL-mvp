# 前端故障排查指南

## 问题：点击后页面变白

### 原因分析
页面变白通常是 JavaScript 运行时错误导致的 React 崩溃。

### 解决步骤

#### 1. 查看浏览器控制台错误

1. 打开浏览器（Chrome/Brave）
2. 按 `F12` 或 `Cmd+Option+I`（Mac）打开开发者工具
3. 点击 **Console** 标签
4. 刷新页面，查看是否有**红色错误信息**

#### 2. 常见错误及解决方案

##### 错误 A: `Cannot read property 'xxx' of undefined`

**原因**: 某个状态或 Hook 返回了 `undefined`

**解决方案**: 已在代码中添加防御性检查，刷新浏览器即可

##### 错误 B: `Module not found: Can't resolve 'ethers'`

**原因**: `ethers` 包未安装或导入错误

**解决方案**: 已移除不必要的 `ethers` 导入，刷新浏览器即可

##### 错误 C: `Hydration failed`

**原因**: 服务端渲染和客户端渲染不匹配

**解决方案**:
```bash
# 停止服务器（Ctrl+C）
# 清除缓存并重启
rm -rf .next
npm run dev
```

##### 错误 D: `localStorage is not defined`

**原因**: Demo 模式在服务端运行时访问了 `localStorage`

**解决方案**: 已在代码中使用 `'use client'` 标记，刷新浏览器即可

#### 3. 手动测试流程

1. **清除浏览器缓存**
   - 打开开发者工具（F12）
   - 右键点击刷新按钮
   - 选择 "清空缓存并硬性重新加载"

2. **刷新页面**
   - 访问 http://localhost:3002
   - 检查是否显示黄色横幅

3. **连接钱包**
   - 点击 "Connect Wallet"
   - 选择 MetaMask
   - 确认连接

4. **访问交易页面**
   - 点击首页的 "开始交易" 链接（或者直接访问 http://localhost:3002/trade）
   - 检查页面是否正常加载

#### 4. 如果问题依然存在

请提供以下信息：

1. **浏览器控制台的完整错误信息**（红色错误）
2. **浏览器类型和版本**（Chrome 123 / Firefox 121 等）
3. **操作系统**（macOS / Windows / Linux）
4. **当前步骤**（在哪个页面，点击了什么）

---

## 检查清单

在报告问题前，请确认：

- [ ] 开发服务器正在运行（http://localhost:3002）
- [ ] 浏览器控制台已打开（F12）
- [ ] 已清除浏览器缓存
- [ ] MetaMask 钱包已连接
- [ ] 已查看控制台是否有错误
- [ ] 已记录错误信息的完整内容

---

## 快速修复

### 方案 1: 完全重启

```bash
# 1. 停止开发服务器（Ctrl+C 或 Cmd+C）

# 2. 清除 Next.js 缓存
cd /Users/ronny/Desktop/ilal/frontend
rm -rf .next

# 3. 重新安装依赖（可选）
npm install

# 4. 重启服务器
npm run dev
```

### 方案 2: 检查 Demo 模式

确认 `.env.local` 中有：

```bash
NEXT_PUBLIC_ENABLE_MOCK=true
```

### 方案 3: 查看调试日志

打开浏览器控制台，应该看到以下日志：

```
Trade page - isConnected: true, isActive: false
SessionStatus - address: 0x..., isActive: false, timeRemaining: 已过期
```

如果没有看到这些日志，说明页面根本没有渲染。

---

## 联系开发者

如果以上方法都无效，请提供：

1. 浏览器控制台截图（包含错误信息）
2. Next.js 服务器终端输出
3. 操作步骤描述

开发者会尽快帮您解决问题。
