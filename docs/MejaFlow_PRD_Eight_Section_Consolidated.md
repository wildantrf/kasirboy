# MejaFlow — Product Requirements Document (PRD)

**Revisi:** Outline dan gaya penulisan sesuai referensi · **Tanggal:** 8 November 2026

**Baseline:** PRD v1.1 yang disetujui, Q1–Q75 dan A1–A8. **Status:** Draft dokumentasi untuk ditinjau.

1. [Overview](#1-overview)
2. [Requirements](#2-requirements)
3. [Core Features](#3-core-features)
4. [User Flow](#4-user-flow)
5. [Architecture](#5-architecture)
6. [Database Schema](#6-database-schema)
7. [Tech Stack](#7-tech-stack)
8. [Deployment](#8-deployment)

## 1. Overview

MejaFlow adalah aplikasi Point of Sale (POS) berbasis web untuk restoran dan kafe kecil hingga menengah di Indonesia. Aplikasi ini menghubungkan pencatatan pesanan, pembayaran, persiapan makanan, pelayanan meja, pengambilan takeaway, rekonsiliasi kas, dan laporan penjualan dalam satu sistem. Setiap bisnis memiliki ruang kerja dan data yang terpisah.

Masalah utama yang ingin diselesaikan adalah informasi pesanan yang terlewat antara kasir, dapur, dan pelayan; ketidakjelasan apakah pesanan sudah dibayar; serta sulitnya mencocokkan penjualan dengan uang kas. MejaFlow menjaga agar setiap pesanan memiliki nomor, rincian produk, pembayaran, status persiapan, dan riwayat penyelesaian yang dapat ditelusuri.

Tujuan utama aplikasi ini adalah membantu staf memproses transaksi dengan mudah dan memberikan informasi operasional yang konsisten kepada pemilik usaha. Pesanan hanya diteruskan ke dapur setelah pembayaran penuh dikonfirmasi. Kasir dan pelayan dapat mengikuti progres pesanan, sementara pemilik dapat memeriksa penjualan, selisih kas, dan tindakan pengecualian melalui catatan yang dapat diaudit.

### Pengguna dan ruang lingkup

| Pengguna | Kebutuhan utama |
|---|---|
| Pemilik bisnis | Mendaftarkan bisnis, mengelola paket, menu, staf, pengaturan, laporan, dan persetujuan pengecualian |
| Manajer | Mengawasi operasional, menyetujui pengecualian/refund, dan meninjau rekonsiliasi |
| Kasir | Membuat transaksi, mengonfirmasi pembayaran tunai, menerbitkan struk, menutup sesi kas, dan menyerahkan takeaway |
| Pelayan | Membuat pesanan dine-in sesuai izin dan mencatat item yang sudah disajikan |
| Staf dapur | Menerima pesanan lunas, memulai persiapan, mengatur prioritas sesuai izin, dan menandai item siap |
| Pelanggan | Membayar pesanan, menerima struk/makanan, dan menyebutkan nomor pesanan untuk takeaway; akun pelanggan tidak diwajibkan |
| Administrator platform | Mengelola konfigurasi paket dan operasional SaaS melalui akses istimewa yang dibatasi dan diaudit |

MVP beroperasi secara online melalui browser, dengan target perangkat kasir komputer Windows dan tablet Android. MVP mencakup menu, transaksi tunai dan Dynamic QRIS yang memenuhi syarat, struk, sesi kas, meja, satu antrean dapur, penyajian, takeaway, pengecualian terkontrol, serta dashboard penjualan dasar. Inventori otomatis, resep/HPP, CRM/loyalitas, multi-outlet, dan operasional offline berada di luar MVP.

**Status dokumen:** Acuan bisnis tetap PRD v1.1 yang telah disetujui, termasuk keputusan arsitektur A1–A8. AI untuk membaca foto menu cetak dan desain premium Emerald merupakan usulan. Keduanya belum otomatis masuk MVP atau paket langganan tertentu. Rincian yang belum disepakati tetap ditandai TBD.

**Catatan sumber:** File blueprint REVISED yang disebut pada chat sebelumnya belum tersedia. Materi AI tambahan direkonstruksi dari ringkasan chat dan ditandai sebagai usulan, bukan diklaim sebagai salinan lengkap file tersebut. Isi utama ditulis dalam bahasa Indonesia mengikuti contoh; rincian teknis berbahasa Inggris dari konsolidasi sebelumnya dipertahankan pada bagian yang dapat dibuka di setiap bab. Nomor rujukan rinci seperti 2.3 dan ID persyaratan tetap mengacu ke rincian tersebut.

Keberhasilan produk akan diukur melalui penyelesaian onboarding, transaksi pertama, ketepatan pengiriman pesanan ke dapur, rekonsiliasi pembayaran, waktu penyelesaian pesanan, penutupan sesi kas, dan aktivasi langganan. Target angka belum ditentukan. Sistem cloud tetap memerlukan backup dan pengujian pemulihan; dokumen ini tidak menjanjikan data mustahil hilang.

<details>
<summary>Rincian referensi: visi, sumber, metrik, dan pemetaan dokumen</summary>

### 1.1 Executive Summary

#### 1.1.1 Vision

MejaFlow is a responsive, browser-based, online-only point-of-sale (POS) software-as-a-service (SaaS) product for small and medium-sized restaurants and cafés in Indonesia. Its purpose is to simplify counter service, dine-in table operations, takeaway fulfillment, kitchen preparation, customer payments, cashier reconciliation, and owner-level reporting without requiring restaurant teams to manage complex technical setups.

Multiple independent restaurant businesses may self-register and operate isolated workspaces. **Free** replaces Starter as a permanent Rp0 tier, providing basic cash takeaway POS without dine-in table ordering or Dynamic QRIS. **Professional** and **Business** remain paid monthly/annual subscriptions with a 30-day trial beginning at MejaFlow registration; the trial exposes implemented Business-tier features **except** that table ordering remains locked until verified Midtrans merchant onboarding and QRIS remains locked until both verified merchant onboarding and production QRIS activation. Cash takeaway checkout remains usable during merchant onboarding. MejaFlow SaaS recurring-billing authorisation is separate from restaurant Midtrans merchant activation. The trial clock is not paused by merchant onboarding.

#### 1.1.2 Key product invariants

1. **Payment before kitchen:** Neither dine-in nor takeaway orders enter the Kitchen Display System (KDS) until that specific order's full payment has been confirmed. Cash is explicitly confirmed by a cashier; Dynamic QRIS is confirmed through verified payment-provider evidence. Dispatch is idempotent.
2. **Independent orders, not split bills:** Multiple independent orders may reference the same table. Each has its own order number, checkout, payment, receipt, preparation history, and completion. **There is no split-bill functionality in the MVP.** This is the authoritative revised Q64 decision; the earlier item-based-splitting decision is superseded.
3. **One payment method per normal order:** A normal checkout is paid in full using either cash or verified Dynamic QRIS; no mixed-method or partial normal payments. Authorised post-payment exception adjustments are distinct linked transactions, not normal split payments.
4. **No saved unpaid drafts:** An uncommitted cart is checked out immediately or discarded. Once a QRIS payment is initiated, its pending-payment record must persist to enable safe recovery and reconciliation; this is not a reusable draft order.
5. **Kitchen and serving milestones are separate:** The kitchen manually accepts a New order with **Start Preparing**, updates item readiness (individually or **Mark All as Ready**), and waitstaff confirm individual items or **Mark All as Served**. Dine-in order completion occurs when all applicable items are served.
6. **Automatically derived table availability:** A dine-in table becomes occupied when an order is created; it is released automatically when all associated active orders are completed. This can show Available while guests remain seated after service; this acknowledged operational risk is not silently overridden by a different workflow.
7. **Controlled paid-order exceptions:** Normal cancellation/editing after payment is prohibited. Authorised staff may request exceptional reversals or replacements; only managers/owners approve, including self-approval with authentication and audit. Affected unserved items are held pending decision.
8. **Merchant isolation:** All restaurant business data, users, financial records, orders, and reports are tenant-scoped; the platform administrator's cross-tenant access must be limited, privileged, and audited.
9. **Six-phase roadmap retained:** The 16 original modules remain in Phases 0–5. Explicitly approved changes move selected payments, subscription features, printing, and a basic sales dashboard into the MVP; they do not erase the later roadmap.
10. **v1.1 access gates:** Permanent Free always permits cash takeaway checkout but never table ordering or QRIS. Paid trials allow cash takeaway before Midtrans activation; merchant verification gates table ordering, while verified production QRIS activation additionally gates QRIS. Neither permission is granted merely because an owner created a Midtrans login.

#### 1.1.3 Intended outcomes

- Owners can register, configure, subscribe, and operate a small food business without manual vendor setup, except where third-party payment activation requires it.
- Cashiers can process complete payments and issue thermal or digital receipts with clear transaction records.
- Waitstaff can handle independent dine-in orders linked to a table and confirm serving.
- Kitchen staff can see one shared paid-order queue and manage item readiness.
- Owners/managers can see a basic sales dashboard and cashier cash discrepancies.
- Exceptions and refunds remain traceable and permission-controlled.

**Success metrics to define before production:** onboarding completion rate; first successful checkout; payment-to-KDS dispatch latency; QRIS reconciliation success; duplicate-charge/duplicate-dispatch rate; order completion time; cash-session closure rate; subscription activation/renewal; uptime. Numeric targets are **TBD**.

### 1.2 Source authority, completeness and status

This is an eight-section reorganisation of the approved MejaFlow POS PRD v1.1, supplemented by the available UI/technical blueprint and clearly identified proposals. It is a documentation draft, not a new approval of scope or a claim that the product is deployed.

| Source | Role | Recovery status |
|---|---|---|
| Approved PRD v1.1, Approved Plan & Onboarding Revision, 6 November 2026 | Authoritative product requirements, Q1–Q75, A1–A8, FR/NFR/AC/INV, TBDs and change log | Read from the user's local KASIRBOY docs/PRD_v1.1_REFERENCE.md; all 19 source sections mapped below |
| MejaFlow_PRD_UI_Technical_Blueprint.md, 1.2 draft extension, 8 November 2026 | Proposed feature catalogue, UX, APIs, model and delivery ideas | Read from Downloads; also present in open repository PR #1 |
| MejaFlow_PRD_UI_Technical_Blueprint_REVISED.md | Requested revised technical source | Unavailable: referenced chat exposes a sandbox download link only; user confirmed no accessible location. Exact revised wording and any unexposed detail cannot be verified |
| Referenced chat, Create PRD UI Guide | Evidence of the intended AI scanner extension | Recovered summary: multi-photo upload, review/correction/publish, Emerald UI, React/TypeScript/Tailwind/custom shadcn/ui, provider-independent vision, validated JSON, drafts, duplicates, audit, tenant isolation, backend keys, idempotent publishing, cost controls, failure/mobile tests |
| wildantrf/kasirboy master, ec723bc9b2f4207812e1ef3a3274ff09b005be59 | Repository context only | Root README describes an older Next.js/SQLite local simulation. No docs/ directory on master; open PR #1 adds two original documents |

**Precedence:** explicit approved v1.1 changes and A1–A8 override earlier generic text and the draft blueprint. Confirmed MVP, later confirmed roadmap intent, proposed implementation, reconstructed proposal and unresolved TBD are different statuses. Premium Emerald styling and AI printed-menu import are proposed, not automatic MVP commitments or paid-plan entitlements.

The older local simulation has finished-item stock reservations and a different ordering/KDS convention. Those are implementation observations, not authority to override v1.1 manual availability, payment-sequenced FIFO, bulk Ready controls, serving and strict pickup requirements. This rewrite does not audit or alter application code. It does not copy the older v1.0 simulation PRD into the approved product baseline.

The original blueprint's next-deliverable question is resolved for this task: a comprehensive Markdown PRD only. Reference-inspired ideas and draft wording concerning offline operation, inventory, manager-reviewed shift closing, kitchen printing and an alternative server stack do not reopen approved v1.1 rules; the no-split-bill decision remains confirmed. Missing revised-file content remains an explicit source limitation.

### 1.3 Blueprint product vision and outcomes — proposed extension

An Indonesia-first, mobile-friendly restaurant operating system connecting POS, dine-in tables, kitchen operations, ingredient stock, recipe costing, cash reconciliation, customer promotions, reporting, and optional AI assistance. It should be usable by small F&B merchants and scale to multi-outlet operations.

**Core outcomes:** shorter checkout time; fewer lost kitchen instructions; accurate cash and stock records; visible gross margin; actionable owner reporting; simple onboarding.

**Primary personas:** Owner (business and financial oversight); outlet manager (operations, stock, shifts); cashier (orders, payments, refunds); kitchen staff (KDS tickets); service staff (tables); accountant (reconciliation/reporting); multi-outlet admin (cross-outlet controls).

**Supported surfaces (proposed):** responsive web/PWA for cashier and owner; tablet-optimised kitchen display; mobile browser owner dashboard. Native Android/iOS apps are future options, **not promised**. Offline-first POS is a reference feature requiring separate technical validation; it is **not part of the confirmed v1.1 contract** unless separately approved.

### 1.4 Success measures, analytics and reference interpretation — proposed extension

**Merchant metrics:** activation rate (first successful cash sale), time to first sale, 7/30-day active outlets, orders/outlet/day, checkout completion, KDS preparation time, stockout frequency, cash variance, reporting usage, paid conversion, merchant onboarding completion.

**Events:** `business_created`, `menu_item_created`, `shift_opened`, `order_created`, `cash_payment_confirmed`, `qris_payment_verified`, `kitchen_ticket_ready`, `shift_closed`, `stock_adjusted`, `ai_draft_reviewed`, `feature_gate_blocked`. Avoid recording personal/payment secrets in analytics.

Stockout frequency and stock_adjusted events apply only to a future inventory release. AI events apply only if that proposal is approved. No numeric success targets are approved; assign targets before the relevant release.

**Cover:** AI-enabled restaurant POS positioning, multi-device dashboard, offline-first claim. **Page 1:** POS, modifiers, table layout, QR ordering, payment, receipt, open bill. **Page 2:** KDS, recipe/HPP, AI insights, menu engineering. **Page 3:** shift/cash book, ingredient inventory, promos/loyalty, reports. **Page 4:** multi-outlet, AI menu-photo import, cross-device sync, four-step onboarding. These are **feature ideas**, not a validated implementation specification or license to reuse proprietary visual elements.

The underlying five reference images were not re-inspected in this task. This description is retained from the available blueprint. Reference screenshots do not establish provider capabilities, implementation completeness, a right to reuse assets, or MVP scope.

### 1.5 Source-to-outline traceability

| Approved v1.1 source section | Location in this document |
|---|---|
| 1. Executive Summary | 1.1 |
| 2. Document Conventions, Scope and Definitions | 2.1 |
| 3. Users, Personas and Permission Model | 2.2 |
| 4. SaaS Registration, Subscriptions and Billing | 2.3 |
| 5. Functional Requirements by Original Roadmap Module | 3.1 |
| 6. Detailed Cross-Module Workflows | 4.1 |
| 7. State Models and Invariants | 4.2 |
| 8. Conceptual Data Model | 6.1 |
| 9. Integration Contracts and External Dependencies | 5.2 |
| 10. Non-Functional Requirements | 2.4 |
| 11. User Stories and Testable Acceptance Criteria | 2.5 |
| 12. MVP Release Gates and Definition of Done | 8.1 |
| 13. Six-Phase Implementation Roadmap and Dependencies | 8.2 |
| 14. Risks and Mitigations | 8.3 |
| 15. Open Decisions and Validation Register (TBD) | 2.6 |
| 16. Discovery Decision Traceability — Q1 to Q75 | 2.7 |
| 17. PRD Baseline Approval and Change Control | 2.8 |
| 18. Stage 2 Architecture Baseline A1–A8 (confirmed, retained in v1.1) | 5.1 |
| 19. Approved v1.1 Change Log and Supersession Register | 2.9 |

All FR, NFR, AC, INV, TBD, WF, Q and CHG identifiers retain their meanings. Section references and heading numbers are updated for this outline. Blueprint sections are distributed as follows: 1/13/15 → Overview; 2/6/12/14 → Requirements; 3/5 → Core Features; 4 → User Flow; 9/10 → Architecture; 8 → Database Schema; 7 → Tech Stack and Deployment; 11 → Deployment. The corrected details below explicitly supersede conflicting proposal wording.

</details>

## 2. Requirements

### Kebutuhan penggunaan dan operasional

- **Kemudahan Penggunaan (Usability):** Antarmuka harus jelas bagi staf dengan pengalaman teknologi yang beragam. Informasi menu, total pembayaran, nomor pesanan, status, dan tindakan berikutnya harus mudah ditemukan. Sediakan status memuat, kosong, gagal, terputus, dan akses ditolak; target aksesibilitas akhir tetap TBD.
- **Pencatatan Cepat:** Kasir dapat mencari atau memilih produk, menentukan jumlah, varian/modifier, dan catatan, lalu meninjau total sebelum membayar. Jumlah klik dan target waktu transaksi belum ditetapkan; keduanya perlu divalidasi melalui uji pengguna.
- **Pembayaran Sebelum Dapur:** Setiap pesanan normal harus dibayar penuh melalui satu metode, yaitu tunai atau Dynamic QRIS terverifikasi. Tidak ada split bill, gabungan metode, atau pembayaran sebagian dalam checkout normal. Sistem mencegah transaksi dan tiket dapur ganda ketika permintaan diulang.
- **Tidak Ada Draft Pesanan Belum Bayar:** Keranjang biasa harus langsung dibayar atau dibuang. Percobaan QRIS yang sudah dimulai harus disimpan untuk pemulihan dan rekonsiliasi; catatan ini bukan fitur simpan draft umum.
- **Ketersediaan Menu Manual:** Staf mengubah produk menjadi Available atau Sold Out. Produk Sold Out tidak dapat ditambahkan ke keranjang baru. Pengurangan stok otomatis, bahan baku, resep, dan peringatan stok rendah bukan kebutuhan MVP.
- **Operasional Online:** Checkout dan perubahan operasional memerlukan koneksi. Gangguan koneksi harus menghasilkan status yang jujur dan pemulihan yang aman; aplikasi tidak boleh mengarang konfirmasi pembayaran.

### Paket, trial, dan aktivasi merchant

- **Free:** Rp0 tanpa batas waktu, tanpa trial dan tanpa metode pembayaran SaaS berulang. Mendukung kasir takeaway tunai dan fungsi Free yang berhak digunakan. Tidak mendukung pemesanan meja atau QRIS, walaupun merchant sudah terverifikasi. Batas staf/transaksi dan cakupan KDS Free masih TBD.
- **Professional dan Business:** Paket berbayar bulanan atau tahunan. Harga IDR masing-masing periode diatur administrator platform; nominal, batas staf, dan matriks fitur lengkap masih TBD. Volume transaksi selesai pada paket berbayar tidak dibatasi, dengan pengendalian penyalahgunaan yang wajar.
- **Trial 30 Hari:** Dimulai saat pendaftaran Professional/Business, dengan otorisasi metode penagihan berulang yang memenuhi syarat dan persetujuan eksplisit. Trial membuka fitur Business yang sudah diimplementasikan, tetapi tetap tunduk pada aktivasi merchant dan QRIS. Penundaan onboarding merchant tidak menghentikan atau memperpanjang trial.
- **Tunai Tetap Tersedia:** Free dan akun berbayar dengan akses trial/aktif/grace yang sah dapat menjalankan takeaway tunai meskipun onboarding Midtrans belum dimulai, tertunda, atau ditolak. Trial berbayar tetap mendapat KDS takeaway sesuai hak trial. Jika KDS penuh tidak diberikan pada Free, alur pemenuhan takeaway yang sesuai tetap harus tersedia.
- **Gerbang Meja dan QRIS Terpisah:** Pesanan meja memerlukan paket berbayar yang berhak dan onboarding merchant yang terverifikasi. QRIS memerlukan tambahan aktivasi kanal QRIS produksi. Akun sandbox, ID merchant yang diketik sendiri, atau formulir yang baru dikirim bukan bukti aktivasi.
- **Grace dan Pembatalan:** Kegagalan tagihan berbayar memulai grace tujuh hari. Jika tidak pulih, akun menjadi read-only. Pembatalan menghentikan perpanjangan berikutnya, tetapi akses berbayar bertahan sampai paid-through date, lalu read-only. Tidak ada perpindahan otomatis ke Free. Jendela pemulihan/akses data 30 hari setelah berakhir terpisah dari kewajiban retensi hukum.
- **Penagihan SaaS Terpisah:** Pembayaran langganan MejaFlow tidak sama dengan pembayaran pelanggan restoran. Penyedia/instrumen recurring billing serta kontrak, verifikasi, biaya, settlement, dan refund QRIS yang benar-benar didukung masih memerlukan konfirmasi. MejaFlow tidak boleh menampung seluruh dana penjualan restoran untuk diteruskan secara manual.

### Integritas, izin, dan keamanan

- **Pemisahan Bisnis:** Setiap pembacaan, perubahan, laporan, dan event diperiksa berdasarkan bisnis, keanggotaan, peran, hak paket, serta kepemilikan data. Menyembunyikan tombol saja tidak cukup.
- **Perhitungan di Server:** Server menentukan harga, varian/modifier, diskon yang berlaku, pajak, service charge, dan total. Aturan pembulatan, dasar pajak, urutan perhitungan, serta definisi penjualan gross/net yang belum disepakati tetap TBD. Riwayat transaksi menyimpan snapshot nilai saat transaksi.
- **Persetujuan Pengecualian:** Hanya manajer/pemilik yang menyetujui pengecualian dan refund, melalui PIN pribadi atau dashboard terautentikasi. Persetujuan harus eksplisit, diverifikasi server, dan diaudit. Self-approval manajer/pemilik diperbolehkan dengan autentikasi ulang dan catatan.
- **Riwayat Tidak Ditimpa:** Transaksi lunas, pembayaran, koreksi, refund, dan penutupan kas harus dapat ditelusuri. Persetujuan refund tidak berarti dana telah dikembalikan; keberhasilan finansial memerlukan bukti hasil yang sesuai.
- **Keamanan dan Pemulihan:** Lindungi kredensial, rahasiakan API key di backend, batasi percobaan autentikasi/PIN, minimalkan data pribadi, serta sediakan log, backup, dan uji pemulihan. Target uptime, latensi, kapasitas, RPO/RTO, dan retensi belum ditetapkan.

### Kriteria penerimaan dan keputusan terbuka

Pengujian harus mencakup Free tanpa mandat pembayaran; trial dengan merchant pending; merchant terverifikasi tetapi QRIS belum aktif; percobaan bypass UI/API; pembayaran ganda dan callback terlambat; pemulihan QRIS pending; pesanan independen pada satu meja; status item dapur/penyajian; hold dan persetujuan pengecualian; nomor takeaway yang salah; selisih kas; serta kebocoran antar-bisnis. Seluruh AC-001–AC-050 dan ID FR/NFR/INV dari v1.1 tetap berlaku.

Register TBD-01–TBD-23 tetap dipertahankan lengkap pada rincian. Kelompok keputusan terbuka meliputi harga dan batas paket; hak KDS Free; gateway recurring; kontrak/verifikasi merchant; expiry/refund/biaya QRIS; printer; perhitungan pajak dan laporan; privasi/retensi; target operasional; perpindahan meja; gangguan pembayaran; pergerakan kas tambahan; serta perpindahan paket berbayar ke Free. Arsitektur A1–A8 sudah dipilih; validasi operasionalnya tetap terbuka.

<details>
<summary>Rincian referensi: persyaratan, izin, paket, kriteria penerimaan, keputusan, dan TBD</summary>

### 2.1 Document Conventions, Scope and Definitions

#### 2.1.1 Requirement conventions

- **MUST**: binding implementation requirement from confirmed discovery or a necessary invariant.
- **SHOULD / proposed**: engineering recommendation; requires product/technical validation if it changes external behaviour.
- **MVP**: essential production release drawn principally from Phases 0–2, plus expressly accelerated capabilities.
- **Future**: roadmapped capabilities not required for MVP.
- **TBD**: unresolved amount, quota, legal judgment, compatibility test, provider contract, or final technical choice.

Every testable requirement uses an identifier (`FR-...`, `NFR-...`, or `AC-...`) for backlog and QA traceability. IDs are identifiers for this PRD, not claims that implementation exists.

#### 2.1.2 In scope for MVP

- Online web POS and tenant-isolated SaaS registration.
- Owner-directed business configuration, taxation/service charges, roles, and basic audit history.
- Registration for permanent Free (Rp0, no payment mandate), or Professional/Business with selected paid tier, 30-day trial, SaaS recurring-payment authorisation, tier entitlements, renewal/grace/read-only/recovery handling and configurable paid pricing, **subject to supported subscription provider capabilities**.
- Menu, variants/modifiers, prices, manually controlled availability, search and item-level order notes.
- Cash takeaway checkout on Free and paid plans, including paid-plan trials while Midtrans onboarding is pending. Dynamic QRIS checkout, pending-QRIS recovery and QRIS refunds require verified production QRIS activation; table ordering additionally requires verified merchant onboarding. All approved financial exception controls remain.
- Thermal receipt layouts for 58mm and 80mm, digital receipt view/download/PDF; browser/OS printing with optional supported print bridges/Android printing companion.
- Independent dine-in orders under the same table; automatic occupancy; no split bills.
- One shared KDS, manual acceptance, item-level preparation, FIFO/manual priority, visual+sound incoming alerts, and item-level serving.
- Takeaway collection queue, visual ready notification, strict order-number matching, manual handover.
- Cashier sessions with opening/closing physical cash counts and discrepancies.
- Basic sales dashboard: daily/monthly, payment breakdown, transaction count, best sellers, date filters.

#### 2.1.3 Explicitly out of MVP

- Split bills of any kind (equal, by item, by quantity, shared cost), mixed/partial normal payments, and saved unpaid drafts.
- Offline POS operations or offline-first sync/checkout.
- Multiple KDS preparation stations and kitchen ticket printing.
- Automatic ingredient or finished-product stock tracking, recipes, inventory ledger, low-stock alerts.
- Mandatory customer registration or separate pickup codes; takeaway number recovery or manager override for pickup.
- Sophisticated analytics and inventory, CRM, advanced employee management, multi-outlet operation, and future integrations not expressly brought forward.
- Unverified QRIS providers or independent card/e-wallet/bank-API acceptance beyond payment through supported Dynamic QRIS scanning apps.

#### 2.1.4 Definitions

| Term | Meaning in MejaFlow |
|---|---|
| Business / tenant | An independent restaurant/café workspace, on permanent Free or an entitled paid subscription, with isolated data. |
| Outlet | Business location profile in MVP; true multi-outlet management belongs to Phase 5. |
| POS order | A separate transaction with unique order number, items, order type, payment and fulfillment states. |
| QRIS attempt | A provider-linked Dynamic QRIS payment attempt whose outcome may initially be pending. |
| Confirmed payment | Cash explicitly accepted/recorded by authorised cashier, or QRIS success verified by trusted server-side provider evidence. |
| KDS | Browser-based single shared kitchen queue; not a kitchen ticket printer. |
| Served | Waitstaff-confirmed item delivery to the dine-in customer. |
| Handed Over | Cashier/waitstaff-confirmed transfer of Ready takeaway food to customer. |
| Exception | Privileged change to a paid order via linked reversal/replacement/financial records, not normal paid-order editing. |
| Subscription read-only | Expired/lapsed paid subscription: business may access historical records, permitted exports and billing recovery, but cannot start new POS transactions or perform normal operational mutations; this state does **not** apply to active permanent Free tenants. |

### 2.2 Users, Personas and Permission Model

#### 2.2.1 Personas

| Actor | Primary goals | Main MVP areas |
|---|---|---|
| Platform administrator | Configure subscription plans/prices, monitor SaaS operations, handle supported tenant and billing administration | SaaS administration, entitlements, audit |
| Business owner | Register, subscribe, configure taxes/receipts/menu, review financials, approve exceptions | Business settings, plans, employees, dashboard |
| Manager | Supervise operations, approve refunds/exceptions, review sessions and KDS priorities | Operations, approvals, reporting |
| Cashier | Take payments, issue receipts, manage cash drawer, handle takeaway collection, request exceptions | Checkout, cashier session, pickup queue |
| Waitstaff | Open dine-in orders, confirm serving, hand over takeaway, request exceptions | Tables, order/service screens |
| Kitchen staff | Accept paid orders, update item preparation, reprioritise KDS, raise exceptions | KDS |
| End customer | Pay and receive ordered food and receipt, present takeaway number | No customer login required for MVP |

#### 2.2.2 Baseline permission matrix

| Action | Owner | Manager | Cashier | Waitstaff | Kitchen |
|---|---:|---:|---:|---:|---:|
| Configure tax/service charges | Yes | TBD delegation | No | No | No |
| Create checkout/order | Yes | Yes | Yes | Yes (role-authorised) | No by default |
| Confirm cash payment | Yes | Yes | Yes | TBD role rule | No |
| Verify/recover pending QRIS status | Yes | Yes | Yes | No by default | No |
| Start Preparing / update Ready | Yes if authorised | Yes if authorised | No | No | Yes |
| Change KDS priority | Yes | Yes | No | No | Yes |
| Mark dine-in items Served | Yes if authorised | Yes if authorised | No by default | Yes | No |
| Mark takeaway Handed Over | Yes if authorised | Yes if authorised | Yes | Yes | No |
| Initiate paid-order exception | Yes | Yes | Yes | Yes | Yes |
| Approve paid-order exception/refund | Yes | Yes | No | No | No |
| View business financial dashboard | Yes | Yes if authorised | Restricted | Restricted | No |
| Change subscription prices | **Platform admin only** | No | No | No | No |

**Note:** “Yes if authorised” and “TBD delegation” avoid assuming advanced configurable role features have already been delivered. Basic safe role permissions are MVP; advanced RBAC configuration remains Phase 4. Approval is server-verified, not UI-only. Cashier refund requests must be approved by a manager or owner (Q36–Q37). Managers/owners may approve their own requests (Q55) with explicit reauthentication and full audit.

#### 2.2.3 Security requirements for roles

- `FR-SEC-001`: Server checks tenant, effective plan or paid-trial entitlement, verified merchant onboarding, QRIS channel activation, role/permission and resource ownership for every protected operation. Free is a valid enduring plan; merchant flags are independent from subscription flags.
- `FR-SEC-002`: Approval accepts either an authorised personal manager PIN on a shared cashier device or a separately authenticated manager/owner dashboard action; passwords/PINs must never be stored in plaintext.
- `FR-SEC-003`: Approval requires explicit user action; it must not be implied by being logged in as manager or creating the request.
- `FR-SEC-004`: Audit records contain actor, tenant, order/reference, previous/new state, reason where required, timestamp and authentication/approval outcome.
- `FR-SEC-005`: Rate-limit approval PIN attempts and security-sensitive endpoints.

### 2.3 SaaS Registration, Subscriptions and Billing

#### 2.3.1 Business registration and trial

- `FR-SUB-001`: A new owner can self-register, create an isolated business workspace, and supply necessary business/outlet information.
- `FR-SUB-002` **[revised v1.1]**: Registration offers **Free (Rp0 forever)**, **Professional** and **Business**. Free requires no recurring SaaS payment method and has no 30-day expiry. Professional/Business registration requires an eligible recurring SaaS payment method and explicit post-trial charge consent, separately from restaurant Midtrans merchant registration.
- `FR-SUB-003` **[revised v1.1]**: For paid Professional/Business registration, clearly disclose paid price, billing frequency, 30-day trial, first potential charge date and automatic renewal; obtain explicit eligible payment-method authorisation and consent. Free registration displays Rp0 and no automatic renewal or payment mandate. Do not silently enrol.
- `FR-SUB-004` **[revised v1.1]**: A 30-day trial starts immediately on **Professional/Business** MejaFlow registration. Trial grants all *currently implemented* Business-tier features **subject to mandatory merchant gates**: cash takeaway works throughout; table ordering remains disabled until verified Midtrans merchant onboarding, and Dynamic QRIS remains disabled until both verified onboarding and QRIS production activation. Midtrans delays do not pause/extend the 30-day clock. Free has no trial and no expiration.
- `FR-SUB-005`: A paid trial owner may change the selected post-trial Professional/Business plan during trial; where amount/timing changes, updated disclosure and payment consent are required. Free-to-paid upgrading is supported as a separately authorised plan selection; paid-to-Free migration policy is TBD, not an automatic cancellation outcome.
- `FR-SUB-006` **[revised v1.1]**: Restaurant Midtrans merchant onboarding is independent of MejaFlow SaaS subscription authorisation. **All eligible tenants, including paid trial tenants, may operate cash takeaway** while Midtrans onboarding is pending, rejected or unavailable. For paid tiers, table ordering requires *verified Midtrans merchant onboarding*, while QRIS requires verified merchant onboarding **and** active production QRIS. Free has no table ordering or QRIS even if the owner independently registers with Midtrans.

#### 2.3.2 Subscription entitlement and pricing

- `FR-SUB-007` **[revised v1.1]**: **Free** replaces Starter at **Rp0 with no expiration and no recurring billing**. **Professional** and **Business** are the only paid tiers. Free includes eligible basic menu and cash takeaway POS with no table ordering or QRIS. Paid tiers differ by feature entitlements and employee account caps; completed customer transaction volume remains unlimited for paid tiers, subject to ordinary abuse/fair-use controls. Free transaction and employee caps remain TBD; do not invent them.
- `FR-SUB-008` **[revised v1.1]**: Free is fixed at **Rp0** with no monthly or annual charge. The platform administrator independently configures **monthly and annual IDR prices for Professional and Business** without code changes; annual prices need not use a discount formula.
- `FR-SUB-009`: Prices, annual savings (when any), billing frequency and upcoming charge disclosures must reflect the actual configured plan price.
- `FR-SUB-010`: Enforce employee-account caps at the **tenant** level; prevent creation/activation of additional employees beyond allowance. Do not delete existing accounts automatically on downgrade; safe downgrade behaviour is **TBD** (see Section 2.8).
- `FR-SUB-011` **[revised v1.1]**: Free offers basic menu, cash takeaway and eligible receipts but **no table ordering and no Dynamic QRIS**. Professional adds eligible tables, KDS and QRIS subject to verified merchant/QRIS gates; Business adds other implemented premium features. During Professional/Business trial, implemented Business features are provisionally entitled, but table ordering/QRIS activation gates still apply. The final Free KDS entitlement, complete feature-by-tier matrix and employee limits are **TBD**; Free cash takeaway must remain operable regardless of full KDS entitlement.
- `FR-SUB-012`: Any change in pricing that affects an existing subscriber must follow the configured billing terms, applicable law and clear renewal-price notice. Exact grandfathering/proration policies are **TBD**.

#### 2.3.3 Subscription lifecycle

**v1.1 access control precedence:** (1) session, tenant membership and role; (2) plan/subscription validity (Free always active, Professional/Business trial/paid/grace/read-only); (3) feature entitlement; (4) restaurant Midtrans merchant verification for table ordering; (5) additionally production QRIS activation for QRIS checkout. Cash takeaway is **not** gated by merchant status when the tenant has valid Free or paid/trial/grace access.


| State / event | Required behaviour |
|---|---|
| Paid trial active | Professional/Business trial: implemented Business-tier entitlements, but cash takeaway is available and table ordering/QRIS remain gated on verified Midtrans states; next paid tier and charge are displayed. |
| Free active | Rp0 indefinitely; basic cash takeaway and eligible Free features; no trial, recurring charge, table ordering or QRIS. |
| Trial completes; charge succeeds | Convert to selected paid tier with corresponding entitlements. |
| Paid-plan recurring charge fails | Start **7-day grace period**, notify/remind and retry only as permitted by provider; retain selected paid plan entitlements subject to existing merchant feature gates. Free is unaffected. |
| Grace expires without recovery | Enter read-only: history, allowed exports and billing recovery remain; new orders and operational mutations blocked. |
| Paid-plan voluntary cancellation | Disable next renewal immediately; preserve paid access through paid-through date, then read-only under the existing policy. **Do not automatically convert to Free**; migration policy remains TBD. |
| Subscription ends | Provide **30-day recovery/data-access window** after end, subject to applicable legal record retention; never promise blanket deletion of regulated records after 30 days. |
| Reactivation or plan change | Restore appropriate entitlements only when billing status is verified; detailed proration/reinstatement rules TBD. |

- `FR-SUB-013`: Billing-provider webhook/reconciliation events are authenticated, idempotent and traceable.
- `FR-SUB-014`: When in read-only, allow only explicit permitted read/export/billing operations; block ordinary POS, order, menu, table and other operational mutations.
- `FR-SUB-015`: Business cannot bypass subscription entitlements by issuing a request directly to the server API.

**Integration dependency:** Revised Q7–Q8 require an eligible SaaS recurring method **only for Professional/Business trial registration**. Free signup requires none. A6 already confirms MejaFlow-managed renewal scheduling using an approved gateway's tokenised charges; the **specific SaaS provider/instruments remain TBD**. Do not assume restaurant Midtrans QRIS onboarding and SaaS subscription billing are the same merchant agreement.

#### 2.3.4 Product and merchant entitlement matrix — approved v1.1

| Capability | Free, any merchant status | Paid trial/active/grace, Midtrans pending or rejected | Paid trial/active/grace, merchant verified but QRIS inactive | Paid trial/active/grace, merchant verified and QRIS active | Paid expired/read-only |
|---|---|---|---|---|---|
| Menu and business setup | Yes, within Free role/plan allowances | Yes | Yes | Yes | Read-only |
| Cash takeaway checkout | **Yes** | **Yes** | **Yes** | **Yes** | No new transactions |
| Takeaway receipt and supported fulfillment | **Yes** | **Yes** | **Yes** | **Yes** | Historical only |
| Dine-in table ordering | **No** | **No** | **Yes, if entitled** | **Yes, if entitled** | No |
| Dynamic QRIS | **No** | **No** | **No** | **Yes, if entitled** | No |
| Paid-order KDS | Free scope **TBD**; cash takeaway must remain workable | **Yes for cash takeaway during trial** when trial grants Business KDS | Yes, as entitled | Yes, as entitled | No new jobs |
| Subscription charges | None | Trial/paid billing applies as due | Trial/paid billing applies as due | Trial/paid billing applies as due | Recovery only |

The **Midtrans onboarding gate for table ordering** is separate from the **production QRIS activation gate** for QRIS payments. Verification is server-side and auditable; entering a Midtrans email, creating a sandbox account, or submitting onboarding documents is not sufficient. For Free, merchant status cannot unlock the two excluded features. Subscription state and merchant state are orthogonal: receiving a payment mandate for MejaFlow does **not** prove that a restaurant is enabled to accept customer QRIS payments.

#### 2.3.5 Additional testable requirements — v1.1

- `FR-SUB-016`: Free signup is successful without payment-method collection or Midtrans merchant registration; free access is perpetual unless otherwise affected by lawful account/security controls.
- `FR-SUB-017`: Owner choosing Professional/Business begins a 30-day trial at registration even if restaurant Midtrans merchant onboarding is not started/pending/rejected; existing SaaS recurring-method consent remains mandatory.
- `FR-SUB-018`: Free and valid paid trial/active/grace businesses may complete **cash takeaway** checkout regardless of merchant onboarding; paid-trial cash orders still reach the authorised takeaway KDS and pickup workflow where Business-trial KDS is entitled.
- `FR-SUB-019`: Free businesses cannot invoke table-order creation or QRIS payment operations by UI or direct API; blocked operations return an explicit feature-entitlement error.
- `FR-SUB-020`: Professional/Business table-order creation requires verified merchant onboarding, even during a paid trial; cash takeaway remains available if merchant onboarding is not verified.
- `FR-SUB-021`: Professional/Business QRIS requires both verified merchant onboarding and verified production QRIS activation; platform never trusts self-declared merchant status.
- `FR-SUB-022`: Midtrans status changes invalidate cached permission decisions and update impacted UI across connected devices; existing verified paid orders and immutable records remain accessible and reconcilable.
- `FR-SUB-023`: Trial and paid renewal dates are not suspended or extended automatically for merchant onboarding delays; prominently disclose this at paid signup and during onboarding.
- `FR-SUB-024`: Restaurant Midtrans onboarding state is verified via an authorised mechanism supported by the eventual provider partnership. The existence, automation and availability of that verification mechanism are **TBD** and not assumed.

### 2.4 Non-Functional Requirements

| ID | Requirement | Verification approach / unresolved target |
|---|---|---|
| NFR-001 | Browser-based responsive UI usable on Windows computers and Android tablets, including touch interactions | Device/browser matrix; exact minimum OS/browser versions TBD. |
| NFR-002 | Online-only POS; no unsupported offline checkout or offline KDS promise | Connectivity-loss test and clear blocked-action UX. |
| NFR-003 | Multi-tenant isolation on every record, query, event and report | Automated tenant A/B read/write negative tests. |
| NFR-004 | Server-side RBAC and subscription entitlement enforcement | API abuse/permission test matrix. |
| NFR-005 | Encrypt transport using current industry-standard TLS; protect stored credentials/secrets | Security review; exact cloud/key design TBD. |
| NFR-006 | Rate-limit authentication/PIN and security-sensitive operations; monitor abuse | Negative/rate-limit testing; thresholds TBD. |
| NFR-007 | No duplicate POS charge/KDS dispatch from retries or repeated callbacks | Concurrency and idempotency integration tests. |
| NFR-008 | Preserve immutable/auditable payments, refunds, exceptions, approvals and cash session closings | Data integrity tests and audit replay. |
| NFR-009 | Real-time status/notification updates with reliable recovery after disconnect | Reconnect, missed-event reconciliation tests; latency SLO TBD. |
| NFR-010 | Durable backup, restore, business continuity and disaster recovery procedures | Restore drill; RPO/RTO TBD. |
| NFR-011 | Accessibility, legible typography, touch target sizes and keyboard alternatives | Accessibility standard/target TBD; manual and automated checks. |
| NFR-012 | Secure operational logs that do not expose payment credentials, sensitive PINs or personal data | Secret scanning and redaction tests. |
| NFR-013 | Timezone-accurate daily/monthly reports and correctly rounded monetary values | Cross-day boundary and money reconciliation tests; financial policy TBD. |
| NFR-014 | Subscription and merchant integration fault isolation: external provider issue must not corrupt local order history | Fault-injection and degraded-mode tests. |
| NFR-015 | Consistent receipt rendering on tested 58mm and 80mm printer paths; digital receipts downloadable | Printer acceptance matrix and layout tests. |
| NFR-016 | Compliance with applicable Indonesian privacy, consumer, tax and records rules after legal review | Legal/security signoff; jurisdiction-specific details TBD. |

**Target-setting policy:** Do not invent uptime, latency, throughput, RPO/RTO, encryption-retention periods or concurrent-user figures. Product and engineering owners must assign measurable targets before production launch.

### 2.5 User Stories and Testable Acceptance Criteria

The following scenarios are minimum acceptance tests. The implementation team should add negative cases, permission variants and provider-specific sandbox tests for every workflow.

| AC ID | User story / test setup | Acceptance criterion (Given / When / Then) |
|---|---|---|
| AC-001 **[v1.1]** | Self-service owner registration | **Given** a new owner, **when** Free is chosen, **then** an isolated perpetual Rp0 workspace is created without billing mandate; **when** Professional/Business is chosen with supported SaaS consent, **then** a 30-day trial starts immediately even if Midtrans merchant onboarding is pending. |
| AC-002 **[v1.1]** | Paid trial entitlements | **Given** Professional/Business registration on day 1, **when** opening an implemented Business-tier feature, **then** trial entitlement applies **except** table ordering/QRIS merchant gates; paid-trial cash takeaway and authorised KDS remain functional even when Midtrans is pending. |
| AC-003 | Trial plan change | **Given** an active trial, **when** owner changes selected paid tier, **then** updated next-charge terms/consent are captured before selection takes effect. |
| AC-004 | Failed **paid-plan** renewal | **Given** confirmed failed Professional/Business renewal, **when** grace begins, **then** selected plan remains usable for seven days subject to merchant gates and supported retries; permanent Free has no renewal or grace period. |
| AC-005 | Read-only after grace | **Given** unresolved failed renewal after grace, **when** cashier calls order-create API, **then** mutation is rejected; permitted history/export/billing recovery remains accessible. |
| AC-006 | Cancel subscription | **Given** active paid plan, **when** owner cancels renewal, **then** access continues until current paid-through date and next recurring charge is disabled through verified provider state. |
| AC-007 | Employee limit | **Given** a tenant at its configured plan seat limit, **when** owner creates/activates another employee, **then** server blocks it without affecting existing paid orders; paid completed transaction volume is not capped. Free cap remains to be configured/approved. |
| AC-008 | Tax applicability | **Given** different dine-in/takeaway charge settings, **when** same cart is priced as each order type, **then** only the respective enabled charges apply and appear on receipts. |
| AC-009 | Menu sold out | **Given** product marked Sold Out, **when** cashier attempts to add it to a new cart through UI or API, **then** order entry is blocked; historical paid orders retain prior item snapshot. |
| AC-010 **[v1.1]** | Cash order paid | **Given** active Free or valid paid trial/active/grace tenant, including Midtrans pending, **when** cashier confirms full cash takeaway, **then** one paid order and receipt exist; where entitled, exactly one KDS New job appears. Paid-trial Business KDS entitlement remains available. |
| AC-011 | Unpaid cart discarded | **Given** an uncommitted checkout, **when** cashier discards it, **then** no saved draft, paid transaction, KDS job or persistent ghost table occupancy remains. |
| AC-012 **[v1.1]** | Merchant QRIS inactive | **Given** Free or a paid tenant without verified merchant onboarding and active production QRIS, **when** cashier opens checkout, **then** Dynamic QRIS is unavailable and cash takeaway checkout remains usable. |
| AC-013 | QRIS pending | **Given** an initiated QRIS attempt without verified success, **when** any client refreshes or polls, **then** no KDS job is created. |
| AC-014 | Verified QRIS success | **Given** a valid server-verified success matching order/amount/reference, **when** callback repeats three times, **then** one confirmed payment and one KDS job exist. |
| AC-015 | QRIS interrupted checkout | **Given** pending QRIS with browser closed, **when** authorised cashier reopens pending-payment screen, **then** the original attempt and verified provider status can be recovered. |
| AC-016 | QRIS fallback safety | **Given** earlier attempt unresolved, **when** cashier tries cash fallback, **then** server blocks or reconciles it until duplicate-charge risk is resolved; no second unverified paid outcome is accepted. |
| AC-017 | Thermal/digital receipts | **Given** paid order, **when** cashier prints 58mm/80mm receipt or downloads digital receipt, **then** order number and correct snapshot amounts/payment/charges are present; printing failure cannot reverse payment. |
| AC-018 **[v1.1]** | Independent table orders | **Given** an entitled Professional/Business tenant with verified Midtrans merchant onboarding and Table 05 with paid Order A, **when** another purchase occurs, **then** Order B has distinct number/payment/KDS dispatch; no merged bill. On Free/unverified paid tenant table ordering is denied. |
| AC-019 | No split bill | **Given** a paid or checkout order, **when** operator attempts equal/item/quantity split via UI or API, **then** split functionality is unavailable/rejected in MVP. |
| AC-020 | Table release | **Given** two active dine-in orders on one table, **when** only one becomes Completed, **then** table remains Occupied; after all are Completed, table becomes Available. |
| AC-021 | KDS manual acceptance | **Given** paid order entering KDS, **when** no kitchen employee acts, **then** order stays New; only authorised Start Preparing transitions it to Preparing and records actor/time. |
| AC-022 | Item readiness | **Given** order with three eligible items, **when** kitchen marks two Ready, **then** order is not fully Ready; Mark All as Ready transitions remaining eligible item(s), making order Ready. |
| AC-023 | Manual priority | **Given** FIFO KDS orders, **when** authorised kitchen staff marks later order high priority, **then** it appears ahead of normal-priority orders; cashier attempting same change is rejected. |
| AC-024 | KDS alerts | **Given** new fully paid order, **when** it reaches KDS, **then** visual alert appears and sound plays where browser permits; blocked autoplay does not hide order. |
| AC-025 | Item service | **Given** dine-in order Ready, **when** waitstaff marks some but not all applicable items Served, **then** order is not Completed; Mark All as Served completes it. |
| AC-026 | Exception hold | **Given** paid order Preparing, **when** authorised staff requests replacement of one unserved item, **then** that item becomes On Hold while unaffected items remain actionable. |
| AC-027 | Exception pending | **Given** a Pending request, **when** time passes, **then** it is not automatically approved, rejected, escalated or timed out, and affected item remains On Hold. |
| AC-028 | Rejected exception | **Given** held item with prior state Preparing, **when** manager rejects request with authentication, **then** original Preparing state is restored, audit is created, and relevant staff see one-time visual result alert. |
| AC-029 | Self-approval | **Given** manager initiated an exception, **when** same manager explicitly approves using valid reauthentication and reason, **then** approval is permitted and logged; unauthorised cashier approval is rejected. |
| AC-030 | Higher-priced replacement | **Given** approved higher-priced replacement, **when** price difference is not confirmed paid, **then** replacement is not dispatched to KDS; after verified additional payment it is dispatched once. |
| AC-031 | Lower-priced replacement refund | **Given** approved lower-priced replacement, **when** provider refunds are unavailable, **then** refund remains marked pending/manual resolution until auditable external refund confirmation, not falsely successful. |
| AC-032 | New exception notification | **Given** new exception, **when** created, **then** manager/owner queue gains one entry and connected manager interfaces receive one-time visual notification, not recurring reminders. |
| AC-033 | Takeaway ready | **Given** takeaway with all applicable items Ready, **when** readiness is committed, **then** Ready for Pickup queue gains the order and cashier/waitstaff receive a one-time visual alert. |
| AC-034 | Strict pickup | **Given** Ready takeaway order, **when** customer gives no valid order number, **then** handover is blocked, even if customer name or receipt is offered as replacement. |
| AC-035 | Manual handover | **Given** Ready takeaway with correct number, **when** authorised cashier marks Handed Over twice from concurrent devices, **then** only one Completed transition and one audit entry are committed. |
| AC-036 | Cash discrepancy | **Given** actual closing cash differs from expected, **when** cashier submits closure without reason, **then** reject; with reason, allow closure without manager approval. |
| AC-037 | Cash/QRIS separation | **Given** one cash and one QRIS sale, **when** closing cashier session, **then** QRIS contributes to method reporting but not expected drawer cash. |
| AC-038 | Basic dashboard | **Given** verified transactions and authorised adjustments, **when** manager selects date range, **then** sales/count/method/best-seller views reflect tenant-scoped reconciled data. |
| AC-039 | Cross-tenant security | **Given** user in Tenant A, **when** requesting Tenant B's order, receipt, payment or dashboard by guessed ID, **then** access is denied and no Tenant B data leaks. |
| AC-040 **[v1.1]** | Subscription admin pricing | **Given** platform admin edits annual Business or Professional price, **when** saving valid IDR configuration, **then** catalogue updates without code deployment and paid signup discloses the correct amount; Free remains Rp0. |

#### 2.5.1 Additional v1.1 acceptance criteria (extension; original AC-001–AC-040 preserved)

| AC ID | Scenario | Acceptance outcome |
|---|---|---|
| AC-041 | Register Free without Midtrans or SaaS payment method | Permanent Free workspace active; no trial countdown or recurring invoice, cash takeaway enabled, tables/QRIS blocked. |
| AC-042 | Paid trial begins before Midtrans registration | Professional/Business trial starts at MejaFlow signup with approved SaaS mandate; cash takeaway available, tables/QRIS blocked while merchant pending. |
| AC-043 | Paid-trial cash takeaway KDS | A confirmed cash takeaway while Midtrans is pending appears in paid-trial entitled shared KDS once and follows Ready for Pickup/manual handover. |
| AC-044 | Midtrans merchant verified; QRIS inactive | Entitled paid business can open table ordering, but QRIS remains disabled until active in Production. |
| AC-045 | Production QRIS activation | Only paid entitled business with verified merchant onboarding and production QRIS active can initiate provider-linked Dynamic QRIS. |
| AC-046 | Free bypass attempt | Free user calling QRIS or table order APIs directly receives a controlled authorization failure; cash takeaway unaffected. |
| AC-047 | Paid onboarding still pending after day 30 | Trial ends on schedule, paid renewal/grace rule applies without Midtrans approval; merchant gates remain in force. |
| AC-048 | Merchant activation revoked | QRIS stops immediately, table ordering eligibility responds to current verification status, already-paid records are preserved and reconciled. |
| AC-049 | Paid cancellation | Paid subscription cancellation continues current paid access then follows existing read-only policy; no automatic downgrade to Free without a separate approved rule. |
| AC-050 | No provider status proof | A self-entered merchant ID, sandbox login, or submitted form does not unlock table ordering or QRIS. |

### 2.6 Open Decisions and Validation Register (TBD)

These items were **not** approved with numerical or provider-specific values in Q1–Q75. Assign responsible owners and close them through explicit decisions or integration evidence.

| TBD ID | Open issue | Required resolution / evidence |
|---|---|---|
| TBD-01 **[v1.1]** | Professional/Business **monthly IDR price** | Approved numeric amount for each paid tier; Free fixed at Rp0. |
| TBD-02 **[v1.1]** | Professional/Business **annual IDR price** | Approved independent numeric amount per paid tier; Free has no billing cycle. |
| TBD-03 | **Employee-account cap** per tier | Approved seat counts, counting rules, treatment of deactivated employees and downgrade overage. |
| TBD-04 **[v1.1]** | Complete feature entitlement matrix | Free always excludes table and QRIS; confirm exact Free KDS/employee/transaction caps and other functions. Define Professional/Business differences beyond verified merchant gates. |
| TBD-05 | **Paid** subscription billing gateway and recurring methods | A6 MejaFlow-managed scheduling selected; gateway contract, upfront paid-trial mandates, annual/monthly support, retries, cancellation and verified charges still open. Free exempt. |
| TBD-06 | Subscription proration, upgrades/downgrades, price changes and grace recovery | Business rules, invoices, effective date and consent handling. |
| TBD-07 **[v1.1]** | Midtrans partner/submerchant eligibility, status verification and API support | Confirm contractual model, machine-verifiable restaurant production onboarding status, independent QRIS channel activation, direct settlement and safe revocation. |
| TBD-08 | QRIS payment expiry | Actual permitted/configured expiry returned by provider; 10 minutes only if supported. |
| TBD-09 | Full/partial QRIS refund enablement and manual fallback | Verified per-merchant/payment capability, timing, reconciliation evidence. |
| TBD-10 | Provider fees, settlement timeline and operating constraints | Official documentation/contract and reconciliation design. |
| TBD-11 | Printer model/device/browser/connection matrix | Windows/Android 58/80mm thermal test list incl. USB, network and Bluetooth where supported. |
| TBD-12 | Tax/service charge calculation policy | Legal/accounting-approved applicable rates, inclusive/exclusive handling, base, ordering, discounts, rounding. |
| TBD-13 | Revenue/reporting calculation definitions | Gross/net sales, tax inclusion, refund timing, transaction counts, best-seller cancellation effects and daily timezone. |
| TBD-14 | Legal/privacy/record retention and recovery period rules | Indonesian legal review; distinguish 30-day recovery access from mandatory records retention. |
| TBD-15 | Nonfunctional SLOs and capacity | Uptime, latency, target concurrency, message delivery, backups, RPO/RTO and audit retention. |
| TBD-16 **[closed architecture / open operational]** | Hosting/backend/database stack | **Selected A1–A8**: Workers + Neon database-per-restaurant and associated components; data residency/security validation, DR and free-pilot live-payment risk gates still open. |
| TBD-17 | Final table move/merge behaviour and source of order-created occupancy | Preserve independent paid orders and automatic release; resolve prepayment transient table state during active checkout. |
| TBD-18 | Treatment of QRIS provider outage, unreadable QR and refund dispute | Detailed customer/staff incident procedures that preserve double-charge safeguards. |
| TBD-19 | Session cash movement scope beyond sales/refunds | Whether paid-outs, change, cash drops or other movements are needed and expected cash formula. |
| TBD-20 | Subscription account data handling after end of 30-day recovery window | Product/legal deletion, archival, anonymisation, access/export and record retention policy. |

| TBD-21 **[new v1.1]** | Free full KDS entitlement, seat cap and transaction cap | Preserve cash takeaway; determine whether Free uses full shared KDS or a basic fulfilment screen, plus exact Free staff/usage limits. |
| TBD-22 **[new v1.1]** | Paid-to-Free transition and retention | Prior rule says cancelled paid accounts become read-only at paid-through date. Decide whether an explicit, consented downgrade to Free is supported; never assume automatic migration. |
| TBD-23 **[new v1.1]** | Midtrans onboarding verification for table ordering | Confirm provider-supported eligibility proof and refresh/revocation process. Do not unlock tables on self-reported registration. |

### 2.7 Discovery Decision Traceability — Q1 to Q75

This appendix records the concise discovery answers, **annotated with approved v1.1 superseding changes**. Q64 remains the superseding no-split-bill decision, and Q65 remains the revised independent-order numbering decision. References to paid Starter, mandatory SaaS payment method for all registrations, or unrestricted Business-tier trial merchant features are obsolete where explicitly revised below.

| Q | Confirmed decision |
|---:|---|
| 1 | Browser-based POS web application. |
| 2 | Online-only operating mode; not offline-first. |
| 3 | Multi-tenant SaaS with isolated independent business workspaces. |
| 4 | Self-service business registration. |
| 5 **[v1.1]** | Permanent Free requires no trial; Professional/Business registration starts a 30-day trial followed by a paid subscription. |
| 6 **[v1.1]** | Professional/Business trial lasts 30 days from MejaFlow signup; no trial for permanent Free. |
| 7 **[v1.1]** | Eligible SaaS recurring method and explicit post-trial consent required for Professional/Business trial registration only; Free does not collect payment method. |
| 8 **[v1.1]** | Paid trials use an approved tokenised recurring gateway method under A6; provider/instruments TBD. No mandate for Free. |
| 9 **[v1.1]** | Tiered SaaS: permanent Free plus paid Professional and Business. |
| 10 **[v1.1]** | Free excludes table ordering/QRIS; paid tiers differ by features and employee caps. Exact Free cap TBD. |
| 11 **[v1.1]** | Monthly and annual billing available for Professional/Business; Free has no paid billing cycle. |
| 12 **[v1.1]** | Subscription tiers: **Free (Rp0 forever)**, Professional, Business; Starter retired. |
| 13 **[v1.1]** | Free basic cash takeaway with **no table/QRIS**; Professional/Business table ordering gated on verified Midtrans merchant onboarding and QRIS also gated on production channel activation; Business has other implemented advanced features. |
| 14 **[v1.1]** | Paid-plan trial grants currently implemented Business features **subject to table/QRIS merchant gates**. Cash takeaway (including paid-trial KDS) stays enabled while onboarding is pending. |
| 15 **[v1.1]** | Free requires no paid-plan selection/authorisation; paid trial selects Professional/Business upfront with supported recurring consent and may change it during trial. |
| 16 **[v1.1]** | Failed Professional/Business recurring charge: seven-day grace and retries; merchant gates remain. Permanent Free has no renewal failure. |
| 17 **[v1.1]** | After failed paid renewal grace, read-only history/export/billing recovery; active Free remains operational for allowed cash takeaway. |
| 18 **[v1.1]** | Paid cancellation retains paid-through access then read-only; no automatic conversion to Free without separate approved downgrade policy. |
| 19 **[v1.1]** | Paid post-end 30-day recovery/data-access window, separate from mandatory retention; not an expiry of active Free. |
| 20 | Both customer thermal printing and digital view/download/PDF receipts in MVP. |
| 21 | Browser/OS print dialog default; optional compatible direct printing bridge. |
| 22 | Configurable thermal paper widths 58mm and 80mm. |
| 23 | Support verified compatible USB, Wi-Fi/Ethernet and Bluetooth printing paths in MVP. |
| 24 | Cashier devices: Windows PCs and Android tablets; responsive/touch-friendly UI. |
| 25 | Android system/browser print with optional companion service for printer support; core POS remains web-based. |
| 26 | Customer POS payments: cash and automatically verified integrated digital payment. |
| 27 **[v1.1]** | MejaFlow-assisted merchant/submerchant onboarding is **not required to register**; provider verifies/directly settles where contractually supported; customer QRIS/table gated on verified status, no MejaFlow pooling. |
| 28 | Digital customer-payment method in MVP: Dynamic QRIS only (plus cash). |
| 29 | Single directly integrated customer QRIS provider in MVP. |
| 30 **[v1.1]** | Midtrans remains preferred QRIS provider; paid table unlock uses verified merchant onboarding and QRIS unlock additionally requires actual production activation, all subject to partner eligibility. |
| 31 **[v1.1]** | Free and paid trial/active/grace users may operate **cash takeaway** while Midtrans is pending; paid table ordering and QRIS remain locked per independent activation gates; paid trial runs from signup. |
| 32 | If merchant rejected, cash continues; provider-supported correction/reapplication only; QRIS disabled. |
| 33 | Failed/unpaid/expired QRIS: safe retry or cash fallback only after prior attempt is verified/resolved; reconcile late callbacks and prevent double charge. |
| 34 | QRIS expiry provider-configured; 10 minutes preferred only if supported; display actual verified expiry. |
| 35 | Full and partial QRIS refunds when enabled; authorised manual/external fallback if unavailable. |
| 36 | Cashier requests refunds; manager or owner approves. |
| 37 | Approval via personal manager PIN on cashier device **or** separately authenticated manager/owner dashboard, with server RBAC and audit. |
| 38 | KDS only for kitchen preparation; no kitchen ticket printing in MVP. |
| 39 | Dine-in and takeaway dispatched to KDS **only after confirmed full payment**. |
| 40 | Additional dine-in purchases are completely independent new orders, with separate payment and KDS dispatch. |
| 41 | Automatic table occupancy on dine-in order creation and automatic release when all associated active orders complete. |
| 42 | Dine-in order completion when waitstaff confirm food Served (not merely kitchen Ready). |
| 43 | Individual item Served confirmation plus **Mark All as Served**; complete when all applicable items served. |
| 44 | Item-level KDS preparation statuses plus **Mark All as Ready**. |
| 45 | One shared KDS queue; no separate preparation stations. |
| 46 | FIFO KDS with manual high-priority adjustment. |
| 47 | Priority changes permitted to authorised kitchen staff, managers, owners; not cashier/waitstaff. |
| 48 | New paid KDS arrivals have visual and audible notifications, subject to browser restrictions. |
| 49 | Kitchen staff manually select **Start Preparing** to accept a New KDS order. |
| 50 | No normal paid-order cancellation; only separate controlled exception handling. |
| 51 | Manager/owner-approved full/item reversal plus item replacement and financial adjustment support, preserving originals. |
| 52 | Collect/refund replacement price difference; verify extra payment before higher-priced replacement enters KDS. |
| 53 | Kitchen staff, cashier, waitstaff, manager and owner may request exceptions; only manager/owner may approve. |
| 54 | Automatically place only affected unserved items On Hold pending decision; restore prior state on rejection. |
| 55 | Manager/owner may self-approve own exception with required authentication, reason and audit. |
| 56 | Pending exceptions and item holds persist until manual approve/reject; no timed reminders, automatic rejection or escalation. |
| 57 | Management approval queue plus one-time visual alert when a request is submitted. |
| 58 | Real-time order/KDS updates and one-time visual alert to relevant staff on approve/reject. |
| 59 | Takeaway Completed only after cashier/waitstaff manually marks **Handed Over** after all applicable items Ready. |
| 60 | Dedicated Ready for Pickup queue and one-time visual alert to relevant cashiers/waitstaff. |
| 61 | Unique takeaway order number plus optional customer name displayed in pickup queue/receipts. |
| 62 | Standard pickup verification is exact customer-visible order number only. |
| 63 | Strict order number required: no forgotten-number recovery or manager override. |
| **64** | **REVISED:** No split-bill functionality in MVP; multiple separate paid orders under same dine-in table. Supersedes original Q64 item-based split decision. |
| **65** | **REVISED:** Distinguish same-table independent orders by unique order number only; no customer label or seat number required. |
| 66 | One full normal payment method per order: cash or verified Dynamic QRIS; no mixed/partial methods. |
| 67 | Immediate checkout or discard; no saved unpaid drafts. |
| 68 | Retain/recover initiated pending QRIS records via authorised cashier and provider-verified status; safe retry/fallback. |
| 69 | Cashier sessions with opening balance, closing physical cash count, expected balance, discrepancy and separate QRIS totals. |
| 70 | Nonzero discrepancy requires reason, but cashier can close without manager approval. |
| 71 | Owner-configurable tax and service-charge rates with separate dine-in/takeaway applicability. |
| 72 | Basic MVP sales dashboard: daily/monthly sales, transaction count, cash-vs-QRIS, best sellers and date filters. |
| 73 | MVP manual Available/Sold Out only; full stock and ingredient inventory remain Phase 3. |
| 74 **[v1.1]** | Paid employee account caps by tier and unlimited completed transactions; exact Free staff/transaction caps TBD. |
| 75 **[v1.1]** | Platform administrator independently configures monthly/annual IDR prices for Professional and Business; Free fixed Rp0. |

### 2.8 PRD Baseline Approval and Change Control

#### 2.8.1 Requirement authority

The Q1–Q75 discovery set, with **v1.1 approved overrides** to plan tiers and merchant feature gates, is the current requirements baseline. This does **not** mean all prices, integrations, implementation details or legal matters are approved. Changes to binding behaviours—especially paid-before-KDS, no split bills, table-release criteria, strict takeaway order-number verification, no saved drafts, no exception auto-escalation and subscription recovery—must be recorded as a new approved decision with a versioned change log.

#### 2.8.2 Suggested implementation handoff package

- This PRD and its numbered FR/NFR/AC/INV requirements.
- The 16-module roadmap and explicit MVP promotions.
- The unclosed TBD register with owners and due dates.
- API and physical schema design documents implementing the selected A1–A8 architecture.
- Payment-provider contract/API findings and a clear merchant-activation gate.
- UI wireframes and device/printer compatibility test matrix.
- Integration test fixtures for QRIS callback races, financial adjustments and multi-tenant isolation.

#### 2.8.3 Initial build-readiness checklist

- [ ] Confirm an eligible Professional/Business recurring gateway/mandate and post-trial consent workflow; Free remains payment-mandate-free.
- [ ] Validate Midtrans partner onboarding, verifiable merchant approval and QRIS production-channel activation, direct settlement and refund capabilities.
- [ ] Set Professional/Business monthly/annual prices and employee caps; determine Free employee/transaction caps without changing Rp0 price.
- [ ] Finalise Free KDS coverage and full feature entitlement matrix; decide explicit paid-to-Free downgrade behaviour (no automatic conversion).
- [ ] Approve tax/charge calculation and reporting accounting policy.
- [ ] Validate implementation against selected A1–A8 web/backend/data/event architecture and assign NFR numeric targets.
- [ ] Test 58mm/80mm thermal printing on supported Windows/Android combinations.
- [ ] Design and review critical screens: checkout, QRIS recovery, KDS, table, exception, takeaway and cash close.
- [ ] Execute acceptance test set AC-001–AC-050 and extend with provider/device/security suites.
- [ ] Complete legal/privacy/retention assessment for Indonesian deployment.

---

### 2.9 Approved v1.1 Change Log and Supersession Register

| Change ID | Earlier v1.0 baseline | Approved v1.1 superseding decision | Impacted requirements |
|---|---|---|---|
| CHG-1.1-01 | Paid Starter, Professional, Business | **Starter retired; permanent Free (Rp0), Professional and Business paid** | FR-SUB-002/007/008/011; Q9–Q13, Q75 |
| CHG-1.1-02 | Trial/payment mandate assumed for all new subscriptions | Free has no trial/recurring mandate; Professional/Business require eligible SaaS mandate and begin 30-day trial at registration | FR-SUB-002–006; Q5–Q8, Q14–Q15 |
| CHG-1.1-03 | Merchant QRIS approval gates QRIS only | Free: **no tables, no QRIS** regardless of merchant status; paid table orders require verified Midtrans merchant onboarding | FR-TABLE-001, FR-SUB-019/020, Q13, Q31 |
| CHG-1.1-04 | Paid trial Business features not expressly gated on merchant status | Paid trial retains cash takeaway and KDS while Midtrans pending; table ordering stays locked until onboarding verified; QRIS until production QRIS active | FR-SUB-004/006/018/021, FR-POS-002/004, FR-KDS-001, AC-042–045 |
| CHG-1.1-05 | Midtrans account registration terminology could imply ready merchant | Require **verified production onboarding** and separate **production QRIS activation**; mere account creation is insufficient | FR-SUB-020–024, Q30–31, TBD-07 |
| CHG-1.1-06 | Paid-plan cancellation enters read-only | **Unchanged**; do not automatically shift to Free. Explicit downgrade policy remains TBD | FR-SUB-005, Q18, TBD-22 |
| CHG-1.1-07 | Stage 2 tech selected after original PRD | Retain approved A1–A8 unchanged; implement new entitlements in central Neon platform and restaurant API gates | Section 5.1, architecture decision records |

**Preserved without modification:** original six-phase/16-module roadmap; revised Q64/Q65 (no split bills, independently numbered table orders); the payment-before-KDS rule; one full payment method per normal order; pending-QRIS persistence; manager approvals and holds; strict takeaway order number verification; cashier sessions; basic dashboard; 7-day paid-plan grace and read-only recovery; and original acceptance scenarios except explicitly annotated v1.1 overrides.

### 2.10 Blueprint commercial summary — aligned with v1.1

- **Free**: permanent Rp0 plan; no trial, no mandatory recurring SaaS payment. Cash takeaway POS is permitted. **No dine-in table ordering and no Dynamic QRIS**, even if Midtrans is connected. Free KDS entitlement and employee/transaction caps remain **TBD**.
- **Professional / Business**: paid monthly or annual plans, with a **30-day free trial starting on MejaFlow registration**. Collect an eligible recurring SaaS payment method and consent upfront. Merchant onboarding **does not pause** the trial or renewals.
- While Midtrans production merchant onboarding is pending/unapproved, paid businesses in trial/active/grace **may process cash takeaway**, including plan-entitled kitchen/KDS and pickup workflow, but **cannot** use dine-in table ordering or QRIS.
- Dine-in table ordering requires **verified production Midtrans merchant onboarding**. Dynamic QRIS additionally requires **verified active production QRIS channel**. Signup and sandbox alone never unlock production features.
- Existing paid-plan lapse has a **7-day grace period**; cancellation results in **read-only** state according to v1.1. **Do not automatically downgrade cancelled paid accounts to Free**; policy TBD.
- Provider partnership/API verification and some entitlements remain **TBD**. Do not claim integration approval or automatic verification before verified.

**Entitlement checks must run server-side** on every protected operation; hiding UI controls alone is insufficient.

### 2.11 Supplemental blueprint requirements — inherited scope applies

**R01 Order integrity:** Each order has stable ID, outlet ID, actor, currency IDR, timestamps, line-item price snapshots, tax/discount breakdown, and lifecycle status. Retried requests with same idempotency key never duplicate paid orders.

**R02 Pricing:** Server calculates subtotal, modifier charges, discounts, tax/service charges and final total using integer rupiah (or integer smallest unit as provider requires); frontend displays same authoritative result. Test stacking, rounding, and zero-value cases.

**R03 Kitchen:** Confirmed order appears once in entitled KDS, includes all notes/modifiers and order age. Kitchen updates cannot modify settled payment amounts.

**R04 Cash:** Cash payment writes a transaction and corresponding cash-ledger entry atomically; refunds and voids require role checks and audit reason.

**R05 Shift:** Only authorised cashier/manager can open or close shift. Closing shows expected vs counted and retains immutable reconciliation snapshot.

**R06 Inventory [future Phase 3]:** Ingredient movements are append-only and traceable to order/purchase/adjustment; unit conversions are validated; cancellations/refunds follow explicit restock policy.

**R07 HPP [future Phase 3]:** HPP uses recorded ingredient quantities and effective cost basis; missing costs yield “incomplete” not zero. Margin = `(selling price - estimated cost) / selling price` where price > 0; clarify treatment of tax/overheads in UI.

**R08 Feature gating:** Free cannot create table orders or Dynamic QRIS requests. Paid unverified merchant cannot create table orders. QRIS additionally checks active production channel. Test UI and API bypass attempts.

**R09 Webhooks:** Verify Midtrans signature and server-side transaction status; store event IDs; process idempotently; reject inconsistent amounts/outlets; reconcile unknown statuses.

**R10 Privacy:** Customer data is minimised; consent recorded for marketing; sensitive fields access-controlled; no card details stored in MejaFlow.

**R11 AI safety [proposed]:** AI output is draft-only for catalogue and advisory-only for insights; user confirmation is required before any business-changing action. Show provenance and confidence/uncertainty.

**R12 Auditability:** Financial changes, access changes, plan/verification state changes, and inventory adjustments include actor, time, reason, before/after (where applicable).

R01–R12 are supplementary blueprint identifiers, not replacements for approved FR/NFR/AC IDs. Discounts and advanced cash movements remain subject to the confirmed scope and financial TBDs; inventory and AI requirements apply only when their respective releases are approved.

### 2.12 Supplemental QA matrix — scope-aware

- Free + verified merchant → cash takeaway allowed; table/QRIS denied.
- Paid trial + merchant pending → cash takeaway and entitled KDS allowed; table/QRIS denied.
- Paid active + merchant verified + QRIS inactive → table enabled; QRIS denied.
- Paid active + merchant verified + QRIS active → eligible table and QRIS workflows enabled.
- Paid grace → only features explicitly permitted by v1.1; no assumption of extra privileges.
- Paid cancellation → renewal disabled, access retained through paid-through date; only subsequent read-only blocks operational writes. No automatic Free conversion.
- Double-click pay/replayed webhook → one settled normal payment and one KDS dispatch; one cash entry for cash only. Future inventory, if approved, must separately prevent duplicate deductions.
- Different business/outlet actor → cannot read/write another tenant's financial records.
- Network disconnect mid-checkout → safe error/retry; never fake payment confirmation.
- Missing recipe ingredient cost → show incomplete HPP, not false profit.
- AI misreads menu price → user must correct/approve before publish.
- Shift variance → exact computation and persistent audit reason.

### 2.13 Blueprint open questions — resolution and remaining TBDs

| Original topic | Current disposition |
|---|---|
| Next deliverable | Resolved for this request: Markdown documentation; no application implementation |
| Free caps/KDS and paid feature matrix | Still TBD-03/04/21; no invented quotas |
| Grace/read-only/retention | Seven-day grace and post-end 30-day recovery are confirmed; details after recovery and permitted exports remain TBD-14/20/22 |
| Midtrans verification and SaaS separation | Separate gates confirmed; provider eligibility, contract and verification method TBD-05/07/23 |
| Offline MVP | Resolved: online-only. Offline remains future discovery requiring a new approval |
| Taxes/refunds/split bill/printers/inventory | No split bills confirmed; financial formula, actual refund support and printer matrix TBD-08–13/18/19; inventory remains Phase 3 with trigger/negative-stock/costing policy TBD |
| Premium/AI tier allocation and usage limits | Proposed; no assignment to Professional or Business; pricing/quotas/cost controls TBD |
| Hosting, residency and native apps | A1–A8 stack approved; operating budget, residency and free-pilot risk review unresolved. Native apps are future options, not promised |

Additional proposed-feature decisions: AI provider/model, supported image formats and size/count limits, retention/deletion, consent wording, spend budgets, rate limits, retry policy, evaluation thresholds, publication permissions, duplicate-match policy and commercial entitlements remain TBD. Emerald tokens/components require design review and accessibility validation; they do not become a plan named Emerald.

</details>

## 3. Core Features

### Fitur MVP yang telah dikonfirmasi

- **Pengaturan Bisnis:** Pemilik mengatur profil bisnis/outlet utama, informasi struk, mata uang IDR, serta pajak dan service charge dengan penerapan dine-in/takeaway yang terpisah.
- **Akun dan Hak Akses:** Peran dasar pemilik, manajer, kasir, pelayan, dan dapur diterapkan server. Administrator platform memiliki ruang lingkup tersendiri. Batas akun mengikuti paket; custom RBAC lanjutan bukan MVP.
- **Manajemen Menu:** Kategori, produk, harga, gambar opsional, varian, modifier, pencarian, dan status Available/Sold Out. Perubahan katalog tidak mengubah isi struk atau pesanan lama.
- **POS dan Pembayaran:** Keranjang berisi jumlah, catatan, dan rincian biaya yang ditinjau sebelum checkout. Tunai memerlukan konfirmasi kasir; QRIS memerlukan status provider yang diverifikasi server. QRIS pending dapat dipulihkan tanpa membuat pesanan atau tagihan ganda.
- **Struk:** Struk pelanggan memuat nomor pesanan, rincian produk, biaya, metode pembayaran, dan identitas bisnis. Mendukung tampilan/unduhan/PDF serta layout thermal 58 mm dan 80 mm melalui jalur printer yang sudah diuji. Kegagalan cetak tidak membatalkan pembayaran.
- **Sesi Kasir:** Kasir memasukkan saldo kas awal dan hitungan fisik akhir. Sistem menghitung expected cash dan selisih, memisahkan QRIS dari uang laci. Setiap selisih nonnol wajib diberi alasan; penutupan tidak memerlukan persetujuan manajer.
- **Meja dan Pesanan Independen:** Satu meja dapat memiliki beberapa pesanan dengan nomor, pembayaran, struk, dan progres terpisah. Tidak ada tagihan bersama atau split bill. Meja terisi ketika pesanan dibuat dan tersedia kembali setelah semua pesanan aktif terkait selesai.
- **Kitchen Display System (KDS):** Satu antrean bersama berisi pesanan lunas yang berhak masuk KDS. Tiket dimulai sebagai New; staf memilih Start Preparing, lalu menandai item atau Mark All as Ready. Urutan standar FIFO berdasarkan konfirmasi pembayaran/dispatch; prioritas manual hanya untuk peran yang diizinkan. Pesanan baru memberi indikator visual dan suara jika browser mengizinkan.
- **Penyajian Dine-in:** Pelayan menandai item Served satu per satu atau Mark All as Served. Ready dari dapur belum berarti pesanan selesai. Meja dapat terlihat Available saat tamu masih duduk setelah semua makanan tersaji; ini konsekuensi aturan v1.1 yang sudah diterima.
- **Takeaway:** Semua item harus siap sebelum masuk Ready for Pickup. Kasir/pelayan mencocokkan nomor pesanan yang disebut pelanggan dan menekan Mark as Handed Over. Nama opsional hanya untuk tampilan; nomor salah atau hilang memblokir penyerahan, tanpa jalur pemulihan atau override manajer pada MVP.
- **Pengecualian Pesanan Lunas:** Staf dapat meminta reversal atau replacement dengan alasan; item belum disajikan yang terdampak masuk On Hold. Manajer/pemilik menyetujui atau menolak. Penolakan memulihkan status semula. Pengganti lebih mahal menunggu pembayaran tambahan terverifikasi sebelum menjadi item dapur yang dapat dikerjakan. Selisih lebih murah mengikuti refund yang disetujui dan hasilnya diverifikasi.
- **Dashboard Dasar:** Penjualan harian/bulanan, jumlah transaksi, rincian tunai/QRIS, produk terlaris, dan filter tanggal dengan akses sesuai peran dan bisnis.

### Cakupan pengembangan lanjutan

Enam fase dan 16 modul asli tetap dipertahankan. Fondasi, menu/POS/sesi kas, meja/pesanan/KDS, serta pengecualian termasuk inti MVP; bagian dasar dashboard, QRIS pelanggan, penagihan SaaS, dan struk telah dipercepat ke MVP sesuai keputusan yang disetujui. Inventori otomatis dan resep/HPP tetap Fase 3; CRM/loyalitas dan pengelolaan staf lanjutan Fase 4; multi-outlet, integrasi tambahan, serta optimasi lain Fase 5. Eksplorasi offline memerlukan keputusan baru.

### AI pembacaan menu cetak — usulan

Pemilik/staf berizin dapat mengunggah satu atau beberapa foto menu cetak. AI mengusulkan nama produk, harga, kategori, serta opsi yang memang terbaca. Hasil masuk sebagai draft dengan sumber gambar dan indikator ketidakpastian. Pengguna meninjau foto dan draft secara berdampingan, memperbaiki nilai, menyelesaikan duplikasi, lalu secara eksplisit menerbitkan hasil yang valid.

AI tidak boleh menerbitkan otomatis, menebak harga yang tidak terbaca, menimpa produk lama tanpa keputusan pengguna, atau mengubah pembayaran. Sistem memerlukan pemisahan tenant, validasi JSON, penyimpanan gambar privat, audit, publikasi yang aman saat diulang, kontrol biaya, dan penanganan foto buram/kegagalan provider. Provider/model, format dan ukuran foto, kuota, biaya, retensi, hak paket, dan batas kualitas masih TBD.

### Premium Emerald UI — usulan

Referensi visual digunakan untuk membentuk identitas MejaFlow yang orisinal: latar ivory/putih, navigasi dan aksi hijau tua, aksen emas terbatas, kartu ringkas, tabel terbaca, serta kontrol POS/KDS yang nyaman disentuh. Elemen merek, teks, dan aset milik produk referensi tidak disalin.

Komponen yang diusulkan meliputi AppShell, Sidebar, Topbar, kartu KPI, tabel/filter, keranjang, dialog pembayaran, tiket dapur, status badge, penjelasan fitur terkunci, dan riwayat audit. Tampilan harus mempertahankan semua kontrol operasional yang diwajibkan v1.1. Emerald bukan nama paket baru; token warna, pilihan komponen, dan target aksesibilitas perlu ditinjau sebelum implementasi.

<details>
<summary>Rincian referensi: modul, prioritas, UI, dan usulan AI</summary>

### 3.1 Functional Requirements by Original Roadmap Module

The modules below preserve the names, numbering and phase ownership of the original 16-module roadmap. Where functionality was accelerated into MVP, that distinction is explicit.

#### 3.1.1 Phase 0 — Foundation and Configuration

##### Module 1 — Business Settings

- `FR-BIZ-001`: Owner configures business name/profile, primary outlet/profile, contact/details, operating configuration, currency IDR and receipt profile.
- `FR-BIZ-002`: Owner can enable and set tax and service-charge percentages independently.
- `FR-BIZ-003`: For **each charge**, owner specifies applicability to dine-in, takeaway, or both. Disabled or non-applicable charges are excluded.
- `FR-BIZ-004`: Checkout shows the applicable subtotal, discounts, charges and grand total before payment; receipts itemise applied charges.
- `FR-BIZ-005`: Applied charge settings/rates/amounts are snapshotted on the transaction so a future business-setting change does not rewrite history.
- `FR-BIZ-006`: Validate rate ranges/precision on the server. Any tax base, compounding order, inclusive/exclusive price model, regional legal classification and rounding rule not confirmed in discovery are **TBD** and require product/legal review before production.

##### Module 2 — Basic Accounts and Security

- `FR-ACC-001`: Owner signs in securely; owner can create and manage operational accounts within plan allowances.
- `FR-ACC-002`: Support basic owner, manager, cashier, waitstaff and kitchen staff roles and server-side feature permissions.
- `FR-ACC-003`: Secure session lifecycle, logout and session expiry; security-sensitive approvals are reauthenticated.
- `FR-ACC-004`: Enforce role restrictions on priority, refunds, exceptions, serving and handover as established in Section 3.
- `FR-ACC-005`: Advanced granular custom RBAC is in Module 13/Phase 4 unless needed for baseline safety.

##### Module 3 — Core Data Foundation

- `FR-DATA-001`: Persist multi-tenant records with unique internal IDs, required foreign keys, event timestamps, audit metadata and transactional integrity.
- `FR-DATA-002`: Every tenant-owned query and mutation is scoped to the authenticated business; automated cross-tenant access tests are mandatory.
- `FR-DATA-003`: Preserve historical order, price, tax, payment, refund and approval snapshots against destructive editing.
- `FR-DATA-004`: Use reliable event delivery/reconciliation for payment-confirmed KDS dispatch and notifications; ensure at-least-once events cannot cause repeated financial or kitchen actions.

#### 3.1.2 Phase 1 — Menu and POS

##### Module 4 — Menu Management

- `FR-MENU-001`: Authorised staff manage products, categories, prices in IDR, optional images, variants, modifiers, availability, and menu browsing/search/sort.
- `FR-MENU-002`: Staff manually toggle a product **Available** or **Sold Out**; sold-out products cannot be newly added to POS carts.
- `FR-MENU-003`: Availability changes synchronize across connected POS screens; historical paid order item snapshots remain unchanged.
- `FR-MENU-004`: **No automatic stock count, ingredient recipe depletion or low-stock warning in MVP.** Full inventory remains Module 11/Phase 3.

##### Module 5 — POS Transactions, Payments and Receipts

- `FR-POS-001`: Create a dine-in or takeaway cart with items, quantities, selected modifiers/variants, notes, applicable discounts and charges; validate final total server-side.
- `FR-POS-002` **[v1.1 gate]**: One independent order is paid **in full** by **either cash or Dynamic QRIS** during normal checkout. Cash takeaway is permitted to active Free and valid paid trial/active/grace accounts regardless of Midtrans status. Dine-in table ordering requires paid entitlement and verified merchant onboarding; QRIS additionally requires active production QRIS. No normal split bills, mixed methods or partial payments.
- `FR-POS-003`: If cash is chosen, authorised cashier records confirmation of full accepted payment; store payment reference and actor/time.
- `FR-POS-004` **[v1.1 gate]**: QRIS cannot be chosen on Free. For eligible paid accounts, generate a provider-linked QRIS attempt only where restaurant Midtrans onboarding is verified and production QRIS is active; show verified provider status and actual configured expiry. Prefer a 10-minute expiry **only if provider-supported**.
- `FR-POS-005`: Treat client-side redirect, displayed QR code or untrusted callback alone as insufficient proof. Verify success through a trusted, authenticated provider notification and/or server-side status inquiry.
- `FR-POS-006`: A successful confirmed order is dispatched to the KDS **once**. An unpaid, failed, expired or uncertain payment must not create a kitchen job.
- `FR-POS-007`: Preserve order and payment-attempt reference on QRIS failure/expiry. Permit a new QRIS attempt or cash fallback **only after resolving/verifying the previous attempt** and preventing duplicate payment/late-callback races.
- `FR-POS-008`: Persist pending QRIS payment records when the browser closes, refreshes or disconnects. Authorised cashiers can access a recovery/status screen and safely resume resolution; this is not a saved general cart/draft.
- `FR-POS-009`: In the standard cart flow, a cashier must check out immediately or discard; **no save/resume unpaid drafts**. A discarded unpaid cart never reaches the KDS and does not leave ghost table occupancy.
- `FR-POS-010`: Generate customer-readable, uniquely attributable receipts with order number, order lines, amounts, applicable tax/service charges, payment method and business details; support digital PDF/view/download and thermal 58mm/80mm layouts.
- `FR-POS-011`: Browser/OS print is the default; optional compatible local print bridge and Android printing companion/service may improve printer coverage. Do not assume arbitrary USB/Wi-Fi/Ethernet/Bluetooth printers work from any browser. Windows computers and Android tablets are target POS devices.
- `FR-POS-012`: Refunds may be full or partial for eligible payment methods, subject to actual Midtrans merchant/payment-method enablement. Cashier may request; manager or owner must approve via existing approved mechanisms. If integrated refunds are unavailable, provide controlled external/manual resolution with recorded references and verified outcomes; never falsely mark provider refunds completed.
- `FR-POS-013`: Existing payment records are retained, not overwritten, when corrections or refunds occur.

##### Module 6 — Cashier Sessions

- `FR-CASH-001`: Cashier opens a session with an entered opening physical cash amount.
- `FR-CASH-002`: Attribute cash sales, QRIS sales, authorised cash refunds and other explicitly supported cash movements to the appropriate session with separate method totals.
- `FR-CASH-003`: At closure, cashier enters actual cash count; system calculates expected physical cash and `discrepancy = actual - expected`.
- `FR-CASH-004`: QRIS proceeds are **not** part of physical drawer cash.
- `FR-CASH-005`: If discrepancy is nonzero, cashier **must enter a reason** before closing; no mandatory manager approval is required, including for shortages/overages.
- `FR-CASH-006`: Store actor, opening/closing timestamps, expected/actual amounts, discrepancy, explanation and linked transaction totals for manager/owner review. Later corrections must be separate auditable entries.

#### 3.1.3 Phase 2 — Tables and Orders

##### Module 7 — Table Management

- `FR-TABLE-001` **[v1.1 gate]**: Configure restaurant tables and areas and display a responsive table map/list with statuses **only for entitled Professional/Business accounts after verified Midtrans merchant onboarding**; Free and unverified paid accounts cannot place dine-in table orders.
- `FR-TABLE-002`: A dine-in order references one table. Several **independent** orders may reference the same table without merging bills or transactions.
- `FR-TABLE-003`: Table becomes **Occupied** when dine-in order is created, and returns to **Available** when all associated active orders are Completed. Discarded unpaid checkouts do not persist occupancy.
- `FR-TABLE-004`: Dine-in order becomes Completed after **all applicable order items** have been marked Served by authorised waitstaff, individually or via **Mark All as Served**.
- `FR-TABLE-005`: Table state is recalculated and synchronised atomically on order creation, discard, completion and valid exception changes. Prevent racing clients from producing a false Available state.
- `FR-TABLE-006`: The original roadmap envisages table moves/merges. Because Q40/Q64 establish independent orders, moving a table may reassign a table reference while preserving independent order/payment records; **merge of already-paid bills remains excluded**. Exact table-move/merge UX is **TBD** rather than assumed.
- `FR-TABLE-007`: A table may show Available although customers remain seated after all items were served. This is a known accepted trade-off from Q41–Q42, documented as a release risk.

##### Module 8 — Order Management and Kitchen Display System

- `FR-KDS-001` **[v1.1 gate]**: One shared browser-based KDS displays entitled fully paid dine-in and takeaway orders. Professional/Business 30-day trial includes KDS for **cash takeaway while Midtrans is pending**. Free retains cash takeaway processing, but the full KDS entitlement for Free is a plan-matrix TBD; a compatible non-KDS takeaway fulfillment path must remain available if full KDS is not included. No separate preparation stations or kitchen ticket printing in MVP.
- `FR-KDS-002`: New paid orders appear with a visual highlight and audible alert. Browser audio may require a first user gesture; visual arrival must work when audio is unavailable.
- `FR-KDS-003`: Each arrived order starts **New**, not Preparing. Kitchen staff must explicitly click **Start Preparing**; capture actor and time.
- `FR-KDS-004`: Track eligible preparation status per item, and offer **Mark All as Ready**; derive aggregate order readiness from all applicable items, excluding reversed/cancelled items from readiness calculation as permitted by exceptions.
- `FR-KDS-005`: Queue defaults to FIFO based on payment confirmation/dispatch sequencing. Authorised kitchen staff, managers and owners can manually raise or clear high priority; cashiers/waitstaff cannot. Same-priority orders remain FIFO. Track actor/time/old/new priority.
- `FR-KDS-006`: Waitstaff can mark individual eligible dine-in items Served or **Mark All as Served**; complete dine-in order only when all applicable items are served.
- `FR-KDS-007`: KDS, cashier and waitstaff interfaces receive live state changes and reconcile correctly after temporary disconnection.
- `FR-KDS-008`: Exception holds prevent held items from moving forward until resolved; unaffected order items continue preparation.

##### Module 9 — Bill and Fulfillment Management (MVP refinement)

The original Module 9 was **Bill Management**, including conceptual group/split-bill capabilities. The confirmed revised Q64 supersedes the earlier split-bill decision: **no split bills in MVP**. Keep the original module identity and phase; implement independent-order billing and fulfillment records rather than shared-bill splitting. Future split-bill exploration, if any, requires a new approved decision.

- `FR-ORDER-001`: Each dine-in purchase is a fully independent numbered order, even when originating from the same table or added after another purchase. There is no editable common running bill.
- `FR-ORDER-002`: No mandatory seat number or customer label for dine-in orders. Identify by unique order number only.
- `FR-ORDER-003`: Each order gets one normal full-payment checkout and a separate receipt. Dispatch it to KDS after **its own** confirmed payment, regardless of payment status of other orders at that table.
- `FR-TAKE-001`: When every applicable takeaway item becomes Ready, the takeaway order enters a dedicated **Ready for Pickup** queue visible to authorised cashiers/waitstaff and triggers a **one-time visual** alert.
- `FR-TAKE-002`: Each takeaway order has a unique customer-visible order number and may include an **optional name** on the queue and receipt; customer registration and phone number are not required.
- `FR-TAKE-003`: Standard pickup requires the customer to provide the matching **order number**. Optional name is for display only; neither a receipt nor a separate code is required.
- `FR-TAKE-004`: If the customer cannot provide the correct number, handover is blocked: **no alternative recovery workflow, lookup-as-substitute, or manager override** in MVP.
- `FR-TAKE-005`: After number matching and only when all applicable items are Ready, cashier or waitstaff manually selects **Mark as Handed Over**. The order becomes Completed and actor/time are audited; do not auto-complete merely on kitchen readiness.
- `FR-TAKE-006`: Completed takeaway orders leave the active pickup queue but remain in history. Simultaneous handover attempts must be idempotent.

#### 3.1.4 Phase 3 — Dashboard and Inventory

##### Module 10 — Dashboard and Analytics

**Approved MVP subset:**

- `FR-REP-001`: Show daily and monthly sales and transaction counts, with selected date filters.
- `FR-REP-002`: Show separated cash and verified Dynamic QRIS payment totals.
- `FR-REP-003`: Show basic best-selling menu products by sold quantity.
- `FR-REP-004`: Scope all data to the signed-in business; allow owner and authorised manager access.
- `FR-REP-005`: Handle authorised refunds and adjustments consistently; specify gross/net definitions and reporting cutoffs before release (**TBD**). Ensure reconciliations with transaction and cashier-session records.

**Remain in Phase 3:** trends and deeper product/category/employee performance, peak-hour analysis, advanced discounts/refund analytics, and more extensive reports/exports as prioritised.

##### Module 11 — Inventory Management

- **Not MVP:** product stock quantities, ingredient inventory, recipes, automatic usage/deduction, stock movements, low-stock alerts, suppliers and stock valuation.
- **Phase 3 intent:** design inventory and recipe structures from validated restaurant workflows; preserve a clear boundary from the MVP's manual Available/Sold Out flags.

#### 3.1.5 Phase 4 — Customers and Employees

##### Module 12 — Customer Management

Future customer profiles, history/loyalty and optional CRM capabilities as warranted. MVP takeaway's optional name is not a customer registration or CRM profile.

##### Module 13 — Advanced Employee and RBAC

Future fine-grained role creation, permissions and advanced employee administration. MVP nevertheless includes the specific safe fixed permissions required for POS, KDS priorities, refunds, exceptions and subscriptions.

#### 3.1.6 Phase 5 — Integrations and Optimisation

##### Module 14 — Future Payment and External Integrations

Add only verified, approved integrations beyond the MVP's single preferred QRIS provider and the necessary SaaS recurring-billing integration. QRIS customer payment was **explicitly accelerated** to the MVP; this does not imply all future payment methods were moved forward.

##### Module 15 — Multi-Outlet Management

Future support for multiple locations, consolidated reporting, cross-outlet configuration and controlled staff scope. Do not confuse multi-outlet capability with MVP **multi-tenant**, where separate businesses have isolated workspaces.

##### Module 16 — Operational Optimisations

Future workflow automation, broader printer integrations, optional offline-related research, analytics enhancements and operational improvements; prioritisation TBD. Online-only remains an MVP requirement.

### 3.2 Blueprint feature catalogue — proposals and approved placement

| ID | Module | User capability | Proposed priority | Dependencies / caveats |
|---|---|---|---|---|
| F01 | Registration & onboarding | Create business/outlet, select plan, set payment consent where required | P0 | v1.1 plan gates |
| F02 | Product catalogue | Categories, items, variants, prices, availability, tax/service settings | P0 | Per-outlet settings |
| F03 | POS checkout | Search/tap items, edit cart, notes, quantity, cash checkout, receipt | P0 | Cash takeaway permitted per v1.1 |
| F04 | Orders & lifecycle | Create/pay independent orders; controlled approved exceptions, kitchen/pickup statuses | P0 | Immutable audit trail |
| F05 | KDS | Queue, ticket details, modifiers, preparation status | P0 paid entitlement | Cash takeaway allowed during onboarding if entitled |
| F06 | Roles & permissions | Owner, manager, cashier, kitchen; invite/revoke staff | P0 | Outlet-scoped access |
| F07 | Daily reporting | Sales, orders, payment breakdown, voids, top items | P0 | Reconciliation definitions |
| F08 | Midtrans merchant status | Verification workflow and production entitlement checks | P0 | Provider integration TBD |
| F09 | Tables & floor plan | Floor map, occupied/free status, dine-in orders | P1 | Paid + verified merchant production |
| F10 | Dynamic QRIS | Generate payment request, verify provider callback, reconcile | P1 | Paid + merchant verified + QRIS active |
| F11 | Modifiers/add-ons | Required/optional groups, min/max selections, price adjustments | P1 | KDS + price engine |
| F12 | Shift & cash book | Opening float, cash movements, closing counted cash, variance | P1 | Audit + permissions |
| F13 | Ingredient inventory | Stock units, purchase/adjustments, low-stock thresholds | P1 | Units and conversions |
| F14 | Recipes & HPP | Bill of materials, ingredient cost, gross-margin estimates | P1 | Recipe versioning |
| F15 | Promotions | Voucher, discounts, time windows, eligibility | P2 | Prevent stacking abuse |
| F16 | Loyalty & CRM | Customer opt-in, points ledger, redemption | P2 | Privacy/consent |
| F17 | Multi-outlet | Outlet-specific staff/menu/stock, consolidated reports | P2 | Tenant/outlet isolation |
| F18 | Photo-to-menu AI | Upload menu image; OCR/vision suggests editable catalogue draft | P2 experimental | Human approval required |
| F19 | AI insights | Daily/weekly summaries, anomalies, suggestions | P2 experimental | Cite underlying metrics; no fabricated data |
| F20 | Printer integration | Customer receipts and supported printer profiles; kitchen tickets future only | P1 | Browser/device compatibility |
| F21 | Offline checkout | Queue eligible cash orders locally and reconcile on reconnect | P2 discovery | Conflict-safe sync; not assumed in v1.1 |
| F22 | Exports | CSV/PDF sales, shift, inventory reports | P1 | Access control |

**P0 = initial release candidate; P1 = next milestone; P2 = later / experimental.** This priority ordering is a recommendation, not an amendment to approved scope.

**Approved placement overrides proposed P0/P1/P2 ranking:** F01–F12 include confirmed MVP functions within the approved six-phase model: table ordering, QRIS, modifiers, cashier sessions, customer receipts and basic sales reporting are MVP subject to gates, not automatically deferred because this draft labels them P1. F13–F14 are Phase 3 future inventory/recipes; F15–F16 future promotions/CRM; F17 Phase 5 multi-outlet; F18/F19 proposed AI; F20 customer receipt printing MVP, kitchen printing future; F21 offline discovery only; F22 advanced exports future except permitted receipt/history/recovery exports. Full paid and Free entitlement mapping remains TBD. Invitations/account UX is proposed, while fixed safe account permissions are confirmed.

### 3.3 Premium Emerald UI — proposed design direction

#### 3.3.1 Reference interpretation
The screenshots use a clean white/ivory base, dark forest-green accents, rounded cards, restrained yellow highlights, editorial serif headlines, compact sans-serif UI, and dense but organised dashboard tables. Borrow the **design principles**, not the brand or pixel-identical layout.

#### 3.3.2 MejaFlow design tokens (proposal)
- Canvas: `#F8F9F6`; surfaces: `#FFFFFF`; primary: `#155E50`; primary hover: `#10483E`; accent: `#E7B44C`.
- Text primary: `#1C2925`; secondary: `#66736D`; border: `#E2E8E3`; danger: `#B9443F`; success: `#27815D`; warning: `#B97819`.
- Font: Inter or equivalent sans-serif for application UI; optional distinctive serif **only for marketing headings**, never dense transaction tables.
- Radius: cards 12–16px; inputs/buttons 10–12px; pill badges 999px. Spacing based on 4/8px scale.
- Desktop layout: fixed 240px sidebar, topbar 64px, responsive main area; mobile uses collapsible navigation. POS on tablets uses large tap targets (≥44×44px).
- Accessibility: WCAG AA contrast targets, visible focus, keyboard support, non-colour status labels, screen-reader descriptions, readable error states.

#### 3.3.3 Information architecture
**Overview** → Dashboard, alerts, outlet switcher. **Sales** → POS, Orders, Payments, Receipts. **Operations** → KDS, Tables (gated), Shifts, Cash Book. **Catalogue** → Menu, Categories, Modifiers, Recipes. **Inventory** → Ingredients, Movements, Purchases, Alerts. **Customers** → Profiles, Promotions, Loyalty. **Analytics** → Sales, HPP, Menu Engineering, AI Insights, Exports. **Administration** → Outlets, Staff & Roles, Billing, Midtrans Verification, Settings, Audit Log.

#### 3.3.4 Screen-by-screen UI instructions
| Screen | Layout / components | Primary actions | Important states |
|---|---|---|---|
| Dashboard | KPI cards, 7-day chart, sales by hour, top products, alerts, outlet filter | Open POS, view reports | Empty, loading, stale-data timestamp |
| POS | Left catalogue grid/search, right persistent cart, bottom payment CTA | Add/edit items, cash checkout | Offline warning, unavailable item, permission denied |
| Checkout | Order summary, fees, tender input, change, confirmation | Record cash / initiate QRIS when entitled | Pending, paid, failed, duplicate submission |
| KDS | New/Preparing/Ready views, item notes/modifiers and ticket age; exact layout proposed | Kitchen Start Preparing, item/all Ready; waitstaff serve; cashier/waitstaff handover in permitted views | Realtime disconnected, overdue ticket |
| Table plan | Floor/area switcher and status legend; drag/drop is proposed | Create gated independent table order; table moves TBD; availability derived automatically | Locked with explicit reason and action |
| Catalogue | Table/grid with search, filters, bulk edit, item drawer | Create item, modifier groups | Missing price, unpublished draft |
| Inventory | Stock summary, thresholds, movements table, unit selector | Adjust, receive, count | Negative stock policy, low stock |
| Recipes/HPP | Ingredient rows, quantity/unit/cost, calculated HPP and margin | Save recipe version, simulate costs | Missing conversion, stale cost |
| Shift & Cash | Opening/closing workflow, denomination count proposal, variance panel | Open, supported cash movements, close | Already open, mismatch; reason for every nonzero discrepancy, no mandatory manager approval |
| Promotions | Rules builder, eligibility preview, usage chart | Publish/pause promotion | Expired, conflicting discount |
| AI menu import | Image upload, extraction preview, side-by-side editable draft | Approve each row, publish | Low confidence, unreadable image |
| AI Insights | Summary cards with date range and linked evidence | View source data, dismiss suggestion | Insufficient data; no speculative claims |
| Multi-outlet | Outlet switcher, comparative KPIs, scoped staff access | Add outlet, view consolidated report | No access, data delayed |
| Billing/verification | Plan, trial countdown, status checklist, feature matrix | Complete onboarding, manage plan | Pending merchant, QRIS inactive, grace, read-only |

#### 3.3.5 UX writing examples
- Gated table screen: **“Pesanan meja belum tersedia. Verifikasi merchant Midtrans produksi diperlukan untuk paket berbayar.”**
- QRIS disabled: **“QRIS belum aktif. Selesaikan verifikasi merchant dan aktivasi kanal QRIS produksi.”**
- Free plan: **“Paket Free mendukung kasir takeaway tunai. Fitur meja dan QRIS tersedia sesuai persyaratan paket berbayar.”**
- Payment pending: **“Menunggu konfirmasi pembayaran. Jangan serahkan pesanan sebagai lunas sampai status terverifikasi.”**
- AI import: **“Periksa nama, harga, dan pilihan produk sebelum menerbitkan katalog.”**
- Shift variance: **“Selisih kas Rp25.000. Tambahkan catatan sebelum menutup shift.”**

**Scope/status:** Emerald describes the proposed original visual system; the styling upgrade is not a separately confirmed MVP or subscription entitlement. Advanced navigation entries must be hidden or clearly gated until their modules exist and are entitled. An offline warning means transactions are blocked, not that offline checkout is supported. Existing confirmed operational controls must remain usable after a redesign.

**Framework proposal from recovered revised-chat summary:** React + TypeScript + Tailwind CSS with customised shadcn/ui accessible primitives and purpose-built POS/KDS components. This fits confirmed React/Vite A1; it does not approve Next.js. Retain shared AppShell, Sidebar, Topbar, OutletSwitcher, KpiCard, StatusBadge, DataTable, FilterBar, OrderCart, PaymentDialog, KitchenTicket, FeatureGate, EmptyState, ConfirmDialog and AuditTimeline. Proposed WCAG AA target, at least 44×44px touch controls and 320px mobile validation require review; the baseline accessibility target remains TBD until accepted.

Every operational screen needs loading, empty, error, permission-denied, saving, reconnecting/stale and retry-safe states. Use labels/icons in addition to colour, visible focus and keyboard alternatives; avoid displaying financial credentials or secrets in kitchen views. UI unlocks derive from server capabilities and explain the specific plan/merchant/QRIS restriction.

### 3.4 AI printed-menu import — reconstructed proposal, not confirmed MVP

**Purpose:** Help an authorised merchant turn photographs of a printed menu into an editable catalogue draft. This elaborates the available blueprint and the recovered revised-chat summary; it is not a reproduction of the missing REVISED file.

| Capability | Proposed behaviour |
|---|---|
| Input | One or multiple menu photos; upload previews, remove/replace image, visible file validation and progress. Formats, page/image count, size and quotas TBD |
| Extraction | Provider-independent server-side vision/OCR adapter suggests product name, IDR price, category, variants/modifiers when evidenced; retain image/region provenance and uncertainty |
| Review | Side-by-side original image and editable rows; flag ambiguous prices, missing names, unreadable text, duplicates and modifier relationships. Do not invent missing prices or silently default to zero |
| Correction | Merchant edits/rejects draft rows and validates required fields, category, price and modifier constraints. Confidence is advisory and is not proof of correctness |
| Duplicate handling | Compare with existing tenant catalogue and other draft rows; explicit keep/create/skip or approved update choice. Matching policy TBD; never silently overwrite an existing product |
| Publication | Explicit review/confirmation before publication; validated, authorised, tenant-scoped and idempotent. No automatic publication or pricing changes from AI output |
| Failure/retry | Failed, partial, cancelled and timed-out jobs remain distinguishable; safe retry without duplicate drafts/products; actionable blurry-photo and unreadable-price errors |
| Commercial controls | Proposed feature flag, role checks, usage/spend caps and rate limits; plans, trial availability, limits, cost and overage policy TBD |
| Audit/privacy | Record uploader/reviewer/publisher, source reference, edits and publish outcome; define image access/retention/deletion, consent and provider processing terms before launch |

Proposed acceptance checks: multiple photos; blurry/skewed/low-light images; Indonesian price separators; ambiguous/missing prices; duplicate items across photos; modifiers; malicious text embedded in photos; unsupported files; provider failure/timeout; cancelled jobs; refresh/retry; concurrent publication; cross-tenant job/image access; budget exhaustion; mobile upload and review. Imported image text is untrusted data and cannot instruct the backend to change permissions, call tools or reveal secrets. Numeric quality thresholds and evaluation dataset remain TBD.

</details>

## 4. User Flow

### Pendaftaran dan pemilihan paket

1. Pemilik mengisi akun dan informasi bisnis, lalu memilih Free atau Professional/Business bulanan/tahunan.
2. Free membuat ruang kerja tanpa mandat pembayaran berulang. Paket berbayar menampilkan harga aktual, trial 30 hari, tanggal potensi tagihan pertama, perpanjangan otomatis, serta persetujuan metode berulang yang memenuhi syarat.
3. Sistem membuat ruang kerja terisolasi. Trial berbayar dimulai pada waktu pendaftaran; menu, staf, pengaturan, dan takeaway tunai dapat disiapkan/dijalankan sesuai hak akses.
4. Onboarding Midtrans dilakukan terpisah. Meja tetap terkunci sampai merchant terverifikasi; QRIS tetap terkunci sampai merchant dan kanal QRIS produksi aktif. Trial terus berjalan.
5. Setelah trial, tagihan terverifikasi mengaktifkan paket terpilih. Kegagalan mengikuti grace tujuh hari, lalu read-only jika tidak pulih. Pembatalan tetap menghormati masa akses yang sudah dibayar.

### Transaksi takeaway tunai

1. Kasir membuka sesi dan memasukkan kas awal, memilih takeaway, menambahkan produk yang tersedia, jumlah, opsi, dan catatan.
2. Server menghitung total; kasir meninjau dan mengonfirmasi penerimaan pembayaran penuh.
3. Server mencatat pesanan/pembayaran dan menerbitkan satu dispatch KDS jika berhak. Struk dapat dicetak atau diunduh. Alur pemenuhan Free tetap tersedia sesuai keputusan hak KDS Free.
4. Dapur memilih Start Preparing dan menandai item siap. Setelah semuanya Ready, pesanan masuk Ready for Pickup dengan notifikasi visual satu kali.
5. Pelanggan menyebutkan nomor yang benar; kasir/pelayan mencocokkan dan menekan Mark as Handed Over. Pesanan selesai dan keluar dari antrean aktif.

### Transaksi QRIS

1. Server memeriksa hak paket berbayar, merchant terverifikasi, dan kanal produksi aktif.
2. Sistem membuat percobaan QRIS dengan referensi, nominal, dan expiry aktual provider, lalu menyimpan status Pending. Belum ada tiket dapur.
3. Server menerima/memeriksa bukti provider yang tepercaya, mencocokkan merchant, pesanan, nominal, mata uang, dan referensi sesuai kontrak integrasi.
4. Setelah lunas terverifikasi, sistem mencatat status finansial dan mengirim ke dapur satu kali. Tampilan QR, redirect, atau klaim dari browser tidak cukup sebagai bukti lunas.
5. Jika koneksi terputus, kasir memulihkan percobaan tersimpan. Retry atau fallback tunai hanya dilakukan setelah percobaan sebelumnya dipastikan aman; callback terlambat yang berkonflik masuk rekonsiliasi.

### Dine-in dan penyajian

1. Staf berizin pada bisnis berbayar dengan merchant terverifikasi memilih meja dan membuat pesanan independen.
2. Setiap pesanan dibayar penuh secara terpisah sebelum masuk KDS. Pembelian tambahan di meja yang sama membuat pesanan baru, bukan menambah tagihan bersama.
3. Dapur menerima dan menandai kesiapan per item/bulk. Pelayan menandai penyajian per item/bulk.
4. Pesanan selesai setelah semua item yang berlaku Served. Meja baru tersedia kembali ketika tidak ada pesanan aktif terkait.

### Pengecualian dan penggantian

Staf mengajukan permintaan dengan item dan alasan → item belum Served yang terdampak masuk On Hold → manajer/pemilik mendapat antrean dan notifikasi visual satu kali → persetujuan/penolakan dilakukan eksplisit dengan autentikasi → penolakan mengembalikan status sebelumnya; persetujuan membuat koreksi terkait tanpa menimpa transaksi asli → selisih lebih mahal dibayar sebelum pengganti masuk dapur; selisih lebih murah mengikuti refund yang hasilnya dicatat secara jujur.

Permintaan tetap menunggu keputusan manual. Tidak ada timeout, penolakan otomatis, pengingat berulang, atau eskalasi otomatis. Item lain dapat terus diproses. Refund yang baru disetujui tetap dibedakan dari refund yang benar-benar selesai.

### Penutupan kas dan alur AI

**Penutupan kas:** Kasir memasukkan uang fisik akhir → sistem membandingkan dengan expected cash, tanpa memasukkan QRIS → selisih nonnol mewajibkan alasan → kasir menutup sesi tanpa persetujuan manajer → ringkasan dikunci dan tersedia untuk peninjauan. Rumus selisih adalah actual dikurangi expected; cakupan cash-in/paid-out/cash drop tambahan masih TBD.

**AI menu, jika disetujui:** Unggah foto → ekstraksi ke draft → tinjau berdampingan → koreksi harga/nama/opsi → putuskan duplikasi → tinjau ringkasan → konfirmasi publish → server memvalidasi izin, versi draft, dan idempotensi → tampilkan hasil serta audit. Mengulang publish tidak boleh membuat produk ganda.

<details>
<summary>Rincian referensi: workflow, status, serta invariant</summary>

### 4.1 Detailed Cross-Module Workflows

#### 4.1.1 WF-01 — Business onboarding, trial and plan selection

**Preconditions:** Owner not yet registered; platform registration available. A supported SaaS recurring method is required only if selecting Professional or Business, **not Free**. Restaurant Midtrans onboarding is never a precondition to creating the MejaFlow account or starting the paid trial.

1. Owner enters account and business information and selects **Free (Rp0)** or **Professional/Business** with monthly/annual billing.
2. **Free:** platform creates an isolated workspace without payment mandate; Free remains active indefinitely with cash takeaway but without table ordering or QRIS.
3. **Professional/Business:** show current IDR price, 30-day trial, first charge date, recurrence terms, cancellation/recovery policy and SaaS payment-method requirements. Owner explicitly authorises eligible recurring charges; this is distinct from Midtrans merchant onboarding.
4. Paid trial begins on the registration timestamp, granting currently implemented Business-tier features subject to merchant gates. Cash takeaway and its authorised kitchen workflow can start immediately.
5. Platform invites owner to initiate/complete Midtrans merchant onboarding independently. Until verified merchant onboarding, disable table ordering; until verified merchant onboarding **and** QRIS activation, disable Dynamic QRIS. Neither gate prevents cash takeaway.
6. Owner may change upcoming paid Professional/Business plan during trial with updated price disclosure/consent where needed. Midtrans onboarding does not pause/extend trial.
7. At paid-trial end, successful recurring charge activates selected paid tier; failed verified renewal enters 7-day grace with selected-tier entitlements and merchant gates retained.
8. Unresolved grace expiry enters read-only; voluntary paid cancellation preserves access through paid-through date then read-only. Do not automatically convert paid accounts to Free without an approved migration policy.

**Exceptions:** No supported recurring method → **Free registration remains available**, but Professional/Business trial signup must not falsely claim recurring authorisation succeeded. Duplicate SaaS billing webhook → no duplicate charge or subscription transition. Midtrans still pending/rejected → cash takeaway remains usable, table ordering/QRIS locked. QRIS inactive after merchant approval → table ordering may be unlocked for entitled paid accounts, but QRIS stays locked.

#### 4.1.2 WF-02 — Cash checkout, receipt and KDS dispatch

1. Authorised staff choose **takeaway** on Free or on paid accounts without verified merchant onboarding; dine-in/table is offered only to entitled paid accounts with verified merchant onboarding. Add currently available items, variants, quantities and notes.
2. POS calculates final IDR amount with configured discounts, tax and service charge and displays review before payment.
3. Customer selects **cash** as the single payment method; cashier confirms receipt of the **entire** amount.
4. Server marks the order paid, records immutable payment details and queues the paid order exactly once for the single shared KDS.
5. KDS shows **New** and sends visual+sound arrival alert; cashier offers a supported thermal or digital customer receipt.
6. Kitchen staff manually select **Start Preparing**; item readiness and later service/handover follow relevant workflow.

**Exceptions:** Browser print fails → payment and KDS state remain valid, receipt can be reprinted/downloaded. Double-click on Pay → one payment and one KDS dispatch. Staff abandons cart before initiating payment → discard, never KDS.

#### 4.1.3 WF-03 — QRIS checkout, interruption, reconciliation and recovery

1. Verify paid-plan QRIS entitlement, restaurant Midtrans merchant onboarding **and** production QRIS channel activation; otherwise disable QRIS and offer **cash takeaway**. Free cannot use QRIS even if Midtrans is activated.
2. For an active order, create one provider-linked Dynamic QRIS attempt with server-generated reference, amount and actual returned expiry.
3. Persist `Pending` attempt and render the QR to customer; do not send the order to KDS.
4. Consume authenticated provider webhook and/or protected server-side status query; validate merchant/order/amount/reference, trust boundary and success state.
5. On confirmed success, atomically mark paid and dispatch once to KDS, even if cashier browser was closed or a notification arrived more than once.
6. If browser closes/disconnects, authorised cashier opens **Pending Payments**, locates the persisted attempt and requests a server-verified status refresh.
7. For an attempt verified failed/expired and safe to replace, cashier may retry QRIS or choose cash for a full payment. Existing unresolved or successful attempts must not be ignored.
8. If a late success callback conflicts with a fallback payment, place in reconciliation/incident handling; do not silently double-charge, create a second paid order or duplicate KDS entry.

**Trust condition:** A cashier screenshot of a bank transfer, browser callback parameter, client polling status or QR display does not independently establish payment success. Exact Midtrans webhook status fields and refund APIs are provider integration TBDs.

#### 4.1.4 WF-04 — Dine-in table and independent purchases

1. Authorised paid-plan staff with **verified Midtrans merchant onboarding** select a table and create an order. Free and paid accounts still awaiting onboarding cannot create table orders. Table is occupied while a valid active associated order exists.
2. Order A is fully paid on its own and enters KDS. Another person at the same table can create **Order B**, a distinct order ID with its own full payment, receipt and KDS status.
3. No common bill, bill splitting, seat assignment or customer label is required. Orders may be visually grouped under the table for service, but not financially merged.
4. KDS marks each item Ready individually or with **Mark All as Ready**; waitstaff mark Served individually or **Mark All as Served**.
5. Once all applicable items in Order A are Served, Order A is Completed. Table remains occupied if Order B is still active.
6. When all table-associated active orders are Completed, table automatically becomes Available, even if guests remain seated.

**Operational caveat:** Item service completion is not reliable evidence of physical departure. This known consequence of approved Q41–Q42 should be shown to pilot users and considered in release acceptance, not silently altered.

#### 4.1.5 WF-05 — Shared KDS, prioritisation and arrival alert

1. New paid order appears once with visual highlighting and sound if browser permits playback; device first interaction may enable audio.
2. Sort queue FIFO; manual priority sets high priority first, retaining FIFO within priority group.
3. Only authorised kitchen staff, managers or owners can set/remove priority; all priority modifications are audited.
4. Kitchen employee selects **Start Preparing**, which changes order New → Preparing and records acceptance.
5. Employee updates individual items Ready or performs **Mark All as Ready** on eligible items; server recomputes aggregate readiness.
6. Waitstaff see item/order readiness in near-real-time and perform serving updates; only their serving confirmation completes dine-in order.

#### 4.1.6 WF-06 — Paid-order exception, hold, replacement and refund

1. Authorised kitchen staff, cashier, waitstaff, manager or owner submits an exception **request**, identifies affected order/items and reason, and optionally identifies a replacement.
2. Only specified **unserved** affected items automatically enter `On Hold`; persist their prior preparation states. Unaffected items continue; paid transaction remains unchanged.
3. Request appears in manager/owner approval queue with **one-time visual notification**. It stays pending until explicit approval/rejection; no timers, repeated reminders, auto-rejection or escalation.
4. Manager/owner approves or rejects via personal PIN or separate authenticated manager/owner dashboard. The same manager/owner may both create and approve the request, but authentication and explicit action are mandatory.
5. **If rejected:** restore the held items to prior preparation states and send one-time visual result notifications to relevant connected staff.
6. **If approved:** create linked immutable reversal/replacement adjustments; stop affected unserved KDS items; compute price/tax/service difference under the accepted pricing policy. Maintain original financial history.
7. **Higher-priced replacement:** create/verify additional cash or Dynamic QRIS adjustment payment **before** the replacement becomes a new actionable KDS item. **Equal-priced:** no extra collection. **Lower-priced:** initiate applicable manager/owner-approved refund difference, with verified integrated refund if enabled or auditable manual/external fallback.
8. Notify relevant kitchen/cashier/waitstaff interfaces immediately through status synchronisation and one-time visual result alerts. Prevent duplicate action if concurrent devices submit approval or payment callbacks.

**Boundary:** No ordinary post-payment cancellation or destructive editing. Exception action is a controlled, separately recorded correction. A previously Served item remains historically Served even if subsequent financial remediation is required. Provider refund failure must remain distinguishable from approved-but-not-completed refund.

#### 4.1.7 WF-07 — Takeaway and handover

1. Takeaway checkout follows full cash payment for Free and any valid paid account; QRIS is offered only after paid entitlement and verified merchant onboarding plus QRIS production activation. Paid trial cash takeaway reaches its authorised KDS even while Midtrans is pending. Free takeaway must retain its supported fulfillment workflow even if full Free KDS entitlement is not included.
2. Once all applicable items are Ready, mark the order **Ready for Pickup**, place in dedicated cashier/waitstaff queue and issue **one-time visual** alert (not required sound).
3. Queue and applicable customer receipts show unique customer-visible order number; optional customer name may be displayed but is not a verification credential.
4. Customer provides exact order number. Cashier/waitstaff match it to a currently Ready for Pickup order.
5. **If order number is missing, incorrect or not matched, block handover. No recovery or manager override.**
6. If valid, authorised cashier/waitstaff manually selects **Mark as Handed Over**; record actor/time and mark order Completed exactly once.

#### 4.1.8 WF-08 — Cashier shift closure

1. Cashier opens a session and inputs opening drawer balance.
2. Server attributes cash and QRIS transactions separately to cashier session and records authorised cash-refund impacts.
3. At closing, system computes expected physical cash, excluding QRIS transactions; cashier enters actual counted amount.
4. If discrepancy is zero, cashier may close. If nonzero, explanation field becomes mandatory; closure does **not** require manager approval.
5. Lock closed session summary against silent modification; expose history and discrepancies to authorised management.

### 4.2 State Models and Invariants

#### 4.2.1 Orders and fulfillment

| Object | States | Allowed transitions / rule |
|---|---|---|
| Unpaid checkout | Cart active → Payment initiated OR Discarded | Not a saved draft; discard must never trigger KDS. |
| Payment | Initiated/Pending → Verified Paid OR Failed/Expired/Cancelled-by-provider as applicable | Any retry/fallback depends on verified prior attempt resolution. |
| Paid KDS order | New → Preparing → Ready (aggregate) | Start Preparing is manual; all applicable item readiness drives Ready. |
| Dine-in service | Ready/Partially Served → All Items Served → Completed | Serving is per item or bulk; paid status unchanged. |
| Takeaway fulfillment | Ready for Pickup → Handed Over → Completed | Only authorised manual handover with correct order number. |
| Item hold | Active preparation state → On Hold → Prior state on rejection OR authorised adjusted/removed state on approval | Preserve pre-hold state; no progress while held. |
| Table | Available ↔ Occupied | Occupied when associated valid active dine-in order exists; Available after all active orders completed/discarded. |
| Exception | Requested/Pending → Approved or Rejected → Financially settled/reconciled where applicable | No automatic timeout or rejection; approved request and completed refund are distinct. |
| Subscription | Free active indefinitely **or** Paid plan: Trial → Active / Grace → Read-only → Recovered / End-of-recovery (subject to retention) | Only Professional/Business trial and recurring billing; merchant status independently gates table ordering/QRIS. |
| Restaurant merchant onboarding | Not started → Pending / Action required / Rejected / Verified | Only **verified onboarding** permits entitled table ordering. Self-reported completion never grants access. |
| Restaurant QRIS channel | Inactive / Pending → Production Active, or Suspended | QRIS allowed only with paid entitlement **plus** verified merchant onboarding **plus** active QRIS channel. |

#### 4.2.2 Financial and consistency invariants

- `INV-001`: For every order in `KDS.New`, there exists exactly one verified full normal checkout payment for that order (or the approved exception-specific payment condition for a new replacement KDS item).
- `INV-002`: A normal order cannot contain two active payment methods or unallocated partial balances. Repeated callbacks and UI clicks are idempotent.
- `INV-003`: A KDS dispatch event is uniquely keyed by order ID and dispatch purpose so retry cannot duplicate a kitchen ticket/card.
- `INV-004`: Original paid order, item prices, charges and payment receipt remain auditable; reversals/replacements are linked append-only records.
- `INV-005`: An exception-request hold affects only specified unserved items; no item remains held after an authenticated rejection is successfully applied.
- `INV-006`: An exception approval does not, by itself, imply a refund succeeded or extra QRIS collection succeeded; those have independent verified states.
- `INV-007`: For a dine-in table, `Occupied = EXISTS(active associated order)` under the agreed service-based definition, accounting for checkout discard and concurrent completion.
- `INV-008`: Takeaway completion implies order Ready for Pickup, exact number matched, and authorised recorded handover.
- `INV-009`: Cash drawer expected total excludes all QRIS proceeds and correctly reflects recorded cash refunds and any explicitly supported cash movements.
- `INV-010`: Every business-owned record resolves to precisely one tenant; no normal cross-tenant reads/writes.
- `INV-011` **[v1.1]**: For active Free or paid trial/active/grace tenants, cash takeaway checkout is available irrespective of merchant onboarding state; Free never has table-order/QRIS entitlement.
- `INV-012` **[v1.1]**: No paid-plan table order is created without verified Midtrans merchant onboarding; no QRIS payment attempt is initiated without both verified onboarding and active production QRIS.
- `INV-013` **[v1.1]**: SaaS recurring-payment mandate and restaurant QRIS merchant activation are independent; a paid trial starts at MejaFlow registration and does not pause for Midtrans review.

### 4.3 Blueprint journeys — reconciled with approved workflows

#### 4.3.1 Merchant onboarding
1. Sign up, verify identity/email/phone as configured; create business and first outlet.
2. Choose Free or paid plan. For paid, display 30-day trial clock and capture eligible recurring payment method/consent.
3. Configure menu, staff, tax/service fees, receipt details, and cash drawer.
4. Display merchant onboarding as a separate, explicit status: `not_started | pending | verified | rejected | action_required`.
5. Show available operations based on **plan + subscription state + merchant verification + QRIS channel**.
6. Allow eligible cash takeaway orders immediately; do not suggest table ordering or QRIS works before production verification.

#### 4.3.2 Cash takeaway
Cashier starts shift (if shift module enabled) → selects items/variants/modifiers → chooses takeaway → confirms totals → records cash tendered/change → finalises paid order → kitchen ticket created if entitled → kitchen updates ready status → handoff → sales/cash ledgers updated.

#### 4.3.3 Dine-in and QRIS (gated)
Entitled paid tenant with verified merchant → select table → create independent order → request Dynamic QRIS only if production channel active (or confirm full cash) → persist Pending without KDS → verify payment server-side → atomically mark Paid and dispatch once → receipt → kitchen Start Preparing and item/all Ready → waitstaff item/all Served → Completed → release table only when every active associated order is Completed. Never treat a QR image display or client callback alone as payment success.

#### 4.3.4 Shift closing
Record opening float → record cash sales, refunds, paid-outs, cash-ins → cashier enters counted cash → system computes `expected cash = opening float + cash sales + cash-ins - cash refunds - paid-outs` → display variance → require reason for every nonzero variance → cashier may close without manager approval → immutable close snapshot available for later manager review.

#### 4.3.5 Ingredient stock and costing — future Phase 3
Define ingredients, canonical units and conversions → attach quantities to versioned recipes → paid/fulfilled order triggers stock movement according to defined business event → low-stock alert → purchase/adjustment entries → compute estimated ingredient HPP per menu item. Prevent double deduction on order retries.

#### 4.3.6 Photo-to-menu AI — proposed
Upload photo(s) → image extraction produces draft names/prices/categories/modifiers with confidence indicators → merchant reviews and corrects every field → duplicate detection → explicit Publish action. Never silently publish inferred prices.

### 4.4 AI menu-import journey — reconstructed proposal

Authorised merchant opens Menu Import → reads usage/privacy disclosure → uploads photos → validates files → submits extraction job → sees queued/processing state → opens side-by-side draft → corrects or rejects names/prices/categories/options → resolves duplicates → reviews publish summary → explicitly confirms → server rechecks tenant, role, entitlement, draft version and budget rules → publishes authorised validated rows once → displays created/updated/skipped counts and links to catalogue → retains audit and source provenance under approved retention policy.

Leaving the screen or retrying the request must recover the job, not create duplicate chargeable work. Editing after review invalidates prior approval of changed values. Extraction does not create live products, orders, payments or stock movements. Partial-publish versus atomic-batch semantics are a technical/product TBD; the UI must truthfully report the chosen outcome.

</details>

## 5. Architecture

MejaFlow mengikuti arsitektur A1–A8 yang telah disetujui. Frontend React/Vite mengakses API Hono di Cloudflare Workers. Neon platform pusat menyimpan identitas, registry tenant, dan langganan SaaS; setiap restoran memiliki project/database PostgreSQL Neon tersendiri untuk data bisnisnya. D1 bukan database aplikasi yang berwenang.

### Komponen dan tanggung jawab

- **Frontend:** Menampilkan POS, meja, KDS, laporan, pengaturan, dan status fitur dari server. Tidak menyimpan secret provider dan tidak menentukan sendiri status lunas atau kelayakan merchant.
- **API dan Kebijakan Akses:** Memeriksa sesi, keanggotaan bisnis, peran, paket/trial/grace/read-only, hak fitur, status merchant, status QRIS, serta kepemilikan setiap resource.
- **Database Platform:** Menangani identitas, registry koneksi tenant, katalog paket/harga, hak akses, langganan, mandat/tagihan SaaS dan proses provisioning sesuai rancangan rinci.
- **Database Restoran:** Menangani menu, pesanan, item, pembayaran, sesi kas, pengecualian, audit, dan transactional outbox. Registry diselesaikan dari keanggotaan terverifikasi, bukan connection string yang dipilih browser.
- **Event dan Realtime:** Transaksi database menyimpan perubahan dan outbox bersama. Cloudflare Queues dan Durable Objects WebSockets menyampaikan pembaruan; consumer mencegah efek ganda. Setelah reconnect, perangkat mengambil snapshot yang berwenang dan menyelaraskan status.
- **Pembayaran Pelanggan:** Adapter provider membuat percobaan QRIS dan memverifikasi notifikasi/status server. Kelengkapan kontrak/API Midtrans serta merchant/payment-method yang didukung masih perlu dibuktikan.
- **Langganan SaaS:** Cloudflare Cron mengatur jadwal renewal milik MejaFlow; gateway tokenised recurring yang disetujui menagih sesuai mandat, lalu hasil direkonsiliasi secara idempoten. Pemilihan gateway/instrumen masih TBD.

Provisioning database restoran harus aman saat diulang dan hanya menandai tenant siap setelah migrasi berhasil. Tidak diasumsikan ada satu transaksi PostgreSQL yang melintasi project Neon terpisah; kegagalan sebagian memerlukan proses pemulihan dan rekonsiliasi yang jelas.

### Integritas dan API

Dalam database restoran, status pembayaran terverifikasi, jurnal finansial, dan event dispatch dicatat secara atomik. Pengulangan callback, klik, dan pengiriman antrean tidak boleh menggandakan pembayaran, tiket dapur, atau perubahan status. Riwayat tetap dapat direkonsiliasi walaupun QRIS baru dinonaktifkan.

Batas domain API meliputi pendaftaran, menu, checkout, QRIS pending/recovery, struk, KDS, prioritas, penyajian, handover, pengecualian, sesi kas, langganan, dan laporan. Nama route/OpenAPI dalam rincian merupakan rancangan, bukan kontrak final. Route pembatalan tidak boleh memberi jalan untuk menghapus pesanan lunas secara biasa.

### Arsitektur AI — usulan

Browser mengunggah foto melalui akses terotorisasi ke penyimpanan privat → backend membuat job → adapter vision/OCR memproses → hasil divalidasi dengan skema JSON → draft disimpan → pengguna meninjau → server memublikasikan hasil yang valid. API key tetap pada backend; teks dalam gambar diperlakukan sebagai data yang tidak tepercaya, bukan instruksi sistem.

Job memerlukan batas biaya/kuota, retry terbatas, pencatatan provider/model/versi, sumber gambar, error, dan perubahan reviewer. Penyimpanan objek, model, batas runtime, kebijakan retensi, dan semantik publikasi atomik/sebagian masih TBD. Usulan ini harus cocok dengan A1–A8 dan tidak otomatis mengganti backend menjadi Node/NestJS/Redis.

<details>
<summary>Rincian referensi: arsitektur, integrasi, API, dan panduan implementasi</summary>

### 5.1 Stage 2 Architecture Baseline A1–A8 (confirmed, retained in v1.1)

The product-tier revision does **not** reopen the following approved architecture decisions:

| Decision | Confirmed choice |
|---|---|
| A1 — Technology | React + Vite + TypeScript + Tailwind CSS frontend; Hono on Cloudflare Workers; Drizzle ORM with PostgreSQL. |
| Hosting/database | Cloudflare Workers + Neon PostgreSQL, **not D1** as the authoritative application database. |
| A2 — Multitenancy | Separate Neon project/PostgreSQL database per restaurant; central Neon platform project for identities, tenant registry and SaaS subscriptions. |
| A3 — Authentication | Neon Managed Better Auth with email/password and Google OAuth; server-enforced tenant membership and fixed MVP RBAC; owner/manager PIN or dashboard approval. |
| A4 — Real-time events | Cloudflare Durable Objects WebSockets, restaurant PostgreSQL transactional outbox, Cloudflare Queues and authoritative KDS reconnection snapshots. |
| A5 — Financial consistency | PostgreSQL transactional state machines, idempotency, immutable financial journal, reconciliation and outbox committed with paid-order state. |
| A6 — SaaS billing | MejaFlow-owned Cron renewal scheduling with gateway-approved tokenised recurring charges; central Neon billing tables; verified callbacks and retry/reconciliation controls. |
| A7 — Printing | Browser/OS default; 58/80 mm print layouts; PDF; optional direct adapter for verified compatible network printers. |
| A8 — Operations | Attempt limited pilot on free Cloudflare Workers and Neon plans, with **explicit risk assessment and approval before any live payment**; independent backup/recovery, observability and release security gates. |

**v1.1 implementation implications:**

1. Extend platform-plan data model with `free` (fixed Rp0, no billing), `professional`, `business`; disable retired `starter` for new registration while preserving existing-price/version history as needed.
2. Keep merchant approval status and production QRIS channel status as independent, server-verified flags; never infer one from the SaaS subscription state or a merchant's self-entry.
3. Centralised `getEffectiveCapabilities(tenant, membership, subscription, merchantStatus)` policy must gate API routes and React menus; no client-side-only lockouts.
4. Treat paid trial as valid for **cash takeaway + its KDS/fulfilment** while merchant onboarding is pending, and table ordering/QRIS as independent capability flags.
5. Free accounts may never initiate QRIS attempts or dine-in table orders, even if Midtrans later approves them; preserve existing paid-before-KDS, immutable financial and strict pickup rules for permitted transactions.
6. Maintain idempotent, independently auditable onboarding: a newly provisioned tenant is not marked ready until its separate Neon project is migrated. Do not treat an unsuccessful SaaS mandate as authorised paid recurring billing.
7. When merchant status changes, invalidate relevant entitlement caches and notify connected clients. Reconciliation and read access to historical payments remain available even if new QRIS is disabled.
8. The live-payment pilot requires the A8 production-readiness risk gate; free-tier eligibility is not an availability or financial-safety guarantee.

### 5.2 Integration Contracts and External Dependencies

#### 5.2.1 Customer-facing Dynamic QRIS (preferred Midtrans)

**Confirmed product intent:** One directly integrated provider in MVP, with Midtrans preferred; facilitate restaurant merchant/submerchant onboarding through a provider that verifies merchants and directly settles to each restaurant. MejaFlow must not pool restaurant customer payments. All of these capabilities require contractual/API confirmation.

**v1.1 merchant gate:** Restaurant owners can create and use Free or start Professional/Business trial before submitting Midtrans merchant onboarding. MejaFlow enables **cash takeaway** even while Midtrans is not verified. Eligible paid-plan **table ordering requires verified merchant onboarding**, and paid-plan **Dynamic QRIS requires verified onboarding plus active production QRIS**. Free never unlocks table ordering or QRIS. Creating a Midtrans sandbox login alone does not establish merchant approval. Provider production-onboarding documentation: https://docs.midtrans.com/docs/dashboard-basics ; payment-method activation: https://docs.midtrans.com/docs/payment-methods ; QRIS: https://docs.midtrans.com/docs/qris-payment-method-in-midtrans . These links support the distinction between account registration, production onboarding and activation, **not** a claim of automatic partner verification/API access.

**To verify before committing to launch:**

1. Whether MejaFlow qualifies for the needed partner/platform onboarding model and relevant production credentials.
2. Whether merchant/submerchant onboarding is available by API, portal or supported manual operations, including settlement recipient identification and status.
3. Whether direct restaurant settlement under the planned model is supported and the legal responsibilities of each party.
4. Provider-specific create-QRIS, status query, webhook security/signature, amount validation, late-callback behaviour, expiration, settlement and reconciliation contracts.
5. Supported full/partial QRIS refund operations for the *actual merchant account and payment method*, which may be disabled or restricted; supported alternatives when refunds are not enabled.
6. Fees, payout schedule, provider uptime/rate limits, sandbox availability, onboarding time, and supported merchant legal forms.

**Activation gate:** When merchant not verified/approved, Dynamic QRIS must be disabled for that restaurant; cash operations remain live and trial counts from registration. No UI may imply QRIS is active without verified activation.

#### 5.2.2 Subscription recurring billing

**Separate integration.** **A6 architecture confirmed:** MejaFlow-managed renewal scheduling using Cloudflare Cron, central Neon billing tables, approved gateway tokenised recurring charges and verified webhooks/idempotent reconciliation. Professional/Business trials require eligible upfront SaaS authorisation and support recurring monthly/annual charges, plan changes and cancellation. **Free requires no recurring payment method and no invoices.** Exact gateway and eligible instruments remain **TBD**. Restaurant QRIS activation is independent of this agreement.

#### 5.2.3 Printers

- Default: browser/OS printing using configured 58mm/80mm customer receipt layouts.
- Optional: supported local print bridge for direct printing on compatible Windows hardware, or Android companion service where browser/OS restrictions require it.
- USB, network (Wi-Fi/Ethernet) and Bluetooth printer support is a **test matrix**, not a universal guarantee. Each printer model/driver/Android OS/browser/bridge combination must be verified and documented.
- Kitchen printing is not an MVP feature.

#### 5.2.4 Suggested API boundaries (proposed implementation)

| Domain | Illustrative operations | Required enforcement |
|---|---|---|
| Registration | Create Free workspace OR begin Professional/Business trial with SaaS mandate | Unique tenant, paid-only recurring consent, separate merchant activation status |
| Menu | List/create/update product; toggle availability | Tenant, role, active entitlement |
| Orders | Create cash takeaway checkout on Free/paid, gated table checkout on verified paid merchants; status/serve/handover | Tenant, plan, merchant status, payment, role, state transition |
| POS payments | Confirm eligible cash; initiate QRIS only after paid entitlement + verified onboarding + production QRIS activation; recover pending attempts | Payment integrity, merchant/QRIS gates, provider verification, idempotency |
| KDS | List paid jobs, start preparing, mark item/all Ready, set priority | Paid-order gate, kitchen role, concurrency control |
| Exceptions | Request, approve/reject, record adjustments, request refund | Role and reauthentication, hold state, financial reconciliation |
| Cashier sessions | Open, count/close, report | Cashier scope, reason-on-discrepancy |
| Subscription | Change plan, cancel renewal, recover billing | Owner role, consent, provider state |
| Reports | Sales summary/top products/date filters | Tenant + management permission |

These are domain contracts rather than fixed REST route names. **Proposed architecture:** transactional database; backend authorisation and payment verification; asynchronous durable outbox for event dispatch; websocket or equivalent live updates with polling/reload fallback; background reconciliation on provider callbacks. Stack/framework, cloud, database engine and hosting are selected under A1–A8 (Section 5.1 and Section 4.2); provider contracts, operational sizing, data residency and production risk validation remain **TBD**.

### 5.3 Approved architecture at a glance

~~~mermaid
flowchart LR
    Staff[Responsive React / Vite client] --> API[Hono API on Cloudflare Workers]
    API --> Auth[Neon Managed Better Auth]
    API --> Platform[Central Neon platform database]
    Platform --> Registry[Tenant database registry]
    API --> Tenant[Separate Neon project / PostgreSQL per restaurant]
    Tenant --> Outbox[Transactional outbox]
    Outbox --> Queue[Cloudflare Queues]
    Queue --> Live[Durable Objects WebSockets]
    Live --> Staff
    API --> QRIS[Approved customer QRIS provider]
    Cron[Cloudflare Cron] --> Billing[SaaS renewal and reconciliation]
    Billing --> Platform
    Billing --> Gateway[Approved tokenised recurring gateway — TBD]
~~~

The registry must resolve from authenticated membership, never a client-selected connection string. Platform identities/subscriptions and tenant restaurant ledgers have separate ownership. Provision restaurant databases idempotently; mark tenant ready only after successful migrations. Cross-database provisioning, billing and restaurant events require explicit recovery/saga and reconciliation designs; do not assume a single PostgreSQL transaction spans separate Neon projects. Tenant database credentials and gateway keys remain backend-only.

In the restaurant database, commit verified paid state, immutable journal and dispatch outbox atomically. Queue delivery may repeat; consumer uniqueness prevents repeated KDS jobs, notifications or financial changes. Reconnect takes an authoritative tenant snapshot plus sequenced updates. Billing failure or QRIS suspension cannot erase verified financial history.

### 5.4 Supplemental API sketch — illustrative, scope-bound

- `POST /auth/register`, `POST /businesses`, `POST /outlets`
- `GET /entitlements` — authoritative feature gates with human-readable reason codes
- `GET|POST /menu/items`, `PATCH /menu/items/:id`
- `POST /orders`, `GET /orders`, `POST /orders/:id/cancel`
- `POST /orders/:id/payments/cash`, `POST /orders/:id/payments/qris`
- `POST /webhooks/midtrans` — signature + replay protection
- `GET /kitchen/tickets`, `PATCH /kitchen/tickets/:id/status`
- `POST /shifts/open`, `POST /shifts/:id/movements`, `POST /shifts/:id/close`
- `GET /inventory`, `POST /inventory/movements`, `GET|POST /recipes`
- `GET /reports/sales`, `GET /reports/shift`, `GET /reports/hpp`
- `POST /ai/menu-imports`, `GET /ai/menu-imports/:id`, `POST /ai/menu-imports/:id/approve`

All writes: authentication, permission, validation, audit, idempotency where appropriate; consistent error codes (`FEATURE_NOT_ENTITLED`, `MERCHANT_NOT_VERIFIED`, `QRIS_CHANNEL_INACTIVE`, etc.).

**Approved corrections:** /orders/:id/cancel must not implement ordinary paid-order cancellation: unpaid discard/provider attempt resolution and authenticated exception routes are different operations. Add request/approve/reject exception routes, per-item/bulk Ready and Served, priority, strict-number handover, pending-payment recovery, receipt reprint and subscription recovery boundaries. Inventory/recipes/HPP and AI routes are future/proposed only. Route names are suggestions; OpenAPI and actual request contracts remain to be designed.

Capability responses should distinguish feature not entitled, merchant not verified, QRIS inactive and paid subscription read-only. Do not reveal another tenant's resource existence. Every protected route validates effective capabilities, tenant, role, ownership, input and state; financial writes additionally use suitable idempotency and audit.

### 5.5 AI processing and API boundary — reconstructed proposal

- Browser receives safe upload/job metadata only. Model/API keys remain in backend secrets; never bundle them in React assets.
- Proposed private image storage uses short-lived authorised upload/download access, tenant-scoped object keys, file/type limits and a retention/deletion job. Storage product/location is TBD.
- Provider adapter takes images and an extraction schema; treat image text as data. Validate returned JSON against a versioned schema before persisting drafts. Invalid output fails safely and cannot publish.
- Proposed background processing fits a Workers-compatible service/queue design; long-running model calls, image size, timeouts and retry limits must be validated. Do not silently replace A1–A8 with a Node/NestJS/Redis architecture.
- Suggested routes: POST /ai/menu-imports; GET /ai/menu-imports/:id; PATCH /ai/menu-imports/:id/items/:itemId; POST /ai/menu-imports/:id/retry; POST /ai/menu-imports/:id/publish. The older /approve route may record review, but publication requires an explicit authorised action with version and idempotency checks. Exact routes remain proposed.
- Track request idempotency, model/provider/version, job attempts, cost/usage, errors, source references and reviewer edits. Enforce per-tenant spend/usage controls and cap retries to avoid unbounded cost.
- Proposed lifecycle: Uploaded → Queued → Processing → Review Required → Validated → Publishing → Published, with Failed/Cancelled and partial-result states where designed. Never equate extraction success with publication.

### 5.6 Design-to-code handoff guidance — future implementation, not execution authority

1. **Read the confirmed MejaFlow PRD v1.1 first.** Do not reinterpret Free, trials, onboarding, grace or cancellation rules.
2. Build an **original MejaFlow design system** inspired by the supplied references: ivory canvas, deep green navigation/actions, compact cards, clear financial tables, restrained gold highlights. No SirMagic logos/copy/assets.
3. Create reusable components: `AppShell`, `Sidebar`, `Topbar`, `OutletSwitcher`, `KpiCard`, `StatusBadge`, `DataTable`, `FilterBar`, `OrderCart`, `PaymentDialog`, `KitchenTicket`, `FeatureGate`, `EmptyState`, `ConfirmDialog`, `AuditTimeline`.
4. Implement responsive dashboard, POS, orders, KDS, catalogue, settings and onboarding using realistic **clearly labelled seed/demo data** before connecting production services.
5. Add a central **server-enforced entitlement service** with a complete matrix for Free/Professional/Business × trial/active/grace/read-only × merchant status × QRIS channel.
6. Use approved Neon PostgreSQL databases per restaurant plus the central platform database and implement tenant-safe models and transactional order/cash flows; write unit/integration tests before payment integrations.
7. Build Midtrans integration behind an interface; use sandbox for development only. Production verification and channel activation must be explicitly checked before enabling real dine-in/QRIS.
8. Add advanced modules in priority order; do not ship AI auto-publication, unverified payment success or untested offline sync.
9. Validate keyboard/touch UX, tablet layout, 320px mobile width, Indonesian currency/date formatting, loading/error/empty states, accessibility, and audit logs.
10. Deliver source code, environment variable template (without secrets), migration files, seed data, automated tests, README, architecture diagram, and a demo walkthrough.

#### 5.6.1 Suggested project structure
```text
apps/
  web/                 # React/Next.js app
  api/                 # Backend API
packages/
  ui/                  # Shared design system
  domain/              # Orders, pricing, entitlements
  config/              # Shared lint, TypeScript, schemas
infra/                 # Deployment and monitoring config
docs/                  # PRD, architecture, API, ADRs
tests/                 # End-to-end and contract tests
```

**Authority clarification:** These are retained planning instructions for a future authorised implementation. This task changes documentation only. React/Vite, Hono/Workers, Drizzle/Neon and A1–A8 control over any earlier Next.js/Node project-layout suggestion. The apps/packages tree above is optional packaging, not an approved monorepo requirement. Repository audit and a reviewed implementation plan should precede a future UI/AI build. AI or premium styling approval is not inferred from documentation inclusion.

</details>

## 6. Database Schema

Skema berikut adalah model logis untuk mendukung aturan produk. Teknologi dan pemisahan database mengikuti A1–A2; nama tabel, kolom, indeks fisik, dan migrasi masih merupakan rancangan implementasi. Referensi antar-project berupa ID logis dan tidak diasumsikan memiliki foreign key lintas database.

| Kelompok data | Entitas utama | Fungsi dan batasan |
|---|---|---|
| Identitas/platform | users, businesses/tenant registry, business_memberships | Identitas, keanggotaan, peran, dan pemetaan tenant; lokasi fisik rinci mengikuti desain autentikasi/provisioning |
| Paket/langganan | plans, plan_prices, plan_entitlements, subscriptions, subscription_payments | Free Rp0 tanpa recurring; paid trial/aktif/grace/read-only, harga bulanan/tahunan, mandat dan hasil penagihan |
| Merchant/channel | merchant_onboarding, merchant_payment_channels | Bukti verifikasi merchant dan aktivasi QRIS produksi yang terpisah dari langganan; kepemilikan pusat/cache operasional perlu dirancang jelas |
| Konfigurasi restoran | outlet_profiles, business_settings, tax_service_rules | Profil outlet utama, struk, aturan biaya dengan versi dan penerapan tipe pesanan |
| Katalog | products/categories, product_variants_modifiers | Produk, kategori, harga, opsi, dan ketersediaan manual |
| Meja/pesanan | areas, tables, orders, order_items | Pesanan independen, nomor unik, snapshot harga/biaya, status persiapan dan penyajian item |
| Pembayaran/struk | payments, payment_attempts, receipts | Satu pembayaran normal penuh, pemulihan percobaan QRIS, referensi provider, hasil verifikasi dan snapshot struk |
| Dapur/event | kds_dispatches, kds_item_events, order_priority_events | Dispatch unik, progres/hold item, prioritas dengan actor dan waktu |
| Pengecualian | exceptions, exception_items, adjustments, refunds | Permintaan/persetujuan, status sebelum hold, reversal/replacement terkait, hasil refund terpisah dari approval |
| Kas | cashier_sessions, cash_drawer_events | Saldo awal, expected/actual, selisih, alasan, metode pembayaran, dan koreksi tercatat |
| Audit/notifikasi | audit_events, notifications, notification_deliveries, outbox_events, processed_events | Jejak tindakan, notifikasi satu kali, pengiriman yang dapat diulang tanpa efek ganda |
| Fitur masa depan | ingredients, inventory_movements, recipes, recipe_lines, customers, loyalty_ledger, promotions | Belum menjadi tabel wajib MVP; perlu keputusan dan desain fase terkait |
| AI, usulan | menu_import_jobs, menu_import_images, menu_import_draft_items, menu_import_duplicate_candidates, menu_import_publications, menu_import_audit_events | Draft privat, sumber/ketidakpastian, koreksi, duplikasi, versi dan hasil publish yang aman saat diulang |

### Aturan penyimpanan

- **Uang:** Gunakan representasi integer sesuai mata uang/gateway dan kebijakan presisi yang disepakati; hindari floating point biner untuk perhitungan uang.
- **Waktu:** Simpan waktu sebagai UTC yang tidak ambigu; tampilkan dan laporkan sesuai zona waktu bisnis. Default zona waktu dan batas hari laporan masih TBD.
- **Snapshot:** Simpan nama/harga produk, modifier, diskon, tarif/penerapan biaya, dan nilai struk pada transaksi. Perubahan menu/pengaturan tidak menulis ulang transaksi lama.
- **Isolasi dan Keunikan:** Query dan relasi harus tenant-safe. Terapkan keunikan nomor pesanan, kunci idempotensi, event provider, dan dispatch sesuai scope yang dirancang. Kebijakan sequence/indeks tepat masih perlu ditetapkan.
- **Transaksi dan Audit:** Pembayaran dan jurnal/outbox terkait harus konsisten. Koreksi finansial bersifat terkait/append-only; approval dan hasil finansial disimpan sebagai status berbeda.
- **Privasi dan Retensi:** Nama takeaway opsional, akun/nomor telepon pelanggan tidak diwajibkan. Akses pemulihan 30 hari tidak berarti semua catatan wajib dihapus setelah 30 hari; aturan retensi hukum tetap perlu ditinjau.

Rincian kolom/relasi baseline dan model tambahan tetap tersedia di bawah. Field masa depan seperti assigned_station tidak mengaktifkan beberapa stasiun dapur pada MVP, dan table_sessions tidak boleh membentuk tagihan gabungan.

<details>
<summary>Rincian referensi: entitas, kolom, relasi, dan data AI</summary>

### 6.1 Conceptual Data Model

This section is a **proposed implementation schema** intended to make the approved workflows buildable. PostgreSQL on Neon and database-per-restaurant are confirmed by A1–A2 (Section 5.1). Physical tables, field names and indexes below remain a proposed implementation schema.

| Entity | Key fields / relationships | Purpose / important constraints |
|---|---|---|
| `businesses` | `id`, name, status, locale, timezone | Tenant root, hard isolation boundary. |
| `outlet_profiles` | `id`, `business_id`, address/profile | Single primary outlet in MVP; future multi-outlet readiness. |
| `users` | `id`, identity/auth fields | Actor identity; secure credentials. |
| `business_memberships` | `business_id`, `user_id`, role, active | Tenant role and employee-limit count. |
| `business_settings` | `business_id`, receipt and operational settings | Business-specific configuration. |
| `tax_service_rules` | `business_id`, charge type, rate, applicable order types, version | Snapshotted to completed order. |
| `plans` | `id`, tier, status | **Free (fixed Rp0, perpetual), Professional, Business** catalogue. |
| `plan_prices` | `plan_id`, monthly/annual, amount IDR, effective date | Platform-admin configured Professional/Business prices; Free Rp0, no paid billing cycle. |
| `plan_entitlements` | `plan_id`, capability, seat cap | Server-enforced features and usage. |
| `subscriptions` | `business_id`, plan, cycle, trial and paid dates, status | Permanent Free or paid trial, active, grace, read-only logic. |
| `merchant_onboarding` | `business_id`, provider, status, evidence_ref, verified_at, verified_by | Restaurant Midtrans registration/approval proof, independent of SaaS recurring mandate. |
| `merchant_payment_channels` | `business_id`, provider, method, production_status, verified_at | QRIS channel activation independent of merchant onboarding approval. |
| `subscription_payments` | subscription, provider reference, verified state | Separate from customer POS payments. |
| `products` | `business_id`, SKU/name/category, availability | Manual availability flag. |
| `product_variants_modifiers` | product, option, price delta | Menu configuration. |
| `tables` / `areas` | `business_id`, area, table number/status | Table map and associated order grouping. |
| `orders` | `id`, `business_id`, outlet/table, order type, public number, amount snapshots, lifecycle | Financially independent per order. |
| `order_items` | order, product snapshot, quantity, modifiers, preparation/serving states | Item-level readiness and service. |
| `payments` | order, method cash/QRIS, amount, status, references | One full normal payment per order. |
| `payment_attempts` | payment/order, provider ID, amount, expiry, verification timestamps | Recover pending QRIS attempts safely. |
| `receipts` | order, version, printable/digital snapshot | Reprint/history with original amounts. |
| `kds_dispatches` | order, event ID, dispatched timestamp, status | Idempotency and retry/reconciliation. |
| `kds_item_events` | item, actor, old/new state, time | Preparation, hold, served audit. |
| `order_priority_events` | order, actor, priority old/new, time | Manual priority audit. |
| `exceptions` | order, requester, approver, reason, status, timestamps | Privileged correction record. |
| `exception_items` | exception, item, pre-hold state, requested/approved adjustment | Item-specific holds. |
| `adjustments` | original order/item refs, reason, delta, linked new item | Immutable reversal/replacement ledger. |
| `refunds` | adjustment/payment refs, requested/approved/provider status, amount | Separate approval vs financial fulfillment. |
| `cashier_sessions` | business/cashier, opening, expected, counted, difference, reason | Session and reconciliation record. |
| `cash_drawer_events` | session, type, amount, payment/refund ref | Cash movement ledger; supported types TBD. |
| `notifications` / `notification_deliveries` | business, event, recipient, delivery status | One-time visual and KDS arrival alerts. |
| `audit_events` | actor, tenant, entity, action, prior/new state, time | Append-only accountability. |
| `outbox_events` / `processed_events` | unique key, payload, delivery / processed marker | Reliable idempotent workflows. |

#### 6.1.1 Data storage rules

- **Currency:** Store IDR amounts in integer minor/whole units appropriate to the configured transaction currency and gateway, with a documented precision and rounding policy; avoid binary floating point for money.
- **Time:** Persist timestamps as unambiguous UTC instants and render/report in the business's configured timezone. Default timezone selection and reporting day boundary **TBD**.
- **Snapshots:** Persist product name, unit price, applied modifiers, discounts, tax/service configuration and receipt values in each completed order. Later catalogue changes do not rewrite history.
- **Tenant scope:** Make foreign keys and queries tenant-safe; recommended compound unique indexes include (`business_id`, public order number scope) and (`provider`, provider event ID), but precise uniqueness/sequence policy TBD.
- **PII minimisation:** Takeaway name is optional; only process data necessary for the order. No mandatory customer account.
- **Retention:** Subscription recovery access is 30 days after end; legal record retention is separately governed by applicable Indonesian requirements and must be reviewed. No unconditional delete-all claim.

### 6.2 Supplemental logical model — proposed, not migration SQL

- `businesses(id, name, owner_user_id, created_at)`
- `outlets(id, business_id, name, timezone, currency, settings)`
- `users(id, email, auth_state)`; `memberships(user_id, business_id, outlet_id, role, status)`
- `subscriptions(id, business_id, plan, state, trial_start, trial_end, grace_end, billing_consent_ref)`
- `merchant_verifications(id, business_id, provider, status, verified_at, evidence_ref)`
- `payment_channels(id, business_id, outlet_id, provider, channel, environment, status)`
- `categories`, `menu_items`, `menu_variants`, `modifier_groups`, `modifier_options`, `item_modifier_groups`
- `orders(id, business_id, outlet_id, order_type, status, total_idr, idempotency_key, created_by)`
- `order_lines(id, order_id, menu_item_id, quantity, unit_price_idr, snapshot_json)`
- `payments(id, order_id, method, provider_ref, amount_idr, status, idempotency_key)`
- `payment_events(id, payment_id, provider_event_id, payload_hash, processed_at)`
- `kitchen_tickets(id, order_id, status, assigned_station, timestamps)`
- `tables(id, outlet_id, floor_id, label, capacity, status)`; `table_sessions(id, table_id, order_id, status)`
- `shifts(id, outlet_id, cashier_id, opening_float_idr, expected_close_idr, counted_close_idr, status)`
- `cash_movements(id, shift_id, type, amount_idr, reason, source_ref)`
- `ingredients(id, outlet_id, name, base_unit, reorder_threshold)`
- `inventory_movements(id, ingredient_id, quantity_base_unit, movement_type, source_ref, actor_id)`
- `recipes(id, menu_item_id, version, effective_from)`; `recipe_lines(id, recipe_id, ingredient_id, quantity_base_unit)`
- `promotions`, `customers`, `loyalty_ledger`, `audit_events`, `ai_jobs`, `ai_suggestions`.

Use UUID/ULID IDs; index business/outlet/status/date filters; foreign keys; unique idempotency keys scoped appropriately. All records with business data require tenant checks. This is a **logical model**, not final migration SQL.

**Placement/caveats:** These are illustrative aliases/extensions of the baseline model, not duplicate mandatory tables. businesses/users/memberships/subscriptions/merchant eligibility metadata map to central platform responsibilities as designed; restaurant orders/items/payments/KDS/receipts/cash/audit belong in the restaurant database. Cross-project references are logical IDs, not assumed enforceable cross-database foreign keys. The exact allocation of merchant evidence and restaurant operational caches is a design TBD requiring clear ownership/reconciliation.

The assigned_station field does not enable multiple KDS stations in MVP. table_sessions must not create a common running bill, split billing or manually overridden occupancy. ingredients, inventory_movements, recipes, recipe_lines, promotions, customers and loyalty_ledger are future. ai_jobs/ai_suggestions are proposed. UUID/ULID choice and physical indexes are engineering proposals; no final SQL is approved here.

### 6.3 AI draft and publication data — reconstructed proposal

| Proposed entity | Key data and relationships | Constraints |
|---|---|---|
| menu_import_jobs | id, business_id, actor_id, state, provider/model, schema_version, usage/cost, request key, attempts, timestamps/error | Tenant-scoped; unique submission key; bounded retry; no production product implied |
| menu_import_images | id, job_id, business_id, private object reference, type/size, source page/order, retention status | Authorised source access only; no public permanent image URLs |
| menu_import_draft_items | id, job_id, source image/region, suggested fields, edited fields, uncertainty, validation/review status, version | Money validated with confirmed currency policy; missing price stays unresolved; changes invalidate relevant review |
| menu_import_duplicate_candidates | draft item, existing product/draft reference, match evidence, merchant resolution | Same tenant only; no automatic destructive merge |
| menu_import_publications | job_id, publisher, draft version, idempotency key, state, created/updated/skipped results, timestamp | Unique publish operation; retries return same outcome; concurrent edits rejected/reviewed |
| menu_import_audit_events | tenant, actor, job/item, action, before/after, provenance, timestamp | Auditable upload/extract/edit/review/publish; redact secrets and minimise image/PII duplication |

Physical names, cost representation, JSON field schemas, quotas, cleanup and atomic versus partial publication policy remain TBD. Prefer restaurant-scoped draft/publication integrity with a clearly designed platform metering boundary. Private object storage does not replace database access checks.

</details>

## 7. Tech Stack

Pilihan teknologi di bawah merupakan keputusan yang sudah dicatat pada PRD, bukan perubahan stack atau klaim bahwa semua layanan sudah diintegrasikan. Revisi ini tidak mengubah kode atau memberikan petunjuk konfigurasi API baru.

| Lapisan | Teknologi | Status |
|---|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS | Dikonfirmasi A1 |
| Backend | Hono pada Cloudflare Workers | Dikonfirmasi A1 |
| ORM/database | Drizzle ORM, PostgreSQL pada Neon | Dikonfirmasi A1/A2; database/project restoran terpisah dan platform pusat |
| Autentikasi | Neon Managed Better Auth, email/password dan Google OAuth | Dikonfirmasi A3; peran dan keanggotaan diperiksa server |
| Realtime/pengiriman | Cloudflare Durable Objects WebSockets, Cloudflare Queues, PostgreSQL transactional outbox | Dikonfirmasi A4 |
| Konsistensi finansial | State machine PostgreSQL, idempotensi, jurnal immutable dan rekonsiliasi | Dikonfirmasi A5 |
| Jadwal penagihan | Cloudflare Cron dan tabel billing Neon pusat | Dikonfirmasi A6; gateway/instrumen recurring TBD |
| Printer | Browser/OS print, layout thermal 58/80 mm, PDF, adapter/companion kompatibel opsional | Dikonfirmasi A7; kombinasi hardware harus diuji |
| Hosting pilot | Cloudflare Workers dan Neon dengan rencana pilot terbatas pada free plan | Dikonfirmasi sebagai arah A8; wajib penilaian risiko/kesiapan sebelum pembayaran live |
| Komponen Emerald | Customised shadcn/ui dan komponen khusus POS/KDS | Usulan; tidak mengubah kewenangan stack A1 |
| Form/data frontend | Zod dan TanStack Query | Usulan blueprint; kompatibilitas perlu divalidasi |
| AI/gambar | Adapter vision/OCR dan penyimpanan objek privat | Usulan; provider/model/penyimpanan TBD |

Blueprint sebelumnya menyebut Next.js, Node/NestJS, Redis, serta model hosting generik. Pilihan tersebut tidak menggantikan A1–A8. Aplikasi lama pada repository merupakan simulasi Next.js/SQLite dan bukan bukti bahwa stack produksi yang disetujui sudah dibangun.

Versi package, batas layanan, biaya aktual, kompatibilitas, dan detail konfigurasi ditentukan pada pekerjaan implementasi/verifikasi berikutnya. Aplikasi native/PWA, offline checkout, dan provider tambahan tidak dijanjikan sebagai MVP.

<details>
<summary>Rincian referensi: stack yang disetujui dan alternatif blueprint</summary>

### 7.1 Confirmed stack and proposed compatible components

| Layer | Status | Selection / constraint |
|---|---|---|
| Web frontend | Confirmed A1 | React + Vite + TypeScript + Tailwind CSS; responsive browser UI |
| Backend/runtime | Confirmed A1 | Hono on Cloudflare Workers |
| ORM/database | Confirmed A1/A2 | Drizzle ORM + PostgreSQL on Neon; separate Neon project/database per restaurant; central platform project; not D1 |
| Authentication | Confirmed A3 | Neon Managed Better Auth, email/password and Google OAuth; membership/fixed MVP RBAC; approved PIN/dashboard mechanisms |
| Live events | Confirmed A4 | Durable Objects WebSockets, restaurant transactional outbox, Cloudflare Queues, reconnection snapshots |
| Financial layer | Confirmed A5 | PostgreSQL state machines, idempotency, immutable journal, reconciliation |
| Subscription scheduling | Confirmed A6 | Cloudflare Cron and central Neon billing; approved tokenised gateway is TBD |
| Printing | Confirmed A7 | Browser/OS, 58/80mm layouts, PDF; optional tested direct adapter/companion |
| Pilot hosting | Confirmed A8 intent | Limited free Workers/Neon pilot only after stated readiness/risk gates; no uptime/capacity guarantee |
| Premium UI primitives | Proposed | Customised shadcn/ui, reusable purpose-built POS/KDS components |
| Client data/forms | Proposed from blueprint | TanStack Query; Zod; accessible primitives; validate compatibility before adoption |
| Object storage | Proposed | Private menu images/receipt exports as required; provider/residency/retention TBD |
| AI vision/OCR | Proposed | Provider-independent backend adapter, validated JSON and cost caps; provider/model TBD |
| Email/SMS | Optional proposal | Provider/need TBD; do not imply a free or approved integration |

Exact package versions, compatibility/security verification and deployment configuration are implementation tasks; no version is invented here. No vendor capability, current free-plan quota or price is asserted by this PRD.

### 7.2 Earlier blueprint alternatives — superseded for the approved baseline

The available blueprint suggested Next.js/React frontend, a Node.js modular monolith (NestJS or equivalent), REST/OpenAPI, PostgreSQL, Redis jobs/caches, object storage and WebSocket/SSE with polling fallback. These ideas are retained for traceability, but Next.js, Node/NestJS hosting, Redis and a generic shared PostgreSQL tenancy model are not the approved stack: A1–A8 select React/Vite, Hono/Workers, Cloudflare Queues/Durable Objects and Neon database-per-restaurant. REST/OpenAPI, forms, private storage and polling/reload fallback remain compatible implementation proposals where needed.

The blueprint's security recommendations—HTTPS, secure cookies or rotated tokens, MFA for privileged roles, RBAC, tenant isolation, rate limits, input validation, encrypted secrets, backups, observability and incident response—are retained. MFA and exact cookie/token design are proposals subject to A3 and security review, not claims of implemented authentication.

The blueprint mentioned PWA and future native Android/iOS. These are optional proposals; core POS remains a browser application. Offline discovery would require local durable storage, device identity, ordered events, idempotent sync, stock reconciliation and conflict policy. Offline cash checkout is excluded from MVP, and offline QRIS success must never be fabricated.

</details>

## 8. Deployment

Deployment dilakukan bertahap agar kemampuan yang ditawarkan sesuai dengan integrasi yang benar-benar terverifikasi. Arah pilot menggunakan Cloudflare Workers dan Neon mengikuti A8; penggunaan free plan bukan jaminan kapasitas, availability, atau keamanan finansial.

### Lingkungan dan proses rilis

- **Development:** Data sintetis, identitas/database terpisah, dan pembayaran simulasi/sandbox. Tidak menggunakan kredensial atau uang pelanggan sungguhan.
- **Staging:** Lingkungan menyerupai produksi untuk menguji provisioning tenant, autentikasi, migrasi, event/reconnect, pembayaran sandbox, hak paket, printer, dan pemulihan. Secret serta referensi merchant terpisah dari produksi.
- **Pilot Produksi:** Kelompok bisnis terbatas setelah provider, kebijakan finansial, keamanan, backup, monitoring, dukungan, dan penilaian risiko A8 selesai serta persetujuan pembayaran live diperoleh.
- **Perluasan Produksi:** Dilakukan setelah bukti hasil pilot, kapasitas, target layanan, serta harga dan hak paket yang akan dipasarkan telah dikonfirmasi.

Pipeline yang diusulkan meliputi peninjauan perubahan, pemeriksaan tipe/lint/keamanan serta pengujian yang relevan, deployment staging, validasi migrasi pusat dan setiap restoran, pengujian penerimaan, rilis bertahap, lalu pemeriksaan kesehatan dan rekonsiliasi. Penyedia CI dan detail mekanismenya masih merupakan pilihan implementasi.

### Syarat sebelum rilis

- **Alur Utama Lulus:** Free signup, trial berbayar dengan mandat sah, menu, tunai, struk, sesi kas, KDS, meja/penyajian, takeaway ketat, pengecualian, dan dashboard berjalan sesuai lingkup. QRIS dan meja tetap dikunci ketika syarat merchant/kanal belum terpenuhi.
- **Integritas Terbukti:** Tidak ada charge atau dispatch ganda, keberhasilan pembayaran/refund palsu, penimpaan transaksi lunas, bypass persetujuan, kebocoran tenant, atau rekonsiliasi kas yang salah.
- **Provider Terverifikasi:** Kontrak, onboarding, settlement langsung, keamanan callback/status, expiry, refund, serta recurring consent benar-benar didukung. Fitur yang belum terverifikasi tidak boleh dijanjikan aktif. Tidak ada klaim persetujuan Midtrans hanya dari dokumen ini.
- **Perangkat Teruji:** Jalur cetak thermal/digital lulus pada kombinasi Windows/Android, browser, printer, dan koneksi yang dinyatakan didukung. Tidak ada janji universal bahwa semua USB/Wi-Fi/Ethernet/Bluetooth printer bekerja.
- **Keputusan Terbuka Ditutup:** Harga, batas paket, matriks fitur, formula pajak/laporan, aturan provider dan target operasional yang diperlukan untuk lingkup rilis sudah diputuskan. Ekspansi AI atau Emerald memerlukan persetujuan tersendiri.
- **Penerimaan dan Legal:** Jalankan AC-001–AC-050 beserta pengujian provider, perangkat, keamanan, dan privasi yang relevan; selesaikan peninjauan ketentuan pelanggan, privasi, pajak dan retensi yang diperlukan.

### Operasional dan pemulihan

Migrasi database harus berversi dan dapat dipantau per restoran. Rencanakan kegagalan sebagian dan kompatibilitas rilis. Rollback aplikasi tidak boleh menghapus jurnal atau transaksi lunas; gunakan koreksi/migrasi dan pemulihan yang menjaga riwayat finansial.

Pantau kegagalan login, checkout, QRIS pending/terlambat, mismatch nominal, antrean/outbox, reconnect, tagihan, refund, dan insiden keamanan. Redaksi secret/data pribadi pada log. Backup independen mencakup platform, setiap database restoran, serta objek privat yang diperlukan; lakukan uji restore dan rekonsiliasi setelah pemulihan. Jadwal, retensi, residency, RPO/RTO, kapasitas, biaya, ambang alert, dan penanggung jawab operasional masih TBD.

Risiko yang tetap dicatat mencakup kelayakan kerja sama provider, metode recurring yang belum cocok, callback QRIS yang berlomba dengan fallback, meja tersedia sebelum tamu pergi, nomor takeaway yang terlupa, hold menunggu manajer, audio browser terblokir, printer tidak kompatibel, refund tidak tersedia, dan perhitungan finansial yang belum final. Penanganannya mengikuti register risiko serta aturan v1.1; tidak diselesaikan dengan mengubah perilaku diam-diam.

**Batas pekerjaan revisi ini:** Hanya dokumen PRD dan pembaruan PR dokumentasi. Tidak ada perubahan kode aplikasi, merge, deployment, atau aktivasi pembayaran live.

<details>
<summary>Rincian referensi: release gates, roadmap, risiko, dan operasional</summary>

### 8.1 MVP Release Gates and Definition of Done

#### 8.1.1 Functional release gates

1. End-to-end **permanent Free** signup and Professional/Business trial registration, billing status and role-bound workspace isolation work. Free needs no SaaS mandate; **paid trial requires verified eligible recurring mandate** or a separately approved launch-policy revision. Do not ship an unsupported auto-charge promise.
2. Cash POS, menu, taxation/service-charge rules, receipt paths and cashier session reconciliation are functional.
3. **Free always excludes table ordering and QRIS.** Professional/Business may process cash takeaway before Midtrans approval; table ordering requires verified merchant onboarding and QRIS requires additional verified production activation. If provider onboarding/settlement is unavailable, affected paid features remain disabled while cash takeaway works. Do not claim full QRIS release completeness.
4. Paid-before-KDS invariant is tested for cash, QRIS, reconnection, late callbacks, retries and exceptional replacements.
5. Single KDS covers New/Preparing/Ready, item-level readiness, FIFO/manual priority and browser audio fallback.
6. Dine-in independent orders/table state, item-level serving and takeaway strict pickup/handover are tested.
7. Exception request/hold/approval/rejection/refund adjustments work with RBAC, audit, and financial-state honesty.
8. Basic dashboard reconciles with tested payment/refund/session definitions.
9. Restore/backup, audit event retrieval, security scans and required privacy/terms review are completed.
10. Actual printer/device matrix passes agreed acceptance tests or unsupported paths are clearly hidden/marked unavailable.

#### 8.1.2 Release blocker classifications

- **Hard blocker:** cross-tenant data leakage, double charging, unverified KDS dispatch, paid-order destructive overwrite, security bypass of approvals, incorrect cash reconciliation, false provider settlement/refund state.
- **Launch-scope blocker:** provider- or hardware-specific feature is not verified but UI promises it works. Disable or revise release claims rather than guess.
- **Open product decision:** exact plan prices, employee limits, feature matrix, tax formula and nonfunctional numeric targets require stakeholder resolution before corresponding release acceptance.

### 8.2 Six-Phase Implementation Roadmap and Dependencies

| Phase | Original modules retained | Confirmed MVP/future placement | Main dependency / deliverable |
|---|---|---|---|
| **0 — Foundation & Configuration** | 1 Business Settings; 2 Basic Accounts & Security; 3 Core Data | **MVP.** Add perpetual Free registration, paid trial/subscription state, merchant onboarding status, pricing and entitlements. | Identity/tenant isolation, merchant status verification, schema, paid recurring-provider eligibility. |
| **1 — Menu & POS** | 4 Menu Management; 5 POS Transactions; 6 Cashier Sessions | **MVP.** Cash takeaway for Free and paid pending Midtrans; paid-gated Dynamic QRIS, printing, recovery and reconciliation. | Correct charge calculations, verified merchant/QRIS activation, payment verification, device/receipt tests. |
| **2 — Tables & Orders** | 7 Table Management; 8 Order Management; 9 Bill Management | **MVP.** Paid-entitled and merchant-verified independent table orders; single KDS, serving, takeaway, controlled exceptions; **no split bills**. | Merchant activation gate, KDS events, order state machines, paid-first rule, approval security. |
| **3 — Dashboard & Inventory** | 10 Dashboard & Analytics; 11 Inventory Management | **Basic Module 10 subset promoted to MVP.** Advanced reports and full Module 11 remain Phase 3. | Trusted financial ledger/report definitions; future recipe/stock design. |
| **4 — Customers & Employees** | 12 Customer Management; 13 Advanced Employee/RBAC | **Future.** MVP uses only necessary fixed operational roles. | Stable identity/customer consent model and tenant security. |
| **5 — Integrations & Optimisation** | 14 Future Payment/External Integrations; 15 Multi-Outlet; 16 Operational Optimisations | **Future.** Customer QRIS from Module 14 was expressly moved into MVP; broader integrations remain later. | External contract/provider verification, multi-outlet data design. |

#### 8.2.1 Proposed build order within the MVP (engineering sequencing; not a new product decision)

1. **Foundations:** tenancy, identity, roles, product/order schemas, permanent Free and paid plan catalogue, merchant status/feature gates, event/audit ledger and configured financial rules.
2. **Minimum cash transaction:** menu, cart, full cash checkout, receipts, cashier sessions and no-draft discard.
3. **Core service:** independent table orders, single KDS, manual acceptance, item readiness, serving, takeaway pickup.
4. **External customer payments:** Midtrans assessment/onboarding, Dynamic QRIS, verified status, pending recovery, retries and refund support if enabled.
5. **Controlled exceptions:** hold, manager approval, replacement financial deltas, provider refund reconciliation and staff notifications.
6. **SaaS commercial hardening:** Free registration without mandate; paid recurring-billing provider, trial-to-paid flow, grace/read-only/recovery, merchant-gated tier enforcement, paid admin pricing.
7. **Insights and release:** basic dashboard, cross-system reconciliation, device compatibility, QA/security and pilot acceptance.

The sequencing may be parallelised; **dependencies** (e.g., verified billing before public paid subscriptions and confirmed payment before KDS) cannot be skipped.

### 8.3 Risks and Mitigations

| Risk | Severity / consequence | Mitigation or decision owner |
|---|---|---|
| Midtrans does not support proposed marketplace/submerchant and direct-settlement model | High — planned QRIS merchant onboarding cannot launch as described | Verify business/technical eligibility and contract before promising feature; keep cash-only fallback. |
| No eligible recurring subscription method meets signup/trial/renewal rules | High — paid SaaS commercial flow blocked; **permanent Free registration remains possible** | Select/validate independent subscription billing provider; revise paid launch policy only with product approval. |
| QRIS webhook race, expired attempts, late success after cash fallback | High — duplicate charges, false kitchen dispatch | Verify provider state, idempotency, pending recovery, reconciliation exception queue, integration tests. |
| Table auto-releases after food served while customers remain seated | Operationally material — table can appear available prematurely | Clearly disclose approved Q41–Q42 behaviour, validate with pilot restaurants; revisit only by a new explicit requirement change. |
| Customer cannot retrieve forgotten takeaway number | Operational friction, uncollected food | Display number prominently on receipt/checkout; acknowledge **no alternative verification/override** under Q63. |
| Exception item remains held because no manager acts | Food delay / customer dissatisfaction | Show persistent pending approval queue and initial one-time visual alert; Q56 explicitly rejects auto escalation/reminders. |
| Browser blocks KDS sound automatically | Missed incoming order sound | Visual alert always functions; enable sound after user interaction and test browsers. |
| Printer model/connection incompatible | Receipt printing unavailable | Tested compatibility matrix; browser print fallback; optional print bridge/companion where validated. |
| Refund capability not enabled for QRIS merchant | Approved refund cannot be completed via API | Manual/external controlled process, accurate pending status, provider reconciliation, clear staff instructions. |
| Tax and service rules incorrectly assumed | Misstated payable/receipts/compliance | Owner configuration plus prelaunch accounting/legal review of rate/base/order/rounding rules. |
| Payment/subscription/tenant secrets exposed | Security/privacy breach | Role boundaries, secret management, encryption, audits, security testing, access minimisation. |
| Feature tiers underspecified at launch | Confusing access and commercial disputes | Finalise precise entitlements, employee caps, and prices before billing public subscribers. |

### 8.4 Supplemental blueprint milestones — engineering proposal

**M0 — Discovery & prototype:** reconcile v1.1 scope, verify Midtrans feasibility, clickable high-fidelity screens, plan-state matrix, data/security design. **Done:** owner approves flows and feature gates.

**M1 — Transactional MVP:** onboarding, Free and paid trial rules, catalogue, cash takeaway POS, basic orders, entitled KDS, staff roles, dashboard, audit. **Done:** realistic end-to-end cash sale with no duplicate records, tested tenant isolation and plan gates.

**M2 — Paid dine-in & QRIS:** merchant verification status, floor/table workflow, Dynamic QRIS channel checks, secure webhooks and reconciliation. **Done:** test suite proves unverified/Free cannot bypass gates and payment statuses reconcile correctly.

**M3 — Operations (original proposed grouping; approved scope overrides):** shifts, cash book, modifiers, stock, recipes/HPP, printer support, exports. **Done:** inventory and shift balances reconcile against controlled test datasets.

**M4 — Growth:** multi-outlet, promotions/loyalty, photo-to-menu AI, evidence-linked AI insights, evaluated offline support. **Done:** feature-specific acceptance tests, privacy review and performance benchmarks.

These M0–M4 labels are optional delivery slices, not a replacement for approved Phases 0–5/Modules 1–16. Cashier sessions, modifiers and customer receipts already belong to MVP; inventory/recipes/HPP, advanced exports and growth functions remain future. AI and offline investigation need separate feature approval. None of these phases is declared complete by this rewrite.

### 8.5 Environments, delivery and operations — proposed implementation under A8

| Environment | Purpose | Boundaries |
|---|---|---|
| Local/development | Synthetic fixtures, isolated identities/databases, unit/integration/device work | No live credentials or money; clearly label simulations |
| Staging | Production-like Workers, Neon platform/restaurant projects, queues, Durable Objects and Cron | Separate secrets and payment sandbox; test auth/OAuth callbacks, tenant provisioning, migrations, replay/recovery and printers |
| Controlled production pilot | Small explicitly accepted cohort | Verified provider agreements and features, mandatory A8 risk assessment/approval before live payments, tested backups/monitoring/support |
| Wider production | Graduated rollout after pilot evidence | Capacity/SLOs and paid pricing/entitlements confirmed; incident/rollback/recovery procedures operational |

Proposed delivery pipeline: review documentation/spec changes → type/lint/security and relevant unit/integration/contract tests → staging deployment → platform and per-restaurant migration validation → tenant/role/entitlement/payment/reconnect/receipt acceptance → reviewed release → staged production rollout → health/reconciliation checks. Exact CI provider, environment identifiers, branch protection and approval mechanics remain implementation choices.

Use versioned migrations and track each restaurant's schema/provisioning version. Plan partial failures across many restaurant projects, backward-compatible rollout, and operator-visible retry/recovery. Rollback of code is distinct from database/financial rollback: never delete immutable journals or paid orders to undo a deployment. Use corrective migrations and verified restoration procedures as appropriate.

Keep secrets outside source control and browser bundles. Separate test/production merchant references, callback URLs and recurring-gateway tokens. Configure domains/TLS/OAuth/webhook endpoints and health checks; actual values TBD. Run scheduled billing and reconciliation with idempotency and retry controls; paid-plan consent/cancellation semantics must match verified provider behaviour.

Monitor tenant provisioning, login failures/PIN rate limiting, checkout errors, unresolved/late QRIS attempts, mismatched amounts, outbox/queue lag, duplicate suppression, websocket reconnects, overdue billing, refunds awaiting verification and security incidents. Proposed AI monitoring adds failures, extraction quality and spend caps only when approved. Redact secrets/PII; thresholds, on-call owner, alert routing and retention TBD.

Independent backups must cover central platform and each restaurant database plus required private objects. Encrypt backups and test restorations, including referential consistency and reconciliation after replay. RPO/RTO, schedule, retention, residency and disaster-recovery cost remain TBD. Free provider tiers do not substitute for recovery guarantees. The operational budget and any free-tier limitation require validation before the pilot.

Production acceptance must resolve the applicable TBDs and functional gates in Section 8.1, pass AC-001–AC-050 plus provider/security/device cases, and retain evidence. AI/Emerald inclusion in this document does not enable either proposal or authorise live payment activation.

</details>
