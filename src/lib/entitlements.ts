import type { PaymentMethod, Subscription } from '../types/domain';

/** TBD-01: harga contoh untuk demo, bukan harga komersial final. */
export const PLAN_PRICES = {
  monthly: 199_000,
  yearly: 1_990_000,
} as const;

export const TRIAL_DAYS = 30;

export const PLAN_LABEL = {
  free: 'Free',
  paid: 'Berbayar',
} as const;

export const FREE_LIMITS = {
  branches: 1,
  staffPerBranch: 1,
  /** Free: 1 staf di luar pemilik pada bisnis/cabang tersebut. */
  staffTotal: 1,
} as const;

export const PAID_LIMITS = {
  branches: 5,
  staffPerBranch: 10,
} as const;

export interface Entitlements {
  plan: 'free' | 'paid';
  state: Subscription['state'];
  branchLimit: number;
  staffPerBranch: number;
  staffTotal: number;
  methods: PaymentMethod[];
  qrisSelfOrder: boolean;
  paidCapabilities: boolean;
  needsDowngradeSelection: boolean;
}

/**
 * Trial memakai kapasitas Berbayar (usulan PRD 2.3). Setelah masa berbayar
 * berakhir, bisnis kembali ke batas Free; operasional ditahan sampai pemilik
 * memilih satu cabang + satu staf (TBD-04 tetap terbuka untuk detail transisi).
 */
export function entitlementsFor(subscription: Subscription | undefined): Entitlements {
  const state = subscription?.state ?? 'free';
  const paidCapabilities = state === 'trial' || state === 'active';

  if (paidCapabilities) {
    return {
      plan: 'paid',
      state,
      branchLimit: PAID_LIMITS.branches,
      staffPerBranch: PAID_LIMITS.staffPerBranch,
      staffTotal: PAID_LIMITS.branches * PAID_LIMITS.staffPerBranch,
      methods: ['cash', 'qris'],
      qrisSelfOrder: true,
      paidCapabilities: true,
      needsDowngradeSelection: false,
    };
  }

  return {
    plan: 'free',
    state,
    branchLimit: FREE_LIMITS.branches,
    staffPerBranch: FREE_LIMITS.staffPerBranch,
    staffTotal: FREE_LIMITS.staffTotal,
    methods: ['cash', 'manual_digital'],
    qrisSelfOrder: false,
    paidCapabilities: false,
    needsDowngradeSelection: state === 'expired',
  };
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  manual_digital: 'Digital manual',
  qris: 'QRIS',
};

export const PAYMENT_METHOD_HINT: Record<PaymentMethod, string> = {
  cash: 'Pembulatan ke Rp1.000 terdekat. Tersedia offline pada perangkat utama.',
  manual_digital: 'Dikonfirmasi kasir, bukan verifikasi provider. Membutuhkan internet.',
  qris: 'Menunggu verifikasi provider. Tidak tersedia offline.',
};
