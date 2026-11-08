import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { entitlementsFor } from '../lib/entitlements';
import { categoriesOf, productsOf } from '../lib/selectors';
import { computeTotals } from '../lib/money';
import { describeError } from '../lib/errors';
import { useNetwork } from '../lib/network';
import { formatIDR } from '../lib/format';
import type { CartLine, Product } from '../types/domain';
import { Badge, Button, Card, CardBody, CardHead, Empty, Modal, PageHead } from '../components/ui';
import { Icon } from '../components/icons';
import { QrPlaceholder } from '../components/QrPlaceholder';

export function QrOrderPage() {
  const { branchId = '', tableId = '' } = useParams<{ branchId: string; tableId: string }>();
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast, clearToasts } = useToast();
  const network = useNetwork();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showSummary, setShowSummary] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [resumable, setResumable] = useState<{ attemptId: string; number: string } | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const resumeKey = `mejaflow.qr.pending.${branchId}.${tableId}`;

  const branch = state.branches.find((item) => item.id === branchId);
  const table = state.tables.find((item) => item.id === tableId && item.branchId === branchId);
  const business = state.businesses.find((item) => item.id === branch?.businessId);
  const subscription = state.subscriptions.find((item) => item.businessId === branch?.businessId);
  const entitlements = entitlementsFor(subscription);
  const merchant = state.merchantConnections.find((item) => item.businessId === branch?.businessId);

  const products = useMemo(() => (branch ? productsOf(state, branch.id) : []), [state, branch]);
  const categories = useMemo(() => (branch ? categoriesOf(state, branch.id) : []), [state, branch]);

  const pendingOrder = attemptId
    ? state.orders.find((order) => order.attempts.some((attempt) => attempt.id === attemptId))
    : undefined;
  const attempt = pendingOrder?.attempts.find((entry) => entry.id === attemptId);
  const paidOrder = paidOrderId ? state.orders.find((order) => order.id === paidOrderId) : undefined;
  const paidJob = paidOrder ? state.kitchenJobs.find((job) => job.orderId === paidOrder.id) : undefined;

  useEffect(() => {
    if (!attemptId && !paidOrderId) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attemptId, paidOrderId]);

  // The sticky category bar must sit exactly under the sticky brand bar.
  // Measure that bar instead of hard-coding an offset that drifts with
  // the display serif's line box at each breakpoint.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const bar = root.querySelector<HTMLElement>('.qr__bar');
    if (!bar) return;
    const apply = () => {
      root.style.setProperty('--qr-bar-h', `${Math.round(bar.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [paidOrderId, attemptId, resumable]);

  // A pending QRIS attempt must survive a refresh (PRD 3.4 / AC-17).
  useEffect(() => {
    if (!branchId || !tableId) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(resumeKey);
    } catch {
      stored = null;
    }
    if (!stored) return;
    const order = state.orders.find((candidate) =>
      candidate.attempts.some((entry) => entry.id === stored),
    );
    const saved = order?.attempts.find((entry) => entry.id === stored);
    if (!order || !saved) {
      try {
        window.localStorage.removeItem(resumeKey);
      } catch {
        /* ignore */
      }
      return;
    }
    setResumable({ attemptId: saved.id, number: order.number });
  }, [branchId, tableId, resumeKey, state.orders.length]);

  useEffect(() => {
    if (!pendingOrder || !attempt || attempt.state !== 'paid') return;
    setPaidOrderId(pendingOrder.id);
    setAttemptId(null);
    setCart([]);
    setOrderNote('');
    setResumable(null);
    try {
      window.localStorage.removeItem(resumeKey);
    } catch {
      /* ignore */
    }
    pushToast({
      tone: 'success',
      title: 'Pembayaran terverifikasi',
      message: 'Pesanan diteruskan ke dapur sesuai aturan cabang.',
    });
  }, [attempt, pendingOrder, resumeKey, pushToast]);

  if (!branch || !table || !business) {
    return (
      <div className="qr" ref={rootRef} style={{ paddingTop: 'var(--s-9)' }}>
        <Card>
          <Empty
            icon="qr"
            title="QR meja tidak dikenali"
            text="Tautan mungkin sudah tidak berlaku atau meja tidak berada pada cabang ini."
            action={
              <Link to="/masuk" className="btn btn--secondary btn--sm">
                Masuk sebagai staf
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const available =
    entitlements.qrisSelfOrder && merchant?.status === 'active' && branch.status === 'operational';

  if (!available) {
    return (
      <div className="qr" ref={rootRef} style={{ paddingTop: 'var(--s-9)' }}>
        <Card>
          <Empty
            icon="alert"
            title="Pemesanan QR belum tersedia"
            text={
              entitlements.qrisSelfOrder
                ? `${branch.name} belum mengaktifkan kanal QRIS merchant.`
                : 'Pemesanan mandiri QR meja hanya tersedia pada paket Berbayar.'
            }
            action={
              <Link to="/masuk" className="btn btn--secondary btn--sm">
                Masuk sebagai staf
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const totals = computeTotals({
    items: cart.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    discount: null,
    taxRate: branch.taxRate,
    serviceRate: branch.serviceRate,
    taxApplies: branch.taxAppliesTo.includes('dine_in'),
    serviceApplies: branch.serviceAppliesTo.includes('dine_in'),
    method: 'qris',
  });

  const quantityById = new Map(cart.map((line) => [line.productId, line.quantity]));
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const filtered = products.filter((product) => {
    if (activeCategory !== 'all' && product.categoryId !== activeCategory) return false;
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return product.name.toLowerCase().includes(needle) || product.description.toLowerCase().includes(needle);
  });

  const grouped = categories
    .map((category) => ({
      category,
      items: filtered.filter((product) => product.categoryId === category.id),
    }))
    .filter((group) => group.items.length > 0);

  /* Chips must come from `grouped`, not `categories`. An empty category has no
     section to scroll to, so its chip would land on nothing. AC-46 forbids
     deleting a category that still holds products but does not forbid an empty
     one, so empty categories do exist in real data. When a search is active we
     keep every chip so the filter row does not jump around while typing. */
  const chipCategories = search.trim() ? categories : grouped.map((group) => group.category);

  function add(product: Product) {
    if (product.availability !== 'available') return;
    setCart((current) => {
      const index = current.findIndex((line) => line.productId === product.id);
      if (index >= 0) {
        return current.map((line, position) =>
          position === index ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line,
        );
      }
      return [
        ...current,
        {
          key: `line_${product.id}`,
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          note: '',
        },
      ];
    });
  }

  function decrement(productId: string) {
    setCart((current) => {
      const index = current.findIndex((line) => line.productId === productId);
      if (index === -1) return current;
      if (current[index].quantity <= 1) return current.filter((_, position) => position !== index);
      return current.map((line, position) =>
        position === index ? { ...line, quantity: line.quantity - 1 } : line,
      );
    });
  }

  function scrollToCategory(id: string) {
    setActiveCategory(id);
    if (id === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pay() {
    setBusy(true);
    setError(null);
    try {
      if (!network.online) {
        throw new Error('Pembayaran QRIS membutuhkan internet.');
      }
      const result = actions.placeQrTableOrder({
        branchId,
        tableId,
        lines: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          note: line.note,
        })),
        customerNote: orderNote,
      });
      try {
        window.localStorage.setItem(resumeKey, result.attempt.id);
      } catch {
        /* ignore */
      }
      setResumable(null);
      setAttemptId(result.attempt.id);
      setShowSummary(false);
    } catch (caught) {
      const message = describeError(caught);
      setError(message);
      pushToast({ tone: 'error', title: 'Pesanan belum dibuat', message });
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------- tracker */

  if (paidOrder) {
    const steps = [
      { key: 'new', label: 'Diterima dapur' },
      { key: 'preparing', label: 'Sedang disiapkan' },
      { key: 'ready', label: 'Siap disajikan' },
      { key: 'completed', label: 'Selesai' },
    ];
    const jobIndex = paidJob ? ['new', 'preparing', 'ready', 'completed'].indexOf(paidJob.status) : -1;
    const orderIndex =
      paidOrder.fulfillmentState === 'new'
        ? 0
        : paidOrder.fulfillmentState === 'preparing'
          ? 1
          : paidOrder.fulfillmentState === 'ready' || paidOrder.fulfillmentState === 'awaiting_handover'
            ? 2
            : 3;
    const current = Math.max(0, jobIndex >= 0 ? jobIndex : orderIndex);

    return (
      <div className="qr" ref={rootRef}>
        <div className="qr__bar">
          <span className="rail__mark" aria-hidden="true">
            M
          </span>
          <span className="qr__brand">{business.name}</span>
          <span className="qr__table">{table.label}</span>
        </div>

        <div className="track">
          <div className="track__ticket">
            <div>
              <p className="track__label">Nomor pesanan</p>
              <h1 className="track__number">{paidOrder.number}</h1>
              <p className="track__meta">
                {branch.name} · {table.label}
              </p>
            </div>
          </div>

          <div aria-live="polite" aria-atomic="true">
            <p className="eyebrow">Status sekarang</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-3xl)' }}>
              {steps[current].label}
            </h2>
            <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
              {paidJob ? `Antrean #${paidJob.sequence} di dapur` : 'Tanpa antrean dapur'}
            </p>
          </div>

          <div className="track__steps">
            <span className="track__rail" aria-hidden="true" />
            <span
              className="track__progress"
              aria-hidden="true"
              style={{ width: `calc(75% * ${current / (steps.length - 1)})` }}
            />
            {steps.map((step, index) => {
              const done = index < current;
              const active = index === current;
              return (
                <div className="track__step" key={step.key}>
                  <span
                    className={`track__dot ${done ? 'track__dot--done' : ''} ${active ? 'track__dot--active' : ''}`.trim()}
                    aria-hidden="true"
                  >
                    {done ? <Icon name="check" size={10} /> : null}
                  </span>
                  <p className={`track__step-label ${done || active ? 'track__step-label--on' : ''}`.trim()}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          <Card flush>
            <CardHead title="Rincian pesanan" />
            <div className="track__lines">
              {paidOrder.items.map((item) => (
                <div className="track__line" key={item.id}>
                  <span className="num faint">{item.quantity}×</span>
                  <span>
                    {item.name}
                    {item.note ? (
                      <span className="faint" style={{ display: 'block', fontSize: 'var(--t-xs)' }}>
                        Catatan: {item.note}
                      </span>
                    ) : null}
                  </span>
                  <span className="num">{formatIDR(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="track__paid">
              {paidOrder.customerNote ? (
                <p className="muted" style={{ fontSize: 'var(--t-xs)', marginBottom: 'var(--s-3)' }}>
                  Catatan pesanan: {paidOrder.customerNote}
                </p>
              ) : null}
              <div className="track__total">
                <span className="strong track__total-label">Total dibayar</span>
                <span className="num track__total-value">
                  {formatIDR(paidOrder.totals.finalTotal)}
                </span>
              </div>
              <div className="track__paid-meta">
                <Badge tone="signal">Lunas</Badge>
                <span className="faint">QRIS · referensi tersimpan di perangkat ini</span>
              </div>
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => {
              setPaidOrderId(null);
              setCart([]);
              setOrderNote('');
              setError(null);
              clearToasts();
            }}
          >
            Pesan tambahan
          </Button>
          <p className="faint" style={{ textAlign: 'center', fontSize: 'var(--t-xs)' }}>
            Pesanan tambahan di meja yang sama memiliki nomor dan pembayaran baru.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- pending */

  if (attempt && pendingOrder) {
    const minutesLeft = Math.max(
      0,
      Math.ceil((new Date(attempt.expiresAt).getTime() - clock) / 60_000),
    );
    return (
      <div className="qr" ref={rootRef}>
        <div className="qr__bar">
          <span className="rail__mark" aria-hidden="true">
            M
          </span>
          <span className="qr__brand">MejaFlow</span>
          <span className="qr__table">{table.label}</span>
        </div>

        <div className="qris">
          <p className="eyebrow">Menunggu pembayaran</p>
          <h1 className="qris__amount">{formatIDR(attempt.amount)}</h1>
          <div className="qris__frame">
            <QrPlaceholder value={attempt.providerRef} />
          </div>
          <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
            {pendingOrder.number} · {branch.name} · {table.label}
          </p>
          <p className="faint" style={{ fontSize: 'var(--t-xs)' }}>
            Ref {attempt.providerRef} · berlaku {minutesLeft} menit
          </p>

          <div className="qris__note">
            <Icon name="alert" size={15} />
            <span>
              <strong>Pesanan belum masuk dapur.</strong> Selama pending, tidak ada pekerjaan dapur.
              Menutup browser tidak menghapus referensi percobaan.
            </span>
          </div>

          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => {
              try {
                actions.verifyQrTablePayment(attempt.id);
              } catch (caught) {
                pushToast({
                  tone: 'error',
                  title: 'Pembayaran belum terverifikasi',
                  message: describeError(caught),
                });
              }
            }}
          >
            Simulasikan bukti pembayaran
          </Button>
          <Button
            variant="ghost"
            block
            onClick={() => {
              setAttemptId(null);
              setResumable({ attemptId: attempt.id, number: pendingOrder.number });
            }}
          >
            Kembali ke menu
          </Button>
          <p className="faint" style={{ fontSize: 'var(--t-2xs)', maxWidth: '42ch' }}>
            Integrasi nyata menunggu callback provider terverifikasi server, bukan redirect atau screenshot.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- summary */

  if (showSummary) {
    return (
      <div className="qr" ref={rootRef}>
        <div className="qr__bar">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowSummary(false)}>
            <Icon name="chevronLeft" size={15} />
            <span>Menu</span>
          </button>
          <span className="qr__table">{table.label}</span>
        </div>

        <div className="summary">
          <div>
            <p className="eyebrow">Langkah 3 dari 3</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-3xl)' }}>
              Ringkasan pesanan
            </h1>
            <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
              {itemCount} item · {business.name} · {table.label}
            </p>
          </div>

          <Card flush>
            <div style={{ padding: '0 var(--s-4)' }}>
              {cart.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                return (
                  <div className="summary__line" key={line.key}>
                    <div className="summary__thumb">
                      {product?.photo ? <img src={product.photo} alt="" /> : null}
                    </div>
                    <div className="summary__info">
                      <div className="summary__top">
                        <span className="strong" style={{ fontSize: 'var(--t-sm)' }}>
                          {line.name}
                        </span>
                        <span className="num" style={{ fontSize: 'var(--t-sm)', fontWeight: 600 }}>
                          {formatIDR(line.unitPrice * line.quantity)}
                        </span>
                      </div>
                      <input
                        className="input summary__note"
                        placeholder="Catatan (tanpa biaya)"
                        aria-label={`Catatan untuk ${line.name}`}
                        value={line.note}
                        onChange={(event) =>
                          setCart((current) =>
                            current.map((item) =>
                              item.key === line.key
                                ? { ...item, note: event.target.value.slice(0, 140) }
                                : item,
                            ),
                          )
                        }
                      />
                      <div className="stepper" role="group" aria-label={`Jumlah ${line.name}`}>
                        <button
                          type="button"
                          className="stepper__btn"
                          aria-label={`Kurangi ${line.name}`}
                          onClick={() => decrement(line.productId)}
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <span className="stepper__qty">{line.quantity}</span>
                        <button
                          type="button"
                          className="stepper__btn stepper__btn--add"
                          aria-label={`Tambah ${line.name}`}
                          onClick={() => {
                            const found = products.find((item) => item.id === line.productId);
                            if (found) add(found);
                          }}
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardBody>
              <label className="field">
                <span className="field__label">Catatan pesanan (opsional)</span>
                <input
                  className="input"
                  placeholder="Contoh: sajikan bersamaan"
                  aria-label="Catatan pesanan"
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value.slice(0, 200))}
                />
              </label>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="totals">
                <div className="totals__row">
                  <span>Subtotal</span>
                  <span>{formatIDR(totals.subtotal)}</span>
                </div>
                <div className="totals__row">
                  <span>Pajak {totals.taxRate}%</span>
                  <span>{formatIDR(totals.taxAmount)}</span>
                </div>
                {totals.serviceAmount > 0 ? (
                  <div className="totals__row">
                    <span>Layanan {totals.serviceRate}%</span>
                    <span>{formatIDR(totals.serviceAmount)}</span>
                  </div>
                ) : null}
                <div className="totals__row totals__row--total">
                  <span>Total</span>
                  <span>{formatIDR(totals.finalTotal)}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {error ? (
            <div className="qris__note">
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          <Card>
            <CardBody className="stack" style={{ gap: 'var(--s-3)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                  Metode pembayaran
                </span>
                <span className="badge badge--solid">QRIS</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                block
                onClick={pay}
                disabled={cart.length === 0 || busy || !network.online}
              >
                {busy ? 'Menyiapkan…' : `Bayar ${formatIDR(totals.finalTotal)}`}
              </Button>
              <p className="faint" style={{ fontSize: 'var(--t-xs)' }}>
                Pembayaran hanya QRIS. Satu pesanan satu pembayaran penuh.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- menu */

  return (
    <div className="qr" ref={rootRef} style={{ paddingBottom: itemCount > 0 ? 96 : 'var(--s-9)' }}>
      <div className="qr__bar">
        <span className="rail__mark" aria-hidden="true">
          M
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span className="qr__brand">{business.name}</span>
          <span className="faint" style={{ fontSize: 'var(--t-2xs)' }}>
            {branch.name}
          </span>
        </div>
        <span className="qr__table">{table.label}</span>
      </div>

      <div className="qr__hero">
        <div className="qr__hero-meta">
          <span>Pesan dari meja</span>
          <span style={{ marginLeft: 'auto' }}>
            {table.label} · {table.seats} kursi
          </span>
        </div>
        <h1>Pilih menu, bayar QRIS, dapur menerima pesanan lunas.</h1>
        <p className="qr__hero-tax">
          pajak {branch.taxRate}% · layanan {branch.serviceRate}%
        </p>
      </div>

      <div className="qr__body">
        {resumable ? (
          <div className="qris__note" style={{ alignItems: 'center' }}>
            <Icon name="clock" size={16} />
            <span style={{ flex: 1 }}>
              <strong>Ada pembayaran yang belum selesai.</strong> Pesanan {resumable.number} masih menunggu
              QRIS.
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setAttemptId(resumable.attemptId);
                setShowSummary(false);
              }}
            >
              Lanjutkan
            </Button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                try {
                  window.localStorage.removeItem(resumeKey);
                } catch {
                  /* ignore */
                }
                setResumable(null);
              }}
            >
              Abaikan
            </button>
          </div>
        ) : null}

        <div className="search">
          <Icon name="search" size={16} className="search__icon" />
          <input
            className="input"
            type="search"
            placeholder="Cari menu"
            aria-label="Cari menu"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="qr__sticky" style={{ margin: '0 calc(var(--s-4) * -1)' }}>
          <div className="chips" role="group" aria-label="Kategori menu">
            <button
              type="button"
              className="chip"
              aria-pressed={activeCategory === 'all'}
              onClick={() => scrollToCategory('all')}
            >
              Semua
            </button>
            {chipCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="chip"
                aria-pressed={activeCategory === category.id}
                onClick={() => scrollToCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {grouped.length === 0 ? (
          <Empty icon="search" title="Menu tidak ditemukan" text="Coba kata kunci lain." />
        ) : (
          grouped.map(({ category, items }) => (
            <section
              className="qr__section"
              key={category.id}
              aria-labelledby={`qr-cat-${category.id}`}
              ref={(node) => {
                if (node) sectionRefs.current.set(category.id, node);
                else sectionRefs.current.delete(category.id);
              }}
            >
              <div className="qr__section-head">
                <h2 id={`qr-cat-${category.id}`}>{category.name}</h2>
                <span className="qr__rule" aria-hidden="true" />
                <span className="qr__count">{items.length}</span>
              </div>

              {items.map((product) => {
                const quantity = quantityById.get(product.id) ?? 0;
                const soldOut = product.availability === 'sold_out';
                return (
                  <div className="qr-row" key={product.id}>
                    {product.photo ? (
                      <button
                        type="button"
                        className="qr-row__photo"
                        onClick={() => setPhoto({ src: product.photo!, name: product.name })}
                        aria-label={`Perbesar foto ${product.name}`}
                      >
                        <img src={product.photo} alt="" loading="lazy" />
                      </button>
                    ) : (
                      <span className="qr-row__photo qr-row__fallback" aria-hidden="true">
                        <Icon name="image" size={18} />
                      </span>
                    )}

                    <button
                      type="button"
                      className="qr-row__main"
                      disabled={soldOut}
                      onClick={() => add(product)}
                      aria-label={`Tambah ${product.name}, ${formatIDR(product.price)}${soldOut ? ', habis' : ''}`}
                    >
                      <span className="qr-row__name">{product.name}</span>
                      <span className="qr-row__desc">{product.description}</span>
                      <span className="qr-row__price">{formatIDR(product.price)}</span>
                    </button>

                    {soldOut ? (
                      <Badge>Habis</Badge>
                    ) : quantity > 0 ? (
                      <div className="stepper" role="group" aria-label={`Jumlah ${product.name}`}>
                        <button
                          type="button"
                          className="stepper__btn"
                          aria-label={`Kurangi ${product.name}`}
                          onClick={() => decrement(product.id)}
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <span className="stepper__qty">{quantity}</span>
                        <button
                          type="button"
                          className="stepper__btn stepper__btn--add"
                          aria-label={`Tambah ${product.name}`}
                          onClick={() => add(product)}
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="stepper__btn stepper__btn--add"
                        aria-label={`Tambah ${product.name}`}
                        onClick={() => add(product)}
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          ))
        )}

        <p className="faint" style={{ textAlign: 'center', fontSize: 'var(--t-2xs)', marginTop: 'var(--s-6)' }}>
          MejaFlow · demo pemesanan QR meja. Tidak ada transaksi nyata.
        </p>
      </div>

      {itemCount > 0 ? (
        <div className="qr__cartbar">
          <div className="cartbar__meta">
            <span>{itemCount} item</span>
            <strong>{formatIDR(totals.subtotal)}</strong>
          </div>
          <Button variant="primary" size="lg" onClick={() => setShowSummary(true)}>
            Pesan
          </Button>
        </div>
      ) : null}

      <Modal
        open={Boolean(photo)}
        onClose={() => setPhoto(null)}
        title={photo?.name ?? 'Foto menu'}
        wide
        footer={
          <Button variant="secondary" onClick={() => setPhoto(null)}>
            Tutup
          </Button>
        }
      >
        {photo ? (
          <img
            src={photo.src}
            alt={`Foto ${photo.name}`}
            style={{ width: '100%', borderRadius: 'var(--r-sm)', background: 'var(--ink-04)' }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
