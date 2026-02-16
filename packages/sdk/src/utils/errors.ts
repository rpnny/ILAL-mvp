/**
 * ILAL SDK 错误类定义
 */

/**
 * ILAL SDK 基础错误类
 */
export class ILALError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ILALError';
    Object.setPrototypeOf(this, ILALError.prototype);
  }
}

/**
 * Session 相关错误
 */
export class SessionExpiredError extends ILALError {
  constructor(details?: any) {
    super('Session expired or inactive', 'SESSION_EXPIRED', details);
    this.name = 'SessionExpiredError';
  }
}

export class SessionNotFoundError extends ILALError {
  constructor(details?: any) {
    super('Session not found', 'SESSION_NOT_FOUND', details);
  }
}

/**
 * Swap 相关错误
 */
export class InsufficientLiquidityError extends ILALError {
  constructor(details?: any) {
    super('Insufficient liquidity in pool', 'INSUFFICIENT_LIQUIDITY', details);
  }
}

export class SlippageExceededError extends ILALError {
  constructor(details?: any) {
    super('Slippage tolerance exceeded', 'SLIPPAGE_EXCEEDED', details);
  }
}

export class InvalidPoolError extends ILALError {
  constructor(details?: any) {
    super('Invalid or uninitialized pool', 'INVALID_POOL', details);
  }
}

/**
 * 权限相关错误
 */
export class UnauthorizedError extends ILALError {
  constructor(details?: any) {
    super('Unauthorized access', 'UNAUTHORIZED', details);
  }
}

export class RouterNotApprovedError extends ILALError {
  constructor(details?: any) {
    super('Router is not approved', 'ROUTER_NOT_APPROVED', details);
  }
}

/**
 * 验证相关错误
 */
export class VerificationFailedError extends ILALError {
  constructor(details?: any) {
    super('Verification failed', 'VERIFICATION_FAILED', details);
  }
}

export class InvalidProofError extends ILALError {
  constructor(details?: any) {
    super('Invalid ZK proof', 'INVALID_PROOF', details);
  }
}

/**
 * 配置相关错误
 */
export class InvalidConfigError extends ILALError {
  constructor(details?: any) {
    super('Invalid configuration', 'INVALID_CONFIG', details);
  }
}

export class ContractNotDeployedError extends ILALError {
  constructor(details?: any) {
    super('Contract not deployed on this network', 'CONTRACT_NOT_DEPLOYED', details);
  }
}

/**
 * 交易相关错误
 */
export class TransactionFailedError extends ILALError {
  constructor(details?: any) {
    super('Transaction failed', 'TRANSACTION_FAILED', details);
  }
}

export class GasEstimationError extends ILALError {
  constructor(details?: any) {
    super('Gas estimation failed', 'GAS_ESTIMATION_FAILED', details);
  }
}

/**
 * 从合约错误解析 ILAL 错误
 */
export function parseContractError(error: any): ILALError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';

  // Session 错误
  if (errorMessage.includes('SessionExpired') || errorMessage.includes('SESSION_EXPIRED')) {
    return new SessionExpiredError({ originalError: error });
  }

  // Liquidity 错误
  if (errorMessage.includes('InsufficientLiquidity')) {
    return new InsufficientLiquidityError({ originalError: error });
  }

  // Slippage 错误
  if (errorMessage.includes('SlippageExceeded') || errorMessage.includes('PRICE_LIMIT')) {
    return new SlippageExceededError({ originalError: error });
  }

  // Unauthorized 错误
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('NOT_APPROVED')) {
    return new UnauthorizedError({ originalError: error });
  }

  // Pool 错误
  if (errorMessage.includes('PoolNotInitialized')) {
    return new InvalidPoolError({ originalError: error });
  }

  // 默认返回通用错误
  return new ILALError('Contract call failed', 'CONTRACT_ERROR', { originalError: error });
}
