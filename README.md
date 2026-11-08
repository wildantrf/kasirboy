# MejaFlow — Frontend

Frontend Point of Sale (POS) multi-cabang untuk restoran dan kafe, dibangun mengikuti **MejaFlow PRD v2** (`MejaFlow_PRD_v2.md`). Aplikasi mencakup kasir, KDS per cabang, QR meja untuk pelanggan, katalog, meja, staf, laporan, langganan, dan mode offline tunai.

> Ini adalah prototipe frontend. Tidak ada backend, pembayaran nyata, atau integrasi QRIS sungguhan. Seluruh data disimpan di perangkat (localStorage + IndexedDB) dan pembayaran provider disimulasikan secara eksplisit.

---

## Menjalankan

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

Pengujian mesin perhitungan uang:

```bash
npm test
```

## Akun demo

Kata sandi semua akun: **`mejaflow123`**

| Akun | Peran | Cakupan |
|---|---|---|
| `rina@kopisenja.id` | Pemilik | Semua cabang Kopi Senja, paket Berbayar |
| `bagas@kopisenja.id` | Manajer | Cabang Kemang |
| `sari@kopisenja.id` | Kasir | Cabang Kemang |
| `jaka@kopisenja.id` | Staf dapur | KDS cabang Kemang |
| `yuda@kopisenja.id` | Pelayan | Penyerahan takeaway |
| `dewi@dapuruji.id` | Pemilik | Bisnis kedua, paket Free |

Cabang **Senopati** sengaja tidak memiliki staf dapur, sehingga KDS-nya tidak aktif sementara Kemang aktif.

Kredensial ini hanya untuk demo. Pada produksi, kata sandi wajib di-hash di server dan akun staf tidak boleh memakai kata sandi bersama.

## Permukaan aplikasi

- **Masuk / daftar / verifikasi email** — alur pemilik dengan verifikasi wajib sebelum bisnis dipakai.
- **Onboarding** — membuat bisnis + cabang pertama, batas Free (1 cabang, 1 staf).
- **Ringkasan** — penjualan hari ini, tren 7 hari, status dapur, antrean offline, hal yang perlu perhatian.
- **Kasir** — dine-in/takeaway, meja, catatan item, diskon (pemilik/manajer), rincian biaya, tunai/digital manual/QRIS, struk staf.
- **Pesanan & detail** — riwayat, status pembayaran vs pemenuhan, kesiapan item, QRIS pending, penyerahan takeaway, override nomor hilang.
- **Dapur (KDS)** — kolom Baru / Disiapkan / Siap, FIFO berdasarkan pembayaran lunas, kesiapan per item (tekan baris item), konfirmasi penyajian dine-in, penyerahan takeaway, tanpa menampilkan nilai pesanan.
- **Menu & harga** — produk per cabang, kategori, status Tersedia ↔ Habis.
- **Meja & QR** — proyeksi okupansi dari pesanan, tautan QR meja, salin tautan.
- **Staf** — satu peran + satu cabang per akun, kuota paket, aktivasi/nonaktivasi.
- **Laporan** — total penjualan, komponen nilai, tren harian, riwayat transaksi.
- **Langganan** — Free/Berbayar, trial 30 hari, tagihan manual (tanpa autodebit), kanal QRIS, transisi downgrade.
- **Pengaturan** — pajak/layanan per tipe pesanan, status cabang, daftar cabang, perangkat utama offline, audit.
- **QR meja (pelanggan)** — menu, catatan, QRIS pending/lunas, status pesanan, tanpa akun pelanggan.

## Aturan bisnis yang diimplementasikan

- **Pembulatan per metode**: QRIS/digital manual ke rupiah; tunai ke **Rp1.000 terdekat**. `roundingDelta` disimpan terpisah.
- **Urutan biaya**: subtotal → diskon pesanan → pajak & layanan atas dasar setelah diskon → total → pembulatan. Pajak tidak dikenakan atas biaya layanan.
- **Satu metode pembayaran** per pesanan; tidak ada split/parsial.
- **Lunas sebelum dapur**: tiket KDS hanya dibuat setelah pembayaran sah (cash/manual dikonfirmasi kasir, QRIS diverifikasi provider).
- **Routing KDS**: per cabang, hanya bila ada staf dapur aktif. Tanpa staf dapur atau transaksi tunai offline → langsung Selesai tanpa tiket.
- **KDS**: tiket `Baru` tetap Baru sampai "Mulai Persiapan"; dine-in pindah ke kolom Siap saat semua item Siap dan selesai setelah staf mengonfirmasi penyajian; takeaway menunggu penyerahan. KDS tidak menampilkan nilai total/biaya, dan menekan teks/baris item menandainya Siap (D-64, D-65).
- **Pickup**: nomor harus cocok; nomor hilang memerlukan override manajer dengan alasan + bukti alternatif yang diaudit.
- **Paket**: Free 1 cabang/1 staf dan hanya tunai + digital manual; Berbayar 5 cabang/10 staf per cabang dan tunai + QRIS. QR meja hanya Berbayar dan wajib QRIS aktif.
- **Downgrade**: memilih satu cabang + satu staf; cabang/staf lain dinonaktifkan tanpa menghapus data, transaksi lunas tidak berubah.
- **Offline**: hanya perangkat utama cabang, hanya tunai; transaksi disimpan ke IndexedDB **sebelum** dinyatakan berhasil; sinkron idempoten tanpa membuat tiket KDS; laporan cloud tidak menghitung transaksi yang belum tersinkron.
- **Idempotensi**: callback QRIS yang berulang tidak menambah efek; impor offline memakai `localId` unik.
- **Audit**: diskon, override pickup, perubahan staf/paket/perangkat, dan sinkronisasi offline dicatat.

## Batas yang disengaja (sesuai PRD)

Tidak ada refund/pembatalan/replacement lunas, split/mixed payment, varian berbayar, inventori/stok otomatis, voucher/promo, prioritas KDS manual, cetak thermal, struk pelanggan, sesi kas/selisih laci, atau analitik produk. Semua status keuangan memakai rupiah integer; presisi internal dan titik tengah pembulatan masih **TBD-08**.

## Struktur

```text
src/
├── components/          # AppShell, SyncPanel, Receipt, UI primitives, ikon, toast
├── data/seed.ts         # Data demo 2 bisnis, 3 cabang, staf, katalog, riwayat
├── lib/                 # money, entitlements, permissions, selectors, offlineDb, network
├── pages/               # Auth, onboarding, dashboard, POS, KDS, katalog, laporan, QR
├── state/               # Store + actions (aturan bisnis), provider React
├── styles/              # tokens, base, components, app, pages
└── types/domain.ts      # Model domain mengikuti skema logis PRD §6
```

Arsitektur mengikuti kandidat PRD: **TypeScript + React + Vite**. Tidak ada framework UI eksternal; sistem komponen dan token ditulis sendiri agar tampilan tidak bergantung pada default library.

## Deploy ke Vercel

Ini adalah SPA statis (Vite). Vercel hanya menyediakan Node **26.x**, **24.x**, dan **22.x**; Node 18 sudah discontinued sehingga build gagal dengan pesan `Found invalid or discontinued Node.js Version: "18.x"`.

1. Push repo ke GitHub.
2. Vercel → **Add New Project** → import repo.
3. **Settings → Build and Deployment → Node.js Version** → pilih **26.x**. Repo juga sudah mematok `engines.node: "26.x"` di `package.json`, yang menimpa setting project.
4. Build command `npm run build`, output `dist` (dikonfigurasi di `vercel.json`).
5. **Redeploy** project lama setelah mengubah versi Node; deployment sebelumnya tidak berubah otomatis.
6. `vercel.json` juga menambahkan rewrite SPA agar URL seperti `/kasir`, `/laporan`, dan `/qr/...` tidak 404 saat dibuka langsung atau di-refresh.

Tidak ada environment variable atau backend yang dibutuhkan untuk demo ini.

## Catatan implementasi

- **Frontend-only**: store mensimulasikan server. Otorisasi tetap diperiksa di store, tetapi produksi wajib memeriksa ulang di API (PRD §5.4).
- **Simulasi pembayaran**: tombol "Simulasikan bukti provider" menggantikan callback Midtrans. Redirect/screenshot tidak dianggap bukti; hanya fungsi verifikasi yang mengubah status.
- **IndexedDB** menyimpan antrean tunai offline; localStorage menyimpan state operasional demo.
- **Data demo** dapat direset dari halaman Langganan → "Reset data demo".
- **Penyimpanan persisten** dan kuota diperiksa di panel Offline; kegagalan tulis tidak pernah ditampilkan sebagai sukses.
- **Aksesibilitas**: landmark semantik, label form, `aria-live` untuk toast, fokus terlihat, target sentuh ≥ 34–44 px, dan dukungan `prefers-reduced-motion`.

## TBD PRD yang tidak diklaim selesai

Harga/nama paket berbayar, kontrak QRIS/Midtrans, aturan expiry/retry provider, presisi uang dan titik tengah pembulatan, masa offline dan handover perangkat, mekanisme auth staf, definisi total penjualan/cutoff laporan, kebijakan retensi, dan stack/hosting final tetap terbuka. UI menandai beberapa batas ini secara eksplisit agar tidak dianggap keputusan final.
