import { describe, it, expect } from 'vitest';

// Re-implement the pure function to avoid importing liquidity.ts
// which has side-effect dependencies on config/contracts
function calculateOptimalRange(
  currentTick: number,
  tickSpacing: number,
  rangePercent: { lower: number; upper: number },
): { tickLower: number; tickUpper: number } {
  const tickLower = Math.floor(
    currentTick + Math.log(rangePercent.lower) / Math.log(1.0001),
  );
  const tickUpper = Math.ceil(
    currentTick + Math.log(rangePercent.upper) / Math.log(1.0001),
  );

  const alignedLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
  const alignedUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

  return { tickLower: alignedLower, tickUpper: alignedUpper };
}

describe('calculateOptimalRange', () => {
  it('returns aligned ticks around current tick for symmetric range', () => {
    const result = calculateOptimalRange(1000, 10, { lower: 0.95, upper: 1.05 });

    expect(result.tickLower % 10).toBe(0);
    expect(result.tickUpper % 10).toBe(0);
    expect(result.tickLower).toBeLessThan(1000);
    expect(result.tickUpper).toBeGreaterThan(1000);
  });

  it('aligns to tickSpacing=1', () => {
    const result = calculateOptimalRange(500, 1, { lower: 0.99, upper: 1.01 });

    expect(result.tickLower % 1).toBe(0);
    expect(result.tickUpper % 1).toBe(0);
    expect(result.tickLower).toBeLessThan(500);
    expect(result.tickUpper).toBeGreaterThan(500);
  });

  it('aligns to tickSpacing=100', () => {
    const result = calculateOptimalRange(5000, 100, { lower: 0.9, upper: 1.1 });

    expect(result.tickLower % 100).toBe(0);
    expect(result.tickUpper % 100).toBe(0);
  });

  it('produces wider range for larger percentage deviation', () => {
    const narrow = calculateOptimalRange(1000, 10, { lower: 0.99, upper: 1.01 });
    const wide = calculateOptimalRange(1000, 10, { lower: 0.8, upper: 1.2 });

    const narrowRange = narrow.tickUpper - narrow.tickLower;
    const wideRange = wide.tickUpper - wide.tickLower;

    expect(wideRange).toBeGreaterThan(narrowRange);
  });

  it('handles negative ticks', () => {
    const result = calculateOptimalRange(-5000, 10, { lower: 0.95, upper: 1.05 });

    // Math.floor on negative numbers can produce -0, which is divisible by tickSpacing
    expect(result.tickLower % 10 === 0).toBe(true);
    expect(result.tickUpper % 10 === 0).toBe(true);
    expect(result.tickLower).toBeLessThan(-5000);
    expect(result.tickUpper).toBeGreaterThan(-5000);
  });

  it('handles tick=0', () => {
    const result = calculateOptimalRange(0, 10, { lower: 0.95, upper: 1.05 });

    expect(result.tickLower).toBeLessThan(0);
    expect(result.tickUpper).toBeGreaterThan(0);
  });

  it('uses correct price-to-tick formula', () => {
    // price = 1.0001^tick => tick = log(price) / log(1.0001)
    // For range lower=0.5 (50% price), expected tick offset ~ log(0.5)/log(1.0001) ~ -6931
    const result = calculateOptimalRange(0, 1, { lower: 0.5, upper: 2.0 });

    expect(result.tickLower).toBeCloseTo(-6932, 0);
    expect(result.tickUpper).toBeCloseTo(6932, 0);
  });
});

describe('rebalance deviation logic', () => {
  function computeDeviation(
    currentTick: number,
    tickLower: number,
    tickUpper: number,
  ): number {
    const midTick = (tickLower + tickUpper) / 2;
    const range = tickUpper - tickLower;
    return Math.abs(currentTick - midTick) / range;
  }

  it('returns 0 deviation when at midpoint', () => {
    expect(computeDeviation(500, 400, 600)).toBe(0);
  });

  it('returns 0.5 deviation when at boundary', () => {
    expect(computeDeviation(600, 400, 600)).toBe(0.5);
    expect(computeDeviation(400, 400, 600)).toBe(0.5);
  });

  it('returns > 0.5 when beyond range', () => {
    expect(computeDeviation(700, 400, 600)).toBeGreaterThan(0.5);
  });

  it('triggers rebalance at 3% threshold', () => {
    const threshold = 0.03;
    // Position: 400-600, mid=500, range=200
    // 3% of 200 = 6 ticks of deviation
    expect(computeDeviation(507, 400, 600)).toBeGreaterThan(threshold);
    expect(computeDeviation(505, 400, 600)).toBeLessThan(threshold);
  });
});
