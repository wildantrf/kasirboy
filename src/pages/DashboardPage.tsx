import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppProvider';
import { can } from '../lib/permissions';
import { entitlementsFor } from '../lib/entitlements';
import {
  activeOrdersOf,
  branchById,
  rangeFor,
  recentOrders,
  salesSummary,
  tableOccupancy,
} from '../lib/selectors';
import { formatIDR, formatTime } from '../lib/format';
import { Badge, Card, CardBody, CardHead, Empty, PageHead, Stat } from '../components/ui';
import { Icon } from '../components/icons';

export function DashboardPage() {
  const state = useAppState();
  const session = state.session;
  if (!session?.branchId) {
    return null;
  }

  const branch = branchById(state, session.branchId);
  if (!branch) {
    return null;
  }

  const subscription = state.subscriptions.find((item) => item.businessId === branch.businessId);
  const entitlements = entitlementsFor(subscription);
  const { from, to } = rangeFor('today');
  const today = salesSummary(state, [branch.id], from, to);
  const week = salesSummary(state, [branch.id], ...Object.values(rangeFor('7d')) as [Date, Date]);
  const open = activeOrdersOf(state, branch.id);
  const occupancy = tableOccupancy(state, branch.id);
  const tables = state.tables.filter((table) => table.branchId === branch.id);
  const occupied = Object.values(occupancy).filter((entry) => entry.occupied).length;
  const kitchenQueue = state.kitchenJobs.filter(
    (job) => job.branchId === branch.id && job.status !== 'completed',
  );
  const recent = recentOrders(state, [branch.id], 6);

  const peak = Math.max(...week.days.map((day) => day.total), 1);
  const openValue = open.reduce((sum, order) => sum + order.totals.finalTotal, 0);

  return (
    <div className="page">
      <PageHead
        title={branch.name}
        subtitle={`Ringkasan hari ini · ${today.orderCount} transaksi lunas`}
        actions={
          can(session.role, 'pos.run') ? (
            <Link to="/kasir" className="btn btn--primary">
              <Icon name="receipt" size={17} />
              <span>Buka kasir</span>
            </Link>
          ) : null
        }
      />

      <div className="grid-3">
        <Stat
          label="Penjualan hari ini"
          value={formatIDR(today.totalSales)}
          foot={`${today.orderCount} pesanan · rata-rata ${formatIDR(today.averageTicket)}`}
          accent
        />
        <Stat
          label="Pesanan aktif"
          value={open.length}
          foot={`Nilai berjalan ${formatIDR(openValue)}`}
        />
        <Stat
          label="Antrean dapur"
          value={kitchenQueue.length}
          foot={kitchenQueue.length === 0 ? 'Dapur bersih' : 'Termasuk pesanan baru'}
        />
        <Stat
          label="Meja terisi"
          value={`${occupied}/${tables.length}`}
          foot="Dilepas saat pesanan selesai"
        />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <Card>
          <CardHead
            title="Tujuh hari terakhir"
            action={
              <Link to="/laporan" className="btn btn--ghost btn--sm">
                Laporan <Icon name="arrowRight" size={14} />
              </Link>
            }
          />
          <CardBody>
            <div className="row" style={{ alignItems: 'baseline', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
              <strong className="num" style={{ fontSize: 'var(--t-2xl)' }}>
                {formatIDR(week.totalSales)}
              </strong>
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>
                {week.orderCount} pesanan lunas
              </span>
            </div>
            <div className="bars" role="img" aria-label="Penjualan harian tujuh hari terakhir">
              {week.days.map((day) => (
                <div
                  key={day.key}
                  className={`bars__bar ${day.total >= peak * 0.95 ? 'bars__bar--peak' : ''}`}
                  style={{ height: `${Math.max(3, (day.total / peak) * 100)}%` }}
                  title={`${day.label} · ${formatIDR(day.total)}`}
                />
              ))}
            </div>
            <div
              className="row"
              style={{ justifyContent: 'space-between', marginTop: 'var(--s-2)', fontSize: 'var(--t-2xs)' }}
            >
              <span className="faint">{week.days[0]?.label}</span>
              <span className="faint">{week.days[week.days.length - 1]?.label}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Metode pembayaran" />
          <CardBody className="stack">
            {(
              [
                ['qris', 'QRIS'],
                ['cash', 'Tunai'],
                ['manual_digital', 'Digital manual'],
              ] as const
            ).map(([key, label]) => {
              const amount = week.byMethod[key];
              const share = week.totalSales > 0 ? amount / week.totalSales : 0;
              return (
                <div key={key} className="stack" style={{ gap: 4 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--t-sm)' }}>{label}</span>
                    <span className="num" style={{ fontSize: 'var(--t-sm)' }}>
                      {formatIDR(amount)}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--ink-08)', borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${share * 100}%`,
                        height: '100%',
                        background: key === 'qris' ? 'var(--signal)' : 'var(--ink)',
                        borderRadius: 3,
                        transition: 'width var(--dur) var(--ease)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="faint" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s-2)' }}>
              {entitlements.qrisSelfOrder
                ? 'QRIS terintegrasi aktif untuk cabang ini.'
                : 'QRIS terintegrasi belum aktif pada paket ini.'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card flush>
        <CardHead
          title="Pesanan terbaru"
          action={
            <Link to="/pesanan" className="btn btn--ghost btn--sm">
              Semua pesanan <Icon name="arrowRight" size={14} />
            </Link>
          }
        />
        {recent.length === 0 ? (
          <Empty
            title="Belum ada pesanan"
            text="Pesanan yang dibayar lewat kasir atau QR meja akan muncul di sini."
            icon="receipt"
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Jenis</th>
                <th>Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/pesanan/${order.id}`} className="num strong" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                      {order.number}
                    </Link>
                  </td>
                  <td className="muted">
                    {order.type === 'dine_in' ? order.tableLabel ?? 'Dine-in' : 'Takeaway'}
                    {order.source === 'qr_table' ? ' · QR' : ''}
                  </td>
                  <td className="num faint" style={{ fontSize: 'var(--t-xs)' }}>
                    {formatTime(order.paidAt ?? order.createdAt)}
                  </td>
                  <td>
                    {order.paymentState === 'pending' ? (
                      <Badge tone="signal">Menunggu bayar</Badge>
                    ) : order.fulfillmentState === 'completed' ? (
                      <Badge tone="outline">Selesai</Badge>
                    ) : (
                      <Badge>Siap disiapkan</Badge>
                    )}
                  </td>
                  <td className="table__num">{formatIDR(order.totals.finalTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
