import type { DiscountInput, OrderTotals, PaymentMethod } from '../types/domain';

/** Pembulatan tunai ke Rp1.000 terdekat (PRD 2.5). */
export const CASH_ROUNDING_STEP = 1000;
/** QRIS / digital manual ke rupiah terdekat. */
export const DIGITAL_ROUNDING_STEP = 1;

export function roundingStepFor(method: PaymentMethod): number {
  return method === 'cash' ? CASH_ROUNDING_STEP : DIGITAL_ROUNDING_STEP;
}

/**
 * Pembulatan half-up ke kelipatan `step`.
 *
 * TBD-08: PRD belum memutuskan aturan tepat di titik tengah (mis. Rp25.500
 * untuk tunai). Implementasi sementara memilih half-up, menyimpan
 * `roundingDelta`, dan menampilkannya agar total dapat direkonsiliasi.
 */
export function roundToStep(value: number, step: number): number {
  if (step <= 1) {
    return Math.round(value);
  }
  return Math.round(value / step) * step;
}

export function computeDiscountAmount(subtotal: number, discount: DiscountInput | null): number {
  if (!discount || subtotal <= 0) {
    return 0;
  }

  const raw =
    discount.type === 'percent'
      ? subtotal * (clampPercent(discount.value) / 100)
      : Math.max(0, discount.value);

  return Math.min(subtotal, Math.round(raw));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export interface TotalsInput {
  items: ReadonlyArray<{ unitPrice: number; quantity: number }>;
  discount: DiscountInput | null;
  taxRate: number;
  serviceRate: number;
  taxApplies: boolean;
  serviceApplies: boolean;
  method: PaymentMethod;
}

/**
 * Urutan perhitungan PRD 2.5:
 * subtotal → diskon → pajak & layanan atas dasar setelah diskon → total → bulatkan.
 * Pajak tidak dikenakan atas biaya layanan.
 */
export function computeTotals(input: TotalsInput): OrderTotals {
  const subtotal = input.items.reduce(
    (sum, item) => sum + Math.max(0, Math.round(item.unitPrice)) * Math.max(0, Math.trunc(item.quantity)),
    0,
  );

  const discountAmount = computeDiscountAmount(subtotal, input.discount);
  const base = subtotal - discountAmount;

  const taxRate = input.taxApplies ? clampPercent(input.taxRate) : 0;
  const serviceRate = input.serviceApplies ? clampPercent(input.serviceRate) : 0;

  const taxAmount = Math.round(base * (taxRate / 100));
  const serviceAmount = Math.round(base * (serviceRate / 100));
  const unroundedTotal = base + taxAmount + serviceAmount;

  const finalTotal = roundToStep(unroundedTotal, roundingStepFor(input.method));

  return {
    subtotal,
    discountType: input.discount ? input.discount.type : null,
    discountValue: input.discount ? input.discount.value : 0,
    discountAmount,
    taxRate,
    taxAmount,
    serviceRate,
    serviceAmount,
    unroundedTotal,
    roundingDelta: finalTotal - unroundedTotal,
    finalTotal,
  };
}

/** Contoh AC-23: Rp25.760 → tunai Rp26.000 / QRIS Rp25.760. */
export const PRD_ROUNDING_EXAMPLE: TotalsInput = {
  items: [{ unitPrice: 23_400, quantity: 1 }],
  discount: { type: 'amount', value: 1_000 },
  taxRate: 10,
  serviceRate: 5,
  taxApplies: true,
  serviceApplies: true,
  method: 'cash',
};
