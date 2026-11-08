import type {
  AppState,
  AuditEvent,
  Branch,
  Business,
  Category,
  DiningTable,
  Invoice,
  KitchenJob,
  Order,
  OrderItem,
  OrderTotals,
  Product,
  StaffAccount,
  User,
} from '../types/domain';
import { computeTotals } from '../lib/money';
import { PLAN_PRICES } from '../lib/entitlements';
import { productPhoto } from './productPhotos';

export const DEMO_PASSWORD = 'mejaflow123';

const DAY = 24 * 60 * 60 * 1000;

function iso(date: Date): string {
  return date.toISOString();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

function atTime(date: Date, hour: number, minute: number): Date {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

/** PRNG deterministik agar data demo stabil antar muat ulang. */
function createRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const users: User[] = [
  { id: 'usr_rina', name: 'Rina Prameswari', email: 'rina@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-11-02T03:00:00.000Z' },
  { id: 'usr_bagas', name: 'Bagas Nugroho', email: 'bagas@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-11-10T03:00:00.000Z' },
  { id: 'usr_sari', name: 'Sari Wulandari', email: 'sari@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-11-12T03:00:00.000Z' },
  { id: 'usr_jaka', name: 'Jaka Saputra', email: 'jaka@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-11-14T03:00:00.000Z' },
  { id: 'usr_yuda', name: 'Yuda Pratama', email: 'yuda@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-12-01T03:00:00.000Z' },
  { id: 'usr_rani', name: 'Rani Kusuma', email: 'rani@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-12-05T03:00:00.000Z' },
  { id: 'usr_nia', name: 'Nia Lestari', email: 'nia@kopisenja.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2025-12-08T03:00:00.000Z' },
  { id: 'usr_dewi', name: 'Dewi Anggraini', email: 'dewi@dapuruji.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2026-01-04T03:00:00.000Z' },
  { id: 'usr_tono', name: 'Tono Hidayat', email: 'tono@dapuruji.id', password: DEMO_PASSWORD, emailVerified: true, createdAt: '2026-01-05T03:00:00.000Z' },
];

const businesses: Business[] = [
  { id: 'biz_kopisenja', name: 'Kopi Senja Nusantara', ownerUserId: 'usr_rina', createdAt: '2025-11-02T03:00:00.000Z', timezone: 'Asia/Jakarta' },
  { id: 'biz_dapuruji', name: 'Dapur Uji Rasa', ownerUserId: 'usr_dewi', createdAt: '2026-01-04T03:00:00.000Z', timezone: 'Asia/Jakarta' },
];

const branches: Branch[] = [
  {
    id: 'br_kemang',
    businessId: 'biz_kopisenja',
    name: 'Kopi Senja — Kemang',
    code: 'KMG',
    address: 'Jl. Kemang Raya No. 18, Jakarta Selatan',
    status: 'operational',
    timezone: 'Asia/Jakarta',
    taxRate: 10,
    serviceRate: 5,
    taxAppliesTo: ['dine_in', 'takeaway'],
    serviceAppliesTo: ['dine_in'],
    configVersion: 3,
  },
  {
    id: 'br_senopati',
    businessId: 'biz_kopisenja',
    name: 'Kopi Senja — Senopati',
    code: 'SNP',
    address: 'Jl. Senopati No. 41, Jakarta Selatan',
    status: 'operational',
    timezone: 'Asia/Jakarta',
    taxRate: 10,
    serviceRate: 7,
    taxAppliesTo: ['dine_in', 'takeaway'],
    serviceAppliesTo: ['dine_in'],
    configVersion: 2,
  },
  {
    id: 'br_uji',
    businessId: 'biz_dapuruji',
    name: 'Dapur Uji — Tebet',
    code: 'UJI',
    address: 'Jl. Tebet Barat Dalam No. 7, Jakarta Selatan',
    status: 'operational',
    timezone: 'Asia/Jakarta',
    taxRate: 0,
    serviceRate: 0,
    taxAppliesTo: ['dine_in', 'takeaway'],
    serviceAppliesTo: ['dine_in'],
    configVersion: 1,
  },
];

const staff: StaffAccount[] = [
  { id: 'stf_bagas', businessId: 'biz_kopisenja', branchId: 'br_kemang', userId: 'usr_bagas', role: 'manager', status: 'active', createdAt: '2025-11-10T03:00:00.000Z', note: 'Manajer cabang Kemang' },
  { id: 'stf_sari', businessId: 'biz_kopisenja', branchId: 'br_kemang', userId: 'usr_sari', role: 'cashier', status: 'active', createdAt: '2025-11-12T03:00:00.000Z', note: 'Kasir shift pagi' },
  { id: 'stf_jaka', businessId: 'biz_kopisenja', branchId: 'br_kemang', userId: 'usr_jaka', role: 'kitchen', status: 'active', createdAt: '2025-11-14T03:00:00.000Z', note: 'Staf dapur — mengaktifkan KDS Kemang' },
  { id: 'stf_yuda', businessId: 'biz_kopisenja', branchId: 'br_kemang', userId: 'usr_yuda', role: 'waiter', status: 'active', createdAt: '2025-12-01T03:00:00.000Z', note: 'Pelayan lantai' },
  { id: 'stf_rani', businessId: 'biz_kopisenja', branchId: 'br_senopati', userId: 'usr_rani', role: 'manager', status: 'active', createdAt: '2025-12-05T03:00:00.000Z', note: 'Manajer cabang Senopati' },
  { id: 'stf_nia', businessId: 'biz_kopisenja', branchId: 'br_senopati', userId: 'usr_nia', role: 'cashier', status: 'active', createdAt: '2025-12-08T03:00:00.000Z', note: 'Kasir Senopati — cabang tanpa staf dapur' },
  { id: 'stf_tono', businessId: 'biz_dapuruji', branchId: 'br_uji', userId: 'usr_tono', role: 'cashier', status: 'active', createdAt: '2026-01-05T03:00:00.000Z', note: 'Satu-satunya staf pada paket Free' },
];

interface CategorySeed {
  id: string;
  name: string;
  order: number;
}

const categoryPlan: Record<string, CategorySeed[]> = {
  br_kemang: [
    { id: 'cat_kmg_kopi', name: 'Kopi', order: 1 },
    { id: 'cat_kmg_nonkopi', name: 'Non-Kopi', order: 2 },
    { id: 'cat_kmg_makanan', name: 'Makanan', order: 3 },
    { id: 'cat_kmg_pastry', name: 'Pastry', order: 4 },
  ],
  br_senopati: [
    { id: 'cat_snp_kopi', name: 'Kopi', order: 1 },
    { id: 'cat_snp_nonkopi', name: 'Non-Kopi', order: 2 },
    { id: 'cat_snp_makanan', name: 'Makanan', order: 3 },
  ],
  br_uji: [{ id: 'cat_uji_utama', name: 'Menu Utama', order: 1 }],
};

const categories: Category[] = Object.entries(categoryPlan).flatMap(([branchId, items]) => {
  const branch = branches.find((item) => item.id === branchId);
  if (!branch) {
    return [];
  }
  return items.map((item) => ({
    id: item.id,
    businessId: branch.businessId,
    branchId,
    name: item.name,
    displayOrder: item.order,
  }));
});

interface ProductSeed {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  soldOut?: boolean;
}

const productPlan: ProductSeed[] = [
  { id: 'prd_kmg_kopi_susu', branchId: 'br_kemang', categoryId: 'cat_kmg_kopi', name: 'Kopi Susu Senja', description: 'Espresso, susu segar, gula aren', price: 26_000 },
  { id: 'prd_kmg_americano', branchId: 'br_kemang', categoryId: 'cat_kmg_kopi', name: 'Americano', description: 'Espresso dengan air panas atau es', price: 22_000 },
  { id: 'prd_kmg_cappuccino', branchId: 'br_kemang', categoryId: 'cat_kmg_kopi', name: 'Cappuccino', description: 'Espresso, susu, foam tebal', price: 30_000 },
  { id: 'prd_kmg_kelapa', branchId: 'br_kemang', categoryId: 'cat_kmg_kopi', name: 'Es Kopi Kelapa', description: 'Kopi dengan air kelapa muda', price: 32_000, soldOut: true },
  { id: 'prd_kmg_matcha', branchId: 'br_kemang', categoryId: 'cat_kmg_nonkopi', name: 'Matcha Latte', description: 'Matcha Jepang dan susu', price: 32_000 },
  { id: 'prd_kmg_teh', branchId: 'br_kemang', categoryId: 'cat_kmg_nonkopi', name: 'Es Teh Manis', description: 'Teh tubruk, gula batu', price: 15_000 },
  { id: 'prd_kmg_air', branchId: 'br_kemang', categoryId: 'cat_kmg_nonkopi', name: 'Air Mineral', description: 'Botol 600 ml', price: 8_000 },
  { id: 'prd_kmg_nasgor', branchId: 'br_kemang', categoryId: 'cat_kmg_makanan', name: 'Nasi Goreng Kampung', description: 'Ikan asin, telur mata sapi', price: 38_000 },
  { id: 'prd_kmg_mie', branchId: 'br_kemang', categoryId: 'cat_kmg_makanan', name: 'Mie Ayam Bakso', description: 'Mie ayam kampung, bakso sapi', price: 35_000 },
  { id: 'prd_kmg_croissant', branchId: 'br_kemang', categoryId: 'cat_kmg_pastry', name: 'Butter Croissant', description: 'Croissant mentega Prancis', price: 24_000 },
  { id: 'prd_kmg_banana', branchId: 'br_kemang', categoryId: 'cat_kmg_pastry', name: 'Banana Cake', description: 'Kue pisang panggang', price: 28_000 },
  { id: 'prd_snp_kopi_susu', branchId: 'br_senopati', categoryId: 'cat_snp_kopi', name: 'Kopi Susu Senja', description: 'Espresso, susu segar, gula aren', price: 28_000 },
  { id: 'prd_snp_americano', branchId: 'br_senopati', categoryId: 'cat_snp_kopi', name: 'Americano', description: 'Espresso dengan air panas atau es', price: 24_000 },
  { id: 'prd_snp_matcha', branchId: 'br_senopati', categoryId: 'cat_snp_nonkopi', name: 'Matcha Latte', description: 'Matcha Jepang dan susu', price: 34_000 },
  { id: 'prd_snp_nasgor', branchId: 'br_senopati', categoryId: 'cat_snp_makanan', name: 'Nasi Goreng Kampung', description: 'Ikan asin, telur mata sapi', price: 40_000 },
  { id: 'prd_snp_mie', branchId: 'br_senopati', categoryId: 'cat_snp_makanan', name: 'Mie Ayam Bakso', description: 'Mie ayam kampung, bakso sapi', price: 37_000 },
  { id: 'prd_snp_croissant', branchId: 'br_senopati', categoryId: 'cat_snp_makanan', name: 'Butter Croissant', description: 'Croissant mentega Prancis', price: 26_000 },
  { id: 'prd_uji_nasgor', branchId: 'br_uji', categoryId: 'cat_uji_utama', name: 'Nasi Goreng Uji', description: 'Resep rumahan dengan kerupuk', price: 30_000 },
  { id: 'prd_uji_esjeruk', branchId: 'br_uji', categoryId: 'cat_uji_utama', name: 'Es Jeruk', description: 'Jeruk peras segar', price: 12_000 },
];

const products: Product[] = productPlan.map((seed) => {
  const branch = branches.find((item) => item.id === seed.branchId);
  return {
    id: seed.id,
    businessId: branch?.businessId ?? 'biz_kopisenja',
    branchId: seed.branchId,
    categoryId: seed.categoryId,
    name: seed.name,
    description: seed.description,
    price: seed.price,
    photo: productPhoto(seed.id),
    availability: seed.soldOut ? 'sold_out' : 'available',
    updatedAt: '2026-02-01T04:00:00.000Z',
  };
});

const tablePlan: Array<{ id: string; branchId: string; label: string; seats: number }> = [
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `tbl_kmg_${index + 1}`,
    branchId: 'br_kemang',
    label: `Meja ${index + 1}`,
    seats: index % 3 === 0 ? 4 : 2,
  })),
  { id: 'tbl_kmg_bar_1', branchId: 'br_kemang', label: 'Bar 1', seats: 1 },
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `tbl_snp_${index + 1}`,
    branchId: 'br_senopati',
    label: `Meja ${index + 1}`,
    seats: index % 2 === 0 ? 4 : 2,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `tbl_uji_${index + 1}`,
    branchId: 'br_uji',
    label: `Meja ${index + 1}`,
    seats: 4,
  })),
];

const tables: DiningTable[] = tablePlan.map((seed) => {
  const branch = branches.find((item) => item.id === seed.branchId);
  return {
    id: seed.id,
    businessId: branch?.businessId ?? 'biz_kopisenja',
    branchId: seed.branchId,
    label: seed.label,
    seats: seed.seats,
  };
});

interface OrderDraft {  branch: Branch;
  sequence: number;
  createdAt: Date;
  type: 'dine_in' | 'takeaway';
  tableId: string | null;
  method: 'cash' | 'qris' | 'manual_digital';
  items: OrderItem[];
  discount: { type: 'amount' | 'percent'; value: number } | null;
  actor: { staffId: string; name: string; role: 'owner' | 'manager' } | null;
  source?: 'cashier' | 'qr_table';
}

function buildOrder(draft: OrderDraft): Order {
  const { branch } = draft;
  const totals: OrderTotals = computeTotals({
    items: draft.items,
    discount: draft.discount,
    taxRate: branch.taxRate,
    serviceRate: branch.serviceRate,
    taxApplies: branch.taxAppliesTo.includes(draft.type),
    serviceApplies: branch.serviceAppliesTo.includes(draft.type),
    method: draft.method,
  });

  return {
    id: `ord_${draft.branch.code.toLowerCase()}_${draft.createdAt.getTime()}_${draft.sequence}`,
    businessId: branch.businessId,
    branchId: branch.id,
    number: `${branch.code}-${String(draft.sequence).padStart(3, '0')}`,
    source: draft.source ?? 'cashier',
    type: draft.type,
    tableId: draft.tableId,
    tableLabel: draft.tableId ? (tables.find((table) => table.id === draft.tableId)?.label ?? null) : null,
    paymentMethod: draft.method,
    paymentState: 'paid',
    fulfillmentState: 'completed',
    fulfillmentMode: branch.id === 'br_kemang' ? 'kds' : 'instant',
    items: draft.items,
    discountActor: draft.actor,
    totals,
    attempts: [],
    createdAt: iso(draft.createdAt),
    paidAt: iso(new Date(draft.createdAt.getTime() + 4 * 60_000)),
    completedAt: iso(new Date(draft.createdAt.getTime() + 24 * 60_000)),
    deviceId: null,
    offline: null,
    handover: null,
    customerNote: '',
  };
}

function pickItems(branchId: string, random: () => number, count: number): OrderItem[] {
  const pool = products.filter((product) => product.branchId === branchId);
  const chosen = new Map<string, OrderItem>();

  for (let index = 0; index < count; index += 1) {
    const product = pool[Math.floor(random() * pool.length)];
    if (!product) {
      continue;
    }
    const existing = chosen.get(product.id);
    if (existing) {
      chosen.set(product.id, { ...existing, quantity: existing.quantity + 1 });
      continue;
    }
    chosen.set(product.id, {
      id: `itm_${product.id}_${Math.floor(random() * 100_000)}`,
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: 1,
      note: random() > 0.82 ? 'Es sedikit' : '',
      ready: true,
    });
  }

  return [...chosen.values()];
}

function seedHistory(now: Date, orders: Order[]): void {
  const random = createRandom(20261108);

  for (let offset = 13; offset >= 1; offset -= 1) {
    const day = addDays(now, -offset);

    for (const branch of [branches[0], branches[1]]) {
      const count = 2 + Math.floor(random() * 3);
      for (let index = 0; index < count; index += 1) {
        const createdAt = atTime(day, 10 + Math.floor(random() * 9), Math.floor(random() * 60));
        const type = random() > 0.42 ? 'dine_in' : 'takeaway';
        const branchTables = tables.filter((table) => table.branchId === branch.id);
        const tableId = type === 'dine_in' ? branchTables[Math.floor(random() * branchTables.length)].id : null;
        const method = random() > 0.35 ? 'cash' : 'qris';
        const manager = staff.find((member) => member.branchId === branch.id && member.role === 'manager');
        const useDiscount = random() > 0.86;

        const order = buildOrder({
          branch,
          sequence: index + 1,
          createdAt,
          type,
          tableId,
          method,
          items: pickItems(branch.id, random, 1 + Math.floor(random() * 3)),
          discount: useDiscount ? { type: 'percent', value: 10 } : null,
          actor: useDiscount && manager
            ? { staffId: manager.id, name: users.find((user) => user.id === manager.userId)?.name ?? 'Manajer', role: 'manager' }
            : null,
        });

        orders.push(order);
      }
    }
  }
}

function seedToday(now: Date, orders: Order[], kitchenJobs: KitchenJob[]): void {
  const kemang = branches[0];

  const handoverItems: OrderItem[] = [
    { id: 'itm_today_6', productId: 'prd_kmg_americano', name: 'Americano', unitPrice: 22_000, quantity: 2, note: '', ready: true },
    { id: 'itm_today_7', productId: 'prd_kmg_banana', name: 'Banana Cake', unitPrice: 28_000, quantity: 1, note: '', ready: true },
  ];
  const handover = buildOrder({
    branch: kemang,
    sequence: 1,
    createdAt: new Date(now.getTime() - 34 * 60_000),
    type: 'takeaway',
    tableId: null,
    method: 'cash',
    items: handoverItems,
    discount: null,
    actor: null,
  });
  handover.fulfillmentState = 'awaiting_handover';
  handover.completedAt = null;
  orders.push(handover);
  kitchenJobs.push({
    id: 'job_today_1',
    orderId: handover.id,
    businessId: kemang.businessId,
    branchId: kemang.id,
    sequence: 1,
    status: 'ready',
    createdAt: handover.paidAt ?? iso(now),
    startedAt: iso(new Date(now.getTime() - 28 * 60_000)),
    readyAt: iso(new Date(now.getTime() - 12 * 60_000)),
    completedAt: null,
  });

  const preparingItems: OrderItem[] = [
    { id: 'itm_today_1', productId: 'prd_kmg_kopi_susu', name: 'Kopi Susu Senja', unitPrice: 26_000, quantity: 2, note: 'Es sedikit', ready: true },
    { id: 'itm_today_2', productId: 'prd_kmg_nasgor', name: 'Nasi Goreng Kampung', unitPrice: 38_000, quantity: 1, note: 'Tanpa ikan asin', ready: false },
    { id: 'itm_today_3', productId: 'prd_kmg_croissant', name: 'Butter Croissant', unitPrice: 24_000, quantity: 1, note: '', ready: false },
  ];
  const preparing = buildOrder({
    branch: kemang,
    sequence: 2,
    createdAt: new Date(now.getTime() - 20 * 60_000),
    type: 'dine_in',
    tableId: 'tbl_kmg_3',
    method: 'cash',
    items: preparingItems,
    discount: null,
    actor: null,
  });
  preparing.fulfillmentState = 'preparing';
  preparing.completedAt = null;
  orders.push(preparing);
  kitchenJobs.push({
    id: 'job_today_2',
    orderId: preparing.id,
    businessId: kemang.businessId,
    branchId: kemang.id,
    sequence: 2,
    status: 'preparing',
    createdAt: preparing.paidAt ?? iso(now),
    startedAt: iso(new Date(now.getTime() - 14 * 60_000)),
    readyAt: null,
    completedAt: null,
  });

  const newItems: OrderItem[] = [
    { id: 'itm_today_4', productId: 'prd_kmg_mie', name: 'Mie Ayam Bakso', unitPrice: 35_000, quantity: 1, note: '', ready: false },
    { id: 'itm_today_5', productId: 'prd_kmg_teh', name: 'Es Teh Manis', unitPrice: 15_000, quantity: 2, note: 'Gula batu', ready: false },
  ];
  const fresh = buildOrder({
    branch: kemang,
    sequence: 3,
    createdAt: new Date(now.getTime() - 7 * 60_000),
    type: 'takeaway',
    tableId: null,
    method: 'qris',
    items: newItems,
    discount: null,
    actor: null,
  });
  fresh.fulfillmentState = 'new';
  fresh.completedAt = null;
  orders.push(fresh);
  kitchenJobs.push({
    id: 'job_today_3',
    orderId: fresh.id,
    businessId: kemang.businessId,
    branchId: kemang.id,
    sequence: 3,
    status: 'new',
    createdAt: fresh.paidAt ?? iso(now),
    startedAt: null,
    readyAt: null,
    completedAt: null,
  });

  const senopati = branches[1];
  const instant = buildOrder({
    branch: senopati,
    sequence: 1,
    createdAt: new Date(now.getTime() - 22 * 60_000),
    type: 'dine_in',
    tableId: 'tbl_snp_2',
    method: 'qris',
    items: [
      { id: 'itm_today_8', productId: 'prd_snp_kopi_susu', name: 'Kopi Susu Senja', unitPrice: 28_000, quantity: 2, note: '', ready: true },
      { id: 'itm_today_9', productId: 'prd_snp_nasgor', name: 'Nasi Goreng Kampung', unitPrice: 40_000, quantity: 1, note: '', ready: true },
    ],
    discount: null,
    actor: null,
  });
  orders.push(instant);
}

export function createSeedState(): AppState {
  const now = new Date();
  const orders: Order[] = [];
  const kitchenJobs: KitchenJob[] = [];
  seedHistory(now, orders);
  seedToday(now, orders, kitchenJobs);

  const invoices: Invoice[] = [
    {
      id: 'inv_kopisenja_1',
      businessId: 'biz_kopisenja',
      period: 'monthly',
      amount: PLAN_PRICES.monthly,
      state: 'paid',
      createdAt: iso(addDays(now, -31)),
      dueAt: iso(addDays(now, -24)),
      paidAt: iso(addDays(now, -30)),
      providerRef: 'SAAS-DEMO-1041',
      priceSnapshot: 'Bulanan · Rp199.000',
    },
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: 'aud_seed_1',
      businessId: 'biz_kopisenja',
      branchId: 'br_kemang',
      actorName: 'Jaka Saputra',
      action: 'pickup.override',
      detail: 'Pickup tanpa nomor disetujui manajer; bukti: foto struk dapur.',
      at: iso(addDays(now, -3)),
    },
    {
      id: 'aud_seed_2',
      businessId: 'biz_kopisenja',
      branchId: null,
      actorName: 'Rina Prameswari',
      action: 'plan.invoice_paid',
      detail: 'Invoice bulanan SAAS-DEMO-1041 diverifikasi.',
      at: iso(addDays(now, -30)),
    },
  ];

  return {
    schemaVersion: 2,
    users,
    businesses,
    branches,
    staff,
    categories,
    products,
    tables,
    orders,
    kitchenJobs,
    subscriptions: [
      {
        businessId: 'biz_kopisenja',
        plan: 'paid',
        state: 'active',
        trialEndsAt: null,
        validUntil: iso(addDays(now, 42)),
        updatedAt: iso(now),
      },
      {
        businessId: 'biz_dapuruji',
        plan: 'free',
        state: 'free',
        trialEndsAt: null,
        validUntil: null,
        updatedAt: iso(now),
      },
    ],
    trials: [],
    invoices,
    merchantConnections: [
      {
        businessId: 'biz_kopisenja',
        branchScopeId: null,
        provider: 'midtrans',
        status: 'active',
        environment: 'sandbox',
        evidence: 'Sandbox merchant terverifikasi untuk data demo.',
        updatedAt: iso(addDays(now, -20)),
      },
      {
        businessId: 'biz_dapuruji',
        branchScopeId: null,
        provider: 'midtrans',
        status: 'not_connected',
        environment: 'sandbox',
        evidence: '',
        updatedAt: iso(now),
      },
    ],
    devices: [
      {
        id: 'dev_kemang_pos',
        businessId: 'biz_kopisenja',
        branchId: 'br_kemang',
        label: 'Kasir Kemang 1',
        isPrimaryOffline: true,
        lastSeenAt: iso(now),
        version: 2,
      },
      {
        id: 'dev_senopati_pos',
        businessId: 'biz_kopisenja',
        branchId: 'br_senopati',
        label: 'Kasir Senopati 1',
        isPrimaryOffline: true,
        lastSeenAt: iso(now),
        version: 2,
      },
    ],
    downgradeSelections: [],
    auditEvents,
    session: null,
    pendingVerificationUserId: null,
    demoVerificationCode: null,
  };
}

export const DEMO_ACCOUNTS = [
  { email: 'rina@kopisenja.id', name: 'Rina Prameswari', role: 'Pemilik', hint: 'Kopi Senja · akses semua cabang' },
  { email: 'bagas@kopisenja.id', name: 'Bagas Nugroho', role: 'Manajer', hint: 'Cabang Kemang' },
  { email: 'sari@kopisenja.id', name: 'Sari Wulandari', role: 'Kasir', hint: 'Cabang Kemang' },
  { email: 'jaka@kopisenja.id', name: 'Jaka Saputra', role: 'Staf dapur', hint: 'KDS cabang Kemang' },
  { email: 'yuda@kopisenja.id', name: 'Yuda Pratama', role: 'Pelayan', hint: 'Penyerahan takeaway' },
  { email: 'dewi@dapuruji.id', name: 'Dewi Anggraini', role: 'Pemilik', hint: 'Bisnis kedua · paket Free' },
] as const;
