# 📧 邮件服务配置指南 - Resend API

本指南将帮助你配置 Resend API，用于发送用户验证邮件。

---

## 🚀 快速开始

### 1. 注册 Resend 账号

访问 [Resend](https://resend.com) 并注册账号。

**推荐理由**:
- ✅ 免费套餐：每月 3,000 封邮件
- ✅ 简单易用的 API
- ✅ 99.9% 送达率
- ✅ 详细的发送日志
- ✅ 支持自定义域名

### 2. 创建 API Key

1. 登录 Resend Dashboard
2. 进入 **API Keys** 页面
3. 点击 **Create API Key**
4. 填写信息：
   - **Name**: `ILAL Production API Key`
   - **Permission**: `Full access` 或 `Sending access`
   - **Domain**: 选择你的域名（或使用默认）
5. 复制生成的 API Key（以 `re_` 开头）

### 3. 配置环境变量

编辑 `.env` 文件：

```bash
# ============ 邮件配置 ============
RESEND_API_KEY="re_YourActualAPIKeyHere123456789"
FROM_EMAIL="ILAL <noreply@yourdomain.com>"
```

**注意**:
- `RESEND_API_KEY`: 必须以 `re_` 开头
- `FROM_EMAIL`: 格式为 `名称 <邮箱>`
  - 使用自定义域名：`noreply@yourdomain.com`
  - 使用测试域名：`onboarding@resend.dev`（仅开发环境）

### 4. 验证配置

重启服务并测试：

```bash
npm run dev
```

注册一个新用户，检查：
- 服务器日志中不再显示 "RESEND_API_KEY not set"
- 收件箱中收到验证邮件

---

## 🎨 自定义邮件模板

### 当前邮件模板

邮件模板位于 `src/services/email.service.ts`：

```typescript
// 验证邮件
sendVerificationEmail(to, code, name)

// 密码重置邮件
sendPasswordResetEmail(to, code)
```

### 自定义模板示例

```typescript
// src/services/email.service.ts

export async function sendVerificationEmail(
  to: string,
  code: string,
  name?: string
): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="background-color:#0A0A0A;font-family:sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#111;border-radius:16px;">
        <!-- 你的自定义 HTML -->
        <div style="padding:32px;">
          <p>${greeting}, thanks for signing up for ILAL!</p>
          
          <!-- 验证码 -->
          <div style="background:#1a1a1a;border-radius:12px;padding:20px;text-align:center;">
            <span style="font-size:32px;letter-spacing:8px;color:white;font-family:monospace;">
              ${code}
            </span>
          </div>
          
          <p>This code expires in 15 minutes.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${code} is your ILAL verification code`,
    html,
  });
}
```

---

## 🌐 配置自定义域名（推荐）

使用自己的域名可以提高邮件送达率和品牌形象。

### 步骤 1: 添加域名

1. 在 Resend Dashboard 中进入 **Domains**
2. 点击 **Add Domain**
3. 输入你的域名（例如：`ilal.io`）
4. 点击 **Add**

### 步骤 2: 配置 DNS 记录

Resend 会提供需要添加的 DNS 记录。在你的域名服务商（如 Cloudflare、Namecheap）添加以下记录：

**SPF 记录** (TXT):
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM 记录** (TXT):
```
Type: TXT
Name: resend._domainkey
Value: [Resend 提供的值]
```

**DMARC 记录** (TXT):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

### 步骤 3: 验证域名

在 Resend Dashboard 中点击 **Verify Domain**。验证通过后，你就可以使用自定义域名发送邮件了。

### 步骤 4: 更新 .env

```bash
FROM_EMAIL="ILAL <noreply@ilal.io>"
```

---

## 📊 监控邮件发送

### Resend Dashboard

登录 Resend Dashboard 查看：
- 📈 发送统计
- 📧 邮件日志
- ⚠️ 错误报告
- 📊 送达率

### 应用日志

查看应用日志：

```bash
# 实时日志
tail -f logs/*.log

# 搜索邮件相关日志
grep "Email" logs/*.log
```

---

## 🧪 测试邮件发送

### 方法 1: 使用测试脚本

```bash
# 注册新用户并检查邮箱
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

### 方法 2: 使用 Resend 测试邮箱

Resend 提供测试邮箱功能：

```bash
FROM_EMAIL="ILAL <onboarding@resend.dev>"
```

发送到任何邮箱都会收到邮件，但标记为测试邮件。

---

## ❌ 常见问题

### 1. 邮件未收到

**检查清单**:
- [ ] API Key 是否正确配置
- [ ] `RESEND_API_KEY` 以 `re_` 开头
- [ ] 检查垃圾邮件箱
- [ ] 查看 Resend Dashboard 的日志
- [ ] 确认域名已验证（如使用自定义域名）

**日志检查**:
```bash
grep "Email" logs/*.log | tail -20
```

### 2. 401 Unauthorized 错误

**原因**: API Key 无效或过期

**解决方法**:
1. 重新生成 API Key
2. 更新 `.env` 文件
3. 重启服务

### 3. 550 Domain not verified

**原因**: 使用自定义域名但未完成验证

**解决方法**:
1. 在 Resend Dashboard 验证域名
2. 检查 DNS 记录是否正确
3. 等待 DNS 传播（最多 24 小时）
4. 临时使用 `onboarding@resend.dev`

### 4. 邮件进入垃圾箱

**原因**: 域名信誉问题或缺少 SPF/DKIM 配置

**解决方法**:
1. 配置完整的 SPF、DKIM、DMARC 记录
2. 使用已验证的自定义域名
3. 避免使用垃圾词汇（如 "Free", "Click here"）
4. 保持合理的发送频率

---

## 🔐 安全最佳实践

### 1. 保护 API Key

```bash
# ❌ 错误：提交到 Git
git add .env

# ✅ 正确：添加到 .gitignore
echo ".env" >> .gitignore
```

### 2. 使用环境变量

```bash
# 开发环境
RESEND_API_KEY="re_dev_..."

# 生产环境
RESEND_API_KEY="re_prod_..."
```

### 3. 轮换 API Key

定期轮换 API Key（建议每 6 个月）：

1. 创建新的 API Key
2. 更新生产环境配置
3. 测试邮件发送
4. 删除旧的 API Key

---

## 📈 生产环境配置

### 推荐配置

```bash
# .env.production
RESEND_API_KEY="re_prod_your_key_here"
FROM_EMAIL="ILAL <noreply@ilal.io>"

# 邮件发送频率限制
EMAIL_RATE_LIMIT_MAX=5      # 每小时最多 5 封
EMAIL_RATE_LIMIT_WINDOW=3600 # 1 小时窗口
```

### 监控和告警

设置邮件发送失败告警：

```typescript
// src/services/email.service.ts

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      // ... 发送邮件
    });

    if (!res.ok) {
      // 发送告警到 Slack/Discord
      await notifyAdmin('Email send failed', { to: options.to });
      return false;
    }

    return true;
  } catch (error) {
    // 记录错误
    logger.error('Email service error', { error });
    return false;
  }
}
```

---

## 📚 相关资源

- [Resend 官方文档](https://resend.com/docs)
- [Resend API 参考](https://resend.com/docs/api-reference)
- [邮件最佳实践](https://resend.com/docs/best-practices)
- [域名验证指南](https://resend.com/docs/domain-verification)

---

## ✅ 配置完成检查清单

- [ ] 注册 Resend 账号
- [ ] 创建 API Key
- [ ] 配置 `.env` 文件
- [ ] 测试邮件发送
- [ ] （可选）配置自定义域名
- [ ] （可选）配置 SPF/DKIM/DMARC
- [ ] 监控邮件发送日志

完成这些步骤后，你的邮件服务就完全配置好了！🎉

---

**下一步**: [部署到生产环境](./DEPLOYMENT_GUIDE.md)
