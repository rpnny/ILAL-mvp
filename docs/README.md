# ILAL 项目文档导航

欢迎查阅 ILAL 项目文档！为了方便查找，文档已按类别整理。

---

## 📊 测试与报告（testing/）

**最重要的文档，优先阅读！**

- **[PROJECT_REPORT.md](./testing/PROJECT_REPORT.md)** ⭐⭐⭐
  - 完整的最终项目报告
  - 涵盖架构、功能、测试、部署全貌
  - 适合展示给外部合作方、投资人

- **[FINAL_SUMMARY_20260211.md](./testing/FINAL_SUMMARY_20260211.md)** ⭐⭐
  - 2026-02-11 阶段性工作总结
  - 开发历程与关键修复记录

- **[CODE_HEALTH_CHECK.md](./testing/CODE_HEALTH_CHECK.md)**
  - 代码质量检查报告
  - Lint、类型检查、安全审计结果

- **[CODE_STATISTICS.md](./testing/CODE_STATISTICS.md)**
  - 项目代码统计信息
  - 文件数量、代码行数等

- **[TEST_REPORT.md](./testing/TEST_REPORT.md)**
  - 完整测试报告
  - 功能测试、集成测试结果

- **[TEST_SUMMARY.txt](./testing/TEST_SUMMARY.txt)**
  - 测试结果简要总结

---

## 📖 开发指南（guides/）

**技术文档与操作指南**

- **[ARCHITECTURE.md](./guides/ARCHITECTURE.md)** ⭐
  - 系统架构设计文档
  - 技术栈、组件关系、数据流

- **[DEPLOYMENT.md](./guides/DEPLOYMENT.md)** ⭐
  - 部署操作手册
  - 环境配置、部署步骤、验证方法

- **[COMPLETE_DEPLOYMENT_SUMMARY.md](./guides/COMPLETE_DEPLOYMENT_SUMMARY.md)**
  - 完整部署总结
  - 所有部署的合约地址与配置

- **[SWAP_DEBUG_GUIDE.md](./guides/SWAP_DEBUG_GUIDE.md)**
  - Swap 功能调试指南
  - 常见错误码与解决方案

---

## 🗄️ 归档文档（archives/）

**历史记录与清理文档**

- **[CLEANUP_PLAN.md](./archives/CLEANUP_PLAN.md)**
  - 项目文件清理方案
  - 保留/删除文件清单

- **[CLEANUP_SUMMARY.md](./archives/CLEANUP_SUMMARY.md)**
  - 清理执行总结
  - 清理前后对比

---

## 🚀 快速入口

### 我是新人，想快速了解项目
→ 阅读 **[PROJECT_REPORT.md](./testing/PROJECT_REPORT.md)**

### 我要部署系统
→ 参考 **[DEPLOYMENT.md](./guides/DEPLOYMENT.md)**

### 我要了解架构
→ 阅读 **[ARCHITECTURE.md](./guides/ARCHITECTURE.md)**

### 遇到 Swap 报错
→ 查看 **[SWAP_DEBUG_GUIDE.md](./guides/SWAP_DEBUG_GUIDE.md)**

### 想看测试结果
→ 参考 **[TEST_REPORT.md](./testing/TEST_REPORT.md)**

---

## 📂 其他文档位置

### 前端相关
- `frontend/WALLET_CONNECTION_DEBUG.md` - 钱包连接调试
- `frontend/TROUBLESHOOTING.md` - 前端故障排除

### 合约相关
- `contracts/slither-report.json` - Slither 安全审计报告

### 根目录
- `README.md` - 项目英文说明
- `README_CN.md` - 项目中文说明
- `LICENSE` - 开源许可证

---

## 📝 文档维护规范

1. **测试与报告** → `docs/testing/`
   - 测试报告、代码检查、项目总结、最终报告等

2. **指南文档** → `docs/guides/`
   - 架构设计、部署手册、调试指南、用户手册等

3. **归档文档** → `docs/archives/`
   - 历史记录、清理文档、过时文档、修复记录等

4. **临时调试文档** → 调试完成后删除或移至 archives/

---

**最后更新**: 2026-02-12  
**文档结构版本**: v2.0（整理后）
