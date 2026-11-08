import type {
  AppState,
  Branch,
  Business,
  Category,
  DiningTable,
  Order,
  PaymentMethod,
  Product,
  StaffAccount,
} from '../types/domain';
import { dateKey, formatDate, isSameDay, startOfDay } from './format';

export function businessById(state: AppState, businessId: string): Business | undefined {
  return state.businesses.find((business) => business.id === businessId);
}

export function branchById(state: AppState, branchId: string): Branch | undefined {
  return state.branches.find((branch) => branch.id === branchId);
}

export function branchesOf(state: AppState, businessId: string): Branch[] {
  return state.branches.filter((branch) => branch.businessId === businessId);
}

export function categoriesOf(state: AppState, branchId: string): Category[] {
  return state.categories
    .filter((category) => category.branchId === branchId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function productsOf(state: AppState, branchId: string): Product[] {
  return state.products
    .filter((product) => product.branchId === branchId)
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function tablesOf(state: AppState, branchId: string): DiningTable[] {
  return state.tables
    .filter((table) => table.branchId === branchId)
    .sort((a, b) => a.label.localeCompare(b.label, 'id', { numeric: true }));
}

export function staffOf(state: AppState, branchId: string): StaffAccount[] {
  return state.staff
    .filter((member) => member.branchId === branchId)
    .sort((a, b) => a.role.localeCompare(b.role));
}

export function activeStaffOf(state: AppState, branchId: string): StaffAccount[] {
  return staffOf(state, branchId).filter((member) => member.status === 'active');
}

/**
 * KDS diaktifkan per cabang hanya bila cabang memiliki staf dapur terdaftar
 * yang aktif (AC-24). Kepemilikan pemilik tidak menggantikan syarat ini.
 */
export function branchHasKitchenStaff(state: AppState, branchId: string): boolean {
  return activeStaffOf(state, branchId).some((member) => member.role === 'kitchen');
}

export function ordersOf(state: AppState, branchId: string): Order[] {
  return state.orders
    .filter((order) => order.branchId === branchId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function activeOrdersOf(state: AppState, branchId: string): Order[] {
  return ordersOf(state, branchId).filter(
    (order) =>
      (order.paymentState === 'pending' || order.paymentState === 'paid') &&
      order.fulfillmentState !== 'completed',
  );
}

export interface TableOccupancy {
  occupied: boolean;
  orderNumbers: string[];
  hasPendingPayment: boolean;
}

export function tableOccupancy(state: AppState, branchId: string): Record<string, TableOccupancy> {
  const occupancy: Record<string, TableOccupancy> = {};

  for (const table of tablesOf(state, branchId)) {
    occupancy[table.id] = { occupied: false, orderNumbers: [], hasPendingPayment: false };
  }

  for (const order of activeOrdersOf(state, branchId)) {
    if (!order.tableId || !occupancy[order.tableId]) {
      continue;
    }
    occupancy[order.tableId].occupied = true;
    occupancy[order.tableId].orderNumbers.push(order.number);
    if (order.paymentState === 'pending') {
      occupancy[order.tableId].hasPendingPayment = true;
    }
  }

  return occupancy;
}

export function nextBranchSequence(state: AppState, branchId: string): number {
  const today = new Date();
  const todaysOrders = state.orders.filter(
    (order) => order.branchId === branchId && isSameDay(order.createdAt, today),
  );

  const highest = todaysOrders.reduce((max, order) => {
    const suffix = Number.parseInt(order.number.split('-').at(-1) ?? '0', 10);
    return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
  }, 0);

  return highest + 1;
}

export function nextKitchenSequence(state: AppState, branchId: string): number {
  return (
    state.kitchenJobs
      .filter((job) => job.branchId === branchId)
      .reduce((max, job) => Math.max(max, job.sequence), 0) + 1
  );
}

export interface SalesSummary {
  orderCount: number;
  totalSales: number;
  subtotal: number;
  discount: number;
  tax: number;
  service: number;
  rounding: number;
  byMethod: Record<PaymentMethod, number>;
  averageTicket: number;
  days: Array<{ key: string; label: string; total: number }>;
}

function summarize(orders: Order[], from: Date, to: Date): SalesSummary {
  const paid = orders.filter((order) => {
    if (order.paymentState !== 'paid' || !order.paidAt) {
      return false;
    }
    const paidAt = new Date(order.paidAt);
    return paidAt >= from && paidAt <= to;
  });

  const byMethod: Record<PaymentMethod, number> = {
    cash: 0,
    manual_digital: 0,
    qris: 0,
  };

  const dayBuckets = new Map<string, number>();
  let totalSales = 0;

  for (const order of paid) {
    totalSales += order.totals.finalTotal;
    byMethod[order.paymentMethod] += order.totals.finalTotal;

    const key = dateKey(order.paidAt ?? order.createdAt);
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + order.totals.finalTotal);
  }

  const days: Array<{ key: string; label: string; total: number }> = [];
  const cursor = new Date(startOfDay(from));
  const end = startOfDay(to);
  while (cursor <= end) {
    const key = dateKey(cursor);
    days.push({ key, label: formatDate(cursor.toISOString()), total: dayBuckets.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    orderCount: paid.length,
    totalSales,
    subtotal: paid.reduce((sum, order) => sum + order.totals.subtotal, 0),
    discount: paid.reduce((sum, order) => sum + order.totals.discountAmount, 0),
    tax: paid.reduce((sum, order) => sum + order.totals.taxAmount, 0),
    service: paid.reduce((sum, order) => sum + order.totals.serviceAmount, 0),
    rounding: paid.reduce((sum, order) => sum + order.totals.roundingDelta, 0),
    byMethod,
    averageTicket: paid.length > 0 ? Math.round(totalSales / paid.length) : 0,
    days,
  };
}

export function salesSummary(
  state: AppState,
  branchIds: string[],
  from: Date,
  to: Date,
): SalesSummary {
  const allowed = new Set(branchIds);
  const orders = state.orders.filter((order) => allowed.has(order.branchId));
  return summarize(orders, from, to);
}

export interface RangePreset {
  id: 'today' | '7d' | '30d';
  label: string;
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: 'today', label: 'Hari ini' },
  { id: '7d', label: '7 hari' },
  { id: '30d', label: '30 hari' },
];

export function rangeFor(preset: RangePreset['id']): { from: Date; to: Date } {
  const to = new Date();
  const from = startOfDay(new Date());
  const days = preset === 'today' ? 0 : preset === '7d' ? 6 : 29;
  from.setDate(from.getDate() - days);
  return { from, to };
}

export function recentOrders(state: AppState, branchIds: string[], limit = 6): Order[] {
  const allowed = new Set(branchIds);
  return state.orders
    .filter((order) => allowed.has(order.branchId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
