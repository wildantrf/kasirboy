import { useMemo, useState } from 'react';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { can } from '../lib/permissions';
import { entitlementsFor } from '../lib/entitlements';
import { branchById, categoriesOf, productsOf, tablesOf } from '../lib/selectors';
import { computeTotals } from '../lib/money';
import { describeError } from '../lib/errors';
import { useNetwork } from '../lib/network';
import { formatIDR } from '../lib/format';
import type { CartLine, OrderType, PaymentMethod, Product } from '../types/domain';
import {
  Badge,
  Button,
  Card,
  CardHead,
  Empty,
  Modal,
  PageHead,
  Segmented,
  Select,
} from '../components/ui';
import { Icon } from '../components/icons';
import { Receipt } from '../components/Receipt';

export function PosPage() {
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast } = useToast();
  const network = useNetwork();

  const session = state.session;
  const branch = session?.branchId ? branchById(state, session.branchId) : undefined;

  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableId, setTableId] = useState<string>('');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [orderNote, setOrderNote] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [busy, setBusy] = useState(false);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);

  const products = useMemo(() => (branch ? productsOf(state, branch.id) : []), [state, branch]);
  const categories = useMemo(() => (branch ? categoriesOf(state, branch.id) : []), [state, branch]);
  const tables = useMemo(() => (branch ? tablesOf(state, branch.id) : []), [state, branch]);

  if (!branch || !session) {
    return null;
  }

  if (!can(session.role, 'pos.run')) {
    return (
      <div className="page">
        <Card>
          <Empty
            icon="lock"
            title="Kasir bukan untuk peran ini"
            text="Hanya kasir, manajer, dan pemilik yang dapat membuat transaksi."
          />
        </Card>
      </div>
    );
  }

  const subscription = state.subscriptions.find((item) => item.businessId === branch.businessId);
  const entitlements = entitlementsFor(subscription);
  const canDiscount = can(session.role, 'discount.apply');

  const filtered = products.filter((product) => {
    if (categoryId !== 'all' && product.categoryId !== categoryId) return false;
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return (
      product.name.toLowerCase().includes(needle) ||
      product.description.toLowerCase().includes(needle)
    );
  });

  const discount =
    canDiscount && Number(discountValue) > 0
      ? { type: discountType, value: Number(discountValue) }
      : null;

  const totals = computeTotals({
    items: cart.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    discount,
    taxRate: branch.taxRate,
    serviceRate: branch.serviceRate,
    taxApplies: branch.taxAppliesTo.includes(orderType),
    serviceApplies: branch.serviceAppliesTo.includes(orderType),
    method,
  });

  const quantityById = new Map(cart.map((line) => [line.productId, line.quantity]));
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const receiptOrder = receiptOrderId ? state.orders.find((order) => order.id === receiptOrderId) : null;

  function add(product: Product) {
    if (product.availability !== 'available') return;
    setCart((current) => {
      const index = current.findIndex((line) => line.productId === product.id && line.note === '');
      if (index >= 0) {
        return current.map((line, position) =>
          position === index ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line,
        );
      }
      return [
        ...current,
        {
          key: `line_${product.id}_${Date.now()}`,
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

  function reset() {
    setCart([]);
    setOrderNote('');
    setDiscountValue('');
    setTableId('');
  }

  async function confirmPayment() {
    setBusy(true);
    try {
      const result = await actions.confirmPaidOrder({
        branchId: branch!.id,
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
      });
      const order = result.order;
      setReceiptOrderId(order.id);
      reset();
      pushToast({
        tone: 'success',
        title: 'Pembayaran tercatat',
        message: `${order.number} · ${formatIDR(order.totals.finalTotal)}`,
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Transaksi gagal', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page--wide pb-cart">
      <PageHead
        title="Kasir"
        subtitle={`${branch.name} · pajak ${branch.taxRate}% · layanan ${branch.serviceRate}%`}
        actions={
          <>
            <span className={`pill ${network.online ? '' : 'pill--signal'}`}>
              <span className="pill__dot" aria-hidden="true" />
              {network.online ? 'Online' : 'Offline'}
            </span>
            <Segmented
              label="Jenis pesanan"
              value={orderType}
              onChange={setOrderType}
              options={[
                { value: 'dine_in', label: 'Dine-in' },
                { value: 'takeaway', label: 'Takeaway' },
              ]}
            />
          </>
        }
      />

      <div className="pos">
        <div className="pos__catalog">
          <div className="pos__toolbar">
            <div className="search" style={{ flex: 1, minWidth: 180 }}>
              <Icon name="search" size={16} className="search__icon" />
              <input
                className="input"
                type="search"
                placeholder="Cari produk"
                aria-label="Cari produk"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {orderType === 'dine_in' ? (
              <Select
                aria-label="Pilih meja"
                value={tableId}
                onChange={(event) => setTableId(event.target.value)}
                style={{ width: 'auto', minWidth: 150 }}
              >
                <option value="">Tanpa meja</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.label} · {table.seats} kursi
                  </option>
                ))}
              </Select>
            ) : null}
          </div>

          <div className="chips" role="group" aria-label="Kategori">
            <button
              type="button"
              className="chip"
              aria-pressed={categoryId === 'all'}
              onClick={() => setCategoryId('all')}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="chip"
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <Empty
                icon="search"
                title="Tidak ada produk"
                text="Ubah kata kunci atau pilih kategori lain."
              />
            </Card>
          ) : (
            <div className="products">
              {filtered.map((product) => {
                const quantity = quantityById.get(product.id) ?? 0;
                const soldOut = product.availability === 'sold_out';
                return (
                  <article className="product" key={product.id}>
                    <div className="product__photo" aria-hidden={!product.photo}>
                      {product.photo ? (
                        <img src={product.photo} alt="" loading="lazy" />
                      ) : (
                        <span className="product__photo-fallback">
                          <Icon name="image" size={20} />
                        </span>
                      )}
                      {soldOut ? (
                        <span className="product__flag">
                          <Badge tone="solid">Habis</Badge>
                        </span>
                      ) : null}
                    </div>
                    <div className="product__body">
                      <span className="product__name">{product.name}</span>
                      <span className="product__desc">{product.description}</span>
                    </div>
                    <div className="product__foot">
                      <span className="product__price">{formatIDR(product.price)}</span>
                      {soldOut ? null : quantity > 0 ? (
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
                          style={{ marginLeft: 'auto' }}
                          aria-label={`Tambah ${product.name}`}
                          onClick={() => add(product)}
                        >
                          <Icon name="plus" size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <Card className="cart">
          <CardHead
            title="Keranjang"
            action={
              cart.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={reset}>
                  Kosongkan
                </Button>
              ) : null
            }
          />

          <div className="cart__lines">
            {cart.length === 0 ? (
              <Empty title="Keranjang kosong" text="Pilih produk untuk mulai." icon="receipt" />
            ) : (
              cart.map((line) => (
                <div className="cart__line" key={line.key}>
                  <span className="cart__name">{line.name}</span>
                  <span className="cart__amount">{formatIDR(line.unitPrice * line.quantity)}</span>
                  <div className="cart__row">
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
                          const product = products.find((item) => item.id === line.productId);
                          if (product) add(product);
                        }}
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </div>
                  </div>
                  <input
                    className="input"
                    style={{ gridColumn: '1 / -1', fontSize: 'var(--t-xs)', padding: '4px 8px' }}
                    placeholder="Catatan item (tanpa biaya)"
                    aria-label={`Catatan ${line.name}`}
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
                </div>
              ))
            )}
          </div>

          <div className="cart__foot">
            {canDiscount && cart.length > 0 ? (
              <div className="row" style={{ gap: 'var(--s-2)' }}>
                <select
                  className="select"
                  aria-label="Jenis diskon"
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as 'amount' | 'percent')}
                  style={{ width: 92 }}
                >
                  <option value="amount">Rp</option>
                  <option value="percent">%</option>
                </select>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Diskon"
                  aria-label="Nilai diskon"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
            ) : null}

            <Segmented
              label="Metode pembayaran"
              value={method}
              onChange={setMethod}
              options={[
                { value: 'cash', label: 'Tunai' },
                entitlements.plan === 'free'
                  ? { value: 'manual_digital', label: 'Digital' }
                  : { value: 'qris', label: 'QRIS' },
              ]}
            />

            <div className="totals">
              <div className="totals__row">
                <span>Subtotal</span>
                <span>{formatIDR(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 ? (
                <div className="totals__row">
                  <span>Diskon</span>
                  <span>−{formatIDR(totals.discountAmount)}</span>
                </div>
              ) : null}
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
              {totals.roundingDelta !== 0 ? (
                <div className="totals__row">
                  <span>Pembulatan</span>
                  <span>
                    {totals.roundingDelta > 0 ? '+' : '−'}
                    {formatIDR(Math.abs(totals.roundingDelta))}
                  </span>
                </div>
              ) : null}
              <div className="totals__row totals__row--total">
                <span>Total</span>
                <span>{formatIDR(totals.finalTotal)}</span>
              </div>
            </div>

            <input
              className="input"
              placeholder="Catatan pesanan (opsional)"
              aria-label="Catatan pesanan"
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value.slice(0, 200))}
            />

            <Button
              variant="primary"
              size="lg"
              block
              disabled={cart.length === 0 || busy}
              onClick={confirmPayment}
            >
              {busy ? 'Menyimpan…' : `Bayar ${formatIDR(totals.finalTotal)}`}
            </Button>
          </div>
        </Card>
      </div>

      {cart.length > 0 ? (
        <div className="cartbar">
          <div className="cartbar__meta">
            <span>{itemCount} item</span>
            <strong>{formatIDR(totals.finalTotal)}</strong>
          </div>
          <Button variant="primary" style={{ marginLeft: 'auto' }} onClick={confirmPayment} disabled={busy}>
            Bayar
          </Button>
        </div>
      ) : null}

      <Modal
        open={Boolean(receiptOrder)}
        onClose={() => setReceiptOrderId(null)}
        title="Pembayaran tercatat"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceiptOrderId(null)}>
              Tutup
            </Button>
            <Button variant="primary" onClick={() => setReceiptOrderId(null)}>
              Transaksi baru
            </Button>
          </>
        }
      >
        {receiptOrder ? <Receipt order={receiptOrder} /> : null}
      </Modal>
    </div>
  );
}
