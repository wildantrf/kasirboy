import { Link, Navigate } from 'react-router-dom';
import { useAppState } from '../state/AppProvider';
import { Badge, Card, CardHead, EmptyState, Note, Stat } from '../components/ui';
import { FulfillmentBadge, Money, PaymentBadge } from '../components/domain';
import { Icon } from '../components/icons';
import { formatDateTime, formatLongDate, formatTime } from '../lib/format';
import { entitlementsFor } from '../lib/entitlements';
import { PLAN_LABEL } from '../lib/entitlements';
import {
  branchesOf,
  productsOf,
  recentOrders,
  salesSummary,
  rangeFor,
} from '../lib/selectors';
import { useApp } from '../state/AppProvider';

export function DashboardPage() {
  const state = useAppState();
  const { snapshot } = useApp();
  const session = state.session;

  if (!session || !session.businessId) {
    return null;
  }
  if (session.role === 'kitchen') {
    return <Navigate to="/dapur" replace />;
  }
  if (session.role === 'cashier') {
    return <Navigate to="/kasir" replace />;
  }
  if (session.role === 'waiter') {
    return <Navigate to="/pesanan" replace />;
  }

  const business = state.businesses.find((item) => item.id === session.businessId);
  const branch = state.branches.find((item) => item.id === session.branchId);
  const subscription = state.subscriptions.find((item) => item.businessId === session.businessId);
  const entitlements = entitlementsFor(subscription);
  const businessBranches = branchesOf(state, session.businessId);
  const scope = session.role === 'owner' ? businessBranches : branch ? [branch] : [];
  const scopeIds = scope.map((item) => item.id);

  const today = rangeFor('today');
  const week = rangeFor('7d');
  const todaySummary = salesSummary(state, scopeIds, today.from, today.to);
  const weekSummary = salesSummary(state, scopeIds, week.from, week.to);
  const latest = recentOrders(state, scopeIds, 5);
  const maxDay = Math.max(1, ...weekSummary.days.map((day) => day.total));

  const activeJobs = state.kitchenJobs.filter(
    (job) => scopeIds.includes(job.branchId) && job.status !== 'completed',
  );
  const awaitingHandover = state.orders.filter(
    (order) =>
      scopeIds.includes(order.branchId) &&
      order.fulfillmentState === 'awaiting_handover',
  );
  const pendingPayments = state.orders.filter(
    (order) => scopeIds.includes(order.branchId) && order.paymentState === 'pending',
  );
  const soldOut = scope.flatMap((item) =>
    productsOf(state, item.id).filter((product) => product.availability === 'sold_out'),
  );
  const queuedOffline = snapshot.offlineOrders.filter((record) => record.state === 'queued');
  const branchName = (branchId: string) =>
    state.branches.find((item) => item.id === branchId)?.name ?? 'Cabang';

  const planDetail =
    entitlements.state === 'trial'
      ? `Trial berakhir ${subscription?.trialEndsAt ? formatDateTime(subscription.trialEndsAt) : '—'}`
      : entitlements.state === 'active'
        ? `Aktif sampai ${subscription?.validUntil ? formatDateTime(subscription.validUntil) : '—'}`
        : 'Free permanen · 1 cabang · 1 staf';

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatLongDate(new Date().toISOString())}</p>
          <h1 className="page-title">Ringkasan {business?.name}</h1>
          <p className="page-lede">
            {session.role === 'owner'
              ? `Gabungan ${scope.length} cabang. Angka mengikuti transaksi yang sudah lunas dan tersinkron.`
              : `${branch?.name}. Angka hanya mencakup cabang ini.`}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/kasir" className="btn btn--secondary">
            <Icon name="receipt" size={18} />
            <span>Buka kasir</span>
          </Link>
          <Link to="/laporan" className="btn btn--primary">
            <Icon name="chart" size={18} />
            <span>Laporan</span>
          </Link>
        </div>
      </header>

      <section className="dash-hero" aria-label="Penjualan hari ini">
        <div className="dash-hero__main">
          <p className="eyebrow">Penjualan hari ini</p>
          <p className="dash-hero__value money">
            <Money value={todaySummary.totalSales} />
          </p>
          <p className="dash-hero__meta">
            {todaySummary.orderCount} transaksi lunas · rata-rata{' '}
            <Money value={todaySummary.averageTicket} /> per pesanan
          </p>

          <div className="spark" role="img" aria-label="Tren total penjualan tujuh hari terakhir">
            {weekSummary.days.map((day) => (
              <div className="spark__col" key={day.key}>
                <span
                  className="spark__bar"
                  style={{ height: `${Math.max(6, Math.round((day.total / maxDay) * 100))}%` }}
                  title={`${day.label}: ${day.total}`}
                />
                <span className="spark__label">{day.label.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-hero__side">
          <div className="dash-hero__side-row">
            <span className="eyebrow">Dapur aktif</span>
            <strong className="money">{activeJobs.length} tiket</strong>
          </div>
          <div className="dash-hero__side-row">
            <span className="eyebrow">Menunggu serah</span>
            <strong className="money">{awaitingHandover.length} takeaway</strong>
          </div>
          <div className="dash-hero__side-row">
            <span className="eyebrow">Menunggu QRIS</span>
            <strong className="money">{pendingPayments.length} percobaan</strong>
          </div>
          <div className="dash-hero__side-row">
            <span className="eyebrow">Antrean offline</span>
            <strong className="money">{queuedOffline.length} transaksi</strong>
          </div>
          <Link to="/dapur" className="btn btn--ghost btn--sm">
            Buka layar dapur
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      <div className="stat-grid">
        <Stat
          label="Transaksi hari ini"
          value={todaySummary.orderCount}
          meta={`${todaySummary.byMethod.cash > 0 ? 'Tunai & digital tercatat' : 'Belum ada transaksi tunai'}`}
        />
        <Stat
          label="Pajak terkumpul"
          value={<Money value={todaySummary.tax} />}
          meta="Pajak atas dasar setelah diskon"
          tone="success"
        />
        <Stat
          label="Biaya layanan"
          value={<Money value={todaySummary.service} />}
          meta="Hanya sesuai penerapan tipe pesanan"
        />
        <Stat
          label="Pembulatan tunai"
          value={<Money value={todaySummary.rounding} />}
          meta="Selisih pembulatan, bukan pendapatan"
          tone={todaySummary.rounding === 0 ? 'neutral' : 'warning'}
        />
      </div>

      {pendingPayments.length > 0 || soldOut.length > 0 || queuedOffline.length > 0 ? (
        <Card>
          <CardHead
            eyebrow="Perlu perhatian"
            title="Hal yang menahan operasional"
            description="Perubahan ini tidak mengubah transaksi lunas; hanya menandai pekerjaan yang belum selesai."
          />
          <ul className="attention-list">
            {pendingPayments.map((order) => (
              <li key={order.id}>
                <Badge tone="warning">QRIS pending</Badge>
                <span>
                  {order.number} · {branchName(order.branchId)} ·{' '}
                  <Money value={order.totals.finalTotal} />
                </span>
                <span className="muted small">Tidak dikirim ke dapur sebelum terverifikasi.</span>
              </li>
            ))}
            {awaitingHandover.map((order) => (
              <li key={order.id}>
                <Badge tone="info">Menunggu serah</Badge>
                <span>
                  {order.number} · takeaway {branchName(order.branchId)}
                </span>
                <Link className="small" to="/dapur">
                  Konfirmasi penyerahan
                </Link>
              </li>
            ))}
            {soldOut.map((product) => (
              <li key={product.id}>
                <Badge tone="danger">Habis</Badge>
                <span>{product.name}</span>
                <span className="muted small">{branchName(product.branchId)}</span>
              </li>
            ))}
            {queuedOffline.length > 0 ? (
              <li>
                <Badge tone="warning">Belum tersinkron</Badge>
                <span>{queuedOffline.length} transaksi tunai offline</span>
                <span className="muted small">Belum masuk total cloud.</span>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <div className="dash-grid">
        <Card>
          <CardHead
            title="Pesanan terbaru"
            description="Semua metode dan status. Buka detail untuk melihat struk staf."
            actions={
              <Link to="/pesanan" className="btn btn--ghost btn--sm">
                Semua pesanan
              </Link>
            }
          />
          {latest.length === 0 ? (
            <EmptyState
              title="Belum ada pesanan"
              description="Transaksi pertama akan muncul di sini setelah pembayaran dikonfirmasi."
              action={
                <Link to="/kasir" className="btn btn--primary btn--sm">
                  Buka kasir
                </Link>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Nomor</th>
                    <th scope="col">Cabang</th>
                    <th scope="col">Bayar</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="numeric">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/pesanan/${order.id}`} aria-label={`Buka pesanan ${order.number}`}>
                          {order.number}
                        </Link>
                      </td>
                      <td className="small">{branchName(order.branchId)}</td>
                      <td>
                        <PaymentBadge state={order.paymentState} />
                      </td>
                      <td>
                        <FulfillmentBadge state={order.fulfillmentState} />
                      </td>
                      <td className="numeric">
                        <Money value={order.totals.finalTotal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card>
            <CardHead title="Dapur sekarang" description="Urutan mengikuti pembayaran lunas." />
            {activeJobs.length === 0 ? (
              <EmptyState icon="flame" title="Tidak ada tiket aktif" description="KDS hanya menerima pesanan lunas." />
            ) : (
              <ul className="job-mini-list">
                {activeJobs.slice(0, 4).map((job) => {
                  const order = state.orders.find((item) => item.id === job.orderId);
                  return (
                    <li key={job.id}>
                      <span className="job-mini-list__seq">{job.sequence}</span>
                      <div>
                        <strong className="money">{order?.number}</strong>
                        <p className="muted small">
                          {order?.type === 'takeaway' ? 'Takeaway' : order?.tableLabel ?? 'Dine-in'} ·{' '}
                          {order ? formatTime(order.paidAt ?? order.createdAt) : ''}
                        </p>
                      </div>
                      <Badge tone={job.status === 'new' ? 'neutral' : job.status === 'preparing' ? 'warning' : 'info'}>
                        {job.status === 'new' ? 'Baru' : job.status === 'preparing' ? 'Disiapkan' : 'Siap'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="card--tint">
            <CardHead eyebrow="Paket" title={PLAN_LABEL[entitlements.plan]} />
            <p className="small muted">{planDetail}</p>
            <div className="inline" style={{ marginTop: 12 }}>
              <Link to="/langganan" className="btn btn--secondary btn--sm">
                Kelola paket
              </Link>
              <Link to="/pengaturan" className="btn btn--ghost btn--sm">
                Pengaturan cabang
              </Link>
            </div>
          </Card>

          {entitlements.needsDowngradeSelection ? (
            <Note tone="warning" title="Transisi paket belum selesai">
              Pilih satu cabang dan satu staf pada halaman Langganan. Data lain tetap tersimpan.
            </Note>
          ) : null}
        </div>
      </div>
    </div>
  );
}
