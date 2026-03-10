import { describe, expect, it } from 'vitest';
import { calculateEmiDetails, getTenureMonths } from '../utils/emiCalculator';

describe('emiCalculator', () => {
  it('converts tenure from years to months', () => {
    expect(getTenureMonths(5, 'years')).toBe(60);
    expect(getTenureMonths(18, 'months')).toBe(18);
  });

  it('calculates EMI details using the standard reducing balance formula', () => {
    const result = calculateEmiDetails(100000, 12, 12, 'months');

    expect(result.tenureMonths).toBe(12);
    expect(result.monthlyEmi).toBeCloseTo(8884.88, 2);
    expect(result.totalInterest).toBeCloseTo(6618.53, 2);
    expect(result.totalAmount).toBeCloseTo(106618.53, 2);
    expect(result.schedule).toHaveLength(12);
    expect(result.schedule[0]?.interest).toBeCloseTo(1000, 2);
    expect(result.schedule[11]?.balance).toBe(0);
  });

  it('handles zero interest loans without creating phantom interest', () => {
    const result = calculateEmiDetails(120000, 0, 12, 'months');

    expect(result.monthlyEmi).toBe(10000);
    expect(result.totalInterest).toBe(0);
    expect(result.totalAmount).toBe(120000);
    expect(result.schedule.every((row) => row.interest === 0)).toBe(true);
  });
});