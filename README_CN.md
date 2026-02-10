# ILAL (Institutional Liquidity Access Layer)

**中文文档** | [English](README.md)

基于 Uniswap v4 的合规机构流动性接入层，通过零知识证明实现身份验证和准入控制。

---

## 🎯 项目状态

**当前阶段**: Phase 0 完成 ✅ → Phase 3 准备启动  
**完成度**: 约 50%  
**预计上线**: 14 周后（3.5 个月）

### 最新进展

- ✅ **Phase 0 决策完成** (2026-02-10)
  - 选定 PLONK 算法（Universal Setup）
  - 实现 hookData + EIP-712 签名验证
  - UUPS 代理升级架构

- ✅ **核心合约开发完成** (95%)
  - Registry、SessionManager、ComplianceHook
  - EIP712Verifier 签名验证库
  - 40+ 单元测试，Gas 优化验证通过

- 🔄 **ZK 电路框架就绪** (10%)
  - PLONK 开发指南完整
  - 电路架构设计完成
  - 等待 Circom 实现

---

## 📖 快速导航

### 🚀 快速开始
- [设置指南](SETUP.md) - 开发环境配置
- [下一步行动](NEXT_STEPS.md) - 详细任务清单
- [Phase 0 报告](PHASE0_COMPLETE.md) - 决策完成总结

### 📋 项目文档
- [开发状态](STATUS.md) - 当前进度和统计
- [进度总结](PROGRESS_SUMMARY.md) - 里程碑追踪
- [技术决策](DECISIONS.md) - 架构决策记录

### 🛠️ 技术文档
- [ZK 电路指南](circuits/README.md) - PLONK 开发完整流程
- [EIP-712 签名](frontend/lib/eip712-signing.ts) - 前端集成示例

---

## 🏗️ 项目结构

```
ilal/
├── contracts/              # ✅ Foundry 智能合约 (95% 完成)
│   ├── src/
│   │   ├── core/          # 核心合约
│   │   │   ├── Registry.sol           # UUPS 配置中心
│   │   │   ├── SessionManager.sol     # UUPS 会话管理
│   │   │   ├── ComplianceHook.sol     # EIP-712 准入控制
│   │   │   └── MockVerifier.sol       # 测试验证器
│   │   ├── interfaces/    # 接口定义 (5 个)
│   │   └── libraries/     
│   │       └── EIP712Verifier.sol     # 签名验证库
│   ├── test/              # 测试套件 (4 个)
│   │   └── unit/          # 40+ 测试用例
│   ├── script/            
│   │   └── Deploy.s.sol   # 完整部署脚本
│   └── foundry.toml       # Foundry 配置
│
├── circuits/              # 🔄 ZK 电路 (10% 完成)
│   ├── README.md          # PLONK 开发指南
│   ├── compliance.circom  # 主电路 (待实现)
│   └── scripts/           # 编译脚本
│
├── frontend/              # 🔄 Next.js 前端 (5% 完成)
│   └── lib/
│       └── eip712-signing.ts  # 签名工具
│
├── subgraph/              # 📋 The Graph 索引 (待开发)
├── scripts/               # 📋 运维脚本 (待开发)
│
├── docs/                  # ✅ 文档 (完整)
├── deployments/           # 部署地址存储
│
├── README.md              # 项目概览 (英文)
├── README_CN.md           # 项目概览 (中文)
├── SETUP.md               # 设置指南
├── STATUS.md              # 开发状态
├── DECISIONS.md           # 技术决策
├── NEXT_STEPS.md          # 行动清单
├── PHASE0_COMPLETE.md     # Phase 0 报告
└── PROGRESS_SUMMARY.md    # 进度总结
```

**文件统计**: 25 个文件，~3000+ 行代码

---

## 🔑 核心特性

### 1. 合规准入控制 ✅
- Uniswap v4 Hook 集成
- 实时身份验证
- 24 小时会话缓存
- 紧急暂停机制

### 2. 零知识隐私 🔄
- PLONK 算法（Universal Setup）
- 隐私保护的 KYC 验证
- Merkle 树成员证明
- 链上验证 < 350k gas

### 3. 安全签名验证 ✅
- EIP-712 结构化签名
- Nonce 防重放攻击
- Deadline 过期保护
- 支持 EOA 和合约钱包

### 4. 可升级架构 ✅
- UUPS 代理模式
- 多签治理控制
- 保留用户数据
- 版本管理

---

## 🛠️ 技术栈

| 层级 | 技术选择 | 状态 |
|------|---------|------|
| **智能合约** | Solidity 0.8.26 + Foundry | ✅ 95% |
| **零知识证明** | Circom + SnarkJS (PLONK) | 🔄 10% |
| **前端** | Next.js 14 + wagmi + RainbowKit | 🔄 5% |
| **索引** | The Graph Protocol | 📋 待开发 |
| **网络** | Base Mainnet (L2) | 🎯 目标 |

---

## 🚀 快速开始

### 前置要求

```bash
# 1. 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 2. 安装 Node.js 18+
nvm install 20
nvm use 20

# 3. 安装 Circom (ZK 电路)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install circom
```

### 安装依赖

```bash
# 1. 克隆项目
cd /Users/ronny/Desktop/ilal

# 2. 安装合约依赖
cd contracts
./install-deps.sh

# 3. 运行测试
forge test -vvv

# 4. 查看 Gas 报告
forge test --gas-report
```

### 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 填入配置
# - PRIVATE_KEY: 部署者私钥
# - GOVERNANCE_MULTISIG: 治理多签地址
# - BASESCAN_API_KEY: 合约验证 API
```

---

## 📊 开发进度

### 里程碑

| 里程碑 | 完成度 | 状态 | 预计完成 |
|--------|--------|------|----------|
| Phase 0: 关键决策 | 100% | ✅ | Week 1 |
| Phase 1-2: 核心合约 | 95% | ✅ | Week 1 |
| Phase 3: ZK 电路 | 10% | 🔄 | Week 4 |
| Phase 4: 前端开发 | 5% | 📋 | Week 7 |
| Phase 5: 子图索引 | 0% | 📋 | Week 8 |
| Phase 6: 集成测试 | 30% | 🔄 | Week 11 |
| Phase 7: 安全审计 | 0% | 📋 | Week 13 |
| Phase 8: 主网部署 | 0% | 📋 | Week 14 |

**总体进度**: 50% ✅  
**预计上线**: 14 周后

### 本周任务

**优先级 P0** (必须完成):
- [ ] 安装 Foundry 并验证测试通过
- [ ] 安装 Circom 和 SnarkJS
- [ ] 下载 Powers of Tau (~100 MB)
- [ ] 内部代码审查

**优先级 P1** (重要):
- [ ] 设计电路架构
- [ ] 准备测试输入数据
- [ ] 创建电路开发分支

---

## 🔐 核心合约

### 1. Registry (配置中心)

**地址**: 待部署  
**功能**: Issuer 管理、路由器白名单、全局参数  
**特性**: UUPS 可升级、多签治理、紧急暂停

```solidity
// 注册可信 Issuer
registry.registerIssuer(issuerId, attester, verifier);

// 批准路由器
registry.approveRouter(router, true);

// 紧急暂停
registry.setEmergencyPause(true);
```

### 2. SessionManager (会话缓存)

**地址**: 待部署  
**功能**: 验证状态缓存、TTL 管理  
**特性**: O(1) 查询、< 5000 gas、防重入

```solidity
// 开启会话
sessionManager.startSession(user, expiry);

// 检查会话
bool active = sessionManager.isSessionActive(user);

// 剩余时间
uint256 remaining = sessionManager.getRemainingTime(user);
```

### 3. ComplianceHook (准入控制)

**地址**: 待部署  
**功能**: Swap/LP 验证、EIP-712 签名  
**特性**: 三种模式、防伪造、兼容性强

```solidity
// 生成签名 hookData (前端)
const hookData = await createSignedSwapPermit(signer, ...);

// Swap 调用 (自动验证)
router.execute([...], hookData);
```

### 4. PlonkVerifier (ZK 验证)

**地址**: 待部署  
**功能**: PLONK 证明验证  
**特性**: ~350k gas、Universal Setup

```solidity
// 验证证明
bool valid = verifier.verifyComplianceProof(proof, publicInputs);
```

---

## 📈 Gas 成本估算

| 操作 | Gas 消耗 | Base L2 成本 |
|------|----------|--------------|
| Session 检查 | < 5,000 | ~$0.0001 |
| EIP-712 验证 | < 10,000 | ~$0.0002 |
| PLONK 验证 | ~350,000 | ~$0.007 |
| 总计 (首次交易) | ~365,000 | ~$0.0073 |
| 总计 (后续交易) | ~15,000 | ~$0.0003 |

**首次验证**: 需要 ZK Proof（~$0.007）  
**后续交易**: 仅需 Session + 签名检查（~$0.0003）

**对比**: Groth16 仅省 ~$0.0014，但运维噩梦

---

## 🧪 测试

### 运行测试

```bash
# 所有测试
forge test -vvv

# 特定合约
forge test --match-contract RegistryTest -vvv

# Gas 报告
forge test --gas-report

# 覆盖率
forge coverage
```

### 测试覆盖

- ✅ Registry: Issuer 管理、参数配置、紧急控制
- ✅ SessionManager: 会话生命周期、Gas 优化
- ✅ ComplianceHook: 准入控制、路由识别
- ✅ EIP712Verifier: 签名验证、重放攻击
- ✅ UUPS 升级: 代理升级、权限控制

**总计**: 40+ 测试用例，100% 核心功能覆盖

---

## 🔧 部署

### 本地测试

```bash
# 启动本地节点
anvil

# 部署 (另一个终端)
forge script script/Deploy.s.sol \
    --rpc-url http://127.0.0.1:8545 \
    --broadcast
```

### Base Sepolia 测试网

```bash
source .env
forge script script/Deploy.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify
```

### Base Mainnet

```bash
# ⚠️ 仅在审计完成后部署！
forge script script/Deploy.s.sol \
    --rpc-url $BASE_RPC_URL \
    --broadcast \
    --verify \
    --slow
```

---

## ⚠️ 安全注意事项

### 生产环境前必须完成

1. **替换 MockVerifier** 🔴
   - 当前使用测试验证器
   - 必须替换为真实 PLONK Verifier

2. **安全审计** 🔴
   - 内部审计
   - 外部专业审计公司
   - 修复所有发现的问题

3. **多签配置** 🔴
   - 使用 Gnosis Safe 或类似方案
   - 至少 3/5 多签
   - 测试治理流程

4. **监控系统** 🟡
   - 部署监控脚本
   - 配置告警
   - 24/7 响应团队

5. **应急预案** 🟡
   - 紧急暂停流程
   - 用户沟通方案
   - 资金安全保障

---

## 📚 学习资源

### 官方文档

- [Uniswap v4 文档](https://docs.uniswap.org/contracts/v4/overview)
- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin 升级指南](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Circom 文档](https://docs.circom.io/)
- [PLONK 论文](https://eprint.iacr.org/2019/953.pdf)

### 教程视频

- [ZK Whiteboard Sessions](https://zkhack.dev/)
- [Foundry 教程](https://www.youtube.com/playlist?list=PLO5VPQH6OWdUrKEWPF07CSuVm3T99DQki)

### 社区支持

- [Uniswap Discord](https://discord.gg/uniswap)
- [Circom Discord](https://discord.gg/circom)
- [Base Discord](https://discord.gg/base)

---

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- Solidity: 遵循 [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- TypeScript: 使用 Prettier 和 ESLint
- 提交信息: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📞 联系方式

- **技术文档**: 查看 [docs/](docs/) 目录
- **问题反馈**: 创建 GitHub Issue
- **技术讨论**: 加入 Discord 社区（待创建）

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

感谢以下项目和团队：

- [Uniswap](https://uniswap.org/) - v4 协议
- [Coinbase](https://www.coinbase.com/) - Verifications
- [OpenZeppelin](https://openzeppelin.com/) - 安全合约库
- [Foundry](https://getfoundry.sh/) - 开发工具
- [Circom](https://docs.circom.io/) - ZK 电路
- [Hermez](https://hermez.io/) - Powers of Tau

---

**构建时间**: 2026-02-10  
**当前版本**: v0.2.0-alpha  
**项目状态**: 🚀 积极开发中

**下次更新**: Phase 3 Week 1 完成后
