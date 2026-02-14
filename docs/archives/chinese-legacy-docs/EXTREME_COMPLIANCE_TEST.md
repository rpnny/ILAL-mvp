# 极端合规场景测试

**测试日期**: 2026-02-12  
**目的**: 验证系统在边界条件下的 fail-closed 行为

---

## 测试目标

验证 ILAL 系统在以下极端场景下能否**正确拦截**：
1. ✅ 凭证已过期
2. ✅ 凭证已被撤销
3. ✅ Session 链上失效
4. ✅ 刷新页面不会绕过验证

---

## 测试场景 1: 已过期凭证

### 配置

修改 `frontend/.env.local`：
```env
NEXT_PUBLIC_ENABLE_MOCK=true
NEXT_PUBLIC_MOCK_TEST_MODE=expired  # 关键配置
```

### 预期行为

**EAS 查询阶段**：
- ✅ `useEAS` 应检测到 `expirationTime < now`
- ✅ 应设置 `error: "Compliance attestation has expired"`
- ✅ `hasAttestation = true` 但 `attestation = null`

**验证按钮阶段**：
- ✅ 点击 `Start Verification` 后应立即失败
- ✅ 错误提示：`Unable to obtain compliance credentials...`
- ✅ 不应进入 ZK Proof 生成阶段

**UI 显示**：
- ✅ Attestation 状态显示 "Not Found" 或错误信息
- ✅ 验证按钮可点击，但会立即失败

### 测试步骤

1. 修改环境变量（见上方配置）
2. 重启前端服务：`cd frontend && npm run dev`
3. 连接钱包
4. 观察 Coinbase Verification Status 卡片
5. 点击 `Start Verification`
6. 验证是否被正确拦截

### 实际结果

```
[ ] 测试时间: ____________
[ ] EAS 检测到过期: ☐ 是 ☐ 否
[ ] 验证被拦截: ☐ 是 ☐ 否
[ ] 错误提示清晰: ☐ 是 ☐ 否
[ ] 控制台日志: ________________________________
```

---

## 测试场景 2: 已撤销凭证

### 配置

修改 `frontend/.env.local`：
```env
NEXT_PUBLIC_ENABLE_MOCK=true
NEXT_PUBLIC_MOCK_TEST_MODE=revoked  # 关键配置
```

### 预期行为

**EAS 查询阶段**：
- ✅ `useEAS` 应检测到 `revocationTime > 0`
- ✅ 应设置 `error: "Compliance attestation has been revoked"`
- ✅ `hasAttestation = true` 但 `attestation = null`

**验证按钮阶段**：
- ✅ 验证应在第一步被拦截
- ✅ 错误提示应说明凭证已被撤销

### 测试步骤

1. 修改环境变量 `NEXT_PUBLIC_MOCK_TEST_MODE=revoked`
2. 重启前端
3. 连接钱包
4. 点击验证
5. 验证是否正确拦截

### 实际结果

```
[ ] 测试时间: ____________
[ ] EAS 检测到撤销: ☐ 是 ☐ 否
[ ] 验证被拦截: ☐ 是 ☐ 否
[ ] 错误提示清晰: ☐ 是 ☐ 否
```

---

## 测试场景 3: 正常凭证（对照组）

### 配置

修改 `frontend/.env.local`：
```env
NEXT_PUBLIC_ENABLE_MOCK=true
NEXT_PUBLIC_MOCK_TEST_MODE=normal  # 或不设置
```

### 预期行为

- ✅ EAS 查询成功
- ✅ 验证流程可以完整走通
- ✅ Session 激活（本地 Mock Session）
- ✅ UI 显示 "Verification Successful"

### 测试步骤

1. 修改环境变量 `NEXT_PUBLIC_MOCK_TEST_MODE=normal`
2. 重启前端
3. 完成验证流程
4. 确认可以进入已验证状态

### 实际结果

```
[ ] 测试时间: ____________
[ ] 验证成功: ☐ 是 ☐ 否
[ ] Session 激活: ☐ 是 ☐ 否
[ ] UI 显示正确: ☐ 是 ☐ 否
```

---

## 测试场景 4: Session 链上过期（真实场景）

### 配置

**前置条件**：
- 必须已完成真实验证并激活链上 Session
- 等待 24 小时后 Session 自然过期

**或手动模拟**（需要权限）：
```solidity
// 使用具有 VERIFIER_ROLE 的账户调用
SessionManager.endSession(userAddress)
```

### 预期行为

**Trade 页面**：
- ✅ 显示 "Verification Required" 拦截页
- ✅ 无法访问 Swap 功能
- ✅ 引导用户回到首页重新验证

**Liquidity 页面**：
- ✅ 同样被拦截
- ✅ 无法添加流动性

**合约层**：
- ✅ `ComplianceHook.beforeSwap` 返回 `NotVerified(user)`
- ✅ `PositionManager.mint` 返回 `NotVerified(user)`

### 测试步骤

1. 完成真实验证
2. 等待 Session 过期（或手动结束）
3. 尝试访问 Trade / Liquidity
4. 验证是否被拦截

### 实际结果

```
[ ] 测试时间: ____________
[ ] Trade 被拦截: ☐ 是 ☐ 否
[ ] Liquidity 被拦截: ☐ 是 ☐ 否
[ ] 合约拦截生效: ☐ 是 ☐ 否
[ ] 错误提示准确: ☐ 是 ☐ 否
```

---

## 测试场景 5: 刷新页面不会绕过（安全关键）

### 配置

任何模式均可测试

### 测试步骤

1. **未验证状态下**：
   - 访问 `/trade` 或 `/liquidity`
   - 应看到 "Verification Required" 拦截页
   - 刷新页面
   - 验证仍然被拦截（不会变成已验证）

2. **已验证状态下**：
   - 完成验证并激活 Session
   - 访问 `/trade` 正常使用
   - 刷新页面
   - 验证状态保持（链上 Session 仍有效）

3. **Session 过期后**：
   - 等待 Session 过期
   - 刷新页面
   - 应回到未验证状态

### 预期行为

- ✅ 生产模式（`MOCK=false`）：只认链上 Session，刷新不影响
- ✅ Mock 模式（`MOCK=true`）：认本地 Session，但合约仍拦截

### 实际结果

```
[ ] 未验证刷新: ☐ 保持拦截 ☐ 绕过（漏洞）
[ ] 已验证刷新: ☐ 保持验证 ☐ 失效（漏洞）
[ ] 过期后刷新: ☐ 回到未验证 ☐ 仍显示验证（漏洞）
```

---

## 快速测试脚本

```bash
#!/bin/bash
# 极端场景测试一键切换

echo "选择测试场景："
echo "1. 正常凭证（对照组）"
echo "2. 已过期凭证"
echo "3. 已撤销凭证"
read -p "输入选项 (1/2/3): " choice

cd frontend

case $choice in
  1)
    echo "NEXT_PUBLIC_MOCK_TEST_MODE=normal" >> .env.local
    echo "✅ 已设置为正常模式"
    ;;
  2)
    sed -i '' 's/NEXT_PUBLIC_MOCK_TEST_MODE=.*/NEXT_PUBLIC_MOCK_TEST_MODE=expired/' .env.local
    echo "✅ 已设置为过期凭证测试"
    ;;
  3)
    sed -i '' 's/NEXT_PUBLIC_MOCK_TEST_MODE=.*/NEXT_PUBLIC_MOCK_TEST_MODE=revoked/' .env.local
    echo "✅ 已设置为撤销凭证测试"
    ;;
  *)
    echo "无效选项"
    exit 1
    ;;
esac

echo ""
echo "请重启前端服务："
echo "  npm run dev"
```

---

## 测试矩阵

| 场景 | 凭证状态 | EAS 检测 | 验证流程 | 合约拦截 | 预期结果 |
|-----|---------|---------|---------|---------|---------|
| 场景 1 | 已过期 | ✅ 应检测 | ❌ 应拦截 | N/A | 拒绝 |
| 场景 2 | 已撤销 | ✅ 应检测 | ❌ 应拦截 | N/A | 拒绝 |
| 场景 3 | 正常 | ✅ 通过 | ✅ 通过 | ✅ Mock会拦截 | UI通过 |
| 场景 4 | 正常 | ✅ 通过 | ✅ 通过 | ✅ 链上Session过期 | 合约拒绝 |
| 场景 5 | 任意 | - | - | ✅ 刷新测试 | 状态一致 |

---

## 验证清单

### 前端层拦截
- [ ] EAS 正确检测过期凭证
- [ ] EAS 正确检测撤销凭证
- [ ] 验证流程在第一步拦截
- [ ] 错误提示清晰准确

### 合约层拦截
- [ ] ComplianceHook 检查 SessionManager
- [ ] Session 过期后 Swap 被拒绝
- [ ] Session 过期后 Add Liquidity 被拒绝
- [ ] 返回正确的错误签名

### 安全性
- [ ] 刷新页面不会绕过验证
- [ ] Mock 模式无法完成链上交易
- [ ] 生产模式只认链上 Session
- [ ] 本地 Session 不影响合约判断

---

## 当前测试配置

我已经为你设置了：

```env
NEXT_PUBLIC_ENABLE_MOCK=true
NEXT_PUBLIC_MOCK_TEST_MODE=expired  # 🧪 过期凭证测试
```

**现在你可以**：

1. **重启前端**：`cd frontend && npm run dev`
2. **连接钱包**
3. **观察首页**：Coinbase Verification Status 应该显示错误
4. **点击验证**：应该立即被拦截，显示：
   - `"Compliance attestation has expired (expired at ...)"`
5. **验证拦截生效**：无法进入 Trade / Liquidity

---

## 测试后切换

### 切回正常 Mock 模式
```bash
# 改 .env.local
NEXT_PUBLIC_MOCK_TEST_MODE=normal
```

### 切回真实模式
```bash
# 改 .env.local
NEXT_PUBLIC_ENABLE_MOCK=false
# 注释掉或删除 NEXT_PUBLIC_MOCK_TEST_MODE
```

---

## 测试意义

这个测试能证明：

1. **系统不是"橡皮图章"**
   - 不是所有 Attestation 都放行
   - 有真实的合规校验逻辑

2. **Fail-closed 策略有效**
   - 凭证有问题时系统拒绝
   - 不会因为"有凭证"就盲目通过

3. **多层防御有效**
   - 前端层：EAS 检测拦截
   - 合约层：SessionManager 拦截
   - 两层都生效才能保证安全

4. **安全边界清晰**
   - Mock 只影响前端
   - 合约不受 Mock 影响
   - 真实交易必须真实凭证

---

**开始测试**: 重启前端，连接钱包，观察拦截行为 🧪
