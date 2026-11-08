import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
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
  IconButton,
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
import { prepareMenuPhoto } from '../lib/photo';
import type { Category, Product } from '../types/domain';

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
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<Category | null>(null);

  const canManage = can(session?.role, 'menu.manage');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
      const matchesQuery = !query || product.name.toLowerCase().includes(query);
      return inCategory && matchesQuery;
    });
  }, [products, search, categoryFilter]);

  const productsPerCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [products]);

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
    setPhoto(null);
    setPhotoError(null);
    setError(null);
    setConfirmDeleteProduct(false);
    setProductModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setPrice(String(product.price));
    setDescription(product.description);
    setCategoryId(product.categoryId);
    setPhoto(product.photo ?? null);
    setPhotoError(null);
    setError(null);
    setConfirmDeleteProduct(false);
    setProductModalOpen(true);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setPhoto(await prepareMenuPhoto(file));
    } catch (caught) {
      setPhotoError(describeError(caught));
    } finally {
      setPhotoBusy(false);
    }
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
          photo,
        });
        pushToast({ tone: 'success', title: 'Produk diperbarui' });
      } else {
        actions.addProduct({
          name,
          description,
          price: Number(price),
          categoryId,
          photo,
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

  function moveCategory(categoryId: string, direction: 'up' | 'down') {
    setCategoryError(null);
    try {
      actions.moveCategory(categoryId, direction);
    } catch (caught) {
      setCategoryError(describeError(caught));
    }
  }

  function handleDeleteProduct() {
    if (!editing) {
      return;
    }
    try {
      actions.deleteProduct(editing.id);
      pushToast({
        tone: 'success',
        title: 'Produk dihapus',
        message: 'Riwayat transaksi lama tidak berubah.',
      });
      setConfirmDeleteProduct(false);
      setProductModalOpen(false);
    } catch (caught) {
      setConfirmDeleteProduct(false);
      setError(describeError(caught));
    }
  }

  function requestDeleteCategory(category: Category) {
    setCategoryError(null);
    const count = productsPerCategory.get(category.id) ?? 0;
    if (count > 0) {
      setCategoryError(
        `Kategori "${category.name}" masih memiliki ${count} produk. Pindahkan atau hapus produknya terlebih dahulu.`,
      );
      return;
    }
    setPendingCategoryDelete(category);
  }

  function handleDeleteCategory() {
    if (!pendingCategoryDelete) {
      return;
    }
    try {
      actions.deleteCategory(pendingCategoryDelete.id);
      pushToast({
        tone: 'success',
        title: 'Kategori dihapus',
        message: `"${pendingCategoryDelete.name}" dihapus dari katalog.`,
      });
      setPendingCategoryDelete(null);
    } catch (caught) {
      setPendingCategoryDelete(null);
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
                          <span className={`product-thumb ${product.photo ? 'has-photo' : ''}`}>
                            {product.photo ? (
                              <img src={product.photo} alt={`Foto ${product.name}`} loading="lazy" />
                            ) : (
                              <Icon name="image" size={16} />
                            )}
                          </span>
                          <div className="product-cell__text">
                            <strong>{product.name}</strong>
                            <span className="small muted">{product.description || 'Tanpa deskripsi'}</span>
                          </div>
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
        onClose={() => {
          setProductModalOpen(false);
          setConfirmDeleteProduct(false);
        }}
        title={editing ? 'Ubah produk' : 'Tambah produk'}
        description="Nama dan harga disimpan pada katalog cabang ini."
        footer={
          confirmDeleteProduct ? (
            <>
              <Button variant="ghost" onClick={() => setConfirmDeleteProduct(false)}>
                Batal
              </Button>
              <Button variant="danger" icon="trash" onClick={handleDeleteProduct}>
                Hapus permanen
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setProductModalOpen(false);
                  setConfirmDeleteProduct(false);
                }}
              >
                Batal
              </Button>
              {editing ? (
                <Button variant="danger" icon="trash" onClick={() => setConfirmDeleteProduct(true)}>
                  Hapus
                </Button>
              ) : null}
              <Button variant="primary" type="submit" form="product-form">
                {editing ? 'Simpan perubahan' : 'Tambah produk'}
              </Button>
            </>
          )
        }
      >
        {confirmDeleteProduct && editing ? (
          <Note tone="danger" title={`Hapus "${editing.name}"?`}>
            Produk dihapus dari katalog cabang ini. Riwayat transaksi lama tidak berubah karena order
            menyimpan nama dan harga saat transaksi terjadi.
          </Note>
        ) : null}

        <form
          id="product-form"
          className="form-grid"
          onSubmit={handleSubmit}
          hidden={confirmDeleteProduct}
        >
          <div className="field">
            <span className="field__label">Foto menu</span>
            <div className="photo-field">
              <div className={`photo-field__preview ${photo ? 'is-filled' : ''}`}>
                {photo ? (
                  <img src={photo} alt="Pratinjau foto produk" />
                ) : (
                  <Icon name="image" size={24} />
                )}
              </div>
              <div className="photo-field__body">
                <div className="photo-field__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="image"
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy}
                  >
                    {photoBusy ? 'Memproses…' : photo ? 'Ganti foto' : 'Unggah foto'}
                  </Button>
                  {photo ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoError(null);
                      }}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
                <p className="field__hint">
                  JPG/PNG/WebP. Otomatis dipotong persegi 640 px dan dikompres agar hemat penyimpanan.
                  Tampil di kasir dan menu QR.
                </p>
                {photoError ? (
                  <p className="field__error" role="alert">
                    {photoError}
                  </p>
                ) : null}
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

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
                  step={100}
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
        title="Kategori menu"
        description="Urutan kategori dipakai pada chip kasir dan menu QR. Kategori kosong dapat dihapus."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Selesai
            </Button>
            <Button variant="primary" type="submit" form="category-form">
              Tambah
            </Button>
          </>
        }
      >
        <div className="stack stack--tight">
          {categories.length === 0 ? (
            <p className="small muted">Belum ada kategori. Tambahkan kategori pertama di bawah.</p>
          ) : (
            <ul className="category-order-list" aria-label="Urutan kategori">
              {categories.map((category, index) => (
                <li key={category.id} className="category-order-row">
                  <span className="category-order-row__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="category-order-row__name">{category.name}</span>
                  <span className="category-order-row__count">
                    {productsPerCategory.get(category.id) ?? 0} produk
                  </span>
                  <div className="category-order-row__actions">
                    <IconButton
                      icon="chevron-up"
                      label={`Naikkan ${category.name}`}
                      disabled={index === 0}
                      onClick={() => moveCategory(category.id, 'up')}
                    />
                    <IconButton
                      icon="chevron-down"
                      label={`Turunkan ${category.name}`}
                      disabled={index === categories.length - 1}
                      onClick={() => moveCategory(category.id, 'down')}
                    />
                    <IconButton
                      icon="trash"
                      label={`Hapus ${category.name}`}
                      tone="danger"
                      onClick={() => requestDeleteCategory(category)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

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
              <Note tone="danger" title="Tindakan belum berhasil">
                {categoryError}
              </Note>
            ) : null}
          </form>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingCategoryDelete)}
        onClose={() => setPendingCategoryDelete(null)}
        title="Hapus kategori?"
        description="Hanya kategori kosong yang dapat dihapus."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingCategoryDelete(null)}>
              Batal
            </Button>
            <Button variant="danger" icon="trash" onClick={handleDeleteCategory}>
              Hapus kategori
            </Button>
          </>
        }
      >
        <p className="small">
          Kategori <strong>{pendingCategoryDelete?.name}</strong> akan dihapus dari katalog cabang ini.
          Produk dan transaksi lama tidak terpengaruh.
        </p>
      </Modal>
    </div>
  );
}
