import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { Badge, EmptyState, Note, Tabs, Card } from '../components/ui';
import { Icon } from '../components/icons';
import { FulfillmentBadge, Money, OrderNumber, PaymentBadge } from '../components/domain';
import { formatTime } from '../lib/format';
import { can } from '../lib/permissions';

type Filter = 'all' | 'active' | 'pending' | 'completed';

export function OrdersPage() {
  const state = useAppState();
  const { snapshot } = useApp();
  const session = state.session;

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const branchId = session?.branchId ?? '';
  const branch = state.branches.find((item) => item.id === branchId);

  const orders = useMemo(() => {
    const scoped = state.orders
      .filter((order) => order.branchId === branchId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const normalized = query.trim().toLowerCase();

    return scoped.filter((order) => {
      const matchesQuery =
        !normalized ||
        order.number.toLowerCase().includes(normalized) ||
        (order.tableLabel ?? '').toLowerCase().includes(normalized);

      if (!matchesQuery) {
        return false;
      }

      if (filter === 'active') {
        return order.fulfillmentState !== 'completed' && order.paymentState === 'paid';
      }
      if (filter === 'pending') {
        return order.paymentState === 'pending';
      }
      if (filter === 'completed') {
        return order.fulfillmentState === 'completed';
      }
      return true;
    });
  }, [state.orders, branchId, filter, query]);

  const localQueue = snapshot.offlineOrders.filter(
    (record) => record.branchId === branchId && record.state !== 'synced',
  );

  const counts = useMemo(() => {
    const scoped = state.orders.filter((order) => order.branchId === branchId);
    return {
      all: scoped.length,
      active: scoped.filter((order) => order.fulfillmentState !== 'completed' && order.paymentState === 'paid')
        .length,
      pending: scoped.filter((order) => order.paymentState === 'pending').length,
      completed: scoped.filter((order) => order.fulfillmentState === 'completed').length,
    };
  }, [state.orders, branchId]);

  if (!session) {
    return null;
  }

  const canViewHistory =
    can(session.role, 'pos.run') ||
    can(session.role, 'handover.confirm') ||
    can(session.role, 'reports.view');

  if (!canViewHistory) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Riwayat tidak tersedia untuk peran ini"
          description="Layar dapur tidak menampilkan nilai pesanan atau riwayat transaksi. Gunakan KDS untuk pekerjaan dapur."
          action={
            <Link to="/dapur" className="btn btn--primary btn--sm">
              Buka KDS
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Riwayat cabang</p>
          <h1 className="page-title">Pesanan</h1>
          <p className="page-lede">
            {branch?.name}. Pesanan lunas tidak dapat dibatalkan, diganti, atau direfund melalui aplikasi versi
            pertama.
          </p>
        </div>
        <div className="page-actions">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari nomor / meja"
              aria-label="Cari pesanan"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </header>

      <Tabs
        label="Filter pesanan"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'Semua', count: counts.all },
          { value: 'active', label: 'Aktif', count: counts.active },
          { value: 'pending', label: 'QRIS menunggu', count: counts.pending },
          { value: 'completed', label: 'Selesai', count: counts.completed },
        ]}
      />

      {localQueue.length > 0 ? (
        <Card className="queue-card">
          <div className="row-between">
            <div>
              <p className="eyebrow">Belum tersinkron</p>
              <p className="small muted">
                Transaksi tunai offline ini tersimpan di perangkat dan belum masuk laporan cloud.
              </p>
            </div>
            <Badge tone="warning">{localQueue.length} transaksi</Badge>
          </div>
          <ul className="local-queue">
            {localQueue.map((record) => (
              <li key={record.localId}>
                <span className="money">{record.number}</span>
                <span className="small muted">
                  {formatTime(record.recordedAt)} · {record.actorName}
                </span>
                <Money value={record.totals.finalTotal} />
                <Badge tone={record.state === 'failed' ? 'danger' : 'warning'}>
                  {record.state === 'failed' ? 'Gagal sinkron' : 'Menunggu sinkron'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="card--flush">
        {orders.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="list"
              title="Tidak ada pesanan pada filter ini"
              description="Coba filter lain atau buat pesanan baru dari kasir."
              action={
                session.role !== 'kitchen' ? (
                  <Link to="/kasir" className="btn btn--primary btn--sm">
                    Buka kasir
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Nomor</th>
                  <th scope="col">Tipe</th>
                  <th scope="col">Metode</th>
                  <th scope="col">Pembayaran</th>
                  <th scope="col">Pemenuhan</th>
                  <th scope="col">Item</th>
                  <th scope="col" className="numeric">
                    Total
                  </th>
                  <th scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <OrderNumber order={order} />
                    </td>
                    <td className="small">
                      {order.type === 'takeaway' ? 'Takeaway' : order.tableLabel ?? 'Dine-in'}
                    </td>
                    <td className="small">
                      {order.paymentMethod === 'cash'
                        ? 'Tunai'
                        : order.paymentMethod === 'qris'
                          ? 'QRIS'
                          : 'Digital manual'}
                    </td>
                    <td>
                      <PaymentBadge state={order.paymentState} />
                    </td>
                    <td>
                      <FulfillmentBadge state={order.fulfillmentState} />
                    </td>
                    <td className="numeric">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="numeric">
                      <Money value={order.totals.finalTotal} />
                    </td>
                    <td>
                      <Link to={`/pesanan/${order.id}`} className="btn btn--ghost btn--sm">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {session.role !== 'owner' ? (
        <Note tone="info" title="Riwayat sesuai peran">
          Akun staf hanya melihat riwayat cabangnya. Definisi total penjualan, cutoff tanggal, dan akses cabang
          nonaktif masih tercatat sebagai TBD-16 pada PRD.
        </Note>
      ) : null}

      <p className="small muted">
        Pesanan lunas tidak memiliki tombol pembatalan, penggantian, atau refund pada aplikasi versi pertama.
        Penanganan dilakukan di luar aplikasi tanpa mengubah riwayat.
      </p>
    </div>
  );
}
