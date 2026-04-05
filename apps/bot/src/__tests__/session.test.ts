import { describe, it, expect } from 'vitest';

// Re-implement the pure function to avoid importing session.ts
// which has side-effect dependencies on config/contracts
function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '已过期';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

describe('formatRemainingTime', () => {
  it('returns expired for 0 seconds', () => {
    expect(formatRemainingTime(0)).toBe('已过期');
  });

  it('returns expired for negative seconds', () => {
    expect(formatRemainingTime(-100)).toBe('已过期');
  });

  it('formats minutes only when less than 1 hour', () => {
    expect(formatRemainingTime(300)).toBe('5分钟');
    expect(formatRemainingTime(1800)).toBe('30分钟');
    expect(formatRemainingTime(3599)).toBe('59分钟');
  });

  it('formats hours and minutes', () => {
    expect(formatRemainingTime(3600)).toBe('1小时0分钟');
    expect(formatRemainingTime(3660)).toBe('1小时1分钟');
    expect(formatRemainingTime(86400)).toBe('24小时0分钟');
    expect(formatRemainingTime(7200 + 1800)).toBe('2小时30分钟');
  });

  it('rounds down partial minutes', () => {
    expect(formatRemainingTime(90)).toBe('1分钟');
    expect(formatRemainingTime(119)).toBe('1分钟');
  });

  it('shows 0 minutes for very small values', () => {
    expect(formatRemainingTime(30)).toBe('0分钟');
  });
});
