import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { Badge, Button, EmptyState, Modal, Note, Stepper } from '../components/ui';
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
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [showSummary, setShowSummary] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ src: string; name: string } | null>(null);
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

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const sectionsTopRef = useRef<HTMLDivElement | null>(null);

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

  const searchQuery = search.trim().toLowerCase();

  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: products.filter((product) => product.categoryId === category.id),
        }))
        .filter((group) => group.items.length > 0),
    [categories, products],
  );

  const searchResults = useMemo(
    () =>
      searchQuery
        ? products.filter((product) => product.name.toLowerCase().includes(searchQuery))
        : [],
    [products, searchQuery],
  );

  const quantityById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of cart) {
      counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.quantity);
    }
    return counts;
  }, [cart]);

  // Sorot chip kategori sesuai posisi gulir pelanggan, bukan hasil klik saja.
  useEffect(() => {
    if (searchQuery) {
      return;
    }

    function updateActiveCategory() {
      const sections = groups
        .map((group) => ({ id: group.category.id, el: sectionRefs.current.get(group.category.id) }))
        .filter((entry): entry is { id: string; el: HTMLElement } => Boolean(entry.el));

      if (sections.length === 0) {
        setActiveCategoryId('all');
        return;
      }

      let current = 'all';
      for (const section of sections) {
        if (section.el.getBoundingClientRect().top <= 120) {
          current = section.id;
        }
      }

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        current = sections[sections.length - 1].id;
      }

      setActiveCategoryId(current);
    }

    updateActiveCategory();
    window.addEventListener('scroll', updateActiveCategory, { passive: true });
    window.addEventListener('resize', updateActiveCategory);
    return () => {
      window.removeEventListener('scroll', updateActiveCategory);
      window.removeEventListener('resize', updateActiveCategory);
    };
  }, [groups, searchQuery]);

  function scrollToCategory(targetId: string) {
    if (targetId === 'all') {
      const container = sectionsTopRef.current;
      if (!container) {
        return;
      }
      window.scrollTo({
        top: container.getBoundingClientRect().top + window.scrollY - 16,
        behavior: 'smooth',
      });
      return;
    }
    sectionRefs.current.get(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function jumpToCategory(targetId: string) {
    setActiveCategoryId(targetId);
    if (searchQuery) {
      setSearch('');
      window.requestAnimationFrame(() => scrollToCategory(targetId));
      return;
    }
    scrollToCategory(targetId);
  }

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

  function removeProduct(product: Product) {
    setCart((current) => {
      let index = -1;
      for (let cursor = current.length - 1; cursor >= 0; cursor -= 1) {
        if (current[cursor].productId === product.id && current[cursor].note === '') {
          index = cursor;
          break;
        }
      }
      if (index === -1) {
        index = current.map((line) => line.productId).lastIndexOf(product.id);
      }
      if (index === -1) {
        return current;
      }
      if (current[index].quantity <= 1) {
        return current.filter((_, position) => position !== index);
      }
      return current.map((line, position) =>
        position === index ? { ...line, quantity: line.quantity - 1 } : line,
      );
    });
  }

  function renderProductRow(product: Product) {
    const soldOut = product.availability === 'sold_out';
    const quantity = quantityById.get(product.id) ?? 0;
    const photo = product.photo ?? null;

    return (
      <div key={product.id} className={`qr-product-row ${soldOut ? 'is-soldout' : ''}`}>
        {photo ? (
          <button
            type="button"
            className="qr-product-row__thumb-btn"
            onClick={() => setPhotoPreview({ src: photo, name: product.name })}
            aria-label={`Perbesar foto ${product.name}`}
          >
            <span className="qr-product-row__thumb" aria-hidden="true">
              <img src={photo} alt="" loading="lazy" />
            </span>
          </button>
        ) : (
          <span className="qr-product-row__thumb-wrap" aria-hidden="true">
            <span className="qr-product-row__thumb">
              <Icon name="image" size={20} />
            </span>
          </span>
        )}
        <button
          type="button"
          className="qr-product-row__tap"
          onClick={() => addProduct(product)}
          disabled={soldOut}
          aria-label={`Tambah ${product.name}, ${formatIDR(product.price)}${soldOut ? ', habis' : ''}`}
        >
          <span className="qr-product-row__body">
            <span className="qr-product-row__name">{product.name}</span>
            {product.description ? (
              <span className="qr-product-row__desc">{product.description}</span>
            ) : null}
            <span className="qr-product-row__price">
              <Money value={product.price} />
            </span>
          </span>
        </button>

        <div className="qr-product-row__actions">
          {soldOut ? (
            <Badge tone="danger">Habis</Badge>
          ) : quantity > 0 ? (
            <div className="qty-stepper qty-stepper--compact" role="group" aria-label={`Jumlah ${product.name}`}>
              <button
                type="button"
                className="qty-stepper__btn"
                onClick={() => removeProduct(product)}
                aria-label={`Kurangi ${product.name}`}
              >
                <Icon name="minus" size={14} />
              </button>
              <span className="qty-stepper__value" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className="qty-stepper__btn qty-stepper__btn--plus"
                onClick={() => addProduct(product)}
                aria-label={`Tambah ${product.name}`}
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="product-tile__add"
              onClick={() => addProduct(product)}
              aria-label={`Tambah ${product.name}`}
            >
              <Icon name="plus" size={14} />
            </button>
          )}
        </div>
      </div>
    );
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
      setShowSummary(false);
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

  if (showSummary) {
    const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

    return (
      <div className="qr-page">
        <header className="qr-topbar">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowSummary(false)}>
            <Icon name="chevron-left" size={16} />
            <span>Kembali ke menu</span>
          </button>
          <span className="qr-topbar__table">{table.label}</span>
        </header>

        <div className="qr-summary">
          <div>
            <p className="eyebrow">Langkah 2 dari 2</p>
            <h1 className="display">Ringkasan pesanan</h1>
            <p className="muted">
              {itemCount} item · {business.name} · {table.label}
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="qr-summary__card">
              <p className="muted">Keranjang masih kosong.</p>
              <Button variant="secondary" onClick={() => setShowSummary(false)}>
                Kembali ke menu
              </Button>
            </div>
          ) : (
            <>
              <div className="qr-summary__card">
                <ul className="qr-summary__items">
                  {cart.map((line) => {
                    const product = products.find((item) => item.id === line.productId);
                    return (
                      <li className="qr-summary__item" key={line.key}>
                        <span className="qr-summary__thumb">
                          {product?.photo ? (
                            <img src={product.photo} alt="" />
                          ) : (
                            <Icon name="image" size={18} />
                          )}
                        </span>
                        <div className="qr-summary__body">
                          <div className="qr-summary__head">
                            <span className="qr-summary__name">{line.name}</span>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Hapus ${line.name}`}
                              onClick={() =>
                                setCart((current) => current.filter((item) => item.key !== line.key))
                              }
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </div>
                          <input
                            className="input input--compact"
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
                          <div className="qr-summary__controls">
                            <Stepper
                              label={line.name}
                              value={line.quantity}
                              max={20}
                              onChange={(quantity) =>
                                setCart((current) =>
                                  current.map((item) =>
                                    item.key === line.key ? { ...item, quantity } : item,
                                  ),
                                )
                              }
                            />
                            <Money value={line.unitPrice * line.quantity} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="qr-summary__card">
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
              </div>

              {error ? (
                <Note tone="danger" title="Pesanan belum dibuat">
                  {error}
                </Note>
              ) : null}
              {!network.online ? (
                <Note tone="warning" title="Offline" icon="wifi-off">
                  Pesanan QR memerlukan internet. Tunai offline hanya tersedia pada perangkat kasir utama.
                </Note>
              ) : null}

              <div className="qr-summary__card qr-summary__pay">
                <div className="qr-summary__method">
                  <span className="small muted">Metode pembayaran</span>
                  <strong>QRIS</strong>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handlePay}
                  disabled={cart.length === 0 || busy || !network.online}
                >
                  {busy ? 'Membuat QRIS…' : `Bayar ${totals ? formatIDR(totals.finalTotal) : ''}`}
                </Button>
                <p className="small muted">
                  Pembayaran hanya QRIS. Satu pesanan satu pembayaran penuh, tanpa bayar sebagian.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`qr-page ${cart.length > 0 ? 'qr-page--cartbar' : ''}`}>
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

          <div className="qr-menu__categories">
            <div className="category-chips" role="group" aria-label="Kategori menu">
              <button
                type="button"
                className={`chip ${!searchQuery && activeCategoryId === 'all' ? 'is-active' : ''}`}
                aria-pressed={!searchQuery && activeCategoryId === 'all'}
                onClick={() => jumpToCategory('all')}
              >
                Semua
              </button>
              {groups.map(({ category }) => {
                const isActive = !searchQuery && activeCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`chip ${isActive ? 'is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => jumpToCategory(category.id)}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          {searchQuery ? (
            <>
              <div className="qr-product-list">
                {searchResults.map(renderProductRow)}
              </div>
              {searchResults.length === 0 ? (
                <p className="small muted">Menu tidak ditemukan. Coba kata kunci lain.</p>
              ) : null}
            </>
          ) : groups.length === 0 ? (
            <p className="small muted">Belum ada menu pada cabang ini.</p>
          ) : (
            <div className="qr-category-sections" ref={sectionsTopRef}>
              {groups.map(({ category, items }) => (
                <section
                  key={category.id}
                  className="qr-category"
                  aria-labelledby={`qr-cat-title-${category.id}`}
                  ref={(node) => {
                    if (node) {
                      sectionRefs.current.set(category.id, node);
                    } else {
                      sectionRefs.current.delete(category.id);
                    }
                  }}
                >
                  <h2 className="qr-category__title" id={`qr-cat-title-${category.id}`}>
                    {category.name}
                  </h2>
                  <div className="qr-product-list">
                    {items.map(renderProductRow)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {cart.length > 0 ? (
        <div className="qr-cartbar" role="region" aria-label="Ringkasan keranjang">
          <div className="qr-cartbar__inner">
            <div className="qr-cartbar__info">
              <span className="qr-cartbar__count">
                {cart.reduce((sum, line) => sum + line.quantity, 0)} item
              </span>
              <strong className="qr-cartbar__total money">
                {formatIDR(totals?.subtotal ?? 0)}
              </strong>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="qr-cartbar__cta"
              onClick={() => setShowSummary(true)}
            >
              Pesan
            </Button>
          </div>
        </div>
      ) : null}

      <footer className="qr-footer">
        <p>MejaFlow · demo pemesanan QR meja. Tidak ada transaksi nyata.</p>
      </footer>

      <Modal
        open={Boolean(photoPreview)}
        onClose={() => setPhotoPreview(null)}
        title={photoPreview?.name ?? 'Foto menu'}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setPhotoPreview(null)}>
            Tutup
          </Button>
        }
      >
        {photoPreview ? (
          <img className="qr-photo-large" src={photoPreview.src} alt={`Foto ${photoPreview.name}`} />
        ) : null}
      </Modal>
    </div>
  );
}
