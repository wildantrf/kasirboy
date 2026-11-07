# MejaFlow — Product Requirements, UI/UX & Technical Blueprint
**Version:** 1.2 draft extension | **Date:** 8 November 2026 | **Status:** Proposal, not approved

> **Context:** This document translates the five supplied SirMagic marketing screenshots into an implementable product blueprint for **MejaFlow**. The screenshots are visual/feature references, **not evidence of working functionality or technical architecture**. Do not copy SirMagic's brand, exact interface, text, icons, or proprietary assets. This proposal supplements the previously confirmed MejaFlow PRD v1.1; **v1.1 remains authoritative** wherever there is a conflict. Any new features below are proposals, not automatically approved requirements.

## 1. Product vision
An Indonesia-first, mobile-friendly restaurant operating system connecting POS, dine-in tables, kitchen operations, ingredient stock, recipe costing, cash reconciliation, customer promotions, reporting, and optional AI assistance. It should be usable by small F&B merchants and scale to multi-outlet operations.

**Core outcomes:** shorter checkout time; fewer lost kitchen instructions; accurate cash and stock records; visible gross margin; actionable owner reporting; simple onboarding.

**Primary personas:** Owner (business and financial oversight); outlet manager (operations, stock, shifts); cashier (orders, payments, refunds); kitchen staff (KDS tickets); service staff (tables); accountant (reconciliation/reporting); multi-outlet admin (cross-outlet controls).

**Supported surfaces (proposed):** responsive web/PWA for cashier and owner; tablet-optimised kitchen display; mobile browser owner dashboard. Native Android/iOS apps are future options, **not promised**. Offline-first POS is a reference feature requiring separate technical validation; it is **not part of the confirmed v1.1 contract** unless separately approved.

## 2. Binding commercial and onboarding rules from MejaFlow v1.1
- **Free**: permanent Rp0 plan; no trial, no mandatory recurring SaaS payment. Cash takeaway POS is permitted. **No dine-in table ordering and no Dynamic QRIS**, even if Midtrans is connected. Free KDS entitlement and employee/transaction caps remain **TBD**.
- **Professional / Business**: paid monthly or annual plans, with a **30-day free trial starting on MejaFlow registration**. Collect an eligible recurring SaaS payment method and consent upfront. Merchant onboarding **does not pause** the trial or renewals.
- While Midtrans production merchant onboarding is pending/unapproved, paid businesses in trial/active/grace **may process cash takeaway**, including plan-entitled kitchen/KDS and pickup workflow, but **cannot** use dine-in table ordering or QRIS.
- Dine-in table ordering requires **verified production Midtrans merchant onboarding**. Dynamic QRIS additionally requires **verified active production QRIS channel**. Signup and sandbox alone never unlock production features.
- Existing paid-plan lapse has a **7-day grace period**; cancellation results in **read-only** state according to v1.1. **Do not automatically downgrade cancelled paid accounts to Free**; policy TBD.
- Provider partnership/API verification and some entitlements remain **TBD**. Do not claim integration approval or automatic verification before verified.

**Entitlement checks must run server-side** on every protected operation; hiding UI controls alone is insufficient.

## 3. Feature catalogue and proposed priority
| ID | Module | User capability | Proposed priority | Dependencies / caveats |
|---|---|---|---|---|
| F01 | Registration & onboarding | Create business/outlet, select plan, set payment consent where required | P0 | v1.1 plan gates |
| F02 | Product catalogue | Categories, items, variants, prices, availability, tax/service settings | P0 | Per-outlet settings |
| F03 | POS checkout | Search/tap items, edit cart, notes, quantity, cash checkout, receipt | P0 | Cash takeaway permitted per v1.1 |
| F04 | Orders & lifecycle | Create, pay, cancel/void with permissions, kitchen/pickup statuses | P0 | Immutable audit trail |
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
| F20 | Printer integration | Receipts, kitchen tickets, supported printer profiles | P1 | Browser/device compatibility |
| F21 | Offline checkout | Queue eligible cash orders locally and reconcile on reconnect | P2 discovery | Conflict-safe sync; not assumed in v1.1 |
| F22 | Exports | CSV/PDF sales, shift, inventory reports | P1 | Access control |

**P0 = initial release candidate; P1 = next milestone; P2 = later / experimental.** This priority ordering is a recommendation, not an amendment to approved scope.

## 4. End-to-end journeys
### 4.1 Merchant onboarding
1. Sign up, verify identity/email/phone as configured; create business and first outlet.
2. Choose Free or paid plan. For paid, display 30-day trial clock and capture eligible recurring payment method/consent.
3. Configure menu, staff, tax/service fees, receipt details, and cash drawer.
4. Display merchant onboarding as a separate, explicit status: `not_started | pending | verified | rejected | action_required`.
5. Show available operations based on **plan + subscription state + merchant verification + QRIS channel**.
6. Allow eligible cash takeaway orders immediately; do not suggest table ordering or QRIS works before production verification.

### 4.2 Cash takeaway
Cashier starts shift (if shift module enabled) → selects items/variants/modifiers → chooses takeaway → confirms totals → records cash tendered/change → finalises paid order → kitchen ticket created if entitled → kitchen updates ready status → handoff → sales/cash ledgers updated.

### 4.3 Dine-in and QRIS (gated)
Verified paid merchant → select table → create/open order → kitchen ticket → request Dynamic QRIS only if channel verified active → show payment-pending → receive signed, idempotent webhook + server-side status verification → mark paid → receipt/table release. Never treat a QR image display or client callback alone as payment success.

### 4.4 Shift closing
Record opening float → record cash sales, refunds, paid-outs, cash-ins → cashier enters counted cash → system computes `expected cash = opening float + cash sales + cash-ins - cash refunds - paid-outs` → display variance → require reason for threshold breaches → manager review → immutable close snapshot.

### 4.5 Ingredient stock and costing
Define ingredients, canonical units and conversions → attach quantities to versioned recipes → paid/fulfilled order triggers stock movement according to defined business event → low-stock alert → purchase/adjustment entries → compute estimated ingredient HPP per menu item. Prevent double deduction on order retries.

### 4.6 Photo-to-menu AI
Upload photo(s) → image extraction produces draft names/prices/categories/modifiers with confidence indicators → merchant reviews and corrects every field → duplicate detection → explicit Publish action. Never silently publish inferred prices.

## 5. UX and visual direction
### 5.1 Reference interpretation
The screenshots use a clean white/ivory base, dark forest-green accents, rounded cards, restrained yellow highlights, editorial serif headlines, compact sans-serif UI, and dense but organised dashboard tables. Borrow the **design principles**, not the brand or pixel-identical layout.

### 5.2 MejaFlow design tokens (proposal)
- Canvas: `#F8F9F6`; surfaces: `#FFFFFF`; primary: `#155E50`; primary hover: `#10483E`; accent: `#E7B44C`.
- Text primary: `#1C2925`; secondary: `#66736D`; border: `#E2E8E3`; danger: `#B9443F`; success: `#27815D`; warning: `#B97819`.
- Font: Inter or equivalent sans-serif for application UI; optional distinctive serif **only for marketing headings**, never dense transaction tables.
- Radius: cards 12–16px; inputs/buttons 10–12px; pill badges 999px. Spacing based on 4/8px scale.
- Desktop layout: fixed 240px sidebar, topbar 64px, responsive main area; mobile uses collapsible navigation. POS on tablets uses large tap targets (≥44×44px).
- Accessibility: WCAG AA contrast targets, visible focus, keyboard support, non-colour status labels, screen-reader descriptions, readable error states.

### 5.3 Information architecture
**Overview** → Dashboard, alerts, outlet switcher. **Sales** → POS, Orders, Payments, Receipts. **Operations** → KDS, Tables (gated), Shifts, Cash Book. **Catalogue** → Menu, Categories, Modifiers, Recipes. **Inventory** → Ingredients, Movements, Purchases, Alerts. **Customers** → Profiles, Promotions, Loyalty. **Analytics** → Sales, HPP, Menu Engineering, AI Insights, Exports. **Administration** → Outlets, Staff & Roles, Billing, Midtrans Verification, Settings, Audit Log.

### 5.4 Screen-by-screen UI instructions
| Screen | Layout / components | Primary actions | Important states |
|---|---|---|---|
| Dashboard | KPI cards, 7-day chart, sales by hour, top products, alerts, outlet filter | Open POS, view reports | Empty, loading, stale-data timestamp |
| POS | Left catalogue grid/search, right persistent cart, bottom payment CTA | Add/edit items, cash checkout | Offline warning, unavailable item, permission denied |
| Checkout | Order summary, fees, tender input, change, confirmation | Record cash / initiate QRIS when entitled | Pending, paid, failed, duplicate submission |
| KDS | Kanban columns: New, Preparing, Ready; ticket age and modifier detail | Start, ready, handoff | Realtime disconnected, overdue ticket |
| Table plan | Floor switcher, drag/drop table layout (manager), status legend | Open/transfer/close table | Locked with explicit reason and action |
| Catalogue | Table/grid with search, filters, bulk edit, item drawer | Create item, modifier groups | Missing price, unpublished draft |
| Inventory | Stock summary, thresholds, movements table, unit selector | Adjust, receive, count | Negative stock policy, low stock |
| Recipes/HPP | Ingredient rows, quantity/unit/cost, calculated HPP and margin | Save recipe version, simulate costs | Missing conversion, stale cost |
| Shift & Cash | Opening/closing workflow, denomination count, variance panel | Open, record cash move, close | Already open, mismatch, manager approval |
| Promotions | Rules builder, eligibility preview, usage chart | Publish/pause promotion | Expired, conflicting discount |
| AI menu import | Image upload, extraction preview, side-by-side editable draft | Approve each row, publish | Low confidence, unreadable image |
| AI Insights | Summary cards with date range and linked evidence | View source data, dismiss suggestion | Insufficient data; no speculative claims |
| Multi-outlet | Outlet switcher, comparative KPIs, scoped staff access | Add outlet, view consolidated report | No access, data delayed |
| Billing/verification | Plan, trial countdown, status checklist, feature matrix | Complete onboarding, manage plan | Pending merchant, QRIS inactive, grace, read-only |

### 5.5 UX writing examples
- Gated table screen: **“Pesanan meja belum tersedia. Verifikasi merchant Midtrans produksi diperlukan untuk paket berbayar.”**
- QRIS disabled: **“QRIS belum aktif. Selesaikan verifikasi merchant dan aktivasi kanal QRIS produksi.”**
- Free plan: **“Paket Free mendukung kasir takeaway tunai. Fitur meja dan QRIS tersedia sesuai persyaratan paket berbayar.”**
- Payment pending: **“Menunggu konfirmasi pembayaran. Jangan serahkan pesanan sebagai lunas sampai status terverifikasi.”**
- AI import: **“Periksa nama, harga, dan pilihan produk sebelum menerbitkan katalog.”**
- Shift variance: **“Selisih kas Rp25.000. Tambahkan catatan sebelum menutup shift.”**

## 6. Functional requirements and acceptance criteria
**R01 Order integrity:** Each order has stable ID, outlet ID, actor, currency IDR, timestamps, line-item price snapshots, tax/discount breakdown, and lifecycle status. Retried requests with same idempotency key never duplicate paid orders.

**R02 Pricing:** Server calculates subtotal, modifier charges, discounts, tax/service charges and final total using integer rupiah (or integer smallest unit as provider requires); frontend displays same authoritative result. Test stacking, rounding, and zero-value cases.

**R03 Kitchen:** Confirmed order appears once in entitled KDS, includes all notes/modifiers and order age. Kitchen updates cannot modify settled payment amounts.

**R04 Cash:** Cash payment writes a transaction and corresponding cash-ledger entry atomically; refunds and voids require role checks and audit reason.

**R05 Shift:** Only authorised cashier/manager can open or close shift. Closing shows expected vs counted and retains immutable reconciliation snapshot.

**R06 Inventory:** Ingredient movements are append-only and traceable to order/purchase/adjustment; unit conversions are validated; cancellations/refunds follow explicit restock policy.

**R07 HPP:** HPP uses recorded ingredient quantities and effective cost basis; missing costs yield “incomplete” not zero. Margin = `(selling price - estimated cost) / selling price` where price > 0; clarify treatment of tax/overheads in UI.

**R08 Feature gating:** Free cannot create table orders or Dynamic QRIS requests. Paid unverified merchant cannot create table orders. QRIS additionally checks active production channel. Test UI and API bypass attempts.

**R09 Webhooks:** Verify Midtrans signature and server-side transaction status; store event IDs; process idempotently; reject inconsistent amounts/outlets; reconcile unknown statuses.

**R10 Privacy:** Customer data is minimised; consent recorded for marketing; sensitive fields access-controlled; no card details stored in MejaFlow.

**R11 AI safety:** AI output is draft-only for catalogue and advisory-only for insights; user confirmation is required before any business-changing action. Show provenance and confidence/uncertainty.

**R12 Auditability:** Financial changes, access changes, plan/verification state changes, and inventory adjustments include actor, time, reason, before/after (where applicable).

## 7. Suggested technical architecture (not a claim about SirMagic)
**Frontend:** TypeScript + Next.js/React; responsive web UI; TanStack Query; form validation with Zod; component library with accessible primitives; PWA only after offline design review.

**Backend:** TypeScript Node.js modular monolith (NestJS or equivalent) with REST API and OpenAPI schema; background jobs for webhooks, reports, notifications, AI extraction.

**Persistence:** PostgreSQL with tenant/outlet-scoped records, migrations and transactions; Redis for job queues and ephemeral caches; object storage for receipt exports/menu images. Realtime KDS via WebSocket or server-sent events with polling fallback.

**External services:** Midtrans production APIs only after partner/onboarding feasibility verification; email/SMS provider optional; AI provider behind configurable adapter and cost limits. Do not assume any provider is free or already approved.

**Security:** HTTPS, secure session cookies or rotated tokens, MFA for privileged roles, RBAC + tenant isolation, rate limits, input validation, encrypted secrets, backups, observability, incident response.

**Deployment:** Staging + production; CI/CD; automated database migrations with rollback plan; health checks; encrypted backups and restore drills. Choose hosting after budget and traffic estimates.

### 7.1 Offline feasibility note
The screenshot advertises offline-first, but reliable offline cash POS requires local durable storage, device identity, monotonically ordered client events, idempotent sync, stock reconciliation and conflict policy. **Never allow offline QRIS success claims.** Treat offline as a separate spike and product decision, not a quick checkbox.

## 8. Initial data model
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

## 9. API sketch
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

## 10. Design-to-code implementation instructions for Codex / development agent
1. **Read the confirmed MejaFlow PRD v1.1 first.** Do not reinterpret Free, trials, onboarding, grace or cancellation rules.
2. Build an **original MejaFlow design system** inspired by the supplied references: ivory canvas, deep green navigation/actions, compact cards, clear financial tables, restrained gold highlights. No SirMagic logos/copy/assets.
3. Create reusable components: `AppShell`, `Sidebar`, `Topbar`, `OutletSwitcher`, `KpiCard`, `StatusBadge`, `DataTable`, `FilterBar`, `OrderCart`, `PaymentDialog`, `KitchenTicket`, `FeatureGate`, `EmptyState`, `ConfirmDialog`, `AuditTimeline`.
4. Implement responsive dashboard, POS, orders, KDS, catalogue, settings and onboarding using realistic **clearly labelled seed/demo data** before connecting production services.
5. Add a central **server-enforced entitlement service** with a complete matrix for Free/Professional/Business × trial/active/grace/read-only × merchant status × QRIS channel.
6. Connect PostgreSQL and implement tenant-safe models and transactional order/cash flows; write unit/integration tests before payment integrations.
7. Build Midtrans integration behind an interface; use sandbox for development only. Production verification and channel activation must be explicitly checked before enabling real dine-in/QRIS.
8. Add advanced modules in priority order; do not ship AI auto-publication, unverified payment success or untested offline sync.
9. Validate keyboard/touch UX, tablet layout, 320px mobile width, Indonesian currency/date formatting, loading/error/empty states, accessibility, and audit logs.
10. Deliver source code, environment variable template (without secrets), migration files, seed data, automated tests, README, architecture diagram, and a demo walkthrough.

### Suggested project structure
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

## 11. Milestones and definition of done
**M0 — Discovery & prototype:** reconcile v1.1 scope, verify Midtrans feasibility, clickable high-fidelity screens, plan-state matrix, data/security design. **Done:** owner approves flows and feature gates.

**M1 — Transactional MVP:** onboarding, Free and paid trial rules, catalogue, cash takeaway POS, basic orders, entitled KDS, staff roles, dashboard, audit. **Done:** realistic end-to-end cash sale with no duplicate records, tested tenant isolation and plan gates.

**M2 — Paid dine-in & QRIS:** merchant verification status, floor/table workflow, Dynamic QRIS channel checks, secure webhooks and reconciliation. **Done:** test suite proves unverified/Free cannot bypass gates and payment statuses reconcile correctly.

**M3 — Operations:** shifts, cash book, modifiers, stock, recipes/HPP, printer support, exports. **Done:** inventory and shift balances reconcile against controlled test datasets.

**M4 — Growth:** multi-outlet, promotions/loyalty, photo-to-menu AI, evidence-linked AI insights, evaluated offline support. **Done:** feature-specific acceptance tests, privacy review and performance benchmarks.

## 12. Quality assurance test matrix
- Free + verified merchant → cash takeaway allowed; table/QRIS denied.
- Paid trial + merchant pending → cash takeaway and entitled KDS allowed; table/QRIS denied.
- Paid active + merchant verified + QRIS inactive → table enabled; QRIS denied.
- Paid active + merchant verified + QRIS active → eligible table and QRIS workflows enabled.
- Paid grace → only features explicitly permitted by v1.1; no assumption of extra privileges.
- Paid cancelled/read-only → writes blocked as defined by v1.1; no automatic Free conversion.
- Double-click pay/replayed webhook → one settled payment, one stock deduction, one cash entry.
- Different business/outlet actor → cannot read/write another tenant's financial records.
- Network disconnect mid-checkout → safe error/retry; never fake payment confirmation.
- Missing recipe ingredient cost → show incomplete HPP, not false profit.
- AI misreads menu price → user must correct/approve before publish.
- Shift variance → exact computation and persistent audit reason.

## 13. KPIs and analytics events
**Merchant metrics:** activation rate (first successful cash sale), time to first sale, 7/30-day active outlets, orders/outlet/day, checkout completion, KDS preparation time, stockout frequency, cash variance, reporting usage, paid conversion, merchant onboarding completion.

**Events:** `business_created`, `menu_item_created`, `shift_opened`, `order_created`, `cash_payment_confirmed`, `qris_payment_verified`, `kitchen_ticket_ready`, `shift_closed`, `stock_adjusted`, `ai_draft_reviewed`, `feature_gate_blocked`. Avoid recording personal/payment secrets in analytics.

## 14. Open decisions requiring product-owner approval
1. Is the next deliverable a **marketing landing page**, an **interactive UI prototype**, or **working SaaS implementation**?
2. Confirm v1.1 Free employee/transaction limits and KDS entitlement; confirm paid plan feature matrix.
3. Confirm exact subscription grace/read-only capabilities and cancelled account retention.
4. Confirm Midtrans partner/API production verification route and billing-provider separation.
5. Decide whether offline cash POS is required for MVP or deferred.
6. Confirm taxes/service fees, refunds, split bill, printer hardware, stock deduction trigger, inventory negative-stock policy, and costing basis.
7. Confirm which advanced modules belong to Professional vs Business and which need usage-based AI limits.
8. Confirm target hosting budget, data residency/privacy review, and whether native apps are required.

## 15. What the five reference images actually establish
**Cover:** AI-enabled restaurant POS positioning, multi-device dashboard, offline-first claim. **Page 1:** POS, modifiers, table layout, QR ordering, payment, receipt, open bill. **Page 2:** KDS, recipe/HPP, AI insights, menu engineering. **Page 3:** shift/cash book, ingredient inventory, promos/loyalty, reports. **Page 4:** multi-outlet, AI menu-photo import, cross-device sync, four-step onboarding. These are **feature ideas**, not a validated implementation specification or license to reuse proprietary visual elements.
