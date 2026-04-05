import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Test the pure utility functions from config.ts
// We re-implement them here to avoid side effects from loading the full config module

function replaceEnvVars(str: string): string {
  return str.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '');
}

function processConfig(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return replaceEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(processConfig);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processConfig(value);
    }
    return result;
  }
  return obj;
}

describe('replaceEnvVars', () => {
  beforeEach(() => {
    process.env.TEST_VAR = 'hello';
    process.env.ANOTHER_VAR = 'world';
  });

  afterEach(() => {
    delete process.env.TEST_VAR;
    delete process.env.ANOTHER_VAR;
  });

  it('replaces a single env var', () => {
    expect(replaceEnvVars('${TEST_VAR}')).toBe('hello');
  });

  it('replaces multiple env vars', () => {
    expect(replaceEnvVars('${TEST_VAR} ${ANOTHER_VAR}')).toBe('hello world');
  });

  it('returns empty string for missing vars', () => {
    expect(replaceEnvVars('${MISSING_VAR}')).toBe('');
  });

  it('leaves strings without vars unchanged', () => {
    expect(replaceEnvVars('no vars here')).toBe('no vars here');
  });

  it('handles mixed content', () => {
    expect(replaceEnvVars('prefix-${TEST_VAR}-suffix')).toBe('prefix-hello-suffix');
  });
});

describe('processConfig', () => {
  beforeEach(() => {
    process.env.MY_KEY = 'secret123';
  });

  afterEach(() => {
    delete process.env.MY_KEY;
  });

  it('processes string values', () => {
    expect(processConfig('${MY_KEY}')).toBe('secret123');
  });

  it('preserves numbers', () => {
    expect(processConfig(42)).toBe(42);
  });

  it('preserves booleans', () => {
    expect(processConfig(true)).toBe(true);
  });

  it('processes arrays', () => {
    expect(processConfig(['${MY_KEY}', 'plain'])).toEqual(['secret123', 'plain']);
  });

  it('processes nested objects', () => {
    const input = {
      wallet: { privateKey: '${MY_KEY}' },
      port: 3000,
      enabled: true,
    };
    const result = processConfig(input) as any;
    expect(result.wallet.privateKey).toBe('secret123');
    expect(result.port).toBe(3000);
    expect(result.enabled).toBe(true);
  });

  it('handles null', () => {
    expect(processConfig(null)).toBe(null);
  });

  it('handles deeply nested structures', () => {
    const input = {
      a: { b: { c: { d: '${MY_KEY}' } } },
    };
    const result = processConfig(input) as any;
    expect(result.a.b.c.d).toBe('secret123');
  });
});

describe('swap price calculations', () => {
  // Pure math from swap.ts — sqrtPriceX96 to price conversion
  const Q96 = 2n ** 96n;

  function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
    const priceRaw = Number(sqrtPriceX96) / Number(Q96);
    return priceRaw * priceRaw;
  }

  it('converts sqrtPriceX96 = 2^96 to price 1.0', () => {
    const price = sqrtPriceX96ToPrice(Q96);
    expect(price).toBeCloseTo(1.0, 10);
  });

  it('converts known ETH/USDC sqrtPriceX96 value', () => {
    // For price = 4 => sqrtPrice = 2 => sqrtPriceX96 = 2 * 2^96
    const sqrtPriceX96 = Q96 * 2n;
    const price = sqrtPriceX96ToPrice(sqrtPriceX96);
    expect(price).toBeCloseTo(4.0, 5);
  });

  it('handles MIN_SQRT_PRICE', () => {
    const MIN_SQRT_PRICE = 4295128739n;
    const price = sqrtPriceX96ToPrice(MIN_SQRT_PRICE);
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThan(1e-30);
  });

  describe('quote calculation with fees', () => {
    function calculateQuote(
      amountIn: bigint,
      price: number,
      zeroForOne: boolean,
      feeBps: bigint,
    ): bigint {
      let amountOut: bigint;
      if (zeroForOne) {
        amountOut = BigInt(Math.floor(Number(amountIn) * price));
      } else {
        amountOut = BigInt(Math.floor(Number(amountIn) / price));
      }
      return amountOut - (amountOut * feeBps) / 1000000n;
    }

    it('calculates zero-for-one swap (multiply by price)', () => {
      const result = calculateQuote(1000000000000000000n, 2000, true, 500n);
      // 1 ETH * 2000 = 2000 USDC, minus 0.05% fee
      expect(Number(result)).toBeCloseTo(2000e18 * 0.9995, -15);
    });

    it('calculates one-for-zero swap (divide by price)', () => {
      const result = calculateQuote(2000000000n, 2000, false, 500n);
      // 2000 USDC / 2000 = 1 ETH, minus 0.05% fee
      const expected = Number(2000000000n) / 2000 * 0.9995;
      expect(Number(result)).toBeCloseTo(expected, 0);
    });

    it('deducts correct fee amount', () => {
      const noFee = calculateQuote(1000000n, 1, true, 0n);
      const withFee = calculateQuote(1000000n, 1, true, 500n);
      // 500/1000000 = 0.05%
      expect(Number(withFee)).toBeLessThan(Number(noFee));
      expect(Number(noFee) - Number(withFee)).toBeCloseTo(Number(noFee) * 0.0005, 0);
    });
  });
});
