# 🔑 获取 GitHub Personal Access Token

## 方法一：直接链接（最快）

### 第 1 步：打开创建 Token 页面
**直接访问这个链接** ↓
```
https://github.com/settings/tokens/new
```

### 第 2 步：填写信息
1. **Note（名称）**: 填写 `ILAL Upload` 或任意名称
2. **Expiration（有效期）**: 选择 `30 days`（30天）或 `90 days`
3. **Select scopes（权限）**: 勾选以下选项 ↓
   
   找到 **repo** 这一行，**勾选它**（会自动勾选下面的所有子选项）：
   ```
   ✅ repo
      ✅ repo:status
      ✅ repo_deployment
      ✅ public_repo
      ✅ repo:invite
      ✅ security_events
   ```

4. **滚动到页面底部**，点击绿色按钮 **"Generate token"**

### 第 3 步：复制 Token
- 页面会显示一个绿色框，里面是您的 token
- Token 形如：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **⚠️ 重要**: 立即复制这个 token！
- **⚠️ 只显示一次**: 刷新页面后就看不到了

---

## 方法二：从设置页面进入

如果上面的直接链接不行，按以下步骤：

### 第 1 步：进入 GitHub 设置
1. 登录 GitHub：https://github.com
2. 点击右上角头像
3. 点击 **Settings**（设置）

### 第 2 步：进入 Token 页面
1. 在左侧菜单中，滚动到最底部
2. 点击 **Developer settings**（开发者设置）
3. 点击 **Personal access tokens**
4. 点击 **Tokens (classic)**
5. 点击右上角绿色按钮 **"Generate new token"**
6. 选择 **"Generate new token (classic)"**

### 第 3 步：创建 Token
按照"方法一"的第2、3步操作

---

## 📸 图文示例

### 1. 创建页面长这样：
```
Note: [ILAL Upload          ]  ← 输入任意名称

Expiration: [30 days ▼]         ← 选择有效期

Select scopes:                  ← 勾选权限
  ☑️ repo                       ← 勾选这个！
    ☑️ repo:status
    ☑️ repo_deployment  
    ☑️ public_repo
    ...

[Generate token]                ← 点击这个按钮
```

### 2. 生成后的页面：
```
┌─────────────────────────────────────────────┐
│ Make sure to copy your personal access     │
│ token now. You won't be able to see it     │
│ again!                                      │
│                                             │
│ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    │ ← 复制这个！
│                                     [Copy]  │
└─────────────────────────────────────────────┘
```

---

## ✅ 获取 Token 后

### 立即在终端执行（替换 YOUR_TOKEN）：

```bash
cd /Users/ronny/Desktop/ilal

# 设置远程仓库地址（包含 token）
git remote set-url origin https://YOUR_TOKEN@github.com/rpnny/ILAL.git

# 推送代码
git push -u origin main
```

### 完整示例
假设您的 token 是：`ghp_1234567890abcdefghijklmnopqrstu`

```bash
cd /Users/ronny/Desktop/ilal
git remote set-url origin https://ghp_1234567890abcdefghijklmnopqrstu@github.com/rpnny/ILAL.git
git push -u origin main
```

---

## ⚠️ 安全提醒

1. **Token 就是密码**: 不要分享给任何人
2. **使用完可以删除**: 推送成功后，可以在 https://github.com/settings/tokens 删除这个 token
3. **有效期**: Token 会在设置的时间后失效（如30天）
4. **保存 Token**: 如果以后还要用，可以保存在密码管理器中

---

## 🆘 常见问题

**Q: 找不到 "Developer settings"？**
A: 确保您已经登录 GitHub，然后访问：https://github.com/settings/tokens

**Q: 提示 "You don't have permission"？**
A: 确保您是仓库的所有者，访问 https://github.com/rpnny/ILAL/settings 检查

**Q: Token 复制后刷新页面就看不见了？**
A: 正常的！GitHub 只显示一次。如果忘记复制，重新生成一个新的即可

---

## 🎯 快速总结

1. 访问：https://github.com/settings/tokens/new
2. 填写名称：`ILAL Upload`
3. 勾选：`repo` 权限
4. 点击：`Generate token`
5. 复制 token
6. 运行命令推送代码

**预计完成时间**: 2 分钟 ⏱️
