import { 
  encodeAbiParameters, 
  type Address,
  type Hex,
} from 'viem';
import { 
  publicClient, 
  walletClient, 
  botAddress, 
  contracts,
  COMPLIANCE_HOOK_ABI,
} from './contracts.js';
import { config } from './config.js';
import { log } from './logger.js';

// ============ EIP-712 类型 ============

const EIP712_DOMAIN = {
  name: 'ILAL ComplianceHook',
  version: '1',
} as const;

const SWAP_PERMIT_TYPES = {
  SwapPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

const LIQUIDITY_PERMIT_TYPES = {
  LiquidityPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// ============ 签名函数 ============

/**
 * 获取当前 nonce
 */
export async function getNonce(): Promise<bigint> {
  try {
    const nonce = await publicClient.readContract({
      address: contracts.complianceHook,
      abi: COMPLIANCE_HOOK_ABI,
      functionName: 'getNonce',
      args: [botAddress],
    });
    return nonce;
  } catch (error) {
    log.error('获取 nonce 失败', { error: String(error) });
    throw error;
  }
}

/**
 * 生成 Swap Permit 签名
 */
export async function signSwapPermit(): Promise<{ hookData: Hex; deadline: bigint }> {
  try {
    const nonce = await getNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 分钟

    const domain = {
      ...EIP712_DOMAIN,
      chainId: config.network.chainId,
      verifyingContract: contracts.complianceHook,
    };

    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      domain,
      types: SWAP_PERMIT_TYPES,
      primaryType: 'SwapPermit',
      message: {
        user: botAddress,
        deadline,
        nonce,
      },
    });

    const hookData = encodeAbiParameters(
      [
        { type: 'address', name: 'user' },
        { type: 'uint256', name: 'deadline' },
        { type: 'uint256', name: 'nonce' },
        { type: 'bytes', name: 'signature' },
      ],
      [botAddress, deadline, nonce, signature]
    );

    log.debug('Swap Permit 签名完成', { 
      nonce: nonce.toString(), 
      deadline: deadline.toString() 
    });

    return { hookData, deadline };
  } catch (error) {
    log.error('签名 Swap Permit 失败', { error: String(error) });
    throw error;
  }
}

/**
 * 生成 Liquidity Permit 签名
 */
export async function signLiquidityPermit(): Promise<{ hookData: Hex; deadline: bigint }> {
  try {
    const nonce = await getNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    const domain = {
      ...EIP712_DOMAIN,
      chainId: config.network.chainId,
      verifyingContract: contracts.complianceHook,
    };

    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      domain,
      types: LIQUIDITY_PERMIT_TYPES,
      primaryType: 'LiquidityPermit',
      message: {
        user: botAddress,
        deadline,
        nonce,
      },
    });

    const hookData = encodeAbiParameters(
      [
        { type: 'address', name: 'user' },
        { type: 'uint256', name: 'deadline' },
        { type: 'uint256', name: 'nonce' },
        { type: 'bytes', name: 'signature' },
      ],
      [botAddress, deadline, nonce, signature]
    );

    log.debug('Liquidity Permit 签名完成', { 
      nonce: nonce.toString(), 
      deadline: deadline.toString() 
    });

    return { hookData, deadline };
  } catch (error) {
    log.error('签名 Liquidity Permit 失败', { error: String(error) });
    throw error;
  }
}
