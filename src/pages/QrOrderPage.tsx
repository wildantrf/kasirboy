import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { Badge, Button, EmptyState, Note, Stepper } from '../components/ui';
import { Icon } from '../components/icons';
import { Money } from '../components/domain';
import { QrPlaceholder } from '../components/QrPlaceholder';
import { entitlementsFor } from '../lib/entitlements';
import { computeTotals } from '../lib/money';
import { describeError } from '../lib/errors';
import { useNetwork } from '../lib/network';
import { formatIDR } from '../lib/format';
import { categoriesOf, productsOf } from '../lib/selectors';
import { newId } from '../lib/id';
import type { CartLine, Product } from '../types/domain';

export function QrOrderPage() {
  const { branchId = '', tableId = '' } = useParams<{ branchId: string; tableId: string }>();
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast } = useToast();
  const network = useNetwork();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [customerNote, setCustomerNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

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
  const attempt = pendingOrder?.attempts.find((candidate) => candidate.id === attemptId);
  const paidOrder = paidOrderId ? state.orders.find((order) => order.id === paidOrderId) : undefined;
  const paidJob = paidOrder ? state.kitchenJobs.find((job) => job.orderId === paidOrder.id) : undefined;

  useEffect(() => {
    if (!attemptId) {
      return;
    }
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attemptId]);

  useEffect(() => {
    if (!pendingOrder || !attempt) {
      return;
    }
    if (attempt.state === 'paid') {
      setPaidOrderId(pendingOrder.id);
      setAttemptId(null);
      setCart([]);
      setCustomerNote('');
    }
  }, [attempt?.state, pendingOrder]);

  const available = entitlements.qrisSelfOrder && merchant?.status === 'active' && branch?.status === 'operational';
  const totals = branch
    ? computeTotals({
        items: cart.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
        discount: null,
        taxRate: branch.taxRate,
        serviceRate: branch.serviceRate,
        taxApplies: branch.taxAppliesTo.includes('dine_in'),
        serviceApplies: branch.serviceAppliesTo.includes('dine_in'),
        method: 'qris',
      })
    : null;

  const filtered = products.filter((product) => {
    const query = search.trim().toLowerCase();
    const inCategory = categoryId === 'all' || product.categoryId === categoryId;
    const matches = !query || product.name.toLowerCase().includes(query);
    return inCategory && matches;
  });

  function addProduct(product: Product) {
    if (product.availability !== 'available') {
      return;
    }
    setCart((current) => {
      const existing = current.findIndex((line) => line.productId === product.id && line.note === '');
      if (existing >= 0) {
        return current.map((line, index) =>
          index === existing ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line,
        );
      }
      return [
        ...current,
        {
          key: newId('line'),
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          note: '',
        },
      ];
    });
  }

  async function handlePay() {
    setError(null);
    setBusy(true);
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
        customerNote,
      });
      setAttemptId(result.attempt.id);
    } catch (caught) {
      setError(describeError(caught));
      pushToast({ tone: 'error', title: 'Pesanan belum dibuat', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  function handleSimulatePayment() {
    if (!attempt) {
      return;
    }
    try {
      actions.verifyQrTablePayment(attempt.id);
      pushToast({
        tone: 'success',
        title: 'Pembayaran terverifikasi',
        message: 'Pesanan diteruskan ke dapur sesuai aturan cabang.',
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Pembayaran belum terverifikasi', message: describeError(caught) });
    }
  }

  const minutesLeft = attempt
    ? Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - clock) / 60_000))
    : 0;

  if (!branch || !table || !business) {
    return (
      <div className="qr-page">
        <div className="qr-topbar">
          <span className="brand__mark">M</span>
          <span className="brand__name">MejaFlow</span>
        </div>
        <div className="qr-empty">
          <EmptyState
            icon="qr"
            title="QR meja tidak dikenali"
            description="Tautan mungkin sudah tidak berlaku atau meja tidak berada pada cabang ini."
            action={
              <Link to="/masuk" className="btn btn--secondary btn--sm">
                Masuk sebagai staf
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div className="qr-page">
        <div className="qr-topbar">
          <span className="brand__mark">M</span>
          <span className="brand__name">MejaFlow</span>
        </div>
        <div className="qr-empty">
          <EmptyState
            icon="qr"
            title="Pemesanan QR belum tersedia"
            description={`${branch.name} belum mengaktifkan pemesanan mandiri QR meja.${
              entitlements.qrisSelfOrder ? ' Kanal QRIS merchant belum aktif.' : ' Fitur ini hanya pada paket Berbayar.'
            }`}
            action={
              <Link to="/masuk" className="btn btn--secondary btn--sm">
                Masuk sebagai staf
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (paidOrder) {
    const fulfillmentLabel = paidJob
      ? paidJob.status === 'new'
        ? 'Diterima dapur'
        : paidJob.status === 'preparing'
          ? 'Sedang disiapkan'
          : paidJob.status === 'ready'
            ? 'Siap disajikan / diambil'
            : 'Selesai'
      : 'Selesai';

    return (
      <div className="qr-page">
        <div className="qr-topbar">
          <span className="brand__mark">M</span>
          <span className="brand__name">MejaFlow</span>
          <span className="qr-topbar__table">{table.label}</span>
        </div>

        <div className="qr-result">
          <span className="qr-result__icon" aria-hidden="true">
            <Icon name="check" size={26} />
          </span>
          <p className="eyebrow">Pembayaran lunas</p>
          <h1 className="display">{paidOrder.number}</h1>
          <p className="muted">
            {business.name} · {branch.name} · {table.label}
          </p>
          <div className="qr-result__total money">{formatIDR(paidOrder.totals.finalTotal)}</div>
          <Badge tone="success">{fulfillmentLabel}</Badge>

          <ul className="qr-result__items">
            {paidOrder.items.map((item) => (
              <li key={item.id}>
                <span className="money">{item.quantity}×</span>
                <span>{item.name}</span>
                <Money value={item.unitPrice * item.quantity} />
              </li>
            ))}
          </ul>

          <Note tone="info" title="Simpan nomor pesanan">
            Status diperbarui dari perangkat ini. Struk digital hanya tersedia untuk staf; tidak ada pengiriman
            email/WhatsApp atau akun pelanggan pada versi ini.
          </Note>

          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setPaidOrderId(null);
              setCart([]);
            }}
          >
            Pesan tambahan
          </Button>
          <p className="small muted">
            Pesanan tambahan di meja yang sama memiliki nomor dan pembayaran baru. Tidak ada tagihan meja bersama.
          </p>
        </div>
      </div>
    );
  }

  if (attempt && pendingOrder) {
    return (
      <div className="qr-page">
        <div className="qr-topbar">
          <span className="brand__mark">M</span>
          <span className="brand__name">MejaFlow</span>
          <span className="qr-topbar__table">{table.label}</span>
        </div>

        <div className="qr-result">
          <p className="eyebrow">Menunggu pembayaran</p>
          <h1 className="display qr-result__amount money">{formatIDR(attempt.amount)}</h1>
          <QrPlaceholder value={attempt.providerRef} label="Simulasi kode QRIS" />
          <p className="small muted">
            {pendingOrder.number} · {branch.name} · {table.label}
          </p>
          <p className="small muted">
            Ref {attempt.providerRef} · berlaku {minutesLeft} menit
          </p>

          <Note tone="warning" title="Pesanan belum masuk dapur">
            Selama status pending, tidak ada pekerjaan dapur. Menutup browser tidak menghapus referensi percobaan.
            Jangan menutup halaman sebelum status jelas.
          </Note>

          <Button variant="primary" fullWidth onClick={handleSimulatePayment}>
            Simulasikan bukti pembayaran provider
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setAttemptId(null);
              pushToast({
                tone: 'info',
                title: 'Kembali ke menu',
                message: 'Percobaan tetap tersimpan; gunakan nomor pesanan untuk memulihkan status.',
              });
            }}
          >
            Kembali ke menu (percobaan tersimpan)
          </Button>
          <p className="small muted">
            Integrasi nyata menunggu callback provider terverifikasi server, bukan redirect atau screenshot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-page">
      <header className="qr-topbar">
        <span className="brand__mark" aria-hidden="true">M</span>
        <div className="qr-topbar__brand">
          <span className="brand__name">{business.name}</span>
          <span className="brand__tag">
            {branch.name} · {table.label}
          </span>
        </div>
        {!network.online ? <Badge tone="warning">Offline</Badge> : <Badge tone="success">QRIS</Badge>}
      </header>

      <section className="qr-hero">
        <p className="eyebrow">Pesan dari meja</p>
        <h1 className="display">Pilih menu, bayar QRIS, dapur menerima pesanan lunas.</h1>
        <p className="qr-hero__meta">
          {table.seats} kursi · pajak {branch.taxRate}% · layanan {branch.serviceRate}%{branch.serviceAppliesTo.includes('dine_in') ? '' : ' (tidak berlaku)'}
        </p>
      </section>

      {cart.length > 0 ? (
        <div className="qr-banner" role="status">
          <span>{cart.reduce((sum, line) => sum + line.quantity, 0)} item di keranjang</span>
          <span className="money">{totals ? formatIDR(totals.finalTotal) : ''}</span>
        </div>
      ) : null}

      <div className="qr-menu">
        <div className="qr-menu__main">
          <div className="qr-menu__filters">
            <div className="search-field">
              <Icon name="search" size={18} />
              <input
                className="input"
                type="search"
                placeholder="Cari menu"
                aria-label="Cari menu"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="category-chips" role="group" aria-label="Kategori menu">
            <button
              type="button"
              className={`chip ${categoryId === 'all' ? 'is-active' : ''}`}
              onClick={() => setCategoryId('all')}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`chip ${categoryId === category.id ? 'is-active' : ''}`}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="product-grid qr-product-grid">
            {filtered.map((product) => {
              const soldOut = product.availability === 'sold_out';
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`product-tile ${soldOut ? 'is-soldout' : ''}`}
                  onClick={() => addProduct(product)}
                  disabled={soldOut}
                >
                  <span className="product-tile__name">{product.name}</span>
                  <span className="product-tile__desc">{product.description}</span>
                  <span className="product-tile__foot">
                    <span className="product-tile__price">
                      <Money value={product.price} />
                    </span>
                    {soldOut ? (
                      <Badge tone="danger">Habis</Badge>
                    ) : (
                      <span className="product-tile__add" aria-hidden="true">
                        <Icon name="plus" size={14} />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="small muted">Menu tidak ditemukan. Coba kata kunci lain.</p>
          ) : null}
        </div>

        <aside className="qr-cart" aria-label="Keranjang pelanggan">
          <h2 className="qr-cart__title">Pesanan Anda</h2>
          {cart.length === 0 ? (
            <p className="small muted">Belum ada item. Ketuk menu untuk menambahkan.</p>
          ) : (
            <ul className="cart-lines">
              {cart.map((line) => (
                <li className="cart-line" key={line.key}>
                  <div className="cart-line__top">
                    <span className="cart-line__name">{line.name}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Hapus ${line.name}`}
                      onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  <div className="cart-line__controls">
                    <Stepper
                      label={line.name}
                      value={line.quantity}
                      max={20}
                      onChange={(quantity) =>
                        setCart((current) =>
                          current.map((item) => (item.key === line.key ? { ...item, quantity } : item)),
                        )
                      }
                    />
                    <Money value={line.unitPrice * line.quantity} />
                  </div>
                  <input
                    className="input input--compact"
                    placeholder="Catatan (tanpa biaya)"
                    aria-label={`Catatan untuk ${line.name}`}
                    value={line.note}
                    onChange={(event) =>
                      setCart((current) =>
                        current.map((item) =>
                          item.key === line.key ? { ...item, note: event.target.value.slice(0, 140) } : item,
                        ),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <input
            className="input input--compact"
            placeholder="Catatan pesanan (opsional)"
            aria-label="Catatan pesanan"
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
          />

          {totals ? (
            <div className="totals">
              <div className="totals__row">
                <span>Subtotal</span>
                <Money value={totals.subtotal} />
              </div>
              <div className="totals__row">
                <span>Pajak ({totals.taxRate}%)</span>
                <Money value={totals.taxAmount} />
              </div>
              {totals.serviceRate > 0 ? (
                <div className="totals__row">
                  <span>Layanan ({totals.serviceRate}%)</span>
                  <Money value={totals.serviceAmount} />
                </div>
              ) : null}
              <div className="totals__row totals__row--grand">
                <span>Total</span>
                <Money value={totals.finalTotal} />
              </div>
            </div>
          ) : null}

          {error ? <Note tone="danger" title="Pesanan belum dibuat">{error}</Note> : null}
          {!network.online ? (
            <Note tone="warning" title="Offline" icon="wifi-off">
              Pesanan QR memerlukan internet. Tunai offline hanya tersedia pada perangkat kasir utama.
            </Note>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handlePay}
            disabled={cart.length === 0 || busy || !network.online}
          >
            {busy ? 'Membuat QRIS…' : 'Bayar dengan QRIS'}
          </Button>
          <p className="small muted">
            Tanpa diskon pelanggan, tanpa pembayaran sebagian. Satu pesanan satu pembayaran penuh.
          </p>
        </aside>
      </div>

      <footer className="qr-footer">
        <p>MejaFlow · demo pemesanan QR meja. Tidak ada transaksi nyata.</p>
      </footer>
    </div>
  );
}
