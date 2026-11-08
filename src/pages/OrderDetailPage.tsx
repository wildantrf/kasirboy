import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { Badge, Button, Card, CardHead, EmptyState, Modal, Note, TextInput } from '../components/ui';
import { Icon } from '../components/icons';
import { Money, OrderNumber, PaymentBadge, FulfillmentBadge } from '../components/domain';
import { Receipt } from '../components/Receipt';
import { can } from '../lib/permissions';
import { describeError } from '../lib/errors';
import { formatDateTime, formatTime } from '../lib/format';
import { ROLE_LABEL } from '../lib/permissions';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast } = useToast();

  const [handoverNumber, setHandoverNumber] = useState('');
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const session = state.session;
  const order = state.orders.find((candidate) => candidate.id === orderId);

  if (!session) {
    return null;
  }

  if (!can(session.role, 'pos.run') && !can(session.role, 'handover.confirm') && !can(session.role, 'reports.view')) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Detail pesanan tidak tersedia untuk peran ini"
          description="Staf dapur bekerja dari KDS; nilai pesanan dan struk tidak ditampilkan."
          action={
            <Link to="/dapur" className="btn btn--primary btn--sm">
              Buka KDS
            </Link>
          }
        />
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <EmptyState
          icon="receipt"
          title="Pesanan tidak ditemukan"
          description="Pesanan mungkin transaksi lokal yang belum tersinkron, atau bukan milik cabang pada sesi ini."
          action={
            <Link to="/pesanan" className="btn btn--secondary btn--sm">
              Kembali ke riwayat
            </Link>
          }
        />
      </Card>
    );
  }

  const activeOrder = order;
  const branch = state.branches.find((candidate) => candidate.id === order.branchId);
  const job = state.kitchenJobs.find((candidate) => candidate.orderId === order.id);
  const pendingAttempt = order.attempts.find((attempt) => attempt.state === 'pending');
  const paidAttempt = order.attempts.find((attempt) => attempt.state === 'paid');
  const canHandover = can(session.role, 'handover.confirm');
  const canOverride = can(session.role, 'pickup.override');
  const canPayment = can(session.role, 'pos.run');
  const canServe = can(session.role, 'served.confirm');

  function handleHandover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHandoverError(null);
    try {
      actions.confirmHandover(activeOrder.id, handoverNumber);
      setHandoverNumber('');
      pushToast({ tone: 'success', title: 'Penyerahan tercatat', message: 'Pesanan selesai satu kali.' });
    } catch (caught) {
      setHandoverError(describeError(caught));
    }
  }

  function handleOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOverrideError(null);
    try {
      actions.overridePickup(activeOrder.id, { reason, evidence });
      setOverrideOpen(false);
      setReason('');
      setEvidence('');
      pushToast({
        tone: 'success',
        title: 'Penyerahan disetujui manajer',
        message: 'Pemeriksaan alternatif tercatat pada audit.',
      });
    } catch (caught) {
      setOverrideError(describeError(caught));
    }
  }

  function handleServed() {
    try {
      actions.confirmServed(activeOrder.id);
      pushToast({
        tone: 'success',
        title: 'Penyajian dikonfirmasi',
        message: 'Pesanan selesai; meja dilepas setelah semua pesanan terkait selesai.',
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Belum dapat dikonfirmasi', message: describeError(caught) });
    }
  }

  const fulfillmentDetail =
    order.fulfillmentMode === 'kds'
      ? job
        ? `Tiket dapur #${job.sequence} · ${
            job.status === 'new'
              ? 'Baru'
              : job.status === 'preparing'
                ? 'Disiapkan'
                : job.status === 'ready'
                  ? 'Siap'
                  : 'Selesai'
          }`
        : 'Tiket dapur tidak ditemukan'
      : order.fulfillmentMode === 'offline_sync'
        ? 'Transaksi tunai offline — selesai tanpa KDS'
        : 'Tanpa tracking — selesai saat lunas';

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <Link to="/pesanan" className="back-link">
            <Icon name="chevron-left" size={16} /> Riwayat pesanan
          </Link>
          <h1 className="page-title">
            Pesanan <span className="money">{order.number}</span>
          </h1>
          <p className="page-lede">
            {branch?.name} · {formatDateTime(order.createdAt)} ·{' '}
            {order.type === 'takeaway' ? 'Takeaway' : order.tableLabel ?? 'Dine-in'}
          </p>
        </div>
        <div className="inline">
          <PaymentBadge state={order.paymentState} />
          <FulfillmentBadge state={order.fulfillmentState} />
          {order.source === 'qr_table' ? <Badge tone="info">QR meja</Badge> : null}
          {order.offline ? <Badge tone="warning">Offline</Badge> : null}
        </div>
      </header>

      <div className="detail-grid">
        <div className="stack">
          <Receipt order={order} />
        </div>

        <div className="stack">
          <Card>
            <CardHead title="Status" description="Pembayaran dan pemenuhan adalah dua status berbeda." />
            <ol className="timeline">
              <li className="is-done">
                <span className="timeline__dot">
                  <Icon name="check" size={12} />
                </span>
                <div>
                  <strong>Pesanan dibuat</strong>
                  <p className="small muted">{formatTime(order.createdAt)}</p>
                </div>
              </li>
              <li className={order.paymentState === 'paid' ? 'is-done' : order.paymentState === 'pending' ? 'is-current' : ''}>
                <span className="timeline__dot" />
                <div>
                  <strong>
                    {order.paymentState === 'paid'
                      ? 'Lunas'
                      : order.paymentState === 'pending'
                        ? 'Menunggu verifikasi QRIS'
                        : order.paymentState === 'abandoned'
                          ? 'Percobaan kedaluwarsa'
                          : 'Belum dibayar'}
                  </strong>
                  <p className="small muted">
                    {order.paidAt
                      ? `${formatDateTime(order.paidAt)} · ${order.paymentMethod === 'cash' ? 'Tunai' : order.paymentMethod === 'qris' ? 'QRIS terintegrasi' : 'Digital manual'}`
                      : paidAttempt
                        ? `Provider ${paidAttempt.providerRef}`
                        : 'Dana belum masuk.'}
                  </p>
                </div>
              </li>
              <li
                className={
                  order.fulfillmentState === 'completed'
                    ? 'is-done'
                    : order.paymentState === 'paid'
                      ? 'is-current'
                      : ''
                }
              >
                <span className="timeline__dot" />
                <div>
                  <strong>
                    {order.fulfillmentState === 'completed'
                      ? 'Selesai'
                      : order.fulfillmentState === 'awaiting_handover'
                        ? 'Menunggu penyerahan'
                        : order.fulfillmentState === 'ready'
                          ? 'Siap, menunggu konfirmasi penyajian'
                          : order.fulfillmentState === 'new'
                            ? 'Tiket baru'
                            : 'Sedang disiapkan'}
                  </strong>
                  <p className="small muted">{fulfillmentDetail}</p>
                </div>
              </li>
            </ol>
            <div className="kv" style={{ marginTop: 12 }}>
              <span className="kv__label">Total dibayar</span>
              <span className="kv__value">
                <Money value={order.totals.finalTotal} />
              </span>
            </div>
          </Card>

          {order.fulfillmentMode === 'kds' ? (
            <Card>
              <CardHead
                title="Kesiapan item"
                description="Dine-in selesai otomatis saat semua item Siap. Takeaway menunggu penyerahan."
                actions={<Badge tone="neutral">FIFO</Badge>}
              />
              <ul className="readiness-list">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span className={`readiness-dot ${item.ready ? 'is-ready' : ''}`}>
                      {item.ready ? <Icon name="check" size={12} /> : item.quantity}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <p className="small muted">
                        {item.quantity} porsi{item.note ? ` · ${item.note}` : ''}
                      </p>
                    </div>
                    <Badge tone={item.ready ? 'success' : 'neutral'}>
                      {item.ready ? 'Siap' : 'Belum'}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="inline" style={{ marginTop: 12 }}>
                {order.type === 'dine_in' && order.fulfillmentState === 'ready' ? (
                  <Button variant="primary" onClick={handleServed} disabled={!canServe}>
                    Konfirmasi sudah disajikan
                  </Button>
                ) : null}
                <Link to="/dapur" className="btn btn--secondary btn--sm">
                  Buka layar dapur
                </Link>
              </div>
              {order.type === 'dine_in' && order.fulfillmentState === 'ready' && !canServe ? (
                <p className="small muted">
                  Konfirmasi penyajian dilakukan kasir, pelayan, manajer, atau pemilik.
                </p>
              ) : null}
            </Card>
          ) : (
            <Card>
              <CardHead title="Tanpa tracking dapur" />
              <Note tone="info" title={order.fulfillmentMode === 'offline_sync' ? 'Transaksi tunai offline' : 'Cabang tanpa staf dapur'}>
                {order.fulfillmentMode === 'offline_sync'
                  ? 'Tersimpan lokal, selesai tanpa tiket KDS. Saat tersinkron, transaksi masuk riwayat/laporan satu kali tanpa membuat tiket baru.'
                  : 'Pesanan langsung Selesai setelah pembayaran penuh dikonfirmasi. Pemenuhan makanan dijalankan staf di luar tracking.'}
              </Note>
            </Card>
          )}

          {pendingAttempt && canPayment ? (
            <Card>
              <CardHead
                title="QRIS menunggu"
                description="Nilai percobaan immutable. Retry/fallback mengikuti kontrak provider (TBD-06)."
              />
              <div className="stack stack--tight">
                <div className="kv">
                  <span className="kv__label">Referensi provider</span>
                  <span className="kv__value money">{pendingAttempt.providerRef}</span>
                </div>
                <div className="kv">
                  <span className="kv__label">Nominal</span>
                  <span className="kv__value">
                    <Money value={pendingAttempt.amount} />
                  </span>
                </div>
                <div className="kv">
                  <span className="kv__label">Kedaluwarsa</span>
                  <span className="kv__value">{formatDateTime(pendingAttempt.expiresAt)}</span>
                </div>
                <div className="inline">
                  <Button size="sm" onClick={() => actions.verifyQrisAttempt(pendingAttempt.id)}>
                    Simulasikan bukti provider
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      try {
                        actions.expireQrisAttempt(pendingAttempt.id);
                        pushToast({ tone: 'info', title: 'Percobaan ditutup' });
                      } catch (caught) {
                        pushToast({ tone: 'error', title: 'Gagal', message: describeError(caught) });
                      }
                    }}
                  >
                    Tandai kedaluwarsa
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {order.fulfillmentState === 'awaiting_handover' ? (
            <Card>
              <CardHead
                title="Penyerahan takeaway"
                description="Cocokkan nomor pesanan. Pengulangan tidak menandai selesai dua kali."
              />
              <form className="form-grid" onSubmit={handleHandover}>
                <div className="handover-row">
                  <TextInput
                    placeholder={order.number}
                    aria-label="Nomor pesanan yang diserahkan"
                    value={handoverNumber}
                    onChange={(event) => setHandoverNumber(event.target.value)}
                  />
                  <Button type="submit" variant="primary" disabled={!canHandover}>
                    Konfirmasi serah
                  </Button>
                </div>
                {!canHandover ? (
                  <p className="small muted">Peran ini tidak memiliki izin konfirmasi penyerahan.</p>
                ) : null}
                {handoverError ? (
                  <Note tone="danger" title="Nomor tidak cocok">
                    {handoverError}
                  </Note>
                ) : null}
                {canOverride ? (
                  <Button variant="ghost" size="sm" onClick={() => setOverrideOpen(true)}>
                    Nomor hilang? Minta persetujuan manajer
                  </Button>
                ) : null}
              </form>
            </Card>
          ) : null}

          <Card>
            <CardHead title="Jejak keputusan" />
            <dl className="kv-list">
              <div className="kv">
                <dt className="kv__label">Sumber</dt>
                <dd className="kv__value">{order.source === 'qr_table' ? 'Pelanggan QR meja' : 'Kasir'}</dd>
              </div>
              <div className="kv">
                <dt className="kv__label">Mode pemenuhan</dt>
                <dd className="kv__value">{order.fulfillmentMode}</dd>
              </div>
              {order.discountActor ? (
                <div className="kv">
                  <dt className="kv__label">Diskon oleh</dt>
                  <dd className="kv__value">
                    {order.discountActor.name} · {ROLE_LABEL[order.discountActor.role]}
                  </dd>
                </div>
              ) : null}
              {order.handover ? (
                <div className="kv">
                  <dt className="kv__label">Diserahkan</dt>
                  <dd className="kv__value">
                    {order.handover.staffName} · {formatDateTime(order.handover.at)}
                    {order.handover.override ? ' · override' : ''}
                  </dd>
                </div>
              ) : null}
              {order.offline ? (
                <div className="kv">
                  <dt className="kv__label">ID lokal</dt>
                  <dd className="kv__value money">{order.offline.localId}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Note tone="warning" title="Tidak ada koreksi transaksi lunas">
            Pembatalan, replacement, dan refund tidak tersedia di aplikasi versi pertama. Penanganan eksternal perlu
            prosedur sebelum menerima uang nyata.
          </Note>
        </div>
      </div>

      <Modal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Persetujuan penyerahan tanpa nomor"
        description="Hanya manajer/pemilik. Tindakan ini dicatat pada audit dan tidak memberi izin refund atau replacement."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOverrideOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="override-form">
              Setujui penyerahan
            </Button>
          </>
        }
      >
        <form id="override-form" className="form-grid" onSubmit={handleOverride}>
          <label className="field">
            <span className="field__label">Alasan pemeriksaan alternatif</span>
            <textarea
              className="input input--area"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: pelanggan menunjukkan bukti chat dan nama pemesan."
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Bukti alternatif</span>
            <input
              className="input"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="Contoh: nama pemesan + foto struk dapur"
              required
            />
          </label>
          {overrideError ? (
            <Note tone="danger" title="Belum dapat disetujui">
              {overrideError}
            </Note>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
