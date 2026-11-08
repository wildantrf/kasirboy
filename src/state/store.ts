import type {
  AppState,
  AuditAction,
  AuditEvent,
  Branch,
  CartLine,
  DiscountInput,
  Invoice,
  KitchenJob,
  OfflineOrderRecord,
  Order,
  OrderItem,
  OrderTotals,
  OrderType,
  PaymentAttempt,
  PaymentMethod,
  ProductAvailability,
  RegisteredDevice,
  Session,
  StaffAccount,
  StaffStatus,
  Subscription,
} from '../types/domain';
import { createSeedState, DEMO_PASSWORD } from '../data/seed';
import { entitlementsFor, PLAN_PRICES, TRIAL_DAYS, type Entitlements } from '../lib/entitlements';
import { computeTotals } from '../lib/money';
import { newId, newOrderNumber, newProviderRef } from '../lib/id';
import { AppError, describeError } from '../lib/errors';
import { can, canManageStaffRole, type Permission } from '../lib/permissions';
import { isSameDay } from '../lib/format';
import { branchHasKitchenStaff, nextBranchSequence, nextKitchenSequence } from '../lib/selectors';
import { getLocalDeviceId } from '../lib/device';
import { isOnline } from '../lib/network';
import { listOfflineOrders, saveOfflineOrder, clearOfflineOrders } from '../lib/offlineDb';

const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'mejaflow.state.v2';
const DAY = 24 * 60 * 60 * 1000;

export interface StoreSnapshot {
  state: AppState;
  offlineOrders: OfflineOrderRecord[];
}

export interface CartInput {
  productId: string;
  quantity: number;
  note: string;
}

export interface OrderDraftInput {
  branchId: string;
  type: OrderType;
  tableId: string | null;
  lines: CartInput[];
  discount: DiscountInput | null;
  method: PaymentMethod;
  customerNote: string;
}

export interface StaffInput {
  name: string;
  email: string;
  role: Exclude<Session['role'], 'owner'>;
  branchId: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  /** Data URL foto menu; `null` menghapus foto pada saat update. */
  photo?: string | null;
}

export interface BranchInput {
  name: string;
  address: string;
  taxRate: number;
  serviceRate: number;
}

export interface BranchSettingsInput {
  branchId: string;
  name: string;
  address: string;
  taxRate: number;
  serviceRate: number;
  taxAppliesTo: OrderType[];
  serviceAppliesTo: OrderType[];
  status: 'operational' | 'inactive';
}

export interface OnboardingInput {
  businessName: string;
  branchName: string;
  branchAddress: string;
  taxRate: number;
  serviceRate: number;
}

export interface QrTableOrderInput {
  branchId: string;
  tableId: string;
  lines: CartInput[];
  customerNote: string;
}

export interface AppActions {
  login: (email: string, password: string) => Session;
  register: (input: { name: string; email: string; password: string }) => { code: string };
  verifyEmail: (code: string) => Session;
  resendVerification: () => string;
  logout: () => void;
  completeOnboarding: (input: OnboardingInput) => void;
  switchBranch: (branchId: string) => void;
  resetDemo: () => Promise<void>;

  addProduct: (input: ProductInput) => void;
  updateProduct: (productId: string, patch: Partial<ProductInput>) => void;
  deleteProduct: (productId: string) => void;
  setProductAvailability: (productId: string, availability: ProductAvailability) => void;
  addCategory: (name: string) => void;
  /** Geser kategori satu posisi pada urutan tampil cabang aktif. */
  moveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  deleteCategory: (categoryId: string) => void;

  addTable: (label: string, seats: number) => void;

  addBranch: (input: BranchInput) => Branch;
  updateBranchSettings: (input: BranchSettingsInput) => void;

  addStaff: (input: StaffInput) => StaffAccount;
  setStaffStatus: (staffId: string, status: StaffStatus) => void;

  confirmPaidOrder: (input: OrderDraftInput) => Promise<{ order: Order }>;
  startQrisOrder: (input: OrderDraftInput) => { order: Order; attempt: PaymentAttempt };
  verifyQrisAttempt: (attemptId: string) => void;
  expireQrisAttempt: (attemptId: string) => void;

  /** Alur pelanggan QR meja (tanpa sesi staf). */
  placeQrTableOrder: (input: QrTableOrderInput) => { order: Order; attempt: PaymentAttempt };
  verifyQrTablePayment: (attemptId: string) => void;

  startKitchenJob: (jobId: string) => void;
  markItemReady: (orderId: string, itemId: string) => void;
  markAllItemsReady: (orderId: string) => void;
  confirmHandover: (orderId: string, enteredNumber: string) => void;
  confirmServed: (orderId: string) => void;
  overridePickup: (orderId: string, input: { reason: string; evidence: string }) => void;

  registerPrimaryDevice: (branchId: string, label: string) => RegisteredDevice;
  syncOfflineOrders: () => Promise<{ synced: number; failed: number }>;

  activateTrial: () => void;
  createInvoice: (period: 'monthly' | 'yearly') => Invoice;
  payInvoice: (invoiceId: string) => void;
  endSubscriptionNow: () => void;
  selectDowngrade: (branchId: string, staffId: string) => void;
  connectQris: () => void;
}

export interface AppStore {
  getSnapshot: () => StoreSnapshot;
  subscribe: (listener: () => void) => () => void;
  hydrateOffline: () => Promise<void>;
  actions: AppActions;
}

function loadState(): AppState {
  if (typeof localStorage === 'undefined') {
    return createSeedState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createSeedState();
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.orders)) {
      return createSeedState();
    }
    return {
      ...createSeedState(),
      ...parsed,
      schemaVersion: SCHEMA_VERSION,
    };
  } catch {
    return createSeedState();
  }
}

function persist(state: AppState): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Kuota localStorage penuh: jangan menampilkan sukses palsu untuk data penting.
    console.warn('MejaFlow: state gagal disimpan', error);
  }
}

function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Batas aman agar kuota localStorage tidak terisi oleh foto. */
const MAX_PHOTO_LENGTH = 400_000;

function normalizePhoto(photo: string | null | undefined): string | null {
  if (!photo) {
    return null;
  }
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(photo)) {
    throw new AppError('menu/photo-format', 'Format foto menu tidak didukung.');
  }
  if (photo.length > MAX_PHOTO_LENGTH) {
    throw new AppError('menu/photo-size', 'Foto menu masih terlalu besar setelah dikompres.');
  }
  return photo;
}

function addPeriod(from: Date, period: 'monthly' | 'yearly'): Date {
  const next = new Date(from);
  if (period === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export function createAppStore(): AppStore {
  let state: AppState = loadState();
  let offlineOrders: OfflineOrderRecord[] = [];
  let snapshot: StoreSnapshot = { state, offlineOrders };
  const listeners = new Set<() => void>();

  function publish(): void {
    snapshot = { state, offlineOrders };
    persist(state);
    for (const listener of listeners) {
      listener();
    }
  }

  function commit(next: AppState): void {
    state = next;
    publish();
  }

  function setOfflineOrders(next: OfflineOrderRecord[]): void {
    offlineOrders = next;
    publish();
  }

  const nowIso = (): string => new Date().toISOString();

  function requireSession(): Session {
    if (!state.session) {
      throw new AppError('auth/required', 'Sesi tidak ditemukan. Silakan masuk kembali.');
    }
    return state.session;
  }

  function subscriptionFor(businessId: string): Subscription {
    return (
      state.subscriptions.find((subscription) => subscription.businessId === businessId) ?? {
        businessId,
        plan: 'free',
        state: 'free',
        trialEndsAt: null,
        validUntil: null,
        updatedAt: nowIso(),
      }
    );
  }

  interface Context {
    session: Session;
    businessId: string;
    branch: Branch | null;
    subscription: Subscription;
    entitlements: Entitlements;
    actorName: string;
  }

  function requireContext(): Context {
    const session = requireSession();
    if (!session.businessId) {
      throw new AppError('business/required', 'Buat bisnis terlebih dahulu untuk melanjutkan.');
    }
    const subscription = subscriptionFor(session.businessId);
    const user = state.users.find((candidate) => candidate.id === session.userId);
    return {
      session,
      businessId: session.businessId,
      branch: state.branches.find((branch) => branch.id === session.branchId) ?? null,
      subscription,
      entitlements: entitlementsFor(subscription),
      actorName: user?.name ?? 'Pengguna',
    };
  }

  function requirePermission(permission: Permission): Context {
    const context = requireContext();
    if (!can(context.session.role, permission)) {
      throw new AppError('auth/forbidden', 'Peran Anda tidak memiliki izin untuk tindakan ini.');
    }
    return context;
  }

  function requireOwner(): Context {
    const context = requireContext();
    if (context.session.role !== 'owner') {
      throw new AppError('auth/owner-only', 'Tindakan ini hanya dapat dilakukan pemilik bisnis.');
    }
    return context;
  }

  function branchInScope(branchId: string): Branch {
    const session = requireSession();
    const branch = state.branches.find((candidate) => candidate.id === branchId);
    if (!branch || branch.businessId !== session.businessId) {
      throw new AppError('scope/branch', 'Cabang tidak tersedia untuk bisnis ini.');
    }
    if (session.role !== 'owner' && session.branchId !== branchId) {
      throw new AppError('scope/branch-role', 'Akun staf hanya dapat mengakses cabang yang ditugaskan.');
    }
    return branch;
  }

  function assertOperational(branch: Branch): void {
    if (branch.status !== 'operational') {
      throw new AppError(
        'branch/inactive',
        'Cabang ini nonaktif. Data tersimpan, tetapi operasional ditahan sampai paket atau pilihan cabang Free diselesaikan.',
      );
    }
  }

  function assertPlanReady(entitlements: Entitlements): void {
    if (entitlements.needsDowngradeSelection) {
      throw new AppError(
        'plan/transition',
        'Masa trial/berbayar berakhir. Pilih satu cabang dan satu staf untuk melanjutkan pada paket Free.',
      );
    }
  }

  function workingBranch(): Branch {
    const context = requireContext();
    if (!context.session.branchId) {
      throw new AppError('branch/none', 'Pilih cabang terlebih dahulu.');
    }
    const branch = branchInScope(context.session.branchId);
    assertOperational(branch);
    return branch;
  }

  function pushAudit(
    events: AuditEvent[],
    event: {
      businessId: string;
      branchId: string | null;
      actorName: string;
      action: AuditAction;
      detail: string;
    },
  ): AuditEvent[] {
    return [{ id: newId('aud'), at: nowIso(), ...event }, ...events];
  }

  function findOrder(orderId: string): Order {
    const session = requireSession();
    const order = state.orders.find((candidate) => candidate.id === orderId);
    if (!order || order.businessId !== session.businessId) {
      throw new AppError('order/not-found', 'Pesanan tidak ditemukan pada bisnis ini.');
    }
    return order;
  }

  function merchantFor(businessId: string) {
    return state.merchantConnections.find((connection) => connection.businessId === businessId);
  }

  function deviceRowId(branchId: string): string {
    return `${getLocalDeviceId()}::${branchId}`;
  }

  function resolveTable(branch: Branch, tableId: string | null): { tableId: string; label: string } | null {
    if (!tableId) {
      throw new AppError('pos/table-required', 'Pilih meja untuk pesanan dine-in.');
    }
    const table = state.tables.find(
      (candidate) => candidate.id === tableId && candidate.branchId === branch.id,
    );
    if (!table) {
      throw new AppError('pos/table-scope', 'Meja tidak berada pada cabang ini.');
    }
    return { tableId: table.id, label: table.label };
  }

  function buildItems(branch: Branch, lines: CartInput[]): OrderItem[] {
    if (lines.length === 0) {
      throw new AppError('pos/empty', 'Keranjang masih kosong.');
    }

    return lines.map((line) => {
      const product = state.products.find(
        (candidate) => candidate.id === line.productId && candidate.branchId === branch.id,
      );
      if (!product) {
        throw new AppError('pos/product-missing', 'Produk pada keranjang tidak ada di cabang ini.');
      }
      if (product.availability !== 'available') {
        throw new AppError(
          'pos/product-unavailable',
          `${product.name} sedang Habis. Hapus produk dari keranjang.`,
        );
      }

      const quantity = Math.trunc(line.quantity);
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
        throw new AppError('pos/quantity', 'Jumlah produk harus antara 1 dan 99.');
      }

      return {
        id: newId('itm'),
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity,
        note: line.note.trim().slice(0, 140),
        ready: false,
      };
    });
  }

  function validateDiscount(discount: DiscountInput | null, context: Context): DiscountInput | null {
    if (!discount || discount.value <= 0) {
      return null;
    }
    if (!can(context.session.role, 'discount.apply')) {
      throw new AppError(
        'pos/discount-forbidden',
        'Hanya pemilik atau manajer yang dapat memasukkan diskon sebelum pembayaran.',
      );
    }
    if (discount.type === 'percent' && (discount.value <= 0 || discount.value > 100)) {
      throw new AppError('pos/discount-range', 'Diskon persen harus antara 1 dan 100.');
    }
    if (discount.type === 'amount' && discount.value < 0) {
      throw new AppError('pos/discount-range', 'Nominal diskon tidak boleh negatif.');
    }
    return discount;
  }

  function totalsFor(
    branch: Branch,
    type: OrderType,
    items: OrderItem[],
    discount: DiscountInput | null,
    method: PaymentMethod,
  ): OrderTotals {
    return computeTotals({
      items,
      discount,
      taxRate: branch.taxRate,
      serviceRate: branch.serviceRate,
      taxApplies: branch.taxAppliesTo.includes(type),
      serviceApplies: branch.serviceAppliesTo.includes(type),
      method,
    });
  }

  function ensureMethodAllowed(method: PaymentMethod, context: Context, branch: Branch): boolean {
    const offline = !isOnline();

    if (offline) {
      if (method !== 'cash') {
        throw new AppError(
          'pos/offline-method',
          'Saat offline hanya pembayaran tunai yang tersedia. QRIS dan digital manual membutuhkan internet.',
        );
      }
      const device = state.devices.find(
        (candidate) => candidate.id === deviceRowId(branch.id) && candidate.isPrimaryOffline,
      );
      if (!device) {
        throw new AppError(
          'offline/device',
          'Perangkat ini belum terdaftar sebagai perangkat kasir utama cabang. Daftarkan perangkat saat online.',
        );
      }
      return true;
    }

    if (method === 'qris') {
      if (!context.entitlements.methods.includes('qris')) {
        throw new AppError(
          'plan/qris',
          'QRIS terintegrasi hanya tersedia pada paket Berbayar dengan merchant aktif.',
        );
      }
      const merchant = merchantFor(branch.businessId);
      if (!merchant || merchant.status !== 'active') {
        throw new AppError(
          'qris/not-active',
          'Kanal QRIS belum aktif. Hubungkan merchant QRIS terlebih dahulu di halaman Langganan.',
        );
      }
      return false;
    }

    if (!context.entitlements.methods.includes(method)) {
      throw new AppError(
        'plan/method',
        method === 'manual_digital'
          ? 'Digital manual hanya tersedia pada paket Free. Paket Berbayar memakai tunai atau QRIS.'
          : 'Metode pembayaran tidak tersedia pada paket ini.',
      );
    }

    return false;
  }

  function routePaidOrder(order: Order, branch: Branch): { order: Order; job: KitchenJob | null } {
    if (order.fulfillmentMode === 'offline_sync') {
      return { order, job: null };
    }

    const hasKitchen = branchHasKitchenStaff(state, branch.id);
    if (!hasKitchen) {
      return {
        order: {
          ...order,
          fulfillmentMode: 'instant',
          fulfillmentState: 'completed',
          completedAt: nowIso(),
        },
        job: null,
      };
    }

    const sequence = nextKitchenSequence(state, branch.id);
    const job: KitchenJob = {
      id: newId('job'),
      orderId: order.id,
      businessId: order.businessId,
      branchId: order.branchId,
      sequence,
      status: 'new',
      createdAt: nowIso(),
      startedAt: null,
      readyAt: null,
      completedAt: null,
    };

    return {
      order: { ...order, fulfillmentMode: 'kds', fulfillmentState: 'new', completedAt: null },
      job,
    };
  }

  function nextOrderSequence(branch: Branch): number {
    const base = nextBranchSequence(state, branch.id);
    const today = new Date();
    const offlineMax = offlineOrders
      .filter((record) => record.branchId === branch.id && isSameDay(record.recordedAt, today))
      .reduce((max, record) => {
        const suffix = Number.parseInt(record.number.split('-').at(-1) ?? '0', 10);
        return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
      }, 0);
    return Math.max(base, offlineMax + 1);
  }

  function createOrderEntity(args: {
    branch: Branch;
    type: OrderType;
    tableId: string | null;
    items: OrderItem[];
    totals: OrderTotals;
    method: PaymentMethod;
    number: string;
    paymentState: Order['paymentState'];
    discountActor: Order['discountActor'];
    customerNote: string;
    source: Order['source'];
  }): Order {
    const tableLabel = args.tableId
      ? (state.tables.find((table) => table.id === args.tableId)?.label ?? null)
      : null;

    return {
      id: newId('ord'),
      businessId: args.branch.businessId,
      branchId: args.branch.id,
      number: args.number,
      source: args.source,
      type: args.type,
      tableId: args.tableId,
      tableLabel,
      paymentMethod: args.method,
      paymentState: args.paymentState,
      fulfillmentState: 'new',
      fulfillmentMode: 'instant',
      items: args.items,
      discountActor: args.discountActor,
      totals: args.totals,
      attempts: [],
      createdAt: nowIso(),
      paidAt: null,
      completedAt: null,
      deviceId: null,
      offline: null,
      handover: null,
      customerNote: args.customerNote.trim().slice(0, 200),
    };
  }

  async function confirmPaidOrder(input: OrderDraftInput): Promise<{ order: Order }> {
    const context = requirePermission('pos.run');
    assertPlanReady(context.entitlements);
    const branch = branchInScope(input.branchId);
    assertOperational(branch);

    if (input.method === 'qris') {
      throw new AppError('pos/qris-flow', 'QRIS harus diselesaikan melalui percobaan pembayaran provider.');
    }

    const items = buildItems(branch, input.lines);
    const discount = validateDiscount(input.discount, context);
    const offline = ensureMethodAllowed(input.method, context, branch);
    const table = input.type === 'dine_in' ? resolveTable(branch, input.tableId) : null;
    const totals = totalsFor(branch, input.type, items, discount, input.method);
    const number = newOrderNumber(branch.code, nextOrderSequence(branch));

    const discountActor = discount
      ? {
          staffId: context.session.staffId ?? context.session.userId,
          name: context.actorName,
          role: context.session.role,
        }
      : null;

    if (offline) {
      const deviceId = deviceRowId(branch.id);
      const recordedAt = nowIso();
      const localId = newId('off');

      const record: OfflineOrderRecord = {
        localId,
        deviceId,
        businessId: branch.businessId,
        branchId: branch.id,
        branchCode: branch.code,
        number,
        orderType: input.type,
        tableId: table?.tableId ?? null,
        tableLabel: table?.label ?? null,
        items,
        totals,
        actorStaffId: context.session.staffId ?? context.session.userId,
        actorName: context.actorName,
        actorRole: context.session.role,
        recordedAt,
        state: 'queued',
        syncedAt: null,
      };

      // Simpan dahulu; jika gagal, jangan tampilkan transaksi berhasil.
      try {
        await saveOfflineOrder(record);
      } catch (error) {
        throw new AppError('offline/write-failed', describeError(error));
      }

      setOfflineOrders([record, ...offlineOrders]);

      const localOrder: Order = {
        id: `local_${localId}`,
        businessId: branch.businessId,
        branchId: branch.id,
        number,
        source: 'cashier',
        type: input.type,
        tableId: table?.tableId ?? null,
        tableLabel: table?.label ?? null,
        paymentMethod: input.method,
        paymentState: 'paid',
        fulfillmentState: 'completed',
        fulfillmentMode: 'offline_sync',
        items,
        discountActor,
        totals,
        attempts: [],
        createdAt: recordedAt,
        paidAt: recordedAt,
        completedAt: recordedAt,
        deviceId,
        offline: { localId, deviceId, recordedAt, syncedAt: '' },
        handover: null,
        customerNote: input.customerNote,
      };

      return { order: localOrder };
    }

    const baseOrder = createOrderEntity({
      branch,
      type: input.type,
      tableId: table?.tableId ?? null,
      items,
      totals,
      method: input.method,
      number,
      paymentState: 'paid',
      discountActor,
      customerNote: input.customerNote,
      source: 'cashier',
    });

    const paidOrder: Order = { ...baseOrder, paidAt: nowIso() };
    const { order: routedOrder, job } = routePaidOrder(paidOrder, branch);

    let auditEvents = state.auditEvents;
    if (discountActor) {
      auditEvents = pushAudit(auditEvents, {
        businessId: branch.businessId,
        branchId: branch.id,
        actorName: context.actorName,
        action: 'discount.applied',
        detail: `Diskon ${discount?.type === 'percent' ? `${discount.value}%` : `Rp${discount?.value ?? 0}`} pada ${routedOrder.number}.`,
      });
    }

    commit({
      ...state,
      orders: [routedOrder, ...state.orders],
      kitchenJobs: job ? [job, ...state.kitchenJobs] : state.kitchenJobs,
      auditEvents,
    });

    return { order: routedOrder };
  }

  function startQrisOrder(input: OrderDraftInput): { order: Order; attempt: PaymentAttempt } {
    const context = requirePermission('pos.run');
    assertPlanReady(context.entitlements);
    const branch = branchInScope(input.branchId);
    assertOperational(branch);

    if (!isOnline()) {
      throw new AppError('qris/offline', 'QRIS terintegrasi membutuhkan koneksi internet.');
    }
    ensureMethodAllowed('qris', context, branch);

    const items = buildItems(branch, input.lines);
    const discount = validateDiscount(input.discount, context);
    const table = input.type === 'dine_in' ? resolveTable(branch, input.tableId) : null;
    const totals = totalsFor(branch, input.type, items, discount, 'qris');
    const number = newOrderNumber(branch.code, nextOrderSequence(branch));

    const discountActor = discount
      ? {
          staffId: context.session.staffId ?? context.session.userId,
          name: context.actorName,
          role: context.session.role,
        }
      : null;

    const order = createOrderEntity({
      branch,
      type: input.type,
      tableId: table?.tableId ?? null,
      items,
      totals,
      method: 'qris',
      number,
      paymentState: 'pending',
      discountActor,
      customerNote: input.customerNote,
      source: 'cashier',
    });

    const attempt: PaymentAttempt = {
      id: newId('qat'),
      orderId: order.id,
      businessId: branch.businessId,
      branchId: branch.id,
      providerRef: newProviderRef(),
      amount: totals.finalTotal,
      currency: 'IDR',
      state: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      verifiedAt: null,
    };

    const pendingOrder: Order = { ...order, attempts: [attempt] };

    commit({ ...state, orders: [pendingOrder, ...state.orders] });

    return { order: pendingOrder, attempt };
  }

  function verifyQrisAttempt(attemptId: string): void {
    const context = requirePermission('pos.run');
    const order = state.orders.find((candidate) =>
      candidate.attempts.some((attempt) => attempt.id === attemptId),
    );
    if (!order) {
      throw new AppError('qris/not-found', 'Percobaan pembayaran tidak ditemukan.');
    }
    const attempt = order.attempts.find((candidate) => candidate.id === attemptId);
    if (!attempt) {
      throw new AppError('qris/not-found', 'Percobaan pembayaran tidak ditemukan.');
    }

    // Callback sah berulang hanya berefek sekali.
    if (attempt.state === 'paid' || order.paymentState === 'paid') {
      return;
    }
    if (attempt.state !== 'pending') {
      throw new AppError('qris/non-pending', 'Percobaan QRIS ini sudah tidak aktif.');
    }

    const branch = branchInScope(order.branchId);
    const verifiedAt = nowIso();
    const verifiedAttempt: PaymentAttempt = { ...attempt, state: 'paid', verifiedAt };
    const paidOrder: Order = {
      ...order,
      paymentState: 'paid',
      paidAt: verifiedAt,
      attempts: order.attempts.map((candidate) =>
        candidate.id === attemptId ? verifiedAttempt : candidate,
      ),
    };

    const { order: routedOrder, job } = routePaidOrder(paidOrder, branch);

    commit({
      ...state,
      orders: state.orders.map((candidate) =>
        candidate.id === order.id ? routedOrder : candidate,
      ),
      kitchenJobs: job ? [job, ...state.kitchenJobs] : state.kitchenJobs,
      auditEvents: pushAudit(state.auditEvents, {
        businessId: order.businessId,
        branchId: order.branchId,
        actorName: context.actorName,
        action: 'payment.qris_verified',
        detail: `QRIS ${attempt.providerRef} terverifikasi untuk ${order.number}.`,
      }),
    });
  }

  function expireQrisAttempt(attemptId: string): void {
    const context = requirePermission('pos.run');
    const order = state.orders.find((candidate) =>
      candidate.attempts.some((attempt) => attempt.id === attemptId),
    );
    if (!order) {
      throw new AppError('qris/not-found', 'Percobaan pembayaran tidak ditemukan.');
    }
    const attempt = order.attempts.find((candidate) => candidate.id === attemptId);
    if (!attempt) {
      throw new AppError('qris/not-found', 'Percobaan pembayaran tidak ditemukan.');
    }
    if (attempt.state === 'paid' || order.paymentState === 'paid') {
      throw new AppError('qris/paid', 'Percobaan ini sudah lunas dan tidak dapat diubah.');
    }
    if (attempt.state !== 'pending') {
      return;
    }

    commit({
      ...state,
      orders: state.orders.map((candidate) =>
        candidate.id === order.id
          ? {
              ...candidate,
              paymentState: 'abandoned',
              attempts: candidate.attempts.map((entry) =>
                entry.id === attemptId
                  ? { ...entry, state: 'expired', verifiedAt: nowIso() }
                  : entry,
              ),
            }
          : candidate,
      ),
      auditEvents: pushAudit(state.auditEvents, {
        businessId: order.businessId,
        branchId: order.branchId,
        actorName: context.actorName,
        action: 'payment.qris_expired',
        detail: `${order.number} ditandai kedaluwarsa sebelum dana masuk; tidak dikirim ke dapur.`,
      }),
    });
  }

  function applyReadiness(orderId: string, markAll: boolean, itemId?: string): void {
    const context = requireContext();
    const session = context.session;
    if (session.role !== 'kitchen' && session.role !== 'owner') {
      throw new AppError(
        'kds/forbidden',
        'Hanya staf dapur cabang atau pemilik yang dapat menandai kesiapan item.',
      );
    }

    const order = findOrder(orderId);
    branchInScope(order.branchId);

    const job = state.kitchenJobs.find((candidate) => candidate.orderId === orderId);
    if (!job) {
      throw new AppError('kds/no-job', 'Pesanan ini tidak memiliki pekerjaan dapur.');
    }
    if (job.status !== 'preparing') {
      throw new AppError(
        'kds/not-started',
        'Tiket harus dimulai dengan "Mulai Persiapan" sebelum item ditandai siap.',
      );
    }

    const readyAt = nowIso();
    const items = order.items.map((item) => {
      const shouldMark = markAll || item.id === itemId;
      return shouldMark && !item.ready ? { ...item, ready: true, readyAt } : item;
    });

    const allReady = items.every((item) => item.ready);
    let nextOrder: Order = { ...order, items, fulfillmentState: 'preparing' };
    let nextJob: KitchenJob = { ...job, status: 'preparing', startedAt: job.startedAt ?? readyAt };

    if (allReady) {
      nextJob = { ...nextJob, status: 'ready', readyAt };
      nextOrder =
        order.type === 'dine_in'
          ? { ...nextOrder, fulfillmentState: 'ready', completedAt: null }
          : { ...nextOrder, fulfillmentState: 'awaiting_handover' };
    }

    commit({
      ...state,
      orders: state.orders.map((candidate) => (candidate.id === orderId ? nextOrder : candidate)),
      kitchenJobs: state.kitchenJobs.map((candidate) => (candidate.id === job.id ? nextJob : candidate)),
    });
  }

  function completeHandover(
    order: Order,
    context: Context,
    input: { matchedNumber: string; override: boolean; reason?: string; evidence?: string },
  ): void {
    const at = nowIso();
    const completed: Order = {
      ...order,
      fulfillmentState: 'completed',
      completedAt: at,
      handover: {
        at,
        staffId: context.session.staffId ?? context.session.userId,
        staffName: context.actorName,
        matchedNumber: input.matchedNumber,
        override: input.override,
        reason: input.reason,
        alternativeEvidence: input.evidence,
      },
    };

    let auditEvents = state.auditEvents;
    if (input.override) {
      auditEvents = pushAudit(auditEvents, {
        businessId: order.businessId,
        branchId: order.branchId,
        actorName: context.actorName,
        action: 'pickup.override',
        detail: `Pickup ${order.number} tanpa nomor cocok. Alasan: ${input.reason ?? '-'}. Bukti: ${input.evidence ?? '-'}.`,
      });
    }

    commit({
      ...state,
      orders: state.orders.map((candidate) => (candidate.id === order.id ? completed : candidate)),
      kitchenJobs: state.kitchenJobs.map((job) =>
        job.orderId === order.id ? { ...job, status: 'completed', completedAt: at } : job,
      ),
      auditEvents,
    });
  }

  function uniqueBranchCode(name: string): string {
    const base =
      name
        .replace(/[^A-Za-z ]/g, ' ')
        .trim()
        .split(/\s+/)
        .map((word) => word[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'CAB';

    let candidate = base;
    let counter = 2;
    while (state.branches.some((branch) => branch.code === candidate)) {
      candidate = `${base}${counter}`;
      counter += 1;
    }
    return candidate;
  }

  const actions: AppActions = {
    login(email, password) {
      const normalized = email.trim().toLowerCase();
      const user = state.users.find((candidate) => candidate.email.toLowerCase() === normalized);

      if (!user || user.password !== password) {
        throw new AppError('auth/invalid', 'Email atau kata sandi tidak cocok.');
      }
      if (!user.emailVerified) {
        commit({ ...state, pendingVerificationUserId: user.id });
        throw new AppError(
          'auth/unverified',
          'Email belum diverifikasi. Selesaikan verifikasi sebelum menggunakan bisnis.',
        );
      }

      const owned = state.businesses.find((business) => business.ownerUserId === user.id);
      if (owned) {
        const branches = state.branches.filter((branch) => branch.businessId === owned.id);
        const operational = branches.find((branch) => branch.status === 'operational') ?? branches[0];
        const session: Session = {
          userId: user.id,
          businessId: owned.id,
          branchId: operational?.id ?? null,
          role: 'owner',
          staffId: null,
        };
        commit({
          ...state,
          session,
          pendingVerificationUserId: null,
          demoVerificationCode: null,
        });
        return session;
      }

      const member = state.staff.find(
        (candidate) => candidate.userId === user.id && candidate.status === 'active',
      );
      if (!member) {
        throw new AppError(
          'auth/no-access',
          'Akun ini tidak memiliki akses cabang aktif. Hubungi pemilik atau manajer.',
        );
      }

      const session: Session = {
        userId: user.id,
        businessId: member.businessId,
        branchId: member.branchId,
        role: member.role,
        staffId: member.id,
      };
      commit({ ...state, session });
      return session;
    },

    register(input) {
      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();

      if (name.length < 2) {
        throw new AppError('auth/name', 'Nama minimal 2 karakter.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError('auth/email', 'Format email tidak valid.');
      }
      if (input.password.length < 8) {
        throw new AppError('auth/password', 'Kata sandi minimal 8 karakter.');
      }
      if (state.users.some((user) => user.email.toLowerCase() === email)) {
        throw new AppError('auth/email-taken', 'Email ini sudah terdaftar.');
      }

      const id = newId('usr');
      const code = String(Math.floor(100_000 + Math.random() * 900_000));

      commit({
        ...state,
        users: [
          ...state.users,
          {
            id,
            name,
            email,
            password: input.password,
            emailVerified: false,
            createdAt: nowIso(),
          },
        ],
        session: null,
        pendingVerificationUserId: id,
        demoVerificationCode: code,
      });

      return { code };
    },

    verifyEmail(code) {
      const userId = state.pendingVerificationUserId;
      if (!userId) {
        throw new AppError('auth/no-pending', 'Tidak ada pendaftaran yang menunggu verifikasi.');
      }
      if (code.trim() !== state.demoVerificationCode) {
        throw new AppError('auth/code', 'Kode verifikasi tidak cocok.');
      }

      const session: Session = {
        userId,
        businessId: null,
        branchId: null,
        role: 'owner',
        staffId: null,
      };

      commit({
        ...state,
        users: state.users.map((user) =>
          user.id === userId ? { ...user, emailVerified: true } : user,
        ),
        session,
        pendingVerificationUserId: null,
        demoVerificationCode: null,
      });

      return session;
    },

    resendVerification() {
      if (!state.pendingVerificationUserId) {
        throw new AppError('auth/no-pending', 'Tidak ada pendaftaran yang menunggu verifikasi.');
      }
      const code = String(Math.floor(100_000 + Math.random() * 900_000));
      commit({ ...state, demoVerificationCode: code });
      return code;
    },

    logout() {
      commit({
        ...state,
        session: null,
        pendingVerificationUserId: null,
        demoVerificationCode: null,
      });
    },

    completeOnboarding(input) {
      const session = requireSession();
      if (session.businessId) {
        throw new AppError('business/exists', 'Bisnis sudah dibuat untuk akun ini.');
      }
      const businessName = input.businessName.trim();
      const branchName = input.branchName.trim();
      if (businessName.length < 2 || branchName.length < 2) {
        throw new AppError('onboarding/name', 'Nama bisnis dan cabang minimal 2 karakter.');
      }

      const businessId = newId('biz');
      const branchId = newId('br');
      const branch: Branch = {
        id: branchId,
        businessId,
        name: branchName,
        code: uniqueBranchCode(branchName),
        address: input.branchAddress.trim(),
        status: 'operational',
        timezone: 'Asia/Jakarta',
        taxRate: Math.min(100, Math.max(0, input.taxRate)),
        serviceRate: Math.min(100, Math.max(0, input.serviceRate)),
        taxAppliesTo: ['dine_in', 'takeaway'],
        serviceAppliesTo: ['dine_in'],
        configVersion: 1,
      };

      commit({
        ...state,
        businesses: [
          ...state.businesses,
          {
            id: businessId,
            name: businessName,
            ownerUserId: session.userId,
            createdAt: nowIso(),
            timezone: 'Asia/Jakarta',
          },
        ],
        branches: [...state.branches, branch],
        tables: [
          ...state.tables,
          ...['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4'].map((label, index) => ({
            id: newId('tbl'),
            businessId,
            branchId,
            label,
            seats: index < 2 ? 2 : 4,
          })),
        ],
        categories: [
          ...state.categories,
          {
            id: newId('cat'),
            businessId,
            branchId,
            name: 'Menu Utama',
            displayOrder: 1,
          },
        ],
        subscriptions: [
          ...state.subscriptions,
          {
            businessId,
            plan: 'free',
            state: 'free',
            trialEndsAt: null,
            validUntil: null,
            updatedAt: nowIso(),
          },
        ],
        merchantConnections: [
          ...state.merchantConnections,
          {
            businessId,
            branchScopeId: null,
            provider: 'midtrans',
            status: 'not_connected',
            environment: 'sandbox',
            evidence: '',
            updatedAt: nowIso(),
          },
        ],
        session: { ...session, businessId, branchId },
      });
    },

    switchBranch(branchId) {
      const session = requireSession();
      const branch = branchInScope(branchId);
      if (branch.status !== 'operational') {
        throw new AppError('branch/inactive', 'Cabang nonaktif tidak dapat dipilih untuk operasional.');
      }
      commit({ ...state, session: { ...session, branchId } });
    },

    async resetDemo() {
      try {
        await clearOfflineOrders();
      } catch {
        // Antrean lokal mungkin tidak tersedia; state tetap direset.
      }
      offlineOrders = [];
      commit(createSeedState());
    },

    addProduct(input) {
      const context = requirePermission('menu.manage');
      const branch = workingBranch();
      const name = input.name.trim();
      if (name.length < 2) {
        throw new AppError('menu/name', 'Nama produk minimal 2 karakter.');
      }
      if (!Number.isFinite(input.price) || input.price < 100 || input.price > 10_000_000) {
        throw new AppError('menu/price', 'Harga harus antara Rp100 dan Rp10.000.000.');
      }
      const category = state.categories.find(
        (candidate) => candidate.id === input.categoryId && candidate.branchId === branch.id,
      );
      if (!category) {
        throw new AppError('menu/category', 'Kategori tidak ditemukan pada cabang ini.');
      }

      commit({
        ...state,
        products: [
          {
            id: newId('prd'),
            businessId: branch.businessId,
            branchId: branch.id,
            categoryId: category.id,
            name,
            description: input.description.trim().slice(0, 160),
            price: Math.round(input.price),
            availability: 'available',
            photo: normalizePhoto(input.photo),
            updatedAt: nowIso(),
          },
          ...state.products,
        ],
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'menu.updated',
          detail: `Produk "${name}" ditambahkan.`,
        }),
      });
    },

    updateProduct(productId, patch) {
      const product = state.products.find((candidate) => candidate.id === productId);
      if (!product) {
        throw new AppError('menu/not-found', 'Produk tidak ditemukan.');
      }
      const branch = branchInScope(product.branchId);
      const context = requirePermission('menu.manage');

      const name = patch.name?.trim() ?? product.name;
      const price = patch.price ?? product.price;
      if (name.length < 2) {
        throw new AppError('menu/name', 'Nama produk minimal 2 karakter.');
      }
      if (!Number.isFinite(price) || price < 100 || price > 10_000_000) {
        throw new AppError('menu/price', 'Harga harus antara Rp100 dan Rp10.000.000.');
      }

      commit({
        ...state,
        products: state.products.map((candidate) =>
          candidate.id === productId
            ? {
                ...candidate,
                name,
                price: Math.round(price),
                description: patch.description?.trim().slice(0, 160) ?? candidate.description,
                categoryId: patch.categoryId ?? candidate.categoryId,
                photo:
                  patch.photo === undefined
                    ? (candidate.photo ?? null)
                    : normalizePhoto(patch.photo),
                updatedAt: nowIso(),
              }
            : candidate,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'menu.updated',
          detail: `Produk "${name}" diperbarui (snapshot transaksi lama tidak berubah).`,
        }),
      });
    },

    deleteProduct(productId) {
      const product = state.products.find((candidate) => candidate.id === productId);
      if (!product) {
        throw new AppError('menu/not-found', 'Produk tidak ditemukan.');
      }
      const branch = branchInScope(product.branchId);
      const context = requirePermission('menu.manage');

      commit({
        ...state,
        products: state.products.filter((candidate) => candidate.id !== productId),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'menu.deleted',
          detail: `Produk "${product.name}" dihapus dari katalog (snapshot transaksi lama tetap).`,
        }),
      });
    },

    setProductAvailability(productId, availability) {
      const product = state.products.find((candidate) => candidate.id === productId);
      if (!product) {
        throw new AppError('menu/not-found', 'Produk tidak ditemukan.');
      }
      const branch = branchInScope(product.branchId);
      const context = requirePermission('menu.manage');

      commit({
        ...state,
        products: state.products.map((candidate) =>
          candidate.id === productId
            ? { ...candidate, availability, updatedAt: nowIso() }
            : candidate,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'menu.updated',
          detail: `${product.name} → ${availability === 'available' ? 'Tersedia' : 'Habis'}.`,
        }),
      });
    },

    addCategory(name) {
      const branch = workingBranch();
      requirePermission('menu.manage');
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        throw new AppError('menu/category-name', 'Nama kategori minimal 2 karakter.');
      }
      if (
        state.categories.some(
          (category) => category.branchId === branch.id && category.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        throw new AppError('menu/category-duplicate', 'Kategori dengan nama ini sudah ada.');
      }
      const order =
        state.categories
          .filter((category) => category.branchId === branch.id)
          .reduce((max, category) => Math.max(max, category.displayOrder), 0) + 1;

      commit({
        ...state,
        categories: [
          ...state.categories,
          {
            id: newId('cat'),
            businessId: branch.businessId,
            branchId: branch.id,
            name: trimmed,
            displayOrder: order,
          },
        ],
      });
    },

    moveCategory(categoryId, direction) {
      const branch = workingBranch();
      const context = requirePermission('menu.manage');

      const siblings = state.categories
        .filter((category) => category.branchId === branch.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const index = siblings.findIndex((category) => category.id === categoryId);
      if (index === -1) {
        throw new AppError('menu/category-missing', 'Kategori tidak ditemukan pada cabang ini.');
      }

      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= siblings.length) {
        return;
      }

      const reordered = [...siblings];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      const orderById = new Map(
        reordered.map((category, position) => [category.id, position + 1] as const),
      );

      commit({
        ...state,
        categories: state.categories.map((category) =>
          orderById.has(category.id)
            ? { ...category, displayOrder: orderById.get(category.id) ?? category.displayOrder }
            : category,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'menu.updated',
          detail: `Urutan kategori "${siblings[index].name}" digeser ${direction === 'up' ? 'naik' : 'turun'}.`,
        }),
      });
    },

    deleteCategory(categoryId) {
      const branch = workingBranch();
      const context = requirePermission('menu.manage');

      const category = state.categories.find(
        (candidate) => candidate.id === categoryId && candidate.branchId === branch.id,
      );
      if (!category) {
        throw new AppError('menu/category-missing', 'Kategori tidak ditemukan pada cabang ini.');
      }

      const productCount = state.products.filter(
        (product) => product.categoryId === category.id,
      ).length;
      if (productCount > 0) {
        throw new AppError(
          'menu/category-in-use',
          `Kategori "${category.name}" masih memiliki ${productCount} produk. Pindahkan atau hapus produknya terlebih dahulu.`,
        );
      }

      const remaining = state.categories
        .filter((candidate) => candidate.branchId === branch.id && candidate.id !== categoryId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const orderById = new Map(
        remaining.map((candidate, position) => [candidate.id, position + 1] as const),
      );

      commit({
        ...state,
        categories: state.categories
          .filter((candidate) => candidate.id !== categoryId)
          .map((candidate) =>
            orderById.has(candidate.id)
              ? { ...candidate, displayOrder: orderById.get(candidate.id) ?? candidate.displayOrder }
              : candidate,
          ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'menu.deleted',
          detail: `Kategori "${category.name}" dihapus dari katalog.`,
        }),
      });
    },

    addTable(label, seats) {
      const branch = workingBranch();
      requirePermission('table.manage');
      const trimmed = label.trim();
      if (trimmed.length < 1) {
        throw new AppError('table/label', 'Label meja wajib diisi.');
      }
      if (!Number.isFinite(seats) || seats < 1 || seats > 30) {
        throw new AppError('table/seats', 'Jumlah kursi harus antara 1 dan 30.');
      }
      if (
        state.tables.some(
          (table) => table.branchId === branch.id && table.label.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        throw new AppError('table/duplicate', 'Label meja sudah dipakai di cabang ini.');
      }

      commit({
        ...state,
        tables: [
          ...state.tables,
          {
            id: newId('tbl'),
            businessId: branch.businessId,
            branchId: branch.id,
            label: trimmed,
            seats: Math.round(seats),
          },
        ],
      });
    },

    addBranch(input) {
      const context = requireOwner();
      assertPlanReady(context.entitlements);
      const businessId = context.businessId;
      const existing = state.branches.filter((branch) => branch.businessId === businessId);
      if (existing.length >= context.entitlements.branchLimit) {
        throw new AppError(
          'plan/branch-limit',
          `Batas paket saat ini ${context.entitlements.branchLimit} cabang. Naikkan paket untuk menambah cabang.`,
        );
      }
      const name = input.name.trim();
      if (name.length < 2) {
        throw new AppError('branch/name', 'Nama cabang minimal 2 karakter.');
      }

      const branch: Branch = {
        id: newId('br'),
        businessId,
        name,
        code: uniqueBranchCode(name),
        address: input.address.trim(),
        status: 'operational',
        timezone: 'Asia/Jakarta',
        taxRate: Math.min(100, Math.max(0, input.taxRate)),
        serviceRate: Math.min(100, Math.max(0, input.serviceRate)),
        taxAppliesTo: ['dine_in', 'takeaway'],
        serviceAppliesTo: ['dine_in'],
        configVersion: 1,
      };

      commit({
        ...state,
        branches: [...state.branches, branch],
        tables: [
          ...state.tables,
          ...['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4'].map((label, index) => ({
            id: newId('tbl'),
            businessId,
            branchId: branch.id,
            label,
            seats: index < 2 ? 2 : 4,
          })),
        ],
        categories: [
          ...state.categories,
          {
            id: newId('cat'),
            businessId,
            branchId: branch.id,
            name: 'Menu Utama',
            displayOrder: 1,
          },
        ],
        session: { ...context.session, branchId: branch.id },
        auditEvents: pushAudit(state.auditEvents, {
          businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'branch.updated',
          detail: `Cabang "${name}" ditambahkan.`,
        }),
      });

      return branch;
    },

    updateBranchSettings(input) {
      const context = requirePermission('branch.settings');
      const branch = branchInScope(input.branchId);
      if (context.session.role === 'manager' && context.session.branchId !== branch.id) {
        throw new AppError('branch/manager-scope', 'Manajer hanya dapat mengubah cabangnya sendiri.');
      }

      commit({
        ...state,
        branches: state.branches.map((candidate) =>
          candidate.id === branch.id
            ? {
                ...candidate,
                name: input.name.trim() || candidate.name,
                address: input.address.trim(),
                taxRate: Math.min(100, Math.max(0, input.taxRate)),
                serviceRate: Math.min(100, Math.max(0, input.serviceRate)),
                taxAppliesTo: input.taxAppliesTo,
                serviceAppliesTo: input.serviceAppliesTo,
                status: input.status,
                configVersion: candidate.configVersion + 1,
              }
            : candidate,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'branch.updated',
          detail: `Pengaturan cabang diperbarui (pajak ${input.taxRate}%, layanan ${input.serviceRate}%).`,
        }),
      });
    },

    addStaff(input) {
      const context = requireContext();
      const session = context.session;
      if (session.role === 'manager' && !can(session.role, 'staff.manage.own_branch')) {
        throw new AppError('auth/forbidden', 'Peran Anda tidak dapat mengelola staf.');
      }
      if (!can(session.role, 'staff.manage') && !can(session.role, 'staff.manage.own_branch')) {
        throw new AppError('auth/forbidden', 'Peran Anda tidak dapat mengelola staf.');
      }
      if (!canManageStaffRole(session.role, input.role)) {
        throw new AppError('staff/role-forbidden', 'Manajer tidak dapat menambah akun pemilik atau manajer lain.');
      }

      const branch = branchInScope(input.branchId);
      assertOperational(branch);
      assertPlanReady(context.entitlements);

      const activeInBusiness = state.staff.filter(
        (member) => member.businessId === context.businessId && member.status === 'active',
      );
      const activeInBranch = activeInBusiness.filter((member) => member.branchId === branch.id);

      if (context.entitlements.plan === 'free') {
        if (activeInBusiness.length >= context.entitlements.staffTotal) {
          throw new AppError(
            'plan/staff-limit',
            'Paket Free hanya mengizinkan 1 akun staf di luar pemilik.',
          );
        }
      } else if (activeInBranch.length >= context.entitlements.staffPerBranch) {
        throw new AppError(
          'plan/staff-limit',
          `Setiap cabang dibatasi ${context.entitlements.staffPerBranch} staf di luar pemilik.`,
        );
      }

      const email = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError('staff/email', 'Format email staf tidak valid.');
      }
      if (state.users.some((user) => user.email.toLowerCase() === email)) {
        throw new AppError('staff/email-taken', 'Email ini sudah dipakai akun lain.');
      }

      const userId = newId('usr');
      const staffId = newId('stf');
      const created: StaffAccount = {
        id: staffId,
        businessId: context.businessId,
        branchId: branch.id,
        userId,
        role: input.role,
        status: 'active',
        createdAt: nowIso(),
        note: 'Dibuat oleh ' + context.actorName,
      };

      commit({
        ...state,
        users: [
          ...state.users,
          {
            id: userId,
            name: input.name.trim(),
            email,
            password: DEMO_PASSWORD,
            emailVerified: true,
            createdAt: nowIso(),
          },
        ],
        staff: [...state.staff, created],
        auditEvents: pushAudit(state.auditEvents, {
          businessId: context.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'staff.created',
          detail: `${input.name.trim()} (${input.role}) ditambahkan ke ${branch.name}.`,
        }),
      });

      return created;
    },

    setStaffStatus(staffId, status) {
      const context = requireContext();
      const session = context.session;
      const target = state.staff.find(
        (member) => member.id === staffId && member.businessId === context.businessId,
      );
      if (!target) {
        throw new AppError('staff/not-found', 'Akun staf tidak ditemukan pada bisnis ini.');
      }
      if (!can(session.role, 'staff.manage') && !can(session.role, 'staff.manage.own_branch')) {
        throw new AppError('auth/forbidden', 'Peran Anda tidak dapat mengelola staf.');
      }
      if (!canManageStaffRole(session.role, target.role)) {
        throw new AppError('staff/role-forbidden', 'Manajer tidak dapat mengubah akun ini.');
      }
      if (session.role === 'manager' && session.branchId !== target.branchId) {
        throw new AppError('staff/branch-scope', 'Manajer hanya dapat mengelola staf cabangnya.');
      }
      if (target.userId === session.userId) {
        throw new AppError('staff/self', 'Anda tidak dapat menonaktifkan akun sendiri.');
      }

      commit({
        ...state,
        staff: state.staff.map((member) =>
          member.id === staffId ? { ...member, status } : member,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: context.businessId,
          branchId: target.branchId,
          actorName: context.actorName,
          action: status === 'inactive' ? 'staff.deactivated' : 'staff.created',
          detail: `${state.users.find((user) => user.id === target.userId)?.name ?? 'Staf'} → ${status === 'inactive' ? 'nonaktif' : 'aktif'}.`,
        }),
      });
    },

    confirmPaidOrder,

    startQrisOrder,

    verifyQrisAttempt,

    expireQrisAttempt,

    placeQrTableOrder(input) {
      if (!isOnline()) {
        throw new AppError('qr/offline', 'Pemesanan QR meja membutuhkan koneksi internet.');
      }
      const branch = state.branches.find((candidate) => candidate.id === input.branchId);
      if (!branch) {
        throw new AppError('qr/branch', 'Cabang tidak ditemukan.');
      }
      assertOperational(branch);

      const entitlements = entitlementsFor(subscriptionFor(branch.businessId));
      if (!entitlements.qrisSelfOrder) {
        throw new AppError(
          'qr/plan',
          'Pemesanan mandiri lewat QR meja hanya tersedia pada paket Berbayar.',
        );
      }
      const merchant = merchantFor(branch.businessId);
      if (!merchant || merchant.status !== 'active') {
        throw new AppError('qr/merchant', 'Kanal QRIS cabang ini belum aktif.');
      }
      if (branch.status !== 'operational') {
        throw new AppError('qr/branch-offline', 'Cabang sedang tidak menerima pesanan QR.');
      }

      const table = state.tables.find(
        (candidate) => candidate.id === input.tableId && candidate.branchId === branch.id,
      );
      if (!table) {
        throw new AppError('qr/table', 'Meja tidak ditemukan pada cabang ini.');
      }

      const items = buildItems(branch, input.lines);
      const totals = totalsFor(branch, 'dine_in', items, null, 'qris');
      const number = newOrderNumber(branch.code, nextOrderSequence(branch));

      const order = createOrderEntity({
        branch,
        type: 'dine_in',
        tableId: table.id,
        items,
        totals,
        method: 'qris',
        number,
        paymentState: 'pending',
        discountActor: null,
        customerNote: input.customerNote,
        source: 'qr_table',
      });

      const attempt: PaymentAttempt = {
        id: newId('qat'),
        orderId: order.id,
        businessId: branch.businessId,
        branchId: branch.id,
        providerRef: newProviderRef(),
        amount: totals.finalTotal,
        currency: 'IDR',
        state: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        verifiedAt: null,
      };

      const pendingOrder: Order = { ...order, attempts: [attempt] };
      commit({ ...state, orders: [pendingOrder, ...state.orders] });

      return { order: pendingOrder, attempt };
    },

    verifyQrTablePayment(attemptId) {
      const order = state.orders.find((candidate) =>
        candidate.attempts.some((attempt) => attempt.id === attemptId),
      );
      if (!order) {
        throw new AppError('qr/not-found', 'Pesanan tidak ditemukan.');
      }
      const attempt = order.attempts.find((candidate) => candidate.id === attemptId);
      if (!attempt) {
        throw new AppError('qr/not-found', 'Percobaan pembayaran tidak ditemukan.');
      }
      if (attempt.state === 'paid' || order.paymentState === 'paid') {
        return;
      }
      if (attempt.state !== 'pending') {
        throw new AppError('qr/non-pending', 'Percobaan QRIS sudah tidak aktif.');
      }
      if (new Date(attempt.expiresAt).getTime() < Date.now()) {
        throw new AppError('qr/expired', 'Kode QRIS sudah kedaluwarsa. Buat pesanan baru.');
      }

      const branch = state.branches.find((candidate) => candidate.id === order.branchId);
      if (!branch) {
        throw new AppError('qr/branch', 'Cabang tidak ditemukan.');
      }

      const verifiedAt = nowIso();
      const paidOrder: Order = {
        ...order,
        paymentState: 'paid',
        paidAt: verifiedAt,
        attempts: order.attempts.map((candidate) =>
          candidate.id === attemptId
            ? { ...candidate, state: 'paid' as const, verifiedAt }
            : candidate,
        ),
      };
      const { order: routedOrder, job } = routePaidOrder(paidOrder, branch);

      commit({
        ...state,
        orders: state.orders.map((candidate) =>
          candidate.id === order.id ? routedOrder : candidate,
        ),
        kitchenJobs: job ? [job, ...state.kitchenJobs] : state.kitchenJobs,
      });
    },

    startKitchenJob(jobId) {
      const context = requireContext();
      const session = context.session;
      const job = state.kitchenJobs.find(
        (candidate) => candidate.id === jobId && candidate.businessId === context.businessId,
      );
      if (!job) {
        throw new AppError('kds/not-found', 'Pekerjaan dapur tidak ditemukan.');
      }
      branchInScope(job.branchId);
      if (session.role !== 'kitchen' && session.role !== 'owner') {
        throw new AppError(
          'kds/forbidden',
          'Hanya staf dapur cabang atau pemilik yang dapat memulai persiapan.',
        );
      }
      if (job.status !== 'new') {
        return;
      }
      const startedAt = nowIso();

      commit({
        ...state,
        kitchenJobs: state.kitchenJobs.map((candidate) =>
          candidate.id === jobId ? { ...candidate, status: 'preparing', startedAt } : candidate,
        ),
        orders: state.orders.map((order) =>
          order.id === job.orderId ? { ...order, fulfillmentState: 'preparing' } : order,
        ),
      });
    },

    markItemReady(orderId, itemId) {
      applyReadiness(orderId, false, itemId);
    },

    markAllItemsReady(orderId) {
      applyReadiness(orderId, true);
    },

    confirmHandover(orderId, enteredNumber) {
      const context = requirePermission('handover.confirm');
      const order = findOrder(orderId);
      branchInScope(order.branchId);

      if (order.type !== 'takeaway') {
        throw new AppError('handover/dine-in', 'Dine-in selesai otomatis saat semua item siap.');
      }
      if (order.fulfillmentState === 'completed') {
        throw new AppError('handover/done', 'Pesanan ini sudah diserahkan.');
      }
      if (order.fulfillmentState !== 'awaiting_handover') {
        throw new AppError('handover/not-ready', 'Pesanan belum siap diserahkan.');
      }
      if (normalize(enteredNumber) !== normalize(order.number) || normalize(enteredNumber).length === 0) {
        throw new AppError(
          'handover/mismatch',
          'Nomor pesanan tidak cocok. Manajer dapat mengizinkan penyerahan melalui pemeriksaan alternatif yang dicatat.',
        );
      }

      completeHandover(order, context, {
        matchedNumber: enteredNumber.trim(),
        override: false,
      });
    },

    confirmServed(orderId) {
      const context = requirePermission('served.confirm');
      const order = findOrder(orderId);
      branchInScope(order.branchId);

      if (order.type !== 'dine_in') {
        throw new AppError('serve/not-dine-in', 'Konfirmasi penyajian hanya untuk pesanan dine-in.');
      }
      if (order.fulfillmentState === 'completed') {
        throw new AppError('serve/done', 'Pesanan ini sudah diselesaikan.');
      }
      if (order.fulfillmentState !== 'ready') {
        throw new AppError(
          'serve/not-ready',
          'Semua item harus Siap sebelum penyajian dapat dikonfirmasi.',
        );
      }

      const at = nowIso();
      const completed: Order = { ...order, fulfillmentState: 'completed', completedAt: at };

      commit({
        ...state,
        orders: state.orders.map((candidate) =>
          candidate.id === order.id ? completed : candidate,
        ),
        kitchenJobs: state.kitchenJobs.map((job) =>
          job.orderId === order.id ? { ...job, status: 'completed', completedAt: at } : job,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: order.businessId,
          branchId: order.branchId,
          actorName: context.actorName,
          action: 'served.confirmed',
          detail: `${order.number} dikonfirmasi sudah disajikan (${order.tableLabel ?? 'dine-in'}).`,
        }),
      });
    },

    overridePickup(orderId, input) {
      const context = requirePermission('pickup.override');
      const order = findOrder(orderId);
      branchInScope(order.branchId);

      if (order.fulfillmentState !== 'awaiting_handover') {
        throw new AppError('handover/not-ready', 'Hanya pesanan takeaway yang menunggu penyerahan.');
      }
      if (input.reason.trim().length < 8) {
        throw new AppError('handover/reason', 'Alasan pemeriksaan alternatif minimal 8 karakter.');
      }
      if (input.evidence.trim().length < 3) {
        throw new AppError('handover/evidence', 'Catat bukti alternatif yang diperiksa.');
      }

      completeHandover(order, context, {
        matchedNumber: 'TANPA-NOMOR',
        override: true,
        reason: input.reason.trim(),
        evidence: input.evidence.trim(),
      });
    },

    registerPrimaryDevice(branchId, label) {
      const context = requirePermission('device.manage');
      if (!isOnline()) {
        throw new AppError('offline/register-online', 'Perangkat utama harus didaftarkan saat online.');
      }
      const branch = branchInScope(branchId);
      const id = deviceRowId(branch.id);
      const existingPrimary = state.devices.find(
        (device) => device.branchId === branch.id && device.isPrimaryOffline && device.id !== id,
      );

      if (existingPrimary) {
        const pendingForOld = offlineOrders.some(
          (record) => record.deviceId === existingPrimary.id && record.state === 'queued',
        );
        if (pendingForOld) {
          throw new AppError(
            'offline/handover',
            'Perangkat utama lama masih memiliki transaksi belum tersinkron. Sinkronkan dahulu sebelum memindahkan kendali.',
          );
        }
      }

      const device: RegisteredDevice = {
        id,
        businessId: branch.businessId,
        branchId: branch.id,
        label: label.trim() || 'Perangkat kasir',
        isPrimaryOffline: true,
        lastSeenAt: nowIso(),
        version: 1,
      };

      const others = state.devices
        .filter((candidate) => candidate.branchId === branch.id && candidate.id !== id)
        .map((candidate) => ({ ...candidate, isPrimaryOffline: false }));

      commit({
        ...state,
        devices: [
          ...state.devices.filter((candidate) => candidate.branchId !== branch.id),
          ...others,
          device,
        ],
        auditEvents: pushAudit(state.auditEvents, {
          businessId: branch.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'offline.device_registered',
          detail: `Perangkat utama offline: ${device.label}.`,
        }),
      });

      return device;
    },

    async syncOfflineOrders() {
      const context = requireContext();
      if (!isOnline()) {
        throw new AppError('offline/offline', 'Sambungkan internet sebelum menyinkronkan.');
      }

      const session = context.session;
      const queued = offlineOrders.filter((record) => record.state === 'queued');
      if (queued.length === 0) {
        return { synced: 0, failed: 0 };
      }

      let nextOrders = state.orders;
      let auditEvents = state.auditEvents;
      let synced = 0;
      let failed = 0;
      const usedNumbers = new Set(
        state.orders.map((order) => `${order.branchId}:${order.number}`),
      );

      const processed: OfflineOrderRecord[] = [];

      for (const record of queued) {
        try {
          if (record.businessId !== context.businessId) {
            throw new AppError('offline/scope', 'Transaksi milik bisnis lain.');
          }
          if (session.role !== 'owner' && session.branchId !== record.branchId) {
            throw new AppError('offline/scope', 'Transaksi milik cabang lain.');
          }
          const device = state.devices.find(
            (candidate) => candidate.id === record.deviceId && candidate.branchId === record.branchId,
          );
          if (!device) {
            throw new AppError('offline/device-unknown', 'Perangkat penerima transaksi tidak dikenali.');
          }

          const alreadyImported = nextOrders.some(
            (order) => order.businessId === record.businessId && order.offline?.localId === record.localId,
          );
          if (alreadyImported) {
            synced += 1;
            processed.push({ ...record, state: 'synced', syncedAt: nowIso() });
            continue;
          }

          let number = record.number;
          const sequenceBase = nextBranchSequence({ ...state, orders: nextOrders }, record.branchId);
          let cursor = sequenceBase;
          const numberKey = (value: string) => `${record.branchId}:${value}`;
          while (usedNumbers.has(numberKey(number))) {
            number = newOrderNumber(record.branchCode, cursor);
            cursor += 1;
          }
          usedNumbers.add(numberKey(number));

          const syncedAt = nowIso();
          const imported: Order = {
            id: newId('ord'),
            businessId: record.businessId,
            branchId: record.branchId,
            number,
            source: 'cashier',
            type: record.orderType,
            tableId: record.tableId,
            tableLabel: record.tableLabel,
            paymentMethod: 'cash',
            paymentState: 'paid',
            fulfillmentState: 'completed',
            fulfillmentMode: 'offline_sync',
            items: record.items,
            discountActor: null,
            totals: record.totals,
            attempts: [],
            createdAt: record.recordedAt,
            paidAt: record.recordedAt,
            completedAt: record.recordedAt,
            deviceId: record.deviceId,
            offline: {
              localId: record.localId,
              deviceId: record.deviceId,
              recordedAt: record.recordedAt,
              syncedAt,
            },
            handover: null,
            customerNote: '',
          };

          nextOrders = [imported, ...nextOrders];
          auditEvents = pushAudit(auditEvents, {
            businessId: record.businessId,
            branchId: record.branchId,
            actorName: context.actorName,
            action: 'offline.order_synced',
            detail: `Transaksi tunai offline ${record.number} → ${number} diimpor satu kali, tanpa tiket KDS.`,
          });

          const syncedRecord: OfflineOrderRecord = { ...record, state: 'synced', syncedAt };
          try {
            await saveOfflineOrder(syncedRecord);
          } catch {
            // Server sudah mencatat; record lokal tetap ditandai agar tidak diimpor ulang.
          }
          processed.push(syncedRecord);
          synced += 1;
        } catch (error) {
          failed += 1;
          processed.push({ ...record, state: 'failed' });
          console.warn('MejaFlow: sinkronisasi gagal', describeError(error));
        }
      }

      const byId = new Map(processed.map((record) => [record.localId, record]));
      const nextOffline = offlineOrders.map((record) => byId.get(record.localId) ?? record);

      state = { ...state, orders: nextOrders, auditEvents };
      setOfflineOrders(nextOffline);

      return { synced, failed };
    },

    activateTrial() {
      const context = requireOwner();
      const businessId = context.businessId;

      if (state.trials.some((trial) => trial.businessId === businessId)) {
        throw new AppError('plan/trial-used', 'Trial hanya dapat diaktifkan satu kali per bisnis.');
      }
      if (context.subscription.state === 'active') {
        throw new AppError('plan/already-paid', 'Langganan Berbayar sedang aktif.');
      }

      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * DAY);

      commit({
        ...state,
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.businessId === businessId
            ? {
                ...subscription,
                plan: 'paid',
                state: 'trial',
                trialEndsAt: endsAt.toISOString(),
                validUntil: null,
                updatedAt: nowIso(),
              }
            : subscription,
        ),
        trials: [
          ...state.trials,
          {
            businessId,
            activatedBy: context.session.userId,
            startedAt: startedAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        ],
        auditEvents: pushAudit(state.auditEvents, {
          businessId,
          branchId: null,
          actorName: context.actorName,
          action: 'plan.trial_activated',
          detail: `Trial ${TRIAL_DAYS} hari diaktifkan tanpa metode pembayaran.`,
        }),
      });
    },

    createInvoice(period) {
      const context = requireOwner();
      const businessId = context.businessId;

      if (
        state.invoices.some(
          (invoice) => invoice.businessId === businessId && invoice.state === 'unpaid',
        )
      ) {
        throw new AppError('billing/unpaid-exists', 'Sudah ada tagihan yang belum dibayar.');
      }

      const amount = PLAN_PRICES[period];
      const invoice: Invoice = {
        id: newId('inv'),
        businessId,
        period,
        amount,
        state: 'unpaid',
        createdAt: nowIso(),
        dueAt: new Date(Date.now() + 7 * DAY).toISOString(),
        paidAt: null,
        providerRef: newProviderRef().replace('QRIS', 'SAAS'),
        priceSnapshot: `${period === 'monthly' ? 'Bulanan' : 'Tahunan'} · Rp${amount.toLocaleString('id-ID')}`,
      };

      commit({ ...state, invoices: [invoice, ...state.invoices] });
      return invoice;
    },

    payInvoice(invoiceId) {
      const context = requireOwner();
      const invoice = state.invoices.find(
        (candidate) => candidate.id === invoiceId && candidate.businessId === context.businessId,
      );
      if (!invoice) {
        throw new AppError('billing/not-found', 'Tagihan tidak ditemukan.');
      }

      // Callback ulang tidak memperpanjang dua kali.
      if (invoice.state === 'paid') {
        return;
      }

      const paidAt = new Date();
      const subscription = subscriptionFor(context.businessId);
      const currentEnd =
        subscription.validUntil && new Date(subscription.validUntil) > paidAt
          ? new Date(subscription.validUntil)
          : paidAt;
      const validUntil = addPeriod(currentEnd, invoice.period);

      commit({
        ...state,
        invoices: state.invoices.map((candidate) =>
          candidate.id === invoiceId
            ? { ...candidate, state: 'paid', paidAt: paidAt.toISOString() }
            : candidate,
        ),
        subscriptions: state.subscriptions.map((candidate) =>
          candidate.businessId === context.businessId
            ? {
                ...candidate,
                plan: 'paid',
                state: 'active',
                trialEndsAt: null,
                validUntil: validUntil.toISOString(),
                updatedAt: nowIso(),
              }
            : candidate,
        ),
        auditEvents: pushAudit(state.auditEvents, {
          businessId: context.businessId,
          branchId: null,
          actorName: context.actorName,
          action: 'plan.invoice_paid',
          detail: `${invoice.providerRef} diverifikasi; paket aktif sampai ${validUntil.toLocaleDateString('id-ID')}.`,
        }),
      });
    },

    endSubscriptionNow() {
      const context = requireOwner();
      commit({
        ...state,
        subscriptions: state.subscriptions.map((subscription) =>
          subscription.businessId === context.businessId
            ? {
                ...subscription,
                plan: 'free',
                state: 'expired',
                validUntil: nowIso(),
                updatedAt: nowIso(),
              }
            : subscription,
        ),
      });
    },

    selectDowngrade(branchId, staffId) {
      const context = requireOwner();
      const branch = state.branches.find(
        (candidate) => candidate.id === branchId && candidate.businessId === context.businessId,
      );
      if (!branch) {
        throw new AppError('downgrade/branch', 'Pilih cabang yang valid.');
      }
      const staff = state.staff.find(
        (candidate) => candidate.id === staffId && candidate.branchId === branch.id,
      );
      if (!staff) {
        throw new AppError('downgrade/staff', 'Pilih satu staf aktif dari cabang tersebut.');
      }

      const session = context.session;
      const nextSession =
        session.branchId === branch.id ? session : { ...session, branchId: branch.id };

      commit({
        ...state,
        branches: state.branches.map((candidate) =>
          candidate.businessId === context.businessId
            ? { ...candidate, status: candidate.id === branch.id ? 'operational' : 'inactive' }
            : candidate,
        ),
        staff: state.staff.map((candidate) =>
          candidate.businessId === context.businessId
            ? { ...candidate, status: candidate.id === staff.id ? 'active' : 'inactive' }
            : candidate,
        ),
        subscriptions: state.subscriptions.map((candidate) =>
          candidate.businessId === context.businessId
            ? {
                ...candidate,
                plan: 'free',
                state: 'free',
                trialEndsAt: null,
                validUntil: null,
                updatedAt: nowIso(),
              }
            : candidate,
        ),
        downgradeSelections: [
          ...state.downgradeSelections.filter(
            (selection) => selection.businessId !== context.businessId,
          ),
          {
            businessId: context.businessId,
            branchId: branch.id,
            staffId: staff.id,
            selectedAt: nowIso(),
          },
        ],
        session: nextSession,
        auditEvents: pushAudit(state.auditEvents, {
          businessId: context.businessId,
          branchId: branch.id,
          actorName: context.actorName,
          action: 'plan.downgraded',
          detail: `Paket Free: cabang ${branch.name}, staf ${staff.id}. Data lain disimpan tanpa dihapus.`,
        }),
      });
    },

    connectQris() {
      const context = requireOwner();
      const existing = merchantFor(context.businessId);

      commit({
        ...state,
        merchantConnections: existing
          ? state.merchantConnections.map((connection) =>
              connection.businessId === context.businessId
                ? {
                    ...connection,
                    status: 'active',
                    environment: 'sandbox',
                    evidence: 'Aktivasi sandbox disimulasikan pada demo frontend.',
                    updatedAt: nowIso(),
                  }
                : connection,
            )
          : [
              ...state.merchantConnections,
              {
                businessId: context.businessId,
                branchScopeId: null,
                provider: 'midtrans',
                status: 'active',
                environment: 'sandbox',
                evidence: 'Aktivasi sandbox disimulasikan pada demo frontend.',
                updatedAt: nowIso(),
              },
            ],
        auditEvents: pushAudit(state.auditEvents, {
          businessId: context.businessId,
          branchId: null,
          actorName: context.actorName,
          action: 'qr.connected',
          detail: 'Kanal QRIS sandbox ditandai aktif (simulasi).',
        }),
      });
    },
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async hydrateOffline() {
      try {
        const records = await listOfflineOrders();
        offlineOrders = records;
        publish();
      } catch (error) {
        console.warn('MejaFlow: gagal memuat antrean offline', describeError(error));
      }
    },
    actions,
  };
}

export type { CartLine };
