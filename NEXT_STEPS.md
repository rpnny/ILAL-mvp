# 🎯 ILAL 下一步行动指南

**更新时间**: 2026-02-10  
**当前状态**: Phase 0 决策完成 ✅ → 进入 Phase 3 实施

---

## ✅ Phase 0: 关键决策已完成

### 决策结果

1. **ZK 算法**: ✅ PLONK
   - 理由：Universal Setup，极高的迭代灵活性
   - Gas 差异可忽略（Base L2 环境）
   
2. **Hook 方案**: ✅ hookData + EIP-712
   - 理由：安全性最高，不依赖 Router 接口
   - 支持三种模式（签名/EOA/白名单）
   
3. **升级策略**: ✅ UUPS 代理
   - Registry 和 SessionManager 已实现

### 已完成的实施

- [x] 创建决策文档 (`DECISIONS.md`)
- [x] 实现 EIP712Verifier 库
- [x] 更新 ComplianceHook 集成 EIP-712
- [x] 编写 EIP-712 单元测试
- [x] 创建 PLONK 电路文档和框架
- [x] 编写前端签名示例代码

---

## 🚀 立即行动（本周）

### 1. 安装和验证环境 ⚡ (30 分钟)

```bash
# 1. 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 2. 安装合约依赖
cd contracts
./install-deps.sh

# 3. 运行测试（包括新的 EIP-712 测试）
forge test -vvv

# 4. 查看 Gas 报告
forge test --gas-report

# 预期结果：所有测试通过，EIP-712 验证 < 10k gas
```

### 2. 安装 ZK 工具链 🔧 (1-2 小时)

```bash
# 1. 安装 Rust (Circom 依赖)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 安装 Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
circom --version  # 验证

# 3. 安装 SnarkJS
npm install -g snarkjs@latest
snarkjs --version  # 验证

# 4. 下载 Powers of Tau
cd /Users/ronny/Desktop/ilal/circuits
mkdir -p keys
cd keys
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau \
     -O pot20_final.ptau

# 预期：pot20_final.ptau ~100 MB
```

### 3. 内部代码审查 📝 (2-3 小时)

组织技术团队审查已完成的代码：

- [ ] Registry 合约 (UUPS 升级逻辑)
- [ ] SessionManager 合约 (Gas 优化)
- [ ] ComplianceHook 合约 (EIP-712 集成)
- [ ] EIP712Verifier 库 (签名验证)
- [ ] 所有单元测试

**检查要点**:
- 权限控制是否严格
- Gas 优化是否到位
- 事件日志是否完整
- 错误处理是否合理

---

## 📅 Phase 3: ZK 电路开发（2-3 周）

### Week 1: 电路设计和实现

#### Day 1-2: 电路架构设计

- [ ] 绘制电路流程图
- [ ] 确定公共/私有输入
- [ ] 设计约束逻辑
- [ ] 评估电路复杂度

#### Day 3-5: 实现核心电路

```bash
cd /Users/ronny/Desktop/ilal/circuits

# 1. 创建主电路文件
vim compliance.circom
```

**需要实现的组件**:
- [ ] EdDSA 签名验证（使用 circomlib）
- [ ] Merkle 树验证
- [ ] KYC 状态检查
- [ ] 国家代码验证（可选）
- [ ] 地址绑定约束

**参考代码**:
```circom
pragma circom 2.1.0;

include "circomlib/circuits/eddsamimc.circom";
include "circomlib/circuits/mimc.circom";
include "circomlib/circuits/comparators.circom";

template ComplianceVerifier() {
    // 公共输入
    signal input userAddress;
    signal input merkleRoot;
    
    // 私有输入
    signal input signature[3];
    signal input kycPassed;
    
    // 约束逻辑
    // TODO: 实现
}

component main = ComplianceVerifier();
```

### Week 2: 编译和测试

#### Day 1-2: 编译电路

```bash
# 编译
circom compliance.circom --r1cs --wasm --sym -o build

# 检查约束数量
snarkjs r1cs info build/compliance.r1cs

# 预期：约束数 < 100k (保持简单)
```

#### Day 3-4: PLONK Setup

```bash
# 生成 zkey
snarkjs plonk setup \
    build/compliance.r1cs \
    keys/pot20_final.ptau \
    keys/compliance.zkey

# 导出 Solidity Verifier
snarkjs zkey export solidityverifier \
    keys/compliance.zkey \
    ../contracts/src/core/PlonkVerifier.sol
```

#### Day 5: 测试证明生成

- [ ] 准备测试输入
- [ ] 生成测试证明
- [ ] 本地验证通过
- [ ] 测量证明生成时间

### Week 3: 集成和优化

#### Day 1-2: 合约集成

- [ ] 替换 MockVerifier 为 PlonkVerifier
- [ ] 更新部署脚本
- [ ] 编写 Verifier 测试

#### Day 3-4: 前端集成

- [ ] 实现 Web Worker 证明生成
- [ ] 测试浏览器性能
- [ ] 优化 .wasm/.zkey 加载

#### Day 5: 端到端测试

- [ ] 完整流程测试
- [ ] Gas 成本验证
- [ ] 性能基准测试

---

## 📋 Phase 4-5: 前端和子图（3-4 周）

### Week 1-2: Next.js 前端

**初始化**:
```bash
cd /Users/ronny/Desktop/ilal
npx create-next-app@latest frontend \
    --typescript --tailwind --app

cd frontend
npm install wagmi viem @rainbow-me/rainbowkit
npm install snarkjs
```

**核心功能**:
- [ ] 钱包连接 (RainbowKit)
- [ ] Session 状态显示
- [ ] ZK 证明生成 UI
- [ ] EIP-712 签名集成
- [ ] Swap 界面
- [ ] LP 管理界面

### Week 3: The Graph 子图

```bash
cd /Users/ronny/Desktop/ilal/subgraph
graph init --from-contract <REGISTRY_ADDRESS> \
    --network base \
    --contract-name Registry
```

**实体定义**:
- [ ] Issuer
- [ ] Session
- [ ] Swap
- [ ] LiquidityPosition
- [ ] EmergencyEvent

---

## 🧪 Phase 6: 集成测试（2-3 周）

### Week 1: 端到端测试

```solidity
// contracts/test/integration/E2E.t.sol

// 测试完整流程:
// 1. 部署所有合约
// 2. 用户生成 ZK Proof
// 3. 验证并开启 Session
// 4. 生成 EIP-712 签名
// 5. 执行 Swap 成功
// 6. Session 过期后交易失败
```

### Week 2: Invariant Testing

```solidity
// contracts/test/invariant/Compliance.t.sol

// 不变性测试:
// - 未验证用户余额不变
// - Session nonce 单调递增
// - Emergency 时所有操作失败
```

### Week 3: 压力测试和优化

- [ ] Gas 优化
- [ ] 大量用户并发测试
- [ ] 紧急场景演练

---

## 🔐 Phase 7: 安全审计和部署（2-3 周）

### Week 1: 内部审计

- [ ] 代码审查
- [ ] 静态分析 (Slither)
- [ ] Mythril 扫描
- [ ] 手动安全检查

### Week 2: 外部审计

- [ ] 选择审计公司
- [ ] 提交代码和文档
- [ ] 配合审计流程
- [ ] 修复发现的问题

### Week 3: Base Sepolia 部署

```bash
# 测试网部署
source .env
forge script script/Deploy.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify
```

**验证清单**:
- [ ] 所有合约部署成功
- [ ] 合约验证通过
- [ ] 初始配置正确
- [ ] 测试交易成功

---

## 📈 Phase 8: 主网部署和运维（1 周）

### 部署前检查

- [ ] 审计报告已发布
- [ ] 所有测试通过
- [ ] 文档完整
- [ ] 监控系统就绪
- [ ] 紧急响应流程就绪
- [ ] 多签配置验证

### Base Mainnet 部署

```bash
# 主网部署 (谨慎!)
forge script script/Deploy.s.sol \
    --rpc-url $BASE_RPC_URL \
    --broadcast \
    --verify \
    --slow
```

### 部署后任务

- [ ] 合约验证
- [ ] 前端更新地址
- [ ] 子图部署
- [ ] 启动做市机器人
- [ ] 监控告警配置
- [ ] 社区公告

---

## 🛠️ 运维工具开发

### 监控脚本

```bash
cd /Users/ronny/Desktop/ilal/scripts
touch monitor.ts governance.ts market-maker.ts
```

**功能**:
- [ ] Session 事件监听
- [ ] Emergency 告警
- [ ] Gas 价格追踪
- [ ] 异常交易检测

### 做市机器人

```typescript
// scripts/market-maker.ts
// 
// 功能:
// - 提供初始流动性
// - 定期小额交易
// - 动态价格调整
```

---

## 📊 进度跟踪

### 完成度

| 阶段 | 完成度 | 状态 |
|------|--------|------|
| Phase 0 (决策) | 100% | ✅ 完成 |
| Phase 1-2 (合约) | 90% | ✅ 基本完成 |
| Phase 3 (ZK) | 0% | 🔄 准备开始 |
| Phase 4 (前端) | 0% | 📋 待启动 |
| Phase 5 (子图) | 0% | 📋 待启动 |
| Phase 6 (测试) | 20% | 🔄 单元测试完成 |
| Phase 7 (部署) | 0% | 📋 待启动 |
| Phase 8 (运维) | 0% | 📋 待启动 |

**总体进度**: 约 45%

### 时间估算

| 阶段 | 预计时间 | 开始时间 | 完成时间 |
|------|----------|----------|----------|
| Phase 3 | 2-3 周 | 本周 | Week 3-4 |
| Phase 4 | 2-3 周 | Week 4 | Week 6-7 |
| Phase 5 | 1 周 | Week 7 | Week 8 |
| Phase 6 | 2-3 周 | Week 8 | Week 10-11 |
| Phase 7 | 2-3 周 | Week 11 | Week 13-14 |
| Phase 8 | 1 周 | Week 14 | Week 15 |

**预计完成**: 约 15 周 (3.5 个月)

---

## 🚨 风险和阻塞问题

### 高优先级

1. **Circom 安装** 🔴
   - 依赖 Rust 编译环境
   - 可能遇到编译问题

2. **电路复杂度** 🟡
   - 需要平衡安全性和性能
   - 约束数量需要控制

3. **前端 WASM 性能** 🟡
   - 大文件加载可能慢
   - 需要优化策略

### 缓解措施

- 提前安装和测试工具链
- 从简单电路开始迭代
- 使用 Web Worker 和压缩

---

## 📞 支持和资源

### 技术支持

- **Circom**: https://discord.gg/circom
- **SnarkJS**: GitHub Issues
- **Uniswap v4**: https://discord.gg/uniswap

### 学习资源

- [Circom 官方教程](https://docs.circom.io/)
- [ZK Whiteboard Sessions](https://zkhack.dev/)
- [PLONK 论文](https://eprint.iacr.org/2019/953.pdf)

---

## ✅ 本周任务清单

**优先级 P0 (必须完成)**:
- [ ] 安装 Foundry 并验证测试通过
- [ ] 安装 Circom 和 SnarkJS
- [ ] 下载 Powers of Tau
- [ ] 内部代码审查

**优先级 P1 (重要)**:
- [ ] 设计电路架构
- [ ] 准备测试输入数据
- [ ] 创建电路开发分支

**优先级 P2 (可选)**:
- [ ] 前端项目初始化
- [ ] 文档完善

---

**祝开发顺利！** 🚀

有任何问题随时反馈。
