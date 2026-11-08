import type { FulfillmentState, Order, PaymentMethod, PaymentState, Role } from '../types/domain';
import { formatIDR, formatTime } from '../lib/format';
import { PAYMENT_METHOD_LABEL } from '../lib/entitlements';
import { ROLE_LABEL } from '../lib/permissions';
import { Badge } from './ui';

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={`money ${className ?? ''}`}>{formatIDR(value)}</span>;
}

const PAYMENT_TONE: Record<PaymentState, { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  paid: { tone: 'success', label: 'Lunas' },
  pending: { tone: 'warning', label: 'Menunggu QRIS' },
  unpaid: { tone: 'neutral', label: 'Belum dibayar' },
  abandoned: { tone: 'danger', label: 'Kedaluwarsa' },
};

export function PaymentBadge({ state }: { state: PaymentState }) {
  const config = PAYMENT_TONE[state];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const FULFILLMENT_TONE: Record<FulfillmentState, { tone: 'neutral' | 'info' | 'warning' | 'success'; label: string }> = {
  new: { tone: 'neutral', label: 'Baru' },
  preparing: { tone: 'warning', label: 'Disiapkan' },
  ready: { tone: 'info', label: 'Siap' },
  awaiting_handover: { tone: 'info', label: 'Menunggu serah' },
  completed: { tone: 'success', label: 'Selesai' },
};

export function FulfillmentBadge({ state }: { state: FulfillmentState }) {
  const config = FULFILLMENT_TONE[state];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export function OrderModeLabel({ order }: { order: Order }) {
  if (order.type === 'takeaway') {
    return <span className="muted">Takeaway</span>;
  }
  return <span className="muted">{order.tableLabel ?? 'Dine-in'}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={role === 'owner' ? 'ember' : role === 'manager' ? 'info' : 'neutral'}>{ROLE_LABEL[role]}</Badge>;
}

export function MethodLabel({ method }: { method: PaymentMethod }) {
  return <span className="method-label">{PAYMENT_METHOD_LABEL[method]}</span>;
}

export function OrderNumber({ order }: { order: Order }) {
  return (
    <span className="order-number">
      <strong>{order.number}</strong>
      <span className="order-number__meta">
        {formatTime(order.createdAt)}
        {order.source === 'qr_table' ? ' · QR meja' : ''}
      </span>
    </span>
  );
}
