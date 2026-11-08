import type { Role } from '../types/domain';

export type Permission =
  | 'pos.run'
  | 'discount.apply'
  | 'menu.manage'
  | 'table.manage'
  | 'staff.manage'
  | 'staff.manage.own_branch'
  | 'reports.view'
  | 'kds.view'
  | 'handover.confirm'
  | 'pickup.override'
  | 'billing.manage'
  | 'branch.settings'
  | 'device.manage';

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Pemilik',
  manager: 'Manajer',
  cashier: 'Kasir',
  kitchen: 'Staf dapur',
  waiter: 'Pelayan',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: 'Akses operasional semua cabang, paket, staf, dan laporan gabungan.',
  manager: 'Mengawasi cabangnya, diskon, staf cabang, dan persetujuan pickup.',
  cashier: 'Memasukkan pesanan, menerima pembayaran, dan menyerahkan takeaway.',
  kitchen: 'KDS cabangnya: mulai persiapan dan menandai kesiapan item.',
  waiter: 'Membantu operasional dan penyerahan sesuai izin cabang.',
};

/**
 * PRD 2.4 hanya menyetujui sebagian izin secara eksplisit. Izin lain yang masih
 * TBD (mengubah menu/harga/biaya, akses laporan/struk per peran) diberi nilai
 * konservatif di sini dan ditandai pada UI sebagai "perlu keputusan PRD".
 */
const PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'pos.run',
    'discount.apply',
    'menu.manage',
    'table.manage',
    'staff.manage',
    'staff.manage.own_branch',
    'reports.view',
    'kds.view',
    'handover.confirm',
    'pickup.override',
    'billing.manage',
    'branch.settings',
    'device.manage',
  ],
  manager: [
    'pos.run',
    'discount.apply',
    'menu.manage',
    'table.manage',
    'staff.manage.own_branch',
    'reports.view',
    'kds.view',
    'handover.confirm',
    'pickup.override',
    'branch.settings',
    'device.manage',
  ],
  cashier: ['pos.run', 'handover.confirm', 'kds.view'],
  kitchen: ['kds.view'],
  waiter: ['handover.confirm'],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) {
    return false;
  }
  return PERMISSIONS[role].includes(permission);
}

/** Manajer tidak boleh mengelola akun pemilik atau manajer lain (PRD 2.4). */
export function canManageStaffRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'owner') {
    return true;
  }
  if (actorRole !== 'manager') {
    return false;
  }
  return targetRole !== 'owner' && targetRole !== 'manager';
}

export function isManagerial(role: Role): boolean {
  return role === 'owner' || role === 'manager';
}
