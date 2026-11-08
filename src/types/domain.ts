/**
 * MejaFlow domain types.
 *
 * Naming follows the PRD section 6 logical schema (camelCase in TypeScript).
 * Every operational entity carries `businessId` and, where relevant, `branchId`
 * so that scope checks can be enforced in one place.
 *
 * Catatan PRD: skema bersifat usulan logis. Presisi uang final (TBD-08) dan
 * mekanisme autentikasi staf (TBD-14) masih terbuka; implementasi ini memakai
 * rupiah integer dan kredensial demo per akun staf.
 */

export type Role = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'waiter';

export type PlanCode = 'free' | 'paid';

/** Free → trial/paid → transisi ke Free (PRD 4.6). */
export type SubscriptionState = 'free' | 'trial' | 'active' | 'expired';

export type OrderType = 'dine_in' | 'takeaway';

export type OrderSource = 'cashier' | 'qr_table';

export type PaymentMethod = 'cash' | 'manual_digital' | 'qris';

/** `abandoned` = percobaan QRIS kedaluwarsa/gagal sebelum dana masuk. */
export type PaymentState = 'unpaid' | 'pending' | 'paid' | 'abandoned';

/** `kds` = punya staf dapur, `instant` = tanpa tracking, `offline_sync` = tunai offline. */
export type FulfillmentMode = 'kds' | 'instant' | 'offline_sync';

export type FulfillmentState =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'awaiting_handover'
  | 'completed';

export type ProductAvailability = 'available' | 'sold_out';

export type StaffStatus = 'active' | 'inactive';

export type BranchStatus = 'operational' | 'inactive';

export type QrisAttemptState = 'pending' | 'paid' | 'failed' | 'expired' | 'uncertain';

export type MerchantStatus = 'not_connected' | 'pending' | 'active';

export type BillingPeriod = 'monthly' | 'yearly';

export type InvoiceState = 'unpaid' | 'paid';

export type DiscountType = 'amount' | 'percent';

export interface DiscountInput {
  type: DiscountType;
  value: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  /** Demo-only kredensial. Produksi wajib hash di server (PRD 2.7). */
  password: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: string;
  timezone: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  code: string;
  address: string;
  status: BranchStatus;
  timezone: string;
  /** Persen, contoh 10 berarti 10%. */
  taxRate: number;
  serviceRate: number;
  taxAppliesTo: OrderType[];
  serviceAppliesTo: OrderType[];
  configVersion: number;
}

export interface StaffAccount {
  id: string;
  businessId: string;
  branchId: string;
  userId: string;
  role: Exclude<Role, 'owner'>;
  status: StaffStatus;
  createdAt: string;
  /** TBD-14: mekanisme pembuatan/login/reset akun staf belum final. */
  note: string;
}

export interface Category {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  businessId: string;
  branchId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  availability: ProductAvailability;
  updatedAt: string;
}

export interface DiningTable {
  id: string;
  businessId: string;
  branchId: string;
  label: string;
  seats: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
  ready: boolean;
  readyAt?: string;
}

export interface OrderTotals {
  subtotal: number;
  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  serviceRate: number;
  serviceAmount: number;
  unroundedTotal: number;
  roundingDelta: number;
  finalTotal: number;
}

export interface HandoverRecord {
  at: string;
  staffId: string;
  staffName: string;
  matchedNumber: string;
  override: boolean;
  reason?: string;
  alternativeEvidence?: string;
}

export interface Order {
  id: string;
  businessId: string;
  branchId: string;
  number: string;
  source: OrderSource;
  type: OrderType;
  tableId: string | null;
  tableLabel: string | null;
  paymentMethod: PaymentMethod;
  paymentState: PaymentState;
  fulfillmentState: FulfillmentState;
  fulfillmentMode: FulfillmentMode;
  items: OrderItem[];
  discountActor: { staffId: string; name: string; role: Role } | null;
  totals: OrderTotals;
  attempts: PaymentAttempt[];
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  deviceId: string | null;
  offline: {
    localId: string;
    deviceId: string;
    recordedAt: string;
    syncedAt: string;
  } | null;
  handover: HandoverRecord | null;
  customerNote: string;
}

export interface PaymentAttempt {
  id: string;
  orderId: string;
  businessId: string;
  branchId: string;
  providerRef: string;
  amount: number;
  currency: 'IDR';
  state: QrisAttemptState;
  expiresAt: string;
  verifiedAt: string | null;
}

export interface KitchenJob {
  id: string;
  orderId: string;
  businessId: string;
  branchId: string;
  sequence: number;
  status: 'new' | 'preparing' | 'ready' | 'completed';
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
}

export interface Subscription {
  businessId: string;
  plan: PlanCode;
  state: SubscriptionState;
  trialEndsAt: string | null;
  validUntil: string | null;
  updatedAt: string;
}

export interface TrialUsage {
  businessId: string;
  activatedBy: string;
  startedAt: string;
  endsAt: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  period: BillingPeriod;
  amount: number;
  state: InvoiceState;
  createdAt: string;
  dueAt: string;
  paidAt: string | null;
  providerRef: string;
  priceSnapshot: string;
}

export interface MerchantConnection {
  businessId: string;
  /** Null = seluruh bisnis, selain itu dibatasi ke satu cabang. */
  branchScopeId: string | null;
  provider: 'midtrans';
  status: MerchantStatus;
  environment: 'sandbox' | 'production';
  evidence: string;
  updatedAt: string;
}

export interface RegisteredDevice {
  id: string;
  businessId: string;
  branchId: string;
  label: string;
  isPrimaryOffline: boolean;
  lastSeenAt: string;
  version: number;
}

export interface DowngradeSelection {
  businessId: string;
  branchId: string;
  staffId: string;
  selectedAt: string;
}

export type AuditAction =
  | 'discount.applied'
  | 'staff.created'
  | 'staff.deactivated'
  | 'pickup.override'
  | 'served.confirmed'
  | 'plan.trial_activated'
  | 'plan.invoice_paid'
  | 'plan.downgraded'
  | 'qr.connected'
  | 'payment.qris_verified'
  | 'payment.qris_expired'
  | 'offline.device_registered'
  | 'offline.order_synced'
  | 'menu.updated'
  | 'branch.updated';

export interface AuditEvent {
  id: string;
  businessId: string;
  branchId: string | null;
  actorName: string;
  action: AuditAction;
  detail: string;
  at: string;
}

export interface Session {
  userId: string;
  /** Null saat pemilik sudah verifikasi email tetapi belum membuat bisnis. */
  businessId: string | null;
  branchId: string | null;
  role: Role;
  staffId: string | null;
}

/** Antrean lokal (IndexedDB) untuk transaksi tunai offline pada perangkat utama. */
export interface OfflineOrderRecord {
  localId: string;
  deviceId: string;
  businessId: string;
  branchId: string;
  branchCode: string;
  number: string;
  orderType: OrderType;
  tableId: string | null;
  tableLabel: string | null;
  items: OrderItem[];
  totals: OrderTotals;
  actorStaffId: string;
  actorName: string;
  actorRole: Role;
  recordedAt: string;
  state: 'queued' | 'synced' | 'failed';
  syncedAt: string | null;
}

export interface AppState {
  schemaVersion: number;
  users: User[];
  businesses: Business[];
  branches: Branch[];
  staff: StaffAccount[];
  categories: Category[];
  products: Product[];
  tables: DiningTable[];
  orders: Order[];
  kitchenJobs: KitchenJob[];
  subscriptions: Subscription[];
  trials: TrialUsage[];
  invoices: Invoice[];
  merchantConnections: MerchantConnection[];
  devices: RegisteredDevice[];
  downgradeSelections: DowngradeSelection[];
  auditEvents: AuditEvent[];
  session: Session | null;
  pendingVerificationUserId: string | null;
  demoVerificationCode: string | null;
}

/** Satu baris keranjang kasir. */
export interface CartLine {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
}
