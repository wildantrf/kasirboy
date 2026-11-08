import { describe, expect, it } from 'vitest';
import { CASH_ROUNDING_STEP, computeTotals, roundToStep } from './money';

describe('computeTotals', () => {
  it('reproduces the PRD rounding example (AC-23)', () => {
    const base = {
      items: [{ unitPrice: 23_400, quantity: 1 }],
      discount: { type: 'amount' as const, value: 1_000 },
      taxRate: 10,
      serviceRate: 5,
      taxApplies: true,
      serviceApplies: true,
    };

    const cash = computeTotals({ ...base, method: 'cash' });
    expect(cash.subtotal).toBe(23_400);
    expect(cash.discountAmount).toBe(1_000);
    expect(cash.taxAmount).toBe(2_240);
    expect(cash.serviceAmount).toBe(1_120);
    expect(cash.unroundedTotal).toBe(25_760);
    expect(cash.finalTotal).toBe(26_000);
    expect(cash.roundingDelta).toBe(240);

    const qris = computeTotals({ ...base, method: 'qris' });
    expect(qris.finalTotal).toBe(25_760);
    expect(qris.roundingDelta).toBe(0);
  });

  it('calculates tax and service on the post-discount base, never tax on service', () => {
    const totals = computeTotals({
      items: [{ unitPrice: 100_000, quantity: 2 }],
      discount: { type: 'percent', value: 10 },
      taxRate: 10,
      serviceRate: 5,
      taxApplies: true,
      serviceApplies: true,
      method: 'qris',
    });

    expect(totals.subtotal).toBe(200_000);
    expect(totals.discountAmount).toBe(20_000);
    expect(totals.taxAmount).toBe(18_000);
    expect(totals.serviceAmount).toBe(9_000);
    expect(totals.finalTotal).toBe(207_000);
  });

  it('skips service when the order type does not apply', () => {
    const totals = computeTotals({
      items: [{ unitPrice: 50_000, quantity: 1 }],
      discount: null,
      taxRate: 10,
      serviceRate: 5,
      taxApplies: true,
      serviceApplies: false,
      method: 'qris',
    });

    expect(totals.serviceAmount).toBe(0);
    expect(totals.finalTotal).toBe(55_000);
  });

  it('clamps discounts to the subtotal instead of producing a negative base', () => {
    const totals = computeTotals({
      items: [{ unitPrice: 10_000, quantity: 1 }],
      discount: { type: 'amount', value: 25_000 },
      taxRate: 10,
      serviceRate: 0,
      taxApplies: true,
      serviceApplies: false,
      method: 'cash',
    });

    expect(totals.discountAmount).toBe(10_000);
    expect(totals.unroundedTotal).toBe(0);
    expect(totals.finalTotal).toBe(0);
  });
});

describe('roundToStep', () => {
  it('rounds cash totals to the nearest thousand (half-up)', () => {
    expect(roundToStep(25_499, CASH_ROUNDING_STEP)).toBe(25_000);
    expect(roundToStep(25_500, CASH_ROUNDING_STEP)).toBe(26_000);
    expect(roundToStep(25_760, CASH_ROUNDING_STEP)).toBe(26_000);
  });

  it('leaves digital totals at whole rupiah', () => {
    expect(roundToStep(25_760, 1)).toBe(25_760);
  });
});
