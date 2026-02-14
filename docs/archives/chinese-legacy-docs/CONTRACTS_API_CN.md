# ILAL 合约 API 文档

## 核心合约

### Registry

配置中心合约，管理 Issuer、路由器白名单和全局参数。

**地址**: `0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD` (Base Sepolia)

#### 主要功能

##### registerIssuer

注册新的身份验证发行者。

```solidity
function registerIssuer(
    bytes32 issuerId,
    address attester,
    address verifier
) external onlyRole(GOVERNANCE_ROLE)
```

**参数**:
- `issuerId`: Issuer 唯一标识符（如 `keccak256("Coinbase")`）
- `attester`: EAS 认证地址
- `verifier`: ZK 验证器地址

**事件**: `IssuerRegistered(bytes32 indexed issuerId, address indexed attester, address indexed verifier)`

##### updateIssuer

更新现有 Issuer 的验证器地址。

```solidity
function updateIssuer(
    bytes32 issuerId,
    address newVerifier
) external onlyRole(GOVERNANCE_ROLE)
```

##### revokeIssuer

撤销 Issuer 资格。

```solidity
function revokeIssuer(bytes32 issuerId) external onlyRole(GOVERNANCE_ROLE)
```

##### approveRouter

批准或撤销路由器地址。

```solidity
function approveRouter(
    address router,
    bool approved
) external onlyRole(GOVERNANCE_ROLE)
```

##### setSessionTTL

设置 Session 默认过期时间。

```solidity
function setSessionTTL(uint256 newTTL) external onlyRole(GOVERNANCE_ROLE)
```

**默认值**: 86400 秒（24小时）

##### setEmergencyPause

紧急暂停/恢复系统。

```solidity
function setEmergencyPause(bool paused) external onlyRole(EMERGENCY_ROLE)
```

#### 查询函数

```solidity
// 获取 Issuer 信息
function getIssuer(bytes32 issuerId) external view returns (
    address attester,
    address verifier,
    bool isActive
);

// 检查路由器是否被批准
function isRouterApproved(address router) external view returns (bool);

// 获取 Session TTL
function getSessionTTL() external view returns (uint256);

// 检查是否紧急暂停
function isEmergencyPaused() external view returns (bool);
```

---

### SessionManager

会话管理合约，缓存用户验证状态。

**地址**: `0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2` (Base Sepolia)

#### 主要功能

##### startSession

为用户开启新的 Session（仅 VERIFIER_ROLE）。

```solidity
function startSession(
    address user,
    uint256 expiry
) external onlyRole(VERIFIER_ROLE)
```

**参数**:
- `user`: 用户地址
- `expiry`: 过期时间戳

**Gas 消耗**: ~45,000 gas

##### batchStartSessions

批量开启 Session。

```solidity
function batchStartSessions(
    address[] calldata users,
    uint256[] calldata expiries
) external onlyRole(VERIFIER_ROLE)
```

##### endSession

手动结束 Session。

```solidity
function endSession(address user) external onlyRole(VERIFIER_ROLE)
```

#### 查询函数

```solidity
// 检查 Session 是否有效
function isSessionActive(address user) external view returns (bool);

// 获取剩余时间
function getRemainingTime(address user) external view returns (uint256);

// 获取 Session 信息
function getSession(address user) external view returns (
    uint256 expiry,
    bool isActive
);
```

**Gas 消耗**: ~3,000 gas (读取)

---

### ComplianceHook

Uniswap v4 准入控制 Hook。

**地址**: `0x3407E999DD5d96CD53f8ce17731d4B16C9429cE2` (Base Sepolia)

#### Hook 函数

##### beforeSwap

Swap 前的验证检查。

```solidity
function beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external returns (
    bytes4,
    BeforeSwapDelta,
    uint24
)
```

**验证流程**:
1. 检查紧急暂停状态
2. 验证路由器白名单
3. 解析 hookData 获取用户地址
4. 检查用户 Session 状态

**hookData 格式**:
- **EOA**: `abi.encodePacked(userAddress)` (20 bytes)
- **EIP-712**: `abi.encode(Signature)` (动态长度)

##### beforeAddLiquidity

添加流动性前的验证。

```solidity
function beforeAddLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external returns (bytes4)
```

##### beforeRemoveLiquidity

移除流动性前的验证。

```solidity
function beforeRemoveLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external returns (bytes4)
```

#### 事件

```solidity
event AccessGranted(address indexed user, bytes32 indexed poolId);
event AccessDenied(address indexed user, bytes32 indexed poolId, string reason);
```

---

### PlonkVerifier

PLONK 零知识证明验证器（自动生成）。

**地址**: `0x2645C48A7DB734C9179A195C51Ea5F022B86261f` (Base Sepolia)

#### 主要函数

##### verifyProof

验证 PLONK 证明。

```solidity
function verifyProof(
    uint256[24] calldata proof,
    uint256[3] calldata pubSignals
) external view returns (bool)
```

**参数**:
- `proof`: PLONK 证明数据（24个字段）
- `pubSignals`: 公共输入
  - `[0]`: userAddress
  - `[1]`: merkleRoot
  - `[2]`: issuerPubKeyHash

**返回**: `true` 表示证明有效

**Gas 消耗**: ~350,000 gas

---

### PlonkVerifierAdapter

PLONK 验证器适配器，简化调用接口。

**地址**: `0x0cDcD82E5efba9De4aCc255402968397F323AFBB` (Base Sepolia)

#### 主要函数

##### verifyAndExtractUser

验证证明并提取用户地址。

```solidity
function verifyAndExtractUser(
    bytes calldata proofData,
    uint256[3] calldata pubSignals
) external view returns (address userAddr, bool isValid)
```

**使用示例**:

```solidity
(address user, bool valid) = adapter.verifyAndExtractUser(proof, pubInputs);
require(valid, "Invalid proof");
```

---

## 集成示例

### 前端集成

#### 1. 连接钱包并开启 Session

```typescript
import { createPublicClient, createWalletClient } from 'viem';
import { generateProof } from './zk-proof';

// 1. 生成 ZK Proof
const { proof, publicSignals } = await generateProof(userData);

// 2. 验证并开启 Session
const tx = await walletClient.writeContract({
  address: sessionManagerAddress,
  abi: sessionManagerABI,
  functionName: 'startSession',
  args: [userAddress, expiry],
});

await publicClient.waitForTransactionReceipt({ hash: tx });
```

#### 2. 执行 Swap

```typescript
import { createPoolKey, encodeSwapParams } from './uniswap-v4';

// 1. 创建 PoolKey
const poolKey = createPoolKey(
  token0Address,
  token1Address,
  fee,
  tickSpacing,
  complianceHookAddress
);

// 2. 构建 Swap 参数
const swapParams = {
  zeroForOne: true,
  amountSpecified: -parseUnits('100', 6), // 100 USDC
  sqrtPriceLimitX96: MIN_SQRT_PRICE + 1n,
};

// 3. 准备 hookData (用户地址)
const hookData = encodePacked(['address'], [userAddress]);

// 4. 执行 Swap
const tx = await walletClient.writeContract({
  address: swapRouterAddress,
  abi: swapRouterABI,
  functionName: 'swap',
  args: [poolKey, swapParams, hookData],
});
```

### 做市机器人集成

```typescript
import { createWalletClient, http } from 'viem';

const client = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account: privateKeyToAccount(PRIVATE_KEY),
});

// 检查 Session 状态
async function checkSession(userAddress: string): Promise<boolean> {
  return await publicClient.readContract({
    address: sessionManagerAddress,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: [userAddress],
  });
}

// 自动续期
async function renewSessionIfNeeded(userAddress: string) {
  const remaining = await publicClient.readContract({
    address: sessionManagerAddress,
    abi: sessionManagerABI,
    functionName: 'getRemainingTime',
    args: [userAddress],
  });

  // 剩余时间少于1小时则续期
  if (remaining < 3600) {
    await renewSession(userAddress);
  }
}
```

---

## Gas 成本参考

| 操作 | Gas 消耗 | Base Sepolia 成本 |
|------|----------|-------------------|
| Session 检查 | 3,000 | ~$0.00006 |
| 开启 Session | 45,000 | ~$0.0009 |
| PLONK 验证 | 350,000 | ~$0.007 |
| Swap（首次） | ~365,000 | ~$0.0073 |
| Swap（缓存） | ~15,000 | ~$0.0003 |
| 添加流动性 | ~200,000 | ~$0.004 |

---

## 错误代码

### Registry

- `Registry: Issuer already registered`
- `Registry: Issuer not found`
- `Registry: Invalid verifier address`

### SessionManager

- `SessionManager: Session not active`
- `SessionManager: Session expired`
- `SessionManager: Invalid expiry time`

### ComplianceHook

- `ComplianceHook: System paused`
- `ComplianceHook: Router not approved`
- `ComplianceHook: User not verified`
- `ComplianceHook: Session expired`

---

## 安全注意事项

1. **私钥管理**: 永远不要在前端暴露私钥
2. **Gas 限制**: 设置合理的 gasLimit 防止失败
3. **Slippage**: Swap 时设置合理的滑点保护
4. **Session 过期**: 定期检查并续期
5. **Hook验证**: 确保 hookData 格式正确

---

## 升级和治理

合约采用 UUPS 可升级模式：

```solidity
// 升级 Registry
function upgradeToAndCall(
    address newImplementation,
    bytes memory data
) external onlyRole(GOVERNANCE_ROLE)
```

**升级流程**:
1. 部署新实现合约
2. 通过多签调用 `upgradeToAndCall`
3. 验证升级成功
4. 测试新功能

---

## 联系方式

- **技术支持**: GitHub Issues
- **紧急情况**: governance@ilal.io
