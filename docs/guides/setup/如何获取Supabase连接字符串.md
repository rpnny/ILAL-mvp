# 如何获取 Supabase 连接字符串

## 详细步骤（带截图说明）

### 第一步：登录并找到你的项目

1. 访问：https://app.supabase.com
2. 登录后，你会看到你的项目列表
3. 点击你刚创建的项目（例如：ilal-dev）

---

### 第二步：进入设置页面

在项目页面，**左侧菜单**最下方：

```
🏠 Home
📊 Table Editor
🔍 SQL Editor
🗄️  Database
🔐 Authentication
📁 Storage
🔔 Edge Functions
⚙️  Settings  ← 点击这里！
```

点击 **⚙️ Settings**

---

### 第三步：找到数据库设置

在 Settings 页面，左侧有多个选项：

```
General
API
Database  ← 点击这里！
Auth
Storage
```

点击 **Database**

---

### 第四步：找到连接字符串

向下滚动页面，找到这个部分：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connection string
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

有几个标签：
┌─────────────────────────────────┐
│ [URI]  Nodejs  JDBC  Pooler     │  ← 选择 URI
└─────────────────────────────────┘

下面会显示连接字符串：
postgresql://postgres.[项目ref]:[YOUR-PASSWORD]@[host]:[port]/postgres

[Copy] 按钮  ← 点击复制
```

---

### 第五步：替换密码

复制的字符串中有 `[YOUR-PASSWORD]`，需要替换为你创建项目时设置的密码！

**例如：**

复制得到：
```
postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

你的密码是 `MyPass123`，那么最终字符串是：
```
postgresql://postgres.abcdefgh:MyPass123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## 快速导航

如果你还没创建项目，或者找不到项目：

### 方案 1：直接访问这个链接

`https://app.supabase.com/projects`

这里会显示你所有的项目。

### 方案 2：如果还没创建项目

1. 访问：https://app.supabase.com
2. 点击右上角 **"New project"** 按钮
3. 选择或创建 Organization
4. 填写项目信息：
   - Name: `ilal-dev`
   - Database Password: 设置一个密码（记住！）
   - Region: Singapore 或 Tokyo
   - Plan: Free
5. 点击 **"Create new project"**
6. 等待 1-2 分钟

---

## 备选方案：使用 Supabase CLI

如果网页找不到，也可以用命令行：

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 获取项目信息
supabase projects list

# 获取连接字符串
supabase db dump --db-url
```

---

## 或者，先用 SQLite

如果 Supabase 配置太复杂，我们可以：

1. 先用 SQLite 继续开发（已经完全可用）
2. 等需要部署时再切换到 Supabase
3. 只需要 5 分钟就能切换

**立即切回 SQLite：**
```bash
cd /Users/ronny/Desktop/ilal/apps/api
cp .env.sqlite .env
cp prisma/schema.sqlite.backup prisma/schema.prisma
npx prisma generate
npm run dev
```
