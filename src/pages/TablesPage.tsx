import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppActions, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Note,
  Stat,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/icons';
import { entitlementsFor } from '../lib/entitlements';
import { tableOccupancy, tablesOf } from '../lib/selectors';
import { can } from '../lib/permissions';
import { describeError } from '../lib/errors';

export function TablesPage() {
  const state = useAppState();
  const actions = useAppActions();
  const { pushToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [seats, setSeats] = useState('2');
  const [error, setError] = useState<string | null>(null);

  const session = state.session;
  const branch = state.branches.find((item) => item.id === session?.branchId);

  if (!session || !branch) {
    return null;
  }

  if (!can(session.role, 'table.manage')) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Meja dikelola pemilik atau manajer"
          description="Kasir tetap dapat memilih meja saat membuat pesanan dine-in."
          action={
            <Link to="/kasir" className="btn btn--secondary btn--sm">
              Buka kasir
            </Link>
          }
        />
      </Card>
    );
  }

  const activeBranch = branch;
  const tables = tablesOf(state, branch.id);
  const occupancy = tableOccupancy(state, branch.id);
  const subscription = state.subscriptions.find((item) => item.businessId === session.businessId);
  const entitlements = entitlementsFor(subscription);
  const merchant = state.merchantConnections.find((item) => item.businessId === session.businessId);
  const qrReady = entitlements.qrisSelfOrder && merchant?.status === 'active';

  const occupiedCount = tables.filter((table) => occupancy[table.id]?.occupied).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      actions.addTable(label, Number(seats));
      setLabel('');
      setSeats('2');
      setModalOpen(false);
      pushToast({ tone: 'success', title: 'Meja ditambahkan' });
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  async function copyQrLink(tableId: string) {
    const url = `${window.location.origin}/qr/${activeBranch.id}/${tableId}`;
    try {
      await navigator.clipboard.writeText(url);
      pushToast({ tone: 'success', title: 'Tautan QR disalin', message: url });
    } catch {
      pushToast({ tone: 'info', title: 'Tautan QR meja', message: url });
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Meja · {branch.code}</p>
          <h1 className="page-title">Meja & QR</h1>
          <p className="page-lede">
            Status meja berasal dari proyeksi pesanan terkait. Meja otomatis Tersedia setelah seluruh pesanan
            selesai, bukan berdasarkan sensor okupansi fisik.
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={qrReady ? 'success' : 'warning'}>
            {qrReady ? 'QR meja aktif' : 'QR meja belum tersedia'}
          </Badge>
          <Button variant="primary" icon="plus" onClick={() => setModalOpen(true)}>
            Tambah meja
          </Button>
        </div>
      </header>

      <div className="stat-grid stat-grid--three">
        <Stat label="Total meja" value={tables.length} />
        <Stat label="Terisi" value={occupiedCount} tone="warning" />
        <Stat label="Tersedia" value={tables.length - occupiedCount} tone="success" />
      </div>

      {!qrReady ? (
        <Note tone="info" title="Pemesanan mandiri QR meja tidak aktif">
          QR meja membutuhkan paket Berbayar dan kanal QRIS yang aktif. Tautan meja tetap dapat dibuka, tetapi
          pelanggan akan melihat halaman belum tersedia. <Link to="/langganan">Kelola langganan</Link>
        </Note>
      ) : null}

      {tables.length === 0 ? (
        <Card>
          <EmptyState
            icon="table"
            title="Belum ada meja"
            description="Tambahkan meja untuk mengaitkan pesanan dine-in dan menyiapkan QR pemesanan."
            action={<Button onClick={() => setModalOpen(true)}>Tambah meja</Button>}
          />
        </Card>
      ) : (
        <div className="table-grid">
          {tables.map((table) => {
            const status = occupancy[table.id] ?? { occupied: false, orderNumbers: [], hasPendingPayment: false };
            return (
              <article className={`table-card ${status.occupied ? 'is-occupied' : ''}`} key={table.id}>
                <div className="table-card__head">
                  <div>
                    <h2 className="table-card__label">{table.label}</h2>
                    <p className="small muted">{table.seats} kursi</p>
                  </div>
                  <Badge tone={status.occupied ? 'warning' : 'success'}>
                    {status.occupied ? 'Terisi' : 'Tersedia'}
                  </Badge>
                </div>

                <div className="table-card__body">
                  {status.occupied ? (
                    <>
                      <p className="small muted">Pesanan terkait</p>
                      <p className="table-card__orders money">{status.orderNumbers.join(', ')}</p>
                      {status.hasPendingPayment ? (
                        <p className="small">Ada percobaan QRIS pending pada meja ini.</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="small muted">Siap menerima pesanan dine-in baru.</p>
                  )}
                </div>

                <div className="table-card__actions">
                  <Link to={`/qr/${branch.id}/${table.id}`} className="btn btn--ghost btn--sm">
                    <Icon name="qr" size={15} />
                    Buka QR
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => copyQrLink(table.id)}>
                    Salin tautan
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Card>
        <Note tone="info" title="Konsekuensi status meja yang sudah disepakati">
          Pada cabang dengan KDS, dine-in selesai saat semua item Siap — bukan saat pelanggan meninggalkan meja.
          Karena itu meja bisa tampak Tersedia lebih awal. Pesanan tambahan di meja yang sama selalu memiliki nomor
          dan pembayaran baru.
        </Note>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah meja"
        description="Meja hanya berlaku untuk cabang aktif ini."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="table-form">
              Tambah meja
            </Button>
          </>
        }
      >
        <form id="table-form" className="form-grid" onSubmit={handleSubmit}>
          <Field label="Label meja" hint="Contoh: Meja 9, Bar 2, Teras A.">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Jumlah kursi">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="number"
                min={1}
                max={30}
                value={seats}
                onChange={(event) => setSeats(event.target.value)}
                required
              />
            )}
          </Field>
          {error ? (
            <Note tone="danger" title="Meja belum ditambahkan">
              {error}
            </Note>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
