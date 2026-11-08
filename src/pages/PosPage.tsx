import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { can } from '../lib/permissions';
import { entitlementsFor, PAYMENT_METHOD_HINT, PAYMENT_METHOD_LABEL } from '../lib/entitlements';
import { computeTotals } from '../lib/money';
import { describeError } from '../lib/errors';
import { getLocalDeviceId } from '../lib/device';
import { useNetwork } from '../lib/network';
import { formatIDR, formatTime } from '../lib/format';
import {
  categoriesOf,
  productsOf,
  tableOccupancy,
  tablesOf,
} from '../lib/selectors';
import type { CartLine, DiscountType, Order, OrderType, PaymentMethod, Product } from '../types/domain';
import { newId } from '../lib/id';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Modal,
  Note,
  SegmentedControl,
  Select,
  Stepper,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/icons';
import { Money } from '../components/domain';
import { Receipt } from '../components/Receipt';
import { QrPlaceholder } from '../components/QrPlaceholder';

export function PosPage() {
  const state = useAppState();
  const { snapshot, actions } = useApp();
  const { pushToast } = useToast();
  const network = useNetwork();

  const session = state.session;
  const branch = state.branches.find((item) => item.id === session?.branchId);
  const subscription = state.subscriptions.find((item) => item.businessId === session?.businessId);
  const entitlements = entitlementsFor(subscription);
  const merchant = state.merchantConnections.find((item) => item.businessId === session?.businessId);
  const canDiscount = can(session?.role, 'discount.apply');
  const canRunPos = can(session?.role, 'pos.run');

  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderId?: string; order?: Order } | null>(null);
  const [qrisAttemptId, setQrisAttemptId] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  const products = useMemo(() => (branch ? productsOf(state, branch.id) : []), [state, branch]);
  const categories = useMemo(() => (branch ? categoriesOf(state, branch.id) : []), [state, branch]);
  const tables = useMemo(() => (branch ? tablesOf(state, branch.id) : []), [state, branch]);
  const occupancy = useMemo(
    () => (branch ? tableOccupancy(state, branch.id) : {}),
    [state, branch],
  );

  const pagedProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = categoryId === 'all' || product.categoryId === categoryId;
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);
      return inCategory && matchesQuery;
    });
  }, [products, search, categoryId]);

  const discount =
    canDiscount && Number(discountValue) > 0
      ? { type: discountType, value: Number(discountValue) }
      : null;

  const totals = branch
    ? computeTotals({
        items: cart.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
        discount,
        taxRate: branch.taxRate,
        serviceRate: branch.serviceRate,
        taxApplies: branch.taxAppliesTo.includes(orderType),
        serviceApplies: branch.serviceAppliesTo.includes(orderType),
        method,
      })
    : null;

  const deviceId = branch ? `${getLocalDeviceId()}::${branch.id}` : '';
  const primaryDevice = state.devices.find(
    (candidate) => candidate.id === deviceId && candidate.isPrimaryOffline,
  );

  const pendingQris = state.orders.filter(
    (order) =>
      order.branchId === branch?.id &&
      order.paymentState === 'pending' &&
      order.attempts.some((attempt) => attempt.state === 'pending'),
  );

  const queuedOffline = snapshot.offlineOrders.filter((record) => record.state === 'queued').length;

  const qrisOrder = qrisAttemptId
    ? state.orders.find((order) => order.attempts.some((attempt) => attempt.id === qrisAttemptId))
    : undefined;
  const qrisAttempt = qrisOrder?.attempts.find((attempt) => attempt.id === qrisAttemptId);

  useEffect(() => {
    if (!qrisAttemptId) {
      return;
    }
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [qrisAttemptId]);

  useEffect(() => {
    if (!qrisOrder || !qrisAttempt) {
      return;
    }
    if (qrisAttempt.state === 'paid') {
      setReceipt({ orderId: qrisOrder.id });
      setQrisAttemptId(null);
      pushToast({
        tone: 'success',
        title: 'QRIS terverifikasi',
        message: 'Pesanan lunas dan routing dapur dijalankan satu kali.',
      });
    }
  }, [qrisAttempt?.state, qrisOrder, pushToast]);

  useEffect(() => {
    if (!network.online && method !== 'cash') {
      setMethod('cash');
    }
    if (method === 'qris' && merchant?.status !== 'active') {
      setMethod(entitlements.methods.includes('manual_digital') ? 'manual_digital' : 'cash');
    }
  }, [network.online, method, merchant?.status, entitlements.methods]);

  const receiptOrder = receipt
    ? receipt.orderId
      ? state.orders.find((order) => order.id === receipt.orderId) ?? receipt.order
      : receipt.order
    : undefined;

  const qrisMinutesLeft = qrisAttempt
    ? Math.max(0, Math.ceil((new Date(qrisAttempt.expiresAt).getTime() - clock) / 60_000))
    : 0;

  function addProduct(product: Product) {
    if (product.availability !== 'available') {
      return;
    }
    setCart((current) => {
      const existing = current.findIndex(
        (line) => line.productId === product.id && line.note === '',
      );
      if (existing >= 0) {
        return current.map((line, index) =>
          index === existing ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line,
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

  function updateQuantity(key: string, quantity: number) {
    setCart((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );
  }

  function updateNote(key: string, note: string) {
    setCart((current) =>
      current.map((line) => (line.key === key ? { ...line, note: note.slice(0, 140) } : line)),
    );
  }

  function removeLine(key: string) {
    setCart((current) => current.filter((line) => line.key !== key));
  }

  function resetCart() {
    setCart([]);
    setDiscountValue('');
    setOrderNote('');
    setTableId('');
  }

  async function handleConfirm() {
    if (!branch) {
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      branchId: branch.id,
      type: orderType,
      tableId: orderType === 'dine_in' ? tableId || null : null,
      lines: cart.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        note: line.note,
      })),
      discount,
      method,
      customerNote: orderNote,
    };

    try {
      if (method === 'qris') {
        const result = actions.startQrisOrder(payload);
        setQrisAttemptId(result.attempt.id);
        resetCart();
        pushToast({
          tone: 'info',
          title: 'QRIS dibuat',
          message: 'Pesanan belum masuk dapur sampai pembayaran terverifikasi.',
        });
        return;
      }

      const result = await actions.confirmPaidOrder(payload);
      setReceipt({ orderId: result.order.id, order: result.order });
      resetCart();
      pushToast({
        tone: 'success',
        title: result.order.offline ? 'Transaksi tunai tersimpan lokal' : 'Pembayaran tercatat',
        message: result.order.offline
          ? 'Belum masuk laporan cloud sampai sinkron. Tidak ada tiket KDS.'
          : result.order.fulfillmentMode === 'kds'
            ? 'Tiket dapur dibuat satu kali.'
            : 'Cabang tanpa staf dapur: pesanan langsung selesai.',
      });
    } catch (caught) {
      const message = describeError(caught);
      setError(message);
      pushToast({ tone: 'error', title: 'Pembayaran belum tercatat', message });
    } finally {
      setBusy(false);
    }
  }

  function handleExpireQris() {
    if (!qrisAttempt) {
      return;
    }
    try {
      actions.expireQrisAttempt(qrisAttempt.id);
      setQrisAttemptId(null);
      pushToast({
        tone: 'info',
        title: 'Percobaan QRIS ditutup',
        message: 'Tidak ada efek finansial dan tidak ada tiket dapur.',
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Tidak dapat menutup percobaan', message: describeError(caught) });
    }
  }

  if (!session) {
    return null;
  }

  if (!canRunPos) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Peran ini tidak menjalankan kasir"
          description="Staf dapur bekerja dari layar KDS. Pelayan mengonfirmasi penyerahan takeaway dari halaman pesanan."
          action={
            <Link to={session.role === 'kitchen' ? '/dapur' : '/pesanan'} className="btn btn--primary btn--sm">
              Buka halaman yang sesuai
            </Link>
          }
        />
      </Card>
    );
  }

  if (!branch) {
    return (
      <Card>
        <EmptyState
          icon="store"
          title="Cabang belum dipilih"
          description="Pilih cabang operasional dari menu cabang di bagian atas."
        />
      </Card>
    );
  }

  const tableMissing = orderType === 'dine_in' && !tableId;  const planBlocked = entitlements.needsDowngradeSelection;
  const confirmDisabled =
    busy ||
    cart.length === 0 ||
    tableMissing ||
    planBlocked ||
    (!network.online && !primaryDevice) ||
    (method === 'qris' && merchant?.status !== 'active');

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Kasir · {branch.code}</p>
          <h1 className="page-title">Pesanan baru</h1>
          <p className="page-lede">{branch.name}</p>
        </div>
        <div className="page-actions">
          <Badge tone={network.online ? 'success' : 'warning'}>
            <Icon name={network.online ? 'wifi' : 'wifi-off'} size={14} />
            {network.online ? 'Online' : 'Offline · tunai'}
          </Badge>
          <Badge tone="neutral">Pajak {branch.taxRate}% · Layanan {branch.serviceRate}%</Badge>
        </div>
      </header>

      {planBlocked ? (
        <Note tone="danger" title="Operasional ditahan sampai transisi paket selesai" icon="alert">
          Pilih satu cabang dan satu staf Free terlebih dahulu. <Link to="/langganan">Buka Langganan</Link>
        </Note>
      ) : null}

      <div className="pos-layout">
        <section className="pos-catalog" aria-label="Katalog cabang">
          <div className="pos-catalog__toolbar">
            <div className="search-field">
              <Icon name="search" size={18} />
              <input
                className="input"
                type="search"
                placeholder="Cari produk…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Cari produk"
              />
            </div>
            <Badge tone="neutral">{pagedProducts.length} produk</Badge>
          </div>

          <div className="category-chips" role="group" aria-label="Filter kategori">
            <button
              type="button"
              className={`chip ${categoryId === 'all' ? 'is-active' : ''}`}
              onClick={() => setCategoryId('all')}
              aria-pressed={categoryId === 'all'}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`chip ${categoryId === category.id ? 'is-active' : ''}`}
                onClick={() => setCategoryId(category.id)}
                aria-pressed={categoryId === category.id}
              >
                {category.name}
              </button>
            ))}
          </div>

          {pagedProducts.length === 0 ? (
            <EmptyState
              icon="book"
              title="Tidak ada produk yang cocok"
              description="Ubah kata kunci, atau tambahkan produk pada halaman Menu & harga."
              action={
                <Link to="/menu" className="btn btn--secondary btn--sm">
                  Kelola menu
                </Link>
              }
            />
          ) : (
            <div className="product-grid">
              {pagedProducts.map((product) => {
                const soldOut = product.availability === 'sold_out';
                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`product-tile ${soldOut ? 'is-soldout' : ''}`}
                    onClick={() => addProduct(product)}
                    disabled={soldOut}
                    aria-label={`${product.name}, ${formatIDR(product.price)}${soldOut ? ', habis' : ''}`}
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
          )}

          <p className="pos-catalog__note">
            Pilihan ukuran/rasa dibuat sebagai produk terpisah. Tidak ada varian berbayar atau pengurangan stok
            otomatis pada versi ini.
          </p>
        </section>

        <aside className="pos-rail" id="pos-cart" aria-label="Keranjang dan pembayaran">
          <section className="pos-rail__block">
            <SegmentedControl
              label="Tipe pesanan"
              value={orderType}
              onChange={(value) => {
                setOrderType(value);
                if (value === 'takeaway') {
                  setTableId('');
                }
              }}
              options={[
                { value: 'dine_in', label: 'Dine-in' },
                { value: 'takeaway', label: 'Takeaway' },
              ]}
            />

            {orderType === 'dine_in' ? (
              <Field
                label="Meja"
                hint="Meja terisi tetap dapat menerima pesanan tambahan dengan nomor dan pembayaran baru."
                error={tableMissing ? 'Pilih meja untuk pesanan dine-in.' : undefined}
              >
                {({ id, describedBy }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    value={tableId}
                    onChange={(event) => setTableId(event.target.value)}
                  >
                    <option value="">Pilih meja…</option>
                    {tables.map((table) => {
                      const status = occupancy[table.id];
                      return (
                        <option key={table.id} value={table.id}>
                          {table.label} · {table.seats} kursi
                          {status?.occupied ? ' · terisi (tambahan)' : ''}
                        </option>
                      );
                    })}
                  </Select>
                )}
              </Field>
            ) : (
              <p className="pos-rail__hint">
                Takeaway dengan KDS menunggu konfirmasi penyerahan setelah semua item siap.
              </p>
            )}
          </section>

          <section className="pos-rail__block pos-cart">
            <div className="pos-cart__head">
              <h2 className="pos-cart__title">
                Keranjang <span className="pos-cart__count">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>
              </h2>
              {cart.length > 0 ? (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setCart([]);
                    setDiscountValue('');
                    setOrderNote('');
                  }}
                >
                  Kosongkan
                </Button>
              ) : null}
            </div>

            {cart.length === 0 ? (
              <p className="pos-cart__empty">
                Keranjang tidak disimpan sebagai draft. Tambahkan produk untuk mulai.
              </p>
            ) : (
              <ul className="cart-lines">
                {cart.map((line) => (
                  <li className="cart-line" key={line.key}>
                    <div className="cart-line__top">
                      <span className="cart-line__name">{line.name}</span>
                      <IconButton
                        icon="close"
                        label={`Hapus ${line.name}`}
                        onClick={() => removeLine(line.key)}
                      />
                    </div>
                    <div className="cart-line__controls">
                      <Stepper
                        label={line.name}
                        value={line.quantity}
                        onChange={(quantity) => updateQuantity(line.key, quantity)}
                      />
                      <Money value={line.unitPrice * line.quantity} />
                    </div>
                    <input
                      className="input input--compact"
                      placeholder="Catatan item (opsional)"
                      aria-label={`Catatan untuk ${line.name}`}
                      value={line.note}
                      onChange={(event) => updateNote(line.key, event.target.value)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <TextInput
              placeholder="Catatan pesanan (opsional)"
              aria-label="Catatan pesanan"
              className="input--compact"
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
            />
          </section>

          {canDiscount ? (
            <section className="pos-rail__block">
              <div className="discount-head">
                <p className="eyebrow">Diskon pesanan</p>
                <Badge tone="ember">Pemilik / manajer</Badge>
              </div>
              <div className="discount-row">
                <SegmentedControl
                  label="Jenis diskon"
                  size="sm"
                  value={discountType}
                  onChange={setDiscountType}
                  options={[
                    { value: 'amount', label: 'Nominal' },
                    { value: 'percent', label: 'Persen' },
                  ]}
                />
                <TextInput
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  inputMode="numeric"
                  placeholder={discountType === 'percent' ? '0%' : 'Rp0'}
                  aria-label="Nilai diskon"
                  className="input--compact discount-input"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                />
              </div>
              <p className="pos-rail__hint">
                Diskon dicatat atas nama {state.users.find((user) => user.id === session.userId)?.name}. Tidak ada
                voucher atau promo otomatis.
              </p>
            </section>
          ) : (
            <section className="pos-rail__block">
              <p className="pos-rail__hint">
                Diskon seluruh pesanan hanya dapat dimasukkan pemilik atau manajer sebelum pembayaran.
              </p>
            </section>
          )}

          {totals ? (
            <section className="pos-rail__block totals" aria-label="Rincian biaya">
              <div className="totals__row">
                <span>Subtotal</span>
                <Money value={totals.subtotal} />
              </div>
              {totals.discountAmount > 0 ? (
                <div className="totals__row totals__row--discount">
                  <span>Diskon{totals.discountType === 'percent' ? ` (${totals.discountValue}%)` : ''}</span>
                  <span className="money">− {formatIDR(totals.discountAmount)}</span>
                </div>
              ) : null}
              {totals.taxRate > 0 ? (
                <div className="totals__row">
                  <span>Pajak ({totals.taxRate}%)</span>
                  <Money value={totals.taxAmount} />
                </div>
              ) : null}
              {totals.serviceRate > 0 ? (
                <div className="totals__row">
                  <span>Biaya layanan ({totals.serviceRate}%)</span>
                  <Money value={totals.serviceAmount} />
                </div>
              ) : null}
              {totals.roundingDelta !== 0 ? (
                <div className="totals__row">
                  <span>
                    Pembulatan {method === 'cash' ? 'tunai · Rp1.000' : 'digital · rupiah'}
                  </span>
                  <span className="money">
                    {totals.roundingDelta > 0 ? '+' : '−'} {formatIDR(Math.abs(totals.roundingDelta))}
                  </span>
                </div>
              ) : null}
              <div className="totals__row totals__row--grand">
                <span>Total</span>
                <Money value={totals.finalTotal} />
              </div>
              <p className="totals__note">
                Metode mengubah pembulatan: QRIS/digital ke rupiah, tunai ke Rp1.000 terdekat.
              </p>
            </section>
          ) : null}

          <section className="pos-rail__block">
            <p className="eyebrow">Pembayaran</p>
            <div className="pay-options" role="radiogroup" aria-label="Metode pembayaran">
              {entitlements.methods.map((option) => {
                const offlineBlocked = !network.online && option !== 'cash';
                const merchantBlocked = option === 'qris' && merchant?.status !== 'active';
                const disabled = offlineBlocked || merchantBlocked;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={method === option}
                    className={`pay-option ${method === option ? 'is-selected' : ''}`}
                    onClick={() => setMethod(option)}
                    disabled={disabled}
                  >
                    <span className="pay-option__text">
                      <strong>{PAYMENT_METHOD_LABEL[option]}</strong>
                      <span className="pay-option__hint">
                        {offlineBlocked
                          ? 'Tidak tersedia offline.'
                          : merchantBlocked
                            ? 'Merchant QRIS belum aktif.'
                            : PAYMENT_METHOD_HINT[option]}
                      </span>
                    </span>
                    {method === option ? <Icon name="check" size={18} /> : null}
                  </button>
                );
              })}
            </div>

            {!network.online ? (
              <Note
                tone={primaryDevice ? 'warning' : 'danger'}
                title={primaryDevice ? 'Mode offline: tunai saja' : 'Perangkat bukan kasir utama'}
              >
                {primaryDevice
                  ? `Transaksi akan disimpan lokal lebih dulu. ${queuedOffline} transaksi menunggu sinkron.`
                  : 'Daftarkan perangkat ini sebagai perangkat utama melalui panel Offline & sinkronisasi sebelum menerima tunai.'}
              </Note>
            ) : null}

            {error ? (
              <Note tone="danger" title="Pembayaran belum tercatat">
                {error}
              </Note>
            ) : null}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={confirmDisabled}
              onClick={handleConfirm}
            >
              {busy
                ? 'Memproses…'
                : method === 'qris'
                  ? 'Buat QRIS'
                  : method === 'manual_digital'
                    ? 'Konfirmasi digital manual'
                    : 'Konfirmasi tunai'}
            </Button>

            <p className="pos-rail__hint">
              Satu pesanan dibayar penuh dengan satu metode. Tidak ada pembayaran sebagian atau gabungan.
            </p>
          </section>

          {pendingQris.length > 0 ? (
            <section className="pos-rail__block">
              <p className="eyebrow">QRIS menunggu</p>
              <ul className="pending-list">
                {pendingQris.map((order) => {
                  const attempt = order.attempts.find((item) => item.state === 'pending');
                  return (
                    <li key={order.id}>
                      <div>
                        <strong className="money">{order.number}</strong>
                        <p className="muted small">
                          {formatTime(order.createdAt)} · <Money value={order.totals.finalTotal} />
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => attempt && setQrisAttemptId(attempt.id)}
                      >
                        Lanjutkan
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {cart.length > 0 ? (
        <a className="pos-mobile-bar" href="#pos-cart">
          <span className="pos-mobile-bar__count">
            {cart.reduce((sum, line) => sum + line.quantity, 0)} item
          </span>
          <span className="pos-mobile-bar__total money">{formatIDR(totals?.finalTotal ?? 0)}</span>
          <span className="pos-mobile-bar__cta">Lihat pembayaran</span>
        </a>
      ) : null}

      <Modal
        open={Boolean(qrisAttempt && qrisOrder)}
        onClose={() => setQrisAttemptId(null)}
        title="Menunggu pembayaran QRIS"
        description="Pesanan belum menjadi pekerjaan dapur. Nilai percobaan tidak ditimpa; tutup browser tidak menghapus referensi."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={handleExpireQris}>
              Tandai kedaluwarsa
            </Button>
            <Button
              variant="primary"
              icon="check"
              onClick={() => qrisAttempt && actions.verifyQrisAttempt(qrisAttempt.id)}
            >
              Simulasikan bukti provider
            </Button>
          </>
        }
      >
        {qrisAttempt && qrisOrder ? (
          <div className="qris-modal">
            <QrPlaceholder value={qrisAttempt.providerRef} label="Simulasi kode QRIS" />
            <p className="qris-modal__amount money">{formatIDR(qrisAttempt.amount)}</p>
            <p className="small muted">
              {qrisOrder.number} · Ref {qrisAttempt.providerRef} · {qrisMinutesLeft} menit tersisa
            </p>
            <Note tone="warning" title="Gerbang pembayaran">
              Redirect atau screenshot bukan bukti lunas. Hanya callback provider yang diverifikasi server yang
              mengubah status; callback berulang tidak menambah efek.
            </Note>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(receiptOrder)}
        onClose={() => setReceipt(null)}
        title="Pembayaran tercatat"
        description="Struk digital untuk staf. Tidak ada pembagian ke pelanggan atau cetak thermal."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceipt(null)}>
              Pesanan baru
            </Button>
            {receiptOrder && state.orders.some((order) => order.id === receiptOrder.id) ? (
              <Link to={`/pesanan/${receiptOrder.id}`} className="btn btn--secondary">
                Buka detail
              </Link>
            ) : null}
          </>
        }
      >
        {receiptOrder ? <Receipt order={receiptOrder} /> : null}
      </Modal>
    </div>
  );
}
