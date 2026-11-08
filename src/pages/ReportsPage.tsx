import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import {
  Badge,
  Card,
  CardHead,
  EmptyState,
  KeyValue,
  Note,
  SegmentedControl,
  Select,
  Stat,
} from '../components/ui';
import { Money, PaymentBadge } from '../components/domain';
import { entitlementsFor, PAYMENT_METHOD_LABEL } from '../lib/entitlements';
import { can } from '../lib/permissions';
import { branchesOf, rangeFor, salesSummary } from '../lib/selectors';
import { formatDate, formatDateTime, formatIDR } from '../lib/format';

type Preset = 'today' | '7d' | '30d';

export function ReportsPage() {
  const state = useAppState();
  const { snapshot } = useApp();
  const session = state.session;

  const [preset, setPreset] = useState<Preset>('7d');
  const [scope, setScope] = useState('all');

  const canView = can(session?.role, 'reports.view');

  const businessBranches = session?.businessId ? branchesOf(state, session.businessId) : [];
  const branchIds = useMemo(() => {
    if (!session) {
      return [];
    }
    if (session.role === 'owner') {
      return scope === 'all' ? businessBranches.map((branch) => branch.id) : [scope];
    }
    return session.branchId ? [session.branchId] : [];
  }, [session, scope, businessBranches]);

  const range = rangeFor(preset);
  const summary = salesSummary(state, branchIds, range.from, range.to);
  const maxDay = Math.max(1, ...summary.days.map((day) => day.total));

  const history = state.orders
    .filter((order) => {
      if (!branchIds.includes(order.branchId) || order.paymentState !== 'paid' || !order.paidAt) {
        return false;
      }
      const paidAt = new Date(order.paidAt);
      return paidAt >= range.from && paidAt <= range.to;
    })
    .sort((a, b) => new Date(b.paidAt ?? 0).getTime() - new Date(a.paidAt ?? 0).getTime());

  const queued = snapshot.offlineOrders.filter(
    (record) => branchIds.includes(record.branchId) && record.state !== 'synced',
  );

  if (!session) {
    return null;
  }

  if (!canView) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Laporan tidak tersedia untuk peran ini"
          description="Akses laporan per peran masih TBD-16. Nilai default: pemilik dan manajer."
          action={
            <Link to="/kasir" className="btn btn--secondary btn--sm">
              Buka kasir
            </Link>
          }
        />
      </Card>
    );
  }

  const subscription = state.subscriptions.find((item) => item.businessId === session.businessId);
  const entitlements = entitlementsFor(subscription);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Penjualan</p>
          <h1 className="page-title">Laporan</h1>
          <p className="page-lede">
            Total penjualan dan daftar riwayat. Tidak ada analitik produk, sesi kas, atau rekonsiliasi laci.
          </p>
        </div>
        <div className="page-actions">
          {session.role === 'owner' ? (
            <Select
              aria-label="Pilih cakupan cabang"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="all">Semua cabang</option>
              {businessBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          ) : (
            <Badge tone="neutral">Cabang aktif</Badge>
          )}
          <SegmentedControl
            label="Rentang laporan"
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'today', label: 'Hari ini' },
              { value: '7d', label: '7 hari' },
              { value: '30d', label: '30 hari' },
            ]}
          />
        </div>
      </header>

      {queued.length > 0 ? (
        <Note tone="warning" title="Ada transaksi lokal yang belum masuk total ini" icon="wifi-off">
          {queued.length} transaksi tunai offline belum diakui server. Sinkronkan dari panel offline sebelum
          memakai angka ini untuk rekonsiliasi.
        </Note>
      ) : null}

      {entitlements.needsDowngradeSelection ? (
        <Note tone="danger" title="Masa berbayar berakhir">
          Pilih cabang dan staf Free terlebih dahulu. Data dan transaksi lunas tidak dihapus.
        </Note>
      ) : null}

      <div className="stat-grid">
        <Stat label="Total penjualan" value={<Money value={summary.totalSales} />} meta="Total dibayar, setelah pembulatan" />
        <Stat label="Transaksi lunas" value={summary.orderCount} meta={`${formatDate(range.from.toISOString())} – ${formatDate(range.to.toISOString())}`} />
        <Stat label="Rata-rata / pesanan" value={<Money value={summary.averageTicket} />} />
        <Stat
          label="Tunai"
          value={<Money value={summary.byMethod.cash} />}
          meta={`QRIS ${formatIDR(summary.byMethod.qris)} · Manual ${formatIDR(summary.byMethod.manual_digital)}`}
          tone="success"
        />
      </div>

      <div className="report-grid">
        <Card>
          <CardHead
            eyebrow="Tren total"
            title="Penjualan harian"
            description="Batang menunjukkan total dibayar per hari pada rentang terpilih."
          />
          {summary.orderCount === 0 ? (
            <EmptyState icon="chart" title="Belum ada penjualan" description="Tidak ada transaksi lunas pada rentang ini." />
          ) : (
            <div className="chart" role="img" aria-label="Grafik total penjualan harian">
              {summary.days.map((day) => (
                <div className="chart__col" key={day.key}>
                  <div className="chart__track">
                    <span
                      className="chart__bar"
                      style={{ height: `${Math.max(3, Math.round((day.total / maxDay) * 100))}%` }}
                    />
                  </div>
                  <span className="chart__value money">
                    {day.total > 0 ? Math.round(day.total / 1000) + 'rb' : '—'}
                  </span>
                  <span className="chart__label">{day.label.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHead title="Komponen nilai" description="Komponen disimpan terpisah dari total dibayar." />
          <dl className="kv-list">
            <KeyValue label="Subtotal produk" value={<Money value={summary.subtotal} />} />
            <KeyValue label="Diskon" value={<span className="money">− {formatIDR(summary.discount)}</span>} />
            <KeyValue label="Pajak" value={<Money value={summary.tax} />} />
            <KeyValue label="Biaya layanan" value={<Money value={summary.service} />} />
            <KeyValue label="Penyesuaian pembulatan" value={<Money value={summary.rounding} />} />
            <KeyValue label="Total dibayar" value={<Money value={summary.totalSales} />} />
          </dl>
          <div className="divider" />
          <p className="small muted">
            Definisi total penjualan (termasuk/tidak pajak & layanan), zona waktu, dan cutoff masih TBD-16. Angka di
            sini memakai total dibayar.
          </p>
        </Card>
      </div>

      <Card className="card--flush">
        <div className="card__head" style={{ padding: '20px 20px 12px', marginBottom: 0 }}>
          <div>
            <h2 className="card__title">Riwayat transaksi</h2>
            <p className="card__description">
              {history.length > 40 ? `Menampilkan 40 dari ${history.length} transaksi terbaru.` : `${history.length} transaksi pada rentang ini.`}
            </p>
          </div>
          <Badge tone="neutral">{summary.orderCount} lunas</Badge>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState icon="receipt" title="Tidak ada riwayat" description="Ubah rentang atau cakupan cabang." />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Waktu</th>
                  <th scope="col">Nomor</th>
                  <th scope="col">Cabang</th>
                  <th scope="col">Tipe</th>
                  <th scope="col">Metode</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="numeric">
                    Total
                  </th>
                  <th scope="col">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 40).map((order) => (
                  <tr key={order.id}>
                    <td className="small">{formatDateTime(order.paidAt ?? order.createdAt)}</td>
                    <td className="money">{order.number}</td>
                    <td className="small">{state.branches.find((branch) => branch.id === order.branchId)?.name}</td>
                    <td className="small">
                      {order.type === 'takeaway' ? 'Takeaway' : order.tableLabel ?? 'Dine-in'}
                    </td>
                    <td className="small">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</td>
                    <td>
                      <PaymentBadge state={order.paymentState} />
                    </td>
                    <td className="numeric">
                      <Money value={order.totals.finalTotal} />
                    </td>
                    <td>
                      <Link to={`/pesanan/${order.id}`} className="btn btn--ghost btn--sm">
                        Struk
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="small muted">
        Laporan tidak menghitung transaksi yang masih lokal, tidak mencerminkan refund eksternal, dan tidak memiliki
        modul shift/selisih kas. Bukan pengganti rekonsiliasi keuangan.
      </p>
    </div>
  );
}
