import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppActions, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import {
  Badge,
  Button,
  Card,
  CardHead,
  EmptyState,
  Field,
  Modal,
  Note,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';
import { Icon } from '../components/icons';
import { Money } from '../components/domain';
import { can } from '../lib/permissions';
import { categoriesOf, productsOf } from '../lib/selectors';
import { describeError } from '../lib/errors';
import type { Product } from '../types/domain';

export function ProductsPage() {
  const state = useAppState();
  const actions = useAppActions();
  const { pushToast } = useToast();

  const session = state.session;
  const branch = state.branches.find((item) => item.id === session?.branchId);
  const categories = branch ? categoriesOf(state, branch.id) : [];
  const products = branch ? productsOf(state, branch.id) : [];

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const canManage = can(session?.role, 'menu.manage');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
      const matchesQuery = !query || product.name.toLowerCase().includes(query);
      return inCategory && matchesQuery;
    });
  }, [products, search, categoryFilter]);

  if (!session || !branch) {
    return null;
  }

  if (!canManage) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Menu tidak dapat diubah oleh peran ini"
          description="Izin mengubah menu/harga untuk tiap peran masih TBD pada PRD. Nilai default aplikasi: pemilik dan manajer."
          action={
            <Link to="/kasir" className="btn btn--secondary btn--sm">
              Buka kasir
            </Link>
          }
        />
      </Card>
    );
  }

  function openAdd() {
    setEditing(null);
    setName('');
    setPrice('');
    setDescription('');
    setCategoryId(categories[0]?.id ?? '');
    setError(null);
    setProductModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setPrice(String(product.price));
    setDescription(product.description);
    setCategoryId(product.categoryId);
    setError(null);
    setProductModalOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (editing) {
        actions.updateProduct(editing.id, {
          name,
          description,
          price: Number(price),
          categoryId,
        });
        pushToast({ tone: 'success', title: 'Produk diperbarui' });
      } else {
        actions.addProduct({
          name,
          description,
          price: Number(price),
          categoryId,
        });
        pushToast({ tone: 'success', title: 'Produk ditambahkan' });
      }
      setProductModalOpen(false);
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  function toggleAvailability(product: Product) {
    try {
      actions.setProductAvailability(
        product.id,
        product.availability === 'available' ? 'sold_out' : 'available',
      );
      pushToast({
        tone: 'info',
        title: `${product.name} → ${product.availability === 'available' ? 'Habis' : 'Tersedia'}`,
        message: 'Perubahan manual, bukan jumlah stok.',
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Gagal mengubah status', message: describeError(caught) });
    }
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryError(null);
    try {
      actions.addCategory(newCategory);
      setNewCategory('');
      setCategoryModalOpen(false);
      pushToast({ tone: 'success', title: 'Kategori ditambahkan' });
    } catch (caught) {
      setCategoryError(describeError(caught));
    }
  }

  const available = products.filter((product) => product.availability === 'available').length;
  const soldOut = products.length - available;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Katalog · {branch.code}</p>
          <h1 className="page-title">Menu & harga</h1>
          <p className="page-lede">
            Katalog dan harga khusus {branch.name}. Perubahan tidak menulis ulang snapshot transaksi lama.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" icon="plus" onClick={() => setCategoryModalOpen(true)}>
            Kategori
          </Button>
          <Button variant="primary" icon="plus" onClick={openAdd} disabled={categories.length === 0}>
            Tambah produk
          </Button>
        </div>
      </header>

      <Card className="card--flush">
        <div className="menu-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari produk"
              aria-label="Cari produk"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="category-chips">
            <button
              type="button"
              className={`chip ${categoryFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`chip ${categoryFilter === category.id ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="menu-toolbar__counts">
            <Badge tone="success">{available} tersedia</Badge>
            <Badge tone="danger">{soldOut} habis</Badge>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="book"
              title="Belum ada produk"
              description="Tambahkan produk pertama. Pilihan ukuran atau rasa dibuat sebagai produk terpisah."
              action={
                <Button variant="primary" size="sm" icon="plus" onClick={openAdd} disabled={categories.length === 0}>
                  Tambah produk
                </Button>
              }
            />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Produk</th>
                  <th scope="col">Kategori</th>
                  <th scope="col" className="numeric">
                    Harga
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const category = categories.find((item) => item.id === product.categoryId);
                  const isAvailable = product.availability === 'available';
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="product-cell">
                          <strong>{product.name}</strong>
                          <span className="small muted">{product.description || 'Tanpa deskripsi'}</span>
                        </div>
                      </td>
                      <td className="small">{category?.name ?? '—'}</td>
                      <td className="numeric">
                        <Money value={product.price} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-toggle ${isAvailable ? 'is-available' : ''}`}
                          onClick={() => toggleAvailability(product)}
                          aria-label={`Ubah status ${product.name}, saat ini ${isAvailable ? 'tersedia' : 'habis'}`}
                        >
                          <span className="dot" aria-hidden="true" />
                          {isAvailable ? 'Tersedia' : 'Habis'}
                        </button>
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Note tone="info" title="Batas katalog versi pertama">
        Satu harga per produk. Tidak ada varian/modifier berbayar, jumlah stok, resep, atau pengurangan otomatis.
        Status hanya Tersedia ↔ Habis dan diubah manual.
      </Note>

      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editing ? 'Ubah produk' : 'Tambah produk'}
        description="Nama dan harga disimpan pada katalog cabang ini."
        footer={
          <>
            <Button variant="ghost" onClick={() => setProductModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="product-form">
              {editing ? 'Simpan perubahan' : 'Tambah produk'}
            </Button>
          </>
        }
      >
        <form id="product-form" className="form-grid" onSubmit={handleSubmit}>
          <Field label="Nama produk">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Kopi Susu Senja"
                required
              />
            )}
          </Field>

          <div className="form-grid form-grid--2">
            <Field label="Harga (Rp)">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  type="number"
                  min={100}
                  step={500}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Kategori">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Deskripsi" hint="Tampil pada kartu produk di kasir.">
            {({ id, describedBy }) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Bahan singkat atau ukuran porsi"
              />
            )}
          </Field>

          {error ? (
            <Note tone="danger" title="Belum dapat disimpan">
              {error}
            </Note>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Tambah kategori"
        description="Kategori hanya mengelompokkan produk; tidak memengaruhi perhitungan."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="category-form">
              Tambah
            </Button>
          </>
        }
      >
        <form id="category-form" className="form-grid" onSubmit={handleAddCategory}>
          <Field label="Nama kategori">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Contoh: Pastry"
                required
              />
            )}
          </Field>
          {categoryError ? (
            <Note tone="danger" title="Kategori belum dibuat">
              {categoryError}
            </Note>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
