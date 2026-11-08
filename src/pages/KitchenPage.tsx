import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { Badge, Button, Card, CardHead, EmptyState, Modal, Note, TextInput } from '../components/ui';
import { Icon } from '../components/icons';
import { Money } from '../components/domain';
import { branchHasKitchenStaff, staffOf } from '../lib/selectors';
import { can } from '../lib/permissions';
import { describeError } from '../lib/errors';
import { formatTime, isSameDay, relativeTime } from '../lib/format';
import type { KitchenJob, Order } from '../types/domain';

interface Ticket {
  job: KitchenJob;
  order: Order;
}

export function KitchenPage() {
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast } = useToast();

  const [handover, setHandover] = useState<Record<string, string>>({});
  const [overrideOrderId, setOverrideOrderId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const session = state.session;
  const branch = state.branches.find((item) => item.id === session?.branchId);

  if (!session || !branch) {
    return null;
  }

  if (!can(session.role, 'kds.view')) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="KDS bukan untuk peran ini"
          description="Layar dapur dipakai staf dapur cabang dan pemilik. Kasir dan pelayan mengonfirmasi penyerahan dari halaman pesanan."
          action={
            <Link to="/pesanan" className="btn btn--secondary btn--sm">
              Buka pesanan
            </Link>
          }
        />
      </Card>
    );
  }

  const kitchenStaff = staffOf(state, branch.id).filter(
    (member) => member.role === 'kitchen' && member.status === 'active',
  );
  const kitchenEnabled = branchHasKitchenStaff(state, branch.id);
  const canStart = session.role === 'kitchen' || session.role === 'owner';
  const canOverride = can(session.role, 'pickup.override');

  const tickets: Ticket[] = state.kitchenJobs
    .filter((job) => job.branchId === branch.id)
    .map((job) => ({ job, order: state.orders.find((order) => order.id === job.orderId) }))
    .filter((ticket): ticket is Ticket => Boolean(ticket.order))
    .sort((a, b) => a.job.sequence - b.job.sequence);

  const activeTickets = tickets.filter((ticket) => ticket.job.status !== 'completed');
  const completedToday = tickets
    .filter((ticket) => ticket.job.completedAt && isSameDay(ticket.job.completedAt, new Date()))
    .sort((a, b) => new Date(b.job.completedAt ?? 0).getTime() - new Date(a.job.completedAt ?? 0).getTime());

  const columns = [
    {
      id: 'new' as const,
      title: 'Baru',
      hint: 'Belum dimulai',
      tickets: activeTickets.filter((ticket) => ticket.job.status === 'new'),
    },
    {
      id: 'preparing' as const,
      title: 'Sedang disiapkan',
      hint: 'Item ditandai satu per satu',
      tickets: activeTickets.filter((ticket) => ticket.job.status === 'preparing'),
    },
    {
      id: 'ready' as const,
      title: 'Siap',
      hint: 'Takeaway menunggu serah',
      tickets: activeTickets.filter((ticket) => ticket.job.status === 'ready'),
    },
  ];

  function handleStart(jobId: string) {
    try {
      actions.startKitchenJob(jobId);
    } catch (error) {
      pushToast({ tone: 'error', title: 'Tidak dapat memulai', message: describeError(error) });
    }
  }

  function handleItem(orderId: string, itemId: string) {
    try {
      actions.markItemReady(orderId, itemId);
    } catch (error) {
      pushToast({ tone: 'error', title: 'Kesiapan tidak tersimpan', message: describeError(error) });
    }
  }

  function handleAll(orderId: string) {
    try {
      actions.markAllItemsReady(orderId);
    } catch (error) {
      pushToast({ tone: 'error', title: 'Kesiapan tidak tersimpan', message: describeError(error) });
    }
  }

  function handleHandover(order: Order) {
    const value = handover[order.id] ?? '';
    try {
      actions.confirmHandover(order.id, value);
      setHandover((current) => ({ ...current, [order.id]: '' }));
      pushToast({ tone: 'success', title: `${order.number} diserahkan` });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Nomor belum cocok', message: describeError(error) });
    }
  }

  function handleOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overrideOrderId) {
      return;
    }
    try {
      actions.overridePickup(overrideOrderId, { reason, evidence });
      setOverrideOrderId(null);
      setReason('');
      setEvidence('');
      setOverrideError(null);
      pushToast({ tone: 'success', title: 'Penyerahan diizinkan manajer', message: 'Tercatat pada audit.' });
    } catch (error) {
      setOverrideError(describeError(error));
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">KDS · {branch.code}</p>
          <h1 className="page-title">Layar dapur</h1>
          <p className="page-lede">
            {branch.name}. Antrean mengikuti urutan pembayaran lunas, tanpa prioritas manual.
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={kitchenEnabled ? 'success' : 'warning'}>
            {kitchenEnabled ? `${kitchenStaff.length} staf dapur` : 'Tanpa staf dapur'}
          </Badge>
          <Badge tone="neutral">{activeTickets.length} tiket aktif</Badge>
        </div>
      </header>

      {!kitchenEnabled ? (
        <Card>
          <CardHead
            eyebrow="KDS tidak aktif"
            title="Cabang ini belum memiliki staf dapur terdaftar"
            description="Keberadaan staf dapur cabang lain tidak mengaktifkan KDS di sini. Pesanan lunas langsung Selesai tanpa tracking."
          />
          <div className="inline">
            {can(session.role, 'staff.manage') || can(session.role, 'staff.manage.own_branch') ? (
              <Link to="/staf" className="btn btn--primary btn--sm">
                Tambahkan staf dapur
              </Link>
            ) : (
              <p className="small muted">Hubungi pemilik atau manajer untuk menambahkan staf dapur.</p>
            )}
            <Link to="/pesanan" className="btn btn--ghost btn--sm">
              Lihat pesanan
            </Link>
          </div>
          {activeTickets.length > 0 ? (
            <Note tone="warning" title={`${activeTickets.length} tiket dapur aktif tetap tersimpan`}>
              Pesanan lama tidak diubah menjadi Selesai hanya karena staf dapur dinonaktifkan. Aktifkan kembali
              staf dapur untuk menyelesaikan tiket yang sudah ada (TBD-13).
            </Note>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="kds-board">
            {columns.map((column) => (
              <section className="kds-column" key={column.id} aria-label={`Kolom ${column.title}`}>
                <header className="kds-column__head">
                  <div>
                    <h2>{column.title}</h2>
                    <p className="small muted">{column.hint}</p>
                  </div>
                  <span className="kds-column__count">{column.tickets.length}</span>
                </header>

                {column.tickets.length === 0 ? (
                  <p className="kds-column__empty">Tidak ada tiket.</p>
                ) : (
                  <div className="kds-column__stack">
                    {column.tickets.map(({ job, order }) => {
                      const isTakeaway = order.type === 'takeaway';
                      const waitingForHandover = order.fulfillmentState === 'awaiting_handover';
                      return (
                        <article
                          className={`kds-ticket ${waitingForHandover ? 'kds-ticket--handover' : ''}`}
                          key={job.id}
                        >
                          <header className="kds-ticket__head">
                            <div>
                              <p className="kds-ticket__seq">#{job.sequence}</p>
                              <h3 className="money">{order.number}</h3>
                              <p className="small muted">
                                {isTakeaway ? 'Takeaway' : order.tableLabel ?? 'Dine-in'} ·{' '}
                                {order.paidAt ? relativeTime(order.paidAt) : formatTime(order.createdAt)}
                              </p>
                            </div>
                            <div className="kds-ticket__right">
                              <Badge tone={isTakeaway ? 'info' : 'neutral'}>
                                {isTakeaway ? 'Takeaway' : 'Dine-in'}
                              </Badge>
                              <Money value={order.totals.finalTotal} />
                            </div>
                          </header>

                          <ul className="kds-items">
                            {order.items.map((item) => (
                              <li key={item.id} className={item.ready ? 'is-ready' : ''}>
                                <button
                                  type="button"
                                  className={`kds-item-check ${item.ready ? 'is-ready' : ''}`}
                                  onClick={() => handleItem(order.id, item.id)}
                                  disabled={job.status !== 'preparing' || !canStart || item.ready}
                                  aria-label={`Tandai ${item.name} siap`}
                                >
                                  {item.ready ? <Icon name="check" size={14} /> : item.quantity}
                                </button>
                                <div className="kds-item__body">
                                  <strong>{item.name}</strong>
                                  {item.note ? <p className="kds-item__note">“{item.note}”</p> : null}
                                </div>
                                <span className="kds-item__qty money">{item.quantity}×</span>
                              </li>
                            ))}
                          </ul>

                          <footer className="kds-actions">
                            {job.status === 'new' ? (
                              canStart ? (
                                <Button size="sm" variant="primary" onClick={() => handleStart(job.id)}>
                                  Mulai persiapan
                                </Button>
                              ) : (
                                <p className="small muted">Menunggu staf dapur atau pemilik memulai.</p>
                              )
                            ) : null}

                            {job.status === 'preparing' && canStart ? (
                              <Button size="sm" variant="secondary" onClick={() => handleAll(order.id)}>
                                Tandai semua siap
                              </Button>
                            ) : null}

                            {job.status === 'preparing' && !canStart ? (
                              <p className="small muted">Hanya staf dapur/pemilik yang menandai kesiapan.</p>
                            ) : null}

                            {waitingForHandover ? (
                              <div className="kds-handover">
                                <div className="kds-handover__row">
                                  <TextInput
                                    placeholder="Cocokkan nomor"
                                    aria-label={`Nomor pesanan ${order.number}`}
                                    value={handover[order.id] ?? ''}
                                    onChange={(event) =>
                                      setHandover((current) => ({ ...current, [order.id]: event.target.value }))
                                    }
                                    className="input--compact"
                                  />
                                  <Button size="sm" variant="primary" onClick={() => handleHandover(order)}>
                                    Serahkan
                                  </Button>
                                </div>
                                {canOverride ? (
                                  <Button
                                    size="sm"
                                    variant="quiet"
                                    onClick={() => {
                                      setOverrideOrderId(order.id);
                                      setReason('');
                                      setEvidence('');
                                      setOverrideError(null);
                                    }}
                                  >
                                    Nomor hilang?
                                  </Button>
                                ) : null}
                              </div>
                            ) : null}

                            {job.status === 'ready' && !waitingForHandover ? (
                              <p className="small muted">Menunggu penyerahan.</p>
                            ) : null}
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          <Card>
            <CardHead
              title="Selesai hari ini"
              description="Dine-in selesai saat semua item Siap. Takeaway selesai setelah penyerahan dikonfirmasi."
              actions={<Badge tone="neutral">{completedToday.length} tiket</Badge>}
            />
            {completedToday.length === 0 ? (
              <p className="small muted">Belum ada tiket selesai hari ini.</p>
            ) : (
              <ul className="completed-list">
                {completedToday.map(({ job, order }) => (
                  <li key={job.id}>
                    <span className="money">#{job.sequence}</span>
                    <span className="money">{order.number}</span>
                    <span className="small muted">
                      {order.type === 'takeaway' ? 'Takeaway' : order.tableLabel ?? 'Dine-in'}
                    </span>
                    <span className="small muted">
                      {job.completedAt ? formatTime(job.completedAt) : '—'}
                    </span>
                    <Badge tone="success">Selesai</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Note tone="info" title="Batas PRD yang masih terbuka">
            Perubahan staf dapur terakhir, pesanan berjalan saat staf dinonaktifkan, dan pembekuan keputusan routing
            masih tercatat pada TBD-13. Pesanan lama tidak diubah menjadi Selesai hanya karena staf dihapus.
          </Note>
        </>
      )}

      <Modal
        open={Boolean(overrideOrderId)}
        onClose={() => setOverrideOrderId(null)}
        title="Persetujuan penyerahan"
        description="Hanya manajer/pemilik. Alasan dan bukti alternatif wajib dicatat."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOverrideOrderId(null)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="kds-override-form">
              Setujui
            </Button>
          </>
        }
      >
        <form id="kds-override-form" className="form-grid" onSubmit={handleOverride}>
          <label className="field">
            <span className="field__label">Alasan</span>
            <textarea
              className="input input--area"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Pemeriksaan alternatif yang dilakukan"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Bukti alternatif</span>
            <input
              className="input"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="Nama pemesan, bukti chat, foto struk"
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
