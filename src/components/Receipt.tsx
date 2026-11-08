import { useAppState } from '../state/AppProvider';
import type { Order } from '../types/domain';
import { PAYMENT_METHOD_LABEL } from '../lib/entitlements';
import { ROLE_LABEL } from '../lib/permissions';
import { formatDateTime } from '../lib/format';
import { Badge } from './ui';
import { Money } from './domain';

export function Receipt({ order }: { order: Order }) {
  const state = useAppState();
  const business = state.businesses.find((item) => item.id === order.businessId);
  const branch = state.branches.find((item) => item.id === order.branchId);

  return (
    <article className="receipt" aria-label={`Struk staf pesanan ${order.number}`}>
      <header className="receipt__head">
        <p className="receipt__kicker">Struk staf</p>
        <h3 className="receipt__brand">{business?.name ?? 'MejaFlow'}</h3>
        <p className="receipt__branch">{branch?.name}</p>
        {branch?.address ? <p className="receipt__address">{branch.address}</p> : null}
      </header>

      <dl className="receipt__meta">
        <div>
          <dt>Nomor</dt>
          <dd className="money">{order.number}</dd>
        </div>
        <div>
          <dt>Waktu</dt>
          <dd>{formatDateTime(order.paidAt ?? order.createdAt)}</dd>
        </div>
        <div>
          <dt>Tipe</dt>
          <dd>{order.type === 'takeaway' ? 'Takeaway' : `Dine-in · ${order.tableLabel ?? 'tanpa meja'}`}</dd>
        </div>
        <div>
          <dt>Pembayaran</dt>
          <dd>{PAYMENT_METHOD_LABEL[order.paymentMethod]}</dd>
        </div>
        {order.source === 'qr_table' ? (
          <div>
            <dt>Sumber</dt>
            <dd>QR meja (pelanggan)</dd>
          </div>
        ) : null}
      </dl>

      <ul className="receipt__items">
        {order.items.map((item) => (
          <li key={item.id}>
            <div className="receipt__item-main">
              <span className="receipt__qty money">{item.quantity}×</span>
              <span className="receipt__item-name">{item.name}</span>
              <Money value={item.unitPrice * item.quantity} />
            </div>
            {item.note ? <p className="receipt__item-note">Catatan: {item.note}</p> : null}
          </li>
        ))}
      </ul>

      <div className="receipt__totals">
        <div className="receipt__row">
          <span>Subtotal</span>
          <Money value={order.totals.subtotal} />
        </div>
        {order.totals.discountAmount > 0 ? (
          <div className="receipt__row">
            <span>
              Diskon
              {order.totals.discountType === 'percent' ? ` (${order.totals.discountValue}%)` : ''}
            </span>
            <span className="money">− {order.totals.discountAmount.toLocaleString('id-ID')}</span>
          </div>
        ) : null}
        {order.totals.taxAmount > 0 ? (
          <div className="receipt__row">
            <span>Pajak ({order.totals.taxRate}%)</span>
            <Money value={order.totals.taxAmount} />
          </div>
        ) : null}
        {order.totals.serviceAmount > 0 ? (
          <div className="receipt__row">
            <span>Layanan ({order.totals.serviceRate}%)</span>
            <Money value={order.totals.serviceAmount} />
          </div>
        ) : null}
        {order.totals.roundingDelta !== 0 ? (
          <div className="receipt__row">
            <span>Pembulatan {order.paymentMethod === 'cash' ? 'tunai' : 'digital'}</span>
            <span className="money">
              {order.totals.roundingDelta > 0 ? '+' : '−'} Rp{' '}
              {Math.abs(order.totals.roundingDelta).toLocaleString('id-ID')}
            </span>
          </div>
        ) : null}
        <div className="receipt__row receipt__row--total">
          <span>Total dibayar</span>
          <Money value={order.totals.finalTotal} />
        </div>
      </div>

      {order.discountActor ? (
        <p className="receipt__note">
          Diskon dimasukkan oleh {order.discountActor.name} ({ROLE_LABEL[order.discountActor.role]}).
        </p>
      ) : null}

      {order.handover ? (
        <p className="receipt__note">
          Diserahkan {formatDateTime(order.handover.at)} oleh {order.handover.staffName}
          {order.handover.override ? ' melalui persetujuan manajer (nomor tidak cocok).' : '.'}
        </p>
      ) : null}

      {order.offline ? (
        <p className="receipt__note">
          <Badge tone="warning">Transaksi tunai offline</Badge> Dicatat lokal pada perangkat; laporan cloud baru
          mencakup setelah sinkron.
        </p>
      ) : null}

      <footer className="receipt__foot">
        <p>Struk digital untuk staf. Tidak ada pengiriman ke pelanggan atau cetak thermal pada versi ini.</p>
        <p className="receipt__foot-id">{order.id}</p>
      </footer>
    </article>
  );
}
