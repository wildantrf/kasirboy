# MejaFlow UI Design Specification

**Option D — Hybrid SaaS dashboard + touchscreen POS · Emerald**  
**Version:** UI 1.0 · **Date:** 8 November 2026  
**Behavior baseline:** MejaFlow PRD v1.1, Approved Plan & Onboarding Revision  
**Deliverable:** Implementation specification and textual wireframes; no production implementation or rendered accessibility certification is claimed.

## Contents

1. [Authority, sources and scope](#1-authority-sources-and-scope)
2. [Visual direction and screenshot mapping](#2-visual-direction-and-screenshot-mapping)
3. [Business rules and capability gates](#3-business-rules-and-capability-gates)
4. [Design tokens](#4-design-tokens)
5. [Responsive layout and accessibility](#5-responsive-layout-and-accessibility)
6. [Navigation, roles and information architecture](#6-navigation-roles-and-information-architecture)
7. [Permissions and entitlement matrices](#7-permissions-and-entitlement-matrices)
8. [Shared component contracts](#8-shared-component-contracts)
9. [Screen-by-screen wireframe specifications](#9-screen-by-screen-wireframe-specifications)
10. [End-to-end interaction flows](#10-end-to-end-interaction-flows)
11. [Implementation guidance for Codex](#11-implementation-guidance-for-codex)
12. [Acceptance criteria and review checklist](#12-acceptance-criteria-and-review-checklist)
13. [Phase priorities and dependencies](#13-phase-priorities-and-dependencies)
14. [TBD register and handoff](#14-tbd-register-and-handoff)

## 1. Authority, sources and scope

### 1.1 Decision labels

- **CONFIRMED:** Approved product behavior from the user's current instructions or recovered PRD v1.1. Preserve it in implementation.
- **DESIGN:** A concrete UI recommendation made by this specification: dimensions, components, wording, information hierarchy and proposed route names. These do not expand product entitlement.
- **FUTURE / PROPOSED:** A specified design for later exploration, not an approved MVP feature or commercial promise.
- **TBD:** Unresolved business rule, vendor capability, tier allocation, price, limit or release decision. Never substitute an invented value in customer-facing UI.

All layout/token values are DESIGN decisions unless explicitly identified as confirmed. A screen being described here does not make it available in a paid tier. Feature implementation, subscription entitlement, role permission and merchant activation are separate checks.

### 1.2 Sources inspected

| Source | Access and use |
|---|---|
| Referenced ChatGPT conversation, “Create PRD UI Guide”, ID `6aef15b5-f07c-83ec-99b8-3ae64d88eb75` | Recovered the conversation and five attached SirMagic JPGs; inspected all five visually. Confirms Option D and Emerald selection. |
| `IMG_20261108_010750_851.jpg` | Cover/product overview, cross-device dashboard direction. |
| `IMG_20261108_010755_369.jpg` | Front-of-house: POS, modifiers, tables, payment/receipt examples. |
| `IMG_20261108_010757_422.jpg` | Kitchen, HPP/recipe and AI insight examples. |
| `IMG_20261108_010759_545.jpg` | Multi-outlet, menu-photo scanning, cross-device dashboard and onboarding. |
| `IMG_20261108_010801_649.jpg` | Shifts/cash book, ingredients/stock, promotions/loyalty, reporting. |
| `C:/Users/wildan/Downloads/KASIRBOY/docs/PRD_v1.1_REFERENCE.md` | Accessible local PRD copy, dated 6 November 2026. Primary behavioral source, including Sections 3–7, 18–19. This is documentary evidence, not proof of current app functionality. |
| `C:/Users/wildan/Downloads/KASIRBOY/docs/ORIGINAL_FEATURE_ROADMAP_REFERENCE.md` | Preserves six phases and 16 modules; PRD v1.1 supersedes conflicting original roadmap behavior. |
| Older local `MejaFlow Product Requirements Document.md` and `cashier-requirements.md` | Inspected for context; superseded wherever they conflict with v1.1. |
| Previously linked `MejaFlow_PRD_UI_Technical_Blueprint.md` | Conversation exposes a historical sandbox link, but its file contents were not accessible. No claim is made that this combined blueprint was read. |

The screenshots are marketing compositions with small embedded app images. Their broad patterns and captions are observable; precise embedded dimensions, hidden dialogs, font identity and complete workflows cannot be recovered reliably. Measurements below are new MejaFlow design decisions, not measurements of SirMagic. The specification is self-contained and does not require the temporary image files to remain available.

### 1.3 Conflict resolution

Current user instructions take priority, followed by the recovered PRD v1.1, then this UI specification for design choices. Screenshot claims and earlier simulation behavior do not override the PRD.

| Earlier/reference behavior | Authoritative treatment here |
|---|---|
| Offline-first marketing, barcode scanning, open bills, split bills | Online-only MVP; no saved unpaid drafts, no split or mixed payments. Barcode scanning is unconfirmed. |
| Automatic stock and recipes | MVP has manual Available/Sold Out only; inventory/recipes are Phase 3. |
| Earlier oldest-customer-order kitchen sorting | v1.1 uses payment-confirmation/dispatch FIFO, with authorised manual high priority. |
| Earlier owner-only refunds | v1.1 permits manager or owner approval with reauthentication/audit. |
| Earlier all-inclusive prices | v1.1 supports owner-configured tax/service applicability; inclusive/exclusive model, bases and rounding remain TBD. |
| Earlier kitchen line-state privacy | v1.1 explicitly gives waitstaff item-level serving and defines item readiness. Proposed projection: kitchen sees preparation detail; service sees readiness/serving needed for delivery; cashier sees aggregate preparation. Final field-level projection is TBD. |
| Earlier Active/History-only KDS | Design retains those tabs but adds required priority, Mark All as Ready, holds and separate service/pickup views. Ready tickets leave Active; authoritative records remain accessible. |

## 2. Visual direction and screenshot mapping

### 2.1 Product character

MejaFlow is a calm, practical Indonesian restaurant operations tool. Use an Emerald navigation frame, white work surfaces, restrained borders, readable figures and large operational controls. Management screens use compact SaaS tables and charts. POS, KDS and service screens prioritize fast touch actions and persistent order identity.

The memorable detail is a consistent order identity strip: order number, order type/table, elapsed time and plain-language status. Repeat it on payment, KDS, service, pickup, exception and receipt views. Use the same words and identifiers throughout.

No decorative marketing hero inside the app. Gold is a limited informational accent, never a payment success color. Product photography belongs in the POS catalog, not behind financial data. Use MejaFlow branding and original components; do not reproduce SirMagic's logo or marketing artwork.

### 2.2 Reference-to-design traceability

| Reference | Observed pattern | MejaFlow adaptation | Explicit boundary |
|---|---|---|---|
| Cover `_010750_851` | Dark green/white, light neutral background, sidebar, dashboard KPIs, phone/tablet/laptop | Emerald shell; 4 KPI grid; quiet charts; mobile cards | No inference of offline support or native apps from device imagery. |
| Front-of-house `_010755_369` | Product grid with right cart; modifier editor; table map; modal payment/receipt | Split POS workspace; selection sheet; table map/list; focused checkout | Open bill, multi-method and split-bill examples are not adopted. |
| Kitchen `_010757_422` | Ticket/card queue, recipe cost table, AI summaries | Shared paid-order KDS; later HPP worksheet; evidence-linked AI cards | Keep explicit Start Preparing; HPP/AI remain future, not automatic capabilities. |
| Growth `_010759_545` | Outlet summaries, upload-menu modal, four-step onboarding, multi-device analytics | Future outlet hub and import-review flow; resumable setup checklist | Multi-outlet Phase 5; photo OCR approval/tier TBD; no automatic three-minute setup promise. |
| Cash/stock `_010801_649` | Shift reconciliation form, stock table, promotion editor, report preview | Dedicated cash-close worksheet; future inventory table/promotion editor | No MVP ingredient depletion, receipt OCR, points or unapproved promo stacking. |

### 2.3 Design contract by surface

| Surface | Repeated user job | Primary action | Hierarchy | Target viewport |
|---|---|---|---|---|
| Management | Understand sales and configure business | Open POS / save current settings | Scope/date → summary → evidence → detail | 1440×900; 1280×800; 390×844 |
| POS | Record an accurate fully paid order | Pay exact total | Order type → menu → cart → payment | 1366×768; 1024×768 landscape; 768×1024; 390×844 |
| KDS | Accept and prepare paid work | Start Preparing / Ready | Order identity → notes/items → action | 1920×1080; 1280×800; 768×1024 |
| Service/pickup | Deliver the correct ready order | Mark Served / Handed Over | Order number → readiness → verification → action | 390×844; 768×1024 |

These are review targets, not device restrictions. At 320 CSS px management/forms still reflow; dense maps/tables may use an explicitly labelled contained scroll area with a list alternative.

## 3. Business rules and capability gates

### 3.1 Binding commercial rules

1. **Free is permanent Rp0, without a trial or recurring mandate.** It supports basic menu, cash takeaway and eligible receipts/fulfillment. It never supports dine-in table ordering or Dynamic QRIS, irrespective of merchant status. Free employee/transaction limits and full KDS allocation remain TBD.
2. **Professional and Business offer a 30-day trial starting at registration.** Require explicit recurring-payment consent through a supported SaaS billing method. Disclose selected post-trial tier, current monthly/annual price, first charge timestamp and cancellation policy before authorisation.
3. Trial grants **implemented Business-tier capabilities**, subject to role and activation gates. It does not grant nonexistent AI, inventory or multi-outlet features. Merchant delays neither pause nor extend the trial.
4. With merchant onboarding pending/rejected, valid paid trial/active/grace accounts can use **cash takeaway**, including entitled KDS and pickup. Do not block the whole business behind Midtrans onboarding.
5. **Dine-in requires entitled paid access and verified production merchant onboarding.** Merely creating a Midtrans account, entering an email, using sandbox credentials or submitting documents is insufficient.
6. **Dynamic QRIS additionally requires a verified active production QRIS channel.** Merchant approval without active QRIS can unlock entitled dine-in cash while QRIS remains locked.
7. Failed paid renewal starts **7-day grace**, retaining selected paid-tier rights under existing merchant gates. Grace expiry becomes read-only. Billing reminders/retries must follow supported provider terms; schedules are TBD.
8. Cancellation disables next renewal immediately; retain paid access until paid-through date, then read-only. **No automatic downgrade to Free.** Explicit migration/downgrade behavior remains TBD.
9. PRD provides a **30-day recovery/data-access window** after subscription end, subject to legal record retention. Do not promise deletion of all records on day 31. Trial-cancellation timing details require confirmation before final copy.
10. Restaurant customer payments and MejaFlow subscription billing are separate products, permissions, records and onboarding states. No UI may imply an approved Midtrans partnership, QRIS split settlement or recurring billing instrument that has not been verified.

### 3.2 Operational invariants

- Cash requires cashier confirmation of full receipt; QRIS requires authoritative server-verified success. Only then dispatch once to KDS.
- One full normal payment method per order: cash OR Dynamic QRIS. No split bills, partial normal payments or mixed tender.
- Each additional same-table purchase is a separate numbered order and receipt; no editable running paid bill.
- Immediate checkout or discard. Persist initiated pending QRIS records for recovery, not general saved carts.
- KDS starts New; kitchen explicitly Starts Preparing, then marks eligible items Ready, individually or all. Held items cannot progress.
- Dine-in completes after all applicable items Served. Takeaway completes after all applicable items Ready, exact customer order-number match and manual Handed Over.
- Missing pickup number has **no recovery substitute or manager override** in MVP. Optional customer name cannot replace it.
- Table Occupied is derived from active associated orders; Available follows completion of all. Do not add Cleaning/Reserved as MVP lifecycle states. Guests may still be seated when the table becomes Available; this is a documented PRD trade-off.
- No ordinary edit/cancel on paid orders. Use linked, audited exceptions; manager/owner approval and affected-item holds. Approving an exception is distinct from confirming a refund or extra payment.
- Online-only. An offline browser does not accept cash sales or queue payment/fulfillment mutations for later replay.

### 3.3 Capability decision contract

Server returns effective capabilities, reason codes and authoritative expiry timestamps. Client displays the same decisions but never grants permissions itself.

```text
access = authenticated AND active membership AND resource belongs to tenant
operational = FreeActive OR PaidTrial OR PaidActive OR PaidGrace
cashTakeaway = access AND operational AND roleAllowsCheckout
dineIn = access AND operational AND paidFeatureEntitled
         AND merchantProductionVerified AND roleAllowsDineIn
qris = access AND operational AND paidQRISFeatureEntitled
       AND merchantProductionVerified AND productionQRISActive
       AND roleAllowsPayment
kds = access AND operational AND implementedKDSEntitled AND roleAllowsKDS
```

Free's explicit exclusions override merchant flags. A missing/TBD capability fails closed for that capability, while confirmed Free cash takeaway remains usable. New-payment eligibility must be rechecked on the server at submission. Historical payment reconciliation is not disabled merely because new QRIS becomes unavailable.

### 3.4 Lock explanations

| Reason | UI behavior and Indonesian copy |
|---|---|
| Free excludes feature | Disable relevant action; show “Fitur ini tidak tersedia pada paket Free.” Owner: view plan options. Staff: contact owner. |
| Merchant unverified | “Verifikasi merchant belum selesai. Transaksi takeaway tunai tetap tersedia.” Owner: view setup/status. |
| QRIS channel inactive | “QRIS produksi belum aktif.” Retain eligible cash checkout; do not show a fake usable QR. |
| Role denied | Hide unrelated navigation; direct link shows “Anda tidak memiliki akses.” No upgrade CTA. |
| Read-only | Persistent banner with end date; history/billing recovery links; no operational mutation. |
| Not implemented | Omit from live navigation; roadmap preview only in an explicitly labelled preview environment. |
| Limit unknown | No invented “3 staff” or “100 transactions”; block commercial launch until relevant limit decision. |

## 4. Design tokens

### 4.1 Color system

Use semantic variables throughout. Emerald provides brand hierarchy; operational status retains its own meaning.

| Token | Value | Use |
|---|---|---|
| `brand.900` | `#064E3B` | Sidebar, primary hover |
| `brand.800` | `#065F46` | Primary buttons, selected nav text |
| `brand.700` | `#047857` | Links, active accents |
| `brand.100` | `#D1FAE5` | Selected/positive soft surface |
| `brand.50` | `#ECFDF5` | Subtle highlighted section |
| `surface.canvas` | `#F8FAF9` | App background |
| `surface.default` | `#FFFFFF` | Cards, sheets, forms |
| `surface.subtle` | `#F1F5F3` | Table heading, secondary section |
| `text.primary` | `#14251E` | Body, figures |
| `text.secondary` | `#47574F` | Descriptions, labels |
| `text.muted` | `#5C6F64` | Supporting metadata, still readable |
| `text.inverse` | `#FFFFFF` | On dark primary surface |
| `border.default` | `#D8E2DC` | Decorative dividers only |
| `border.control` | `#718078` | Input/button boundaries where needed |
| `focus` | `#1D4ED8` | Keyboard focus ring |
| `success.text / surface` | `#166534 / #F0FDF4` | Confirmed paid/ready, icon + label |
| `warning.text / surface` | `#854D0E / #FEFCE8` | Preparing, pending, grace |
| `danger.text / surface` | `#B91C1C / #FEF2F2` | Error, exception, critical action |
| `info.text / surface` | `#1E40AF / #EFF6FF` | Informational state |
| `accent.gold` | `#B7791F` | Small decorative accent; no white small text |
| `overlay` | `rgba(20,37,30,0.48)` | Modal backdrop |

States: primary default `brand.800`, hover `brand.900`, pressed `#033D2E`; secondary white with control border, hover subtle; danger solid `#B91C1C` with white text. Selected rows use brand.50 plus a visible selected indicator. Disabled controls use subtle background, muted text, disabled semantics and a nearby reason; do not rely on opacity alone.

### 4.2 Typography

Use **Inter** (self-hosted licensed webfont) with `ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif` fallback. Confirm font licensing/package availability during implementation. Use weights 400/500/600/700 only. No serif marketing headlines in operational screens.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| Page title | 28 / 36 px | 700 | Management heading; mobile 24/32 |
| Section title | 20 / 28 px | 600 | Panel/form section |
| Card title | 16 / 24 px | 600 | Product/panel labels |
| Body | 16 / 24 px | 400 | Forms, operational copy |
| Compact body | 14 / 20 px | 400/500 | SaaS tables, secondary labels |
| Caption | 12 / 16 px | 500 | Supplemental metadata only |
| KPI | 28 / 36 px | 700 | Management metrics |
| POS total / KDS order | 24 / 32 px | 700 | Essential operational identity |
| Button | 14/20 management; 16/24 POS | 600 | Action label |

Use tabular numerals for amounts, counts and elapsed times. Never shrink essential POS/KDS text below 16 px to fit. Long product names wrap; order numbers do not silently truncate. Amounts align right and retain currency context. Use `Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR',maximumFractionDigits:0})` only when the approved pricing/rounding model supports whole-rupiah display. Store monetary values with exact arithmetic, never floating-point totals.

### 4.3 Spacing, geometry and sizing

| Group | Tokens |
|---|---|
| Spacing | `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px |
| Typical gaps | Label/input 8; field/field 20; panel padding 24 desktop, 16 mobile; page section gap 24 |
| Radii | Input/button 8; card 12; sheet/dialog 16; status pill 999 px |
| Border | 1 px default; selected outline 2 px |
| Shadow | Card none/default border; floating menu `0 4px 16px #14251E14`; modal `0 16px 48px #14251E29` |
| Icons | 20 px standard, 24 px POS/KDS; consistent 2 px stroke; 16 px only metadata |
| Heights | SaaS input/button 44; operational control 48–56; nav row 44; compact table row min 48; touch table row min 56 |
| Modal widths | Confirm 440; standard 640; complex editor 880 px, always viewport-constrained |
| Drawers | 420 px standard; 480 complex; mobile full width |
| Stacking | Base 0; sticky 10; sidebar/drawer 30; backdrop 40; dialog 50; toast 60; tooltip 70 |

Cards are containers for one coherent task, not a card around each field. Forms use a readable max width of 720 px; complex line-item editors may expand.

### 4.4 Motion and feedback

Use 120 ms control transitions, 180 ms drawer/dialog entrance, 240 ms maximum page-panel transition; `cubic-bezier(.2,0,0,1)`. No parallax, bouncing financial figures, auto-scrolling tickets or flashing alerts. Respect reduced motion by removing transform animation. Pending spinners must include text. Toasts supplement durable page state and never carry the only payment or error evidence.

### 4.5 Example token implementation

```css
:root {
  --mf-primary: #065f46;
  --mf-primary-hover: #064e3b;
  --mf-canvas: #f8faf9;
  --mf-surface: #fff;
  --mf-text: #14251e;
  --mf-text-secondary: #47574f;
  --mf-border: #d8e2dc;
  --mf-control-border: #718078;
  --mf-focus: #1d4ed8;
  --mf-radius-control: 8px;
  --mf-radius-panel: 12px;
  --mf-space-unit: 4px;
}
:focus-visible { outline: 3px solid var(--mf-focus); outline-offset: 3px; }
```

## 5. Responsive layout and accessibility

### 5.1 Breakpoints and shells

| CSS width | Management | POS | KDS/service |
|---|---|---|---|
| `<640` compact | Drawer navigation; single column; 16 px gutters | Catalog/cart steps; fixed cart summary above safe area | Single ticket column; list-first service |
| `640–767` | Single/two-column where content fits; 20 px gutters | Catalog; full-height cart sheet | One/two ticket columns as min width allows |
| `768–1023` tablet | 72 px labelled-on-demand rail; 24 px gutters | Catalog + cart tab/sheet; no squeezed dual panes | Two-column KDS; service detail drawer |
| `1024–1279` | 72 px rail, expandable overlay | 72 px rail + catalog + 340 px cart | Up to three ticket columns |
| `1280–1535` desktop | 240 px sidebar; content max 1600 px | 72 px rail + catalog + 380 px cart | Three/four columns |
| `≥1536` wide | 256 px sidebar; center max-width content | Catalog + cart up to 420 px | Additional columns using min 300/max 380 px tickets |

Management top bar 64 px; page heading and filters remain in document flow. Management grid uses 12 columns, 24 px gaps. KPI grid is 4 desktop / 2 tablet / 1 narrow mobile where numbers need room. Charts have minimum 240 px height.

POS product grid: `repeat(auto-fill,minmax(144px,1fr))`, tile max around 220 px; image ratio 4:3, fixed text space with up to 3 name lines. Collapse image if necessary in compact list mode; do not hide modifier requirements. Catalog and cart may scroll separately on landscape desktop; title, order identity, total and Pay remain visible. At short heights or software-keyboard opening, allow natural scrolling and keep focused input above the keyboard.

On mobile, bottom navigation max four destinations plus More; selected labels stay visible. Cashier: POS, Orders, Pickup, Shift. Waitstaff: Tables, Service, Pickup, More. Owner management: Dashboard, Orders, Menu, More. Kitchen uses its own operational header rather than owner bottom tabs. Hide destinations unavailable to role; capability locks can be explained contextually.

### 5.2 Accessibility design target

Target **WCAG 2.2 AA** across complete implemented journeys; conformance requires implementation testing. Contrast, focus, keyboard, reflow and accessible feedback follow the [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/). The following are project requirements; do not treat this document as a completed audit.

- Normal text contrast at least 4.5:1; large text at least 3:1. Meaningful controls, focus and graphical indicators need sufficient non-text contrast. Verify all actual foreground/background combinations.
- Project touch target minimum 44×44 CSS px; POS/KDS primary actions at least 48×48, with 8 px separation. This deliberately exceeds the WCAG AA minimum target-size baseline.
- All functions work with keyboard; meaningful focus order follows visual order. Skip navigation, one page H1, landmarks and native controls. Table headers and sorting use semantic markup.
- Focus is visible and not obscured by sticky bars. Dialogs trap focus, have accessible names and return focus to the opener. Escape closes dismissible overlays, never silently discards a financial action.
- Allow browser zoom and text enlargement; no `user-scalable=no`, pinch suppression or forced full-screen dependency. At 200% text size no loss of actions; management/forms reflow at 320 CSS px.
- Error summary links to invalid fields; labels persist outside placeholders; invalid state includes text and `aria-describedby`.
- Charts offer a data table and descriptive summary; do not encode series/status solely by color. Table map has an equivalent list and keyboard controls.
- Announce status changes through restrained live regions; do not repeatedly announce every timer tick. Payment success and critical errors are announced once.
- KDS sounds are optional with a visible enable/mute control; visual alerts always work. No essential instruction depends on audio, hover, gesture or drag alone.
- Allow password managers/paste and accessible authentication. Manager PIN input has an explicit label, error and accessible alternative authenticated dashboard flow.
- Dragging future layout objects has move buttons/coordinate alternatives. Long or translated text wraps; icon-only buttons expose names and tooltips.

## 6. Navigation, roles and information architecture

### 6.1 Shared application frame

```text
┌───────────────┬───────────────────────────────────────────────────┐
│ MejaFlow      │ Business/outlet • connectivity • alerts • profile │
│ Workspace     ├───────────────────────────────────────────────────┤
│ Operations    │ Context/status banner (only when relevant)        │
│ Insights      │ Page title + description              Main action│
│ Management    │ Scope/date/filter toolbar                        │
│ Settings      │ Work area: table / chart / form / operational view│
│ Plan/status   │                                                   │
└───────────────┴───────────────────────────────────────────────────┘
```

Sidebar groups: **Operate** (POS, Orders, Pickup, Tables, Kitchen, Cash Shifts); **Understand** (Dashboard, Reports; future AI Insights); **Manage** (Menu, Staff; future Inventory, Promotions, Outlets); **Business** (Settings, Merchant Setup, Billing). Put frequently used operational destinations first for cashier/manager. Do not show a dozen inactive future modules in production navigation.

### 6.2 Route and landing map

Routes below are DESIGN contracts, not claims about existing endpoints. All app routes are tenant-bound and independently authorised.

| Route | Default audience | Landing/purpose |
|---|---|---|
| `/register`, `/login` | Prospective member | Plan-aware registration/authentication |
| `/app/:tenant/setup` | Owner | Resumable setup and independent merchant gates |
| `/app/:tenant/dashboard` | Owner, authorised manager | Basic sales overview |
| `/app/:tenant/pos` | Cashier, authorised ordering staff | New immediate checkout |
| `/app/:tenant/payments/pending` | Cashier, manager, owner | Reconcile initiated QRIS attempts |
| `/app/:tenant/orders/:orderId` | Scoped staff | Role-filtered durable order detail |
| `/app/:tenant/kitchen` | Kitchen | Shared KDS |
| `/app/:tenant/tables` | Waitstaff, manager, owner | Eligible dine-in operations |
| `/app/:tenant/service` | Waitstaff | Item readiness and serving |
| `/app/:tenant/pickup` | Cashier, waitstaff | Strict-number takeaway handover |
| `/app/:tenant/approvals` | Manager, owner | Exception decisions |
| `/app/:tenant/menu` | Menu-authorised staff | Products, categories, modifiers |
| `/app/:tenant/shifts` | Cashier; manager oversight | Open/close and review shifts |
| `/app/:tenant/reports` | Owner, authorised manager | Reconciled sales detail |
| `/app/:tenant/settings/*` | Owner / explicit delegation | Business, charges, staff, receipt, device |
| `/app/:tenant/billing` | Owner | Subscription and recovery |
| `/app/:tenant/inventory`, `/costing`, `/ai`, `/promotions`, `/outlets` | Future authorisation TBD | Hidden until implemented and allocated |

Kitchen login lands on KDS, cashier on POS or required shift opening, waitstaff on Tables/Service according to capability, owner on Dashboard with setup notice. A role with no permitted operational destination receives an explanatory access page, not a redirect loop.

### 6.3 Role-specific layout differences

| Role | Layout emphasis | Exclusions |
|---|---|---|
| Owner | Full management shell, setup/billing alerts, reports, approvals | No assumed unimplemented premium modules |
| Manager | Operations + approvals + authorised reporting | Subscription/charge configuration only when explicitly delegated |
| Cashier | Narrow rail, persistent cart, payment recovery, pickup, own shift | No KDS priority or approval execution |
| Waitstaff | Touch-first tables/service list, eligible new order, pickup | No default cash confirmation or refund approval |
| Kitchen | Full-width KDS; large order/items; connection/audio state | No revenue, billing, payment credentials or ordinary checkout |
| Customer | Receipt/payment presentation only for permitted current journey | No staff controls; customer self-ordering remains future unless separately approved |
| Platform admin | Separate privileged console, plan catalog and audit | Tenant access requires explicit privileged audited context; never ordinary owner shell impersonation |

## 7. Permissions and entitlement matrices

### 7.1 Fixed MVP role matrix

`Y` allowed subject to plan/resource checks; `A` explicitly authorised only; `R` request only; `TBD` no permission inferred; `—` denied. This matrix follows v1.1 fixed RBAC; advanced custom roles remain Phase 4.

| Action | Owner | Manager | Cashier | Waitstaff | Kitchen |
|---|---|---|---|---|---|
| Create eligible checkout | Y | Y | Y | A | — |
| Confirm cash payment | Y | Y | Y | TBD | — |
| Recover pending QRIS | Y | Y | Y | — | — |
| Start preparation / mark Ready | A | A | — | — | Y |
| Raise/clear KDS priority | Y | Y | — | — | Y |
| Mark dine-in items Served | A | A | — | Y | — |
| Mark takeaway Handed Over | A | A | Y | Y | — |
| Request paid-order exception | Y | Y | R | R | R |
| Approve exception/refund | Y | Y | — | — | — |
| View financial dashboard | Y | A | Restricted scope TBD | Restricted scope TBD | — |
| Configure tax/service | Y | TBD | — | — | — |
| Manage menu/availability | A | A | TBD | — | — |
| Manage staff | Y | Delegation TBD | — | — | — |
| Manage restaurant payment setup | Y | Delegation TBD | — | — | — |
| Manage subscription | Y | Delegation TBD | — | — | — |
| Change platform subscription prices | — | — | — | — | — |

Platform admin alone changes platform prices. Menu permission granularity, staff delegation and restricted financial views must be resolved explicitly; a broad role name is not permission. Default deny any TBD action except separately confirmed minimum cash takeaway rights.

### 7.2 Tier allocation matrix

| Capability | Free | Professional | Business | Paid trial |
|---|---|---|---|---|
| Plan price | Permanent Rp0 | Monthly/annual IDR TBD | Monthly/annual IDR TBD | 30 days; selected paid tier follows |
| Recurring consent | Not required | Required | Required | Required at paid registration |
| Basic menu and cash takeaway | Yes | Yes | Yes | Yes |
| Eligible receipts / supported takeaway completion | Yes | Yes | Yes | Yes |
| Tables/dine-in | Never | Merchant verification gate | Merchant verification gate | Same gate |
| Dynamic QRIS | Never | Merchant + active QRIS gates | Merchant + active QRIS gates | Same gates |
| Shared paid-order KDS | Allocation TBD | Included, as implemented | Included, as implemented | Implemented Business KDS, including cash takeaway before onboarding |
| Basic sales dashboard | Allocation TBD | Final allocation TBD | Final allocation TBD | Implemented Business entitlement only |
| Staff account cap | TBD | TBD | TBD | Business cap TBD |
| Completed transaction cap | TBD | Unlimited per PRD | Unlimited per PRD | Trial cap treatment TBD |
| Inventory/HPP | Future; allocation TBD | Future; allocation TBD | Future; allocation TBD | Not unlocked merely by trial |
| AI, promotions/loyalty, multi-outlet | Future; allocation TBD | Future; allocation TBD | Future; allocation TBD | Not unlocked merely by trial |

Do not advertise future capabilities as Business inclusions. Do not apply a fabricated Free transaction cap. A missing approved plan matrix is a release dependency for affected screens.

### 7.3 State × activation matrix

| Account/merchant state | Cash takeaway | Entitled KDS/pickup | Dine-in | Dynamic QRIS |
|---|---|---|---|---|
| Free, any merchant state | Yes | Supported fulfillment; full KDS TBD | No | No |
| Paid trial, merchant pending/rejected | Yes | Yes, implemented trial KDS | No | No |
| Paid active/grace, merchant pending/rejected | Yes | Per effective entitlement | No | No |
| Paid valid, merchant verified, QRIS inactive | Yes | Per entitlement | Yes if entitled | No |
| Paid valid, merchant verified, QRIS active | Yes | Per entitlement | Yes if entitled | Yes if entitled |
| Paid cancelled but within paid-through date | Retained until end | Retained until end | Existing gates | Existing gates |
| Paid expired/read-only | No new operations | History only; operational mutations blocked | No new operations | No new attempts |

Read-only order/payment reconciliation still runs server-side; it must not lose received payments. Handling already-paid in-flight food at the precise read-only boundary is a release-critical TBD: show preserved work and contact-owner guidance, do not silently invent an operational-write exception.

## 8. Shared component contracts

### 8.1 State model for every data surface

| State | Trigger | Visible feedback | Safe next action |
|---|---|---|---|
| Initial loading | First fetch | Layout-matched skeleton; labelled busy region | Wait, navigate away; no mock totals |
| Refreshing | Background re-fetch | Preserve data; “Memperbarui…” | Continue safe reads; mutation checks use server |
| Empty | Confirmed zero records | Specific explanation with date/scope | Add first item or change filter when permitted |
| Error | Fetch/action fails | Persistent local message and recovery | Retry original idempotent operation or status check |
| Partial | One panel/source unavailable | Render valid sections, label missing section | Retry affected section; no zero substitution |
| Success | Server confirms mutation | Durable updated state plus brief feedback | Next task; undo only where supported |
| Forbidden | Permission/entitlement denied | Scoped reason, no leaked resource data | Return, contact owner or owner billing/setup link |
| Offline/stale | Connection unavailable | Banner + last verified time | Read cached visible records; reconnect; no mutation replay |
| Conflict | Another actor changed record | Latest version/diff, retained local nonfinancial input | Reload/review; explicit resubmit where safe |

All screen specs inherit these states; their domain-specific differences are below. Never display “Paid”, “Saved”, “Ready” or “Refunded” optimistically for an unacknowledged authoritative transition.

### 8.2 Component inventory

| Component | Anatomy, states and interaction |
|---|---|
| Button | Icon optional + verb label; default/hover/focus/pressed/disabled/busy. Busy retains width and explains activity; duplicate submission locked. |
| Field | Label, optional hint, control, inline error; required text; numeric `inputmode` appropriate. Preserve valid entries after error. |
| Select/combobox | Keyboard searchable, selected value visible, clear only when optional; no hover-only choices. |
| Tabs | Visible labels and count; keyboard arrows; active indicator plus text; no hidden destructive transitions. |
| Segmented order type | Takeaway default when dine-in unavailable; locked dine-in explanation; changing type revalidates charge applicability and table selection. |
| Badge | Icon/label, semantic colors; Paid ≠ Ready ≠ Completed; plan badges never look like payment status. |
| Data table | Sticky semantic header; right amounts; sort direction; filter count; pagination. Selection only if a real authorised batch action exists. |
| Product tile | Image/fallback, name, base price, availability, modifier indicator; focus and pressed feedback. Sold Out remains visible and cannot add. |
| Modifier group | Name, required/min/max rule, radio/checkbox choices, price delta; error beside group; no silent default upcharge. |
| Cart line | Name, variant/modifiers, note, exact line total, 48 px quantity controls, remove. Paid detail uses read-only snapshot. |
| Payment panel | Order/total, single method, amount received/change, irreversible confirmation; Pending/Checking/Success/Failed/Expired/Unknown. |
| KDS ticket | Identity strip, priority, New/Preparing/Hold, item notes, readiness controls, actor feedback; no prices. |
| Dialog/sheet | Heading, concise purpose, content, cancel/primary footer; mobile full-screen for complex editor. Close checks unsaved edits. |
| Toast/banner | Brief toast for noncritical success; durable banner for connectivity, billing, payment ambiguity or unresolved error. |
| Empty state | Specific scope/date and permitted next action; no generic illustration that crowds operational space. |
| Date filter | Today, month, custom; visible timezone and inclusive/exclusive cutoff description in report help. Server authoritative boundaries. |
| Receipt | Historical snapshot; supported paper width; reprint/download does not repeat payment or KDS dispatch. |
| Capability lock | Reason + owner/staff-appropriate action; never a client-only security mechanism. |
| Approval challenge | Request summary, affected items, reason, manager identity and PIN/dashboard option; submitting/denied/approved/expired auth states. Never shared universal PIN. |

### 8.3 Common interaction rules

Search debounces about 250 ms; Enter also submits. Cancel stale requests and retain query in URL where safe. Filter/sort/date state persists through detail/back navigation. Pagination avoids moving focused rows during live refresh. Dropdowns reposition within viewport. Delete/archive confirmations name the entity; archived menu records do not erase historical snapshots.

Escape backs out one dismissible layer; browser Back respects a dirty-form warning. No autosave of POS carts. Draft settings forms may preserve local unsaved inputs explicitly, without implying a reusable unpaid order. Toast success may dismiss after about 5 seconds; errors remain until resolved/dismissed with durable context preserved.

Idempotency, record versions and explicit latest state govern concurrent actions. When a submission response is lost, show “Status belum diketahui. Periksa status sebelum mencoba lagi.” Resolve against its original reference before another payment attempt.

## 9. Screen-by-screen wireframe specifications

Screen IDs `S01–S20` are stable handoff references. Each screen inherits the shared shell, responsive and state contracts. Future screens are design-ready proposals, not delivery commitments.

### S01 — Dashboard / overview

**Scope:** Basic sales subset accelerated into MVP; tier allocation still TBD. **Users:** Owner, authorised manager. **Primary action:** Open POS; inspect scoped sales.

```text
Dashboard                              [Buka POS]
[Primary outlet] [Today / Month / Custom] [Refresh]
[Sales total] [Paid transaction count] [Cash] [Verified QRIS]
[Daily/monthly sales chart.........................]
[Best sellers: product, quantity] [Payment breakdown]
[Recent paid orders → order detail]
```

Four KPI cards share heights; amounts use exact full value with optional compact secondary formatting. Show selected period, timezone and updated-at timestamp. Chart click/keyboard selection opens the corresponding filtered report; clicking best seller filters product transactions. Setup/trial/grace notice is above heading, one relevant banner at a time with a view-details link.

Sales, gross/net/refund definitions must be approved before real financial totals are published. Do not label revenue “profit” without validated costs. Comparisons, average order value, active queue KPI and category charts are future/design extensions unless explicitly approved. Zero orders yields honest zero with “Belum ada transaksi pada periode ini”; failed QRIS aggregation shows unavailable, not zero. On mobile KPI cards stack and chart/table remain legible.

### S02 — Touchscreen POS catalog and cart

**Scope:** MVP. **Users:** Cashier and authorised ordering staff. **Primary action:** Checkout full current cart.

```text
┌──────┬────────────────────────────────┬──────────────────────────┐
│Rail  │ Takeaway [Dine-in: gated]      │ Order type / table        │
│      │ [Search menu.................] │ Optional takeaway name    │
│      │ [All][Food][Drinks][...]      │ Item / qty / modifiers    │
│      │ [Product][Product][Product]   │ Notes                     │
│      │ [Product][Sold Out][Product]  │ Subtotal / discount       │
│      │ [Product][Product][Product]   │ Applicable tax / service  │
│      │                              │ TOTAL Rp...               │
│      │                              │ [Discard] [Pay Rp...]      │
└──────┴────────────────────────────────┴──────────────────────────┘
```

Simple product tap adds one; product with required variant/modifiers opens S03. Touch feedback confirms quantity without moving catalog scroll. Cart lines combine only when product, variant, modifiers and note match; retain distinct customizations. Quantity cannot be negative; zero removes after an explicit action. Cart empty disables Pay with explanation. Maximum quantity/note length are validated configurable constraints, exact caps TBD.

Paid order detail cannot reopen as an editable cart. There is no Hold/Open Bill/Save Draft button. Navigation away from an unpaid local cart asks to continue checkout or discard. A pending QRIS attempt instead navigates to durable recovery.

Changing dine-in/takeaway recalculates applicable charges and requires review before paying. Free/unverified paid accounts default to takeaway. Optional takeaway name is not a customer account or required phone number. Dine-in uses order number, not seats/customer labels. Barcode scan is omitted pending approval.

Mobile shows catalog with “Lihat pesanan · N item · Rp…” bottom action; cart opens as a full-height step. Checkout stays reachable above safe area and keyboard. Server revalidation errors identify changed product/price/availability and require explicit renewed review. No automatic substitute.

### S03 — Item customization sheet

**Scope:** MVP menu/modifiers. **Primary action:** Add/update this cart line.

```text
[Product name]                              [Close]
Image optional       Base price
Variant *            ( ) Small   ( ) Large +Rp...
Required group       Choose exactly 1
Optional additions   Choose up to N
[ ] Option +Rp...    [ ] Option +Rp...
Item note            [............................]
Quantity             [−]  1  [+]
[Cancel]                         [Add · Rp...]
```

Required/minimum groups block Add until valid; maximum selection shows remaining count and clear error, never silently deselects another option. Modifier deltas contribute to visible item total. Reopening preserves choices; unavailable choices remain labelled and not newly selectable. Editing an uncommitted line changes only that line. Mobile full-screen sheet, sticky summary/footer; group labels and errors remain accessible.

### S04 — Payment, QRIS recovery and receipt

**Scope:** MVP with activation gates. **Users:** Cashier/manager/owner as authorised.

Desktop two-column review: left immutable order review, right single-method controls. Mobile sequential review then payment; repeat total on the payment step.

```text
Order #... · Takeaway / Table ...
Items + modifiers + charges             Total Rp...
[Cash] [Dynamic QRIS — gated if unavailable]
Cash: [Amount received] [Exact] [Suggested denomination]
Change Rp...             [Confirm full cash payment]
OR
QRIS: QR + exact amount + provider expiry + reference
Status: Waiting / Checking / Paid / Failed / Expired / Unknown
[Check status]             [Safe recovery, only when allowed]
```

Confirm cash requires accepted amount ≥ grand total; show change before confirmation. Payment method is not a multi-select. Pending cash confirmation disables repeat Pay; lost response checks original order/action status. Successful payment opens receipt with Print, View/Download PDF and New Order; print failure leaves paid state intact.

QRIS QR is server-issued and linked to this order/amount. Client countdown is advisory; only server/provider determines expiry. Never mark Paid from a screenshot, redirect or frontend timer. Close/back during pending QRIS retains its durable record and warns that payment may still complete. A recovery list displays order number, total, initiation time, attempt reference and verified status. Check status is safe; cash fallback or new QRIS is enabled only after server resolves the old attempt against duplicate/late payment risk.

Receipt includes business details, unique order number, order type/table, line customizations, applicable charges, payment method, total and actor/time as permitted. 58mm/80mm layouts avoid clipped names/amounts; supported browser/OS printing only. Do not show kitchen ticket printing in MVP.

### S05 — Kitchen Display System (KDS)

**Scope:** MVP entitled shared queue; Free allocation TBD. **Users:** Kitchen; authorised manager/owner. **Primary action:** Accept New work, then complete preparation.

```text
Kitchen · Primary outlet   Online / last verified time  [Enable sound]
[Active N] [History]             [All / High priority]
┌─────────────────────────┐ ┌─────────────────────────┐
│ #A104 · Takeaway · 4m   │ │ #A105 · Table 07 · 2m   │
│ NEW · High priority     │ │ PREPARING               │
│ 2× Nasi ...             │ │ 1× Coffee [Mark Ready]  │
│   No chili              │ │ 1× Toast  [On Hold]     │
│ [Start Preparing]       │ │ [Mark All as Ready]     │
└─────────────────────────┘ └─────────────────────────┘
```

One queue contains only verified fully paid eligible orders. FIFO uses authoritative paid/dispatch sequencing, not original cart creation; stable tie-breaker is server sequence. High priority sorts before normal; within each priority keep FIFO. Raise/clear priority uses a button/menu and audit, never drag-only. Priority is not a payment control.

New ticket uses red accent + New label; Start Preparing is the one acceptance action. Preparing uses yellow accent and per-line neutral Ready controls. Mark All as Ready applies to eligible nonheld lines; clearly show excluded held lines and do not mark whole order Ready while any applicable line remains unfinished/held. Per-unit versus per-line quantities requires final policy; MVP UI must not imply per-unit completion without support.

All applicable lines Ready removes ticket from Active and sends order to service/pickup; it does not mark Served/Handed Over. History is read-only searchable order/preparation history, retaining ready/completed records according to approved retention; it is not another active ready queue. Kitchen cannot mark dine-in Served under baseline RBAC. Only kitchen receives detailed preparation controls; service sees the readiness needed to serve.

One-time visual arrival highlight and optional audio; never an endlessly flashing screen. Live inserts do not steal focus or scroll. On reconnect get authoritative snapshot before enabling mutations; if a ticket changed elsewhere show latest state and avoid duplicate transition. No payment figures or customer payment credentials.

### S06 — Tables and areas

**Scope:** MVP, paid and merchant-verified. **Primary action:** Open table and create independent order / inspect service.

```text
Tables                            [Manage tables: permitted only]
[Area selector] [Map | List] [Available / Occupied / All]
[T01 Available] [T02 Occupied • 2 active orders] [...]
Table detail drawer: T02
Order #A100 · Preparing     Order #A108 · Paid/New
[Open order]               [New independent order]
```

Grid/map statuses are derived, not manual recoloring. Available uses outline/icon/label; Occupied uses filled subtle background and active-order count. Table detail lists independent order numbers, status and permitted amounts without a combined payable bill. Additional purchase creates a separate immediate checkout.

Owner table editor contains name/number, area and active state; uniqueness/safe retirement validated. Free/unverified paid accounts receive clear gate, not an interactive dine-in map. Changes at checkout are rechecked against merchant/capability state. Do not add reservations, Cleaning, bill merge or table transfer workflow; exact moves/layout editing remain TBD. Map has list equivalent on mobile/keyboard. Table QR self-ordering is a future module and distinct from QRIS payment.

### S07 — Service and takeaway pickup

**Scope:** MVP for entitled fulfillment. **Primary action:** Confirm delivery accurately.

Service list is grouped by table and independent order number. Detail shows item quantity, readiness, hold, Served state and actor/time. Waitstaff may mark eligible ready items Served individually or Mark All as Served. Whole dine-in order completes only when all applicable items served, then table availability recomputes across every associated active order.

```text
Pickup [Ready N] [History]       [Search order number]
#A104 · optional display name · Ready since 12:20
Items and quantities
Customer-provided order number [................]
Match result: exact match / mismatch / required
[Mark as Handed Over]
```

Do not prefill the verification input from selected card or treat search selection as customer proof. Manual handover requires matching server-recognized customer-visible order number and all applicable items Ready. Case/format normalization policy is TBD; matching must not become fuzzy/name-based lookup. Name helps display only. Missing number shows “Nomor pesanan diperlukan untuk penyerahan.” No override or forgotten-number alternative. Concurrent handover succeeds once and updates other clients. Completed leaves active queue and persists in history.

Free must have a compatible non-KDS takeaway readiness/handover path if full KDS is excluded; final role/control allocation is TBD. Do not block Free cash sales because a full KDS entitlement was never decided.

### S08 — Order detail and approvals

**Scope:** MVP. **Primary action:** Inspect immutable order; request/decide controlled exception.

Order header: number, type/table, payment status, preparation/fulfillment status. Tabs: Summary, Timeline, Receipt; financial/approval information is role-filtered. Show original payment and linked adjustments separately. No ordinary Edit/Delete/Cancel paid-order button.

Exception request sheet selects affected eligible unserved items/quantity, reason, requested reversal/replacement and proposed price difference. Server immediately holds only affected unserved items. Unaffected work continues. Already served eligibility and quantity limits are server-decided; no blanket reversal inference.

Manager/owner queue shows oldest request, requester, amount, held items and age; one-time submission alert. Detail offers Approve/Reject with personal authentication and reason. Self-approval is permitted only with explicit reauthentication/audit. Reject restores prior item state. No automatic timeout, timed reminder, auto-rejection or escalation.

Approval does not mean refund completed. Track approved → payment/refund pending → verified outcome/failed independently. Replacement requiring extra money stays out of KDS until extra payment is verified; use linked transaction, not mixed tender on original order. Provider refund unsupported shows controlled external/manual resolution with reference/evidence capture. Full/partial refund capability is provider-dependent. Announce decision once to relevant staff; preserve the complete original/linked history.

### S09 — Menu, categories, variants and modifiers

**Scope:** MVP. **Users:** Explicit menu-authorised roles. **Primary action:** Create/edit product safely.

```text
Menu                          [Categories] [Modifiers] [Add product]
[Search] [Category] [Available / Sold Out / All]
Image | Product | Category | Base price | Availability | Actions
Product editor: Details / Variants / Modifiers / Availability
Name* · Category* · Description · Image · IDR base price*
Variant rows: name, price delta/override rule (validated policy)
Modifier groups: selection type, required/min/max, choices/deltas
[Cancel]                                             [Save]
```

Form validation identifies invalid IDR values, missing names and contradictory selection bounds. Distinguish base price/variant pricing model; exact override versus delta policy must be confirmed before real pricing. Preview shows catalog tile and customization sheet. Available/Sold Out toggle persists only after server acknowledgment and synchronizes POS. A product going Sold Out during cart review triggers server validation; do not accept an unavailable item via a stale browser.

Manual availability is not a count; no stock quantity or “only 2 left” in MVP. Archive with historical preservation instead of destructive deletion of sold items. Categories/order support simple accessible move buttons; drag optional. AI photo-menu import is future: upload → extraction review → correct names/prices → explicit publish; no automatic live-menu publication.

### S10 — Inventory and HPP / recipe costing

**Scope:** Phase 3 design proposal; HPP-specific details/AI support and tier allocations TBD. Hidden in MVP.

```text
Inventory                         [Record movement] [Stock count]
[Items] [Movements] [Recipes / HPP] [Suppliers: future]
[Search] [Unit] [Low stock filter: future policy]
Item | Unit | On hand | Threshold | Unit cost | Updated | Action
Detail: balance · ledger · receipt/usage/adjustment references
```

Movement editor: item, type (receipt/use/waste/adjustment), quantity, unit, effective time, reason/reference; preview resulting balance, then confirm. Define unit conversions, decimal precision, negative-stock policy, valuation and correction audit before implementing. Stock count uses expected versus counted difference and review; never directly rewrites ledger history.

HPP editor: product, recipe yield/servings, ingredient rows (quantity, unit, conversion, effective unit cost), packaging/other allowed costs, total batch cost, cost per serving, sale-price comparison. Formula proposal: HPP per portion = sum(validated ingredient usage cost + approved other allocated cost) / validated yield. Margin proposal = (net sale basis − HPP) / net sale basis; tax/discount basis must be defined before labeling margin. Missing ingredient cost yields Incomplete, not zero cost or a misleading healthy margin. Cost methods, waste/yield, overhead and tax treatment remain TBD.

Scenario panel may model ingredient-cost changes without altering actual inventory/prices. AI price suggestions are future, labelled recommendations with inputs/date; never auto-publish. Mobile uses ledger cards and dedicated row editor; units remain visible beside every quantity.

### S11 — Cash shifts and reconciliation

**Scope:** MVP. **Primary action:** Open/close own authorised cashier session.

```text
Cash shift · Cashier · Session ID · Opened at
Opening physical cash               Rp...
Cash sales                          Rp...
Authorised cash refunds             Rp...
Other supported cash movements      Rp...
EXPECTED DRAWER CASH                Rp...
QRIS total (separate, not in drawer) Rp...
Actual physical cash count          [Rp............]
Discrepancy = actual − expected      Rp...
Reason (required if nonzero)         [..............]
[Back]                              [Close shift]
```

Open session collects opening cash and confirms actor/device context. Whether overlapping sessions/device association is allowed is TBD; do not silently combine drawers. Closing shows current totals/version; refresh review if sales changed while counting. Nonzero discrepancy requires reason but **does not require manager approval**. Closed session becomes immutable summary; later corrections are separate audited entries. QRIS never increases drawer cash. Unknown/missing transaction totals block final reconciliation until resolved.

Shift history lists actor/date, opening/expected/actual/difference and reason; cashier sees authorised scope, owner/manager oversight. Cash book expenses/receipt OCR are future unless supported by approved movement types; do not add arbitrary expense posting that changes expected cash without policy.

### S12 — Reporting

**Scope:** Basic MVP subset; advanced Phase 3. **Primary action:** Inspect reconciled period totals and drill down.

```text
Reports                   [Today / Month / Custom] [Timezone]
[Sales] [Payments] [Best sellers] [Cash sessions]
Summary figures with accounting-definition help
Trend / breakdown (only supported data)
Date | Order number | Type | Method | Gross | Adjustments | Status
[Open order]                           [Export: when entitled]
```

Keep selected scope/date in URL and exports. Paid count is not KDS ticket count. Refunds and extra collections appear as linked records; gross/net/recognition dates/cutoffs are approved accounting definitions, currently TBD. Do not hide tax/service in a number called profit. Basic best sellers uses sold quantity; treatment of reversed quantities needs policy. Data table accompanies chart; unavailable segment is labelled. Permissions apply to generated files and downloads, not only the report screen. Permitted historical exports remain accessible in read-only; exact formats/scope are TBD. Download/PDF job may show pending/ready/failed for large future reports.

### S13 — AI Insights

**Scope:** Future proposal; provider, data use, tier, quotas, price and schedule TBD. **Primary action:** Review evidence and make an informed manual decision.

```text
AI Insights · Preview / generated at · period / data coverage
[Daily summary] [Weekly summary] [Menu analysis: proposed]
Insight title
What changed + comparison period + source metric links
Possible explanation (explicit inference)
Suggested action → review related report/menu
[Helpful / Not helpful] [Regenerate: if supported]
```

Separate measured facts, inferences and recommendations. Show coverage limitations, missing costs and last generation time. No generated figures when source reports are unavailable. Insufficient data has a minimum-data explanation; threshold TBD. Generation loading/error/rate-limit/quota states have retry guidance without fabricated limits. Manual review is required before changing prices, menu availability or promotions. AI is not allowed to execute payments/refunds or silently change settings. Exporting tenant data to a model requires approved privacy/security terms. Conversational assistant, daily push messages and AI Radar are not MVP commitments.

### S14 — Promotions and loyalty

**Scope:** Future proposal, generally Phase 5 automation and Phase 4 CRM/loyalty. Basic transaction discount UI may exist under core POS, but permissions/calculation policy need validation.

```text
Promotions                                    [Create promotion]
[Draft] [Scheduled] [Active] [Ended] [Paused]
Name | Rule | Validity/timezone | Eligible items | Status | Results
Editor: name → amount/percent → eligibility → schedule → review
Preview: representative subtotal → discount → charges → total
```

Define validity, stacking, maximum discount, rounding, budget/redemption rules and tax interaction before release. Explicit review/publish rather than activating on form save. Pause requires confirmation and clear effect on in-progress checkout. Never discount below permitted totals. Voucher, happy hour, membership points and redemption require separate approved rules; do not imply they are included in Business. Effectiveness reports separate correlation from incremental impact; optional names are not CRM consent. Basic cashier discount requires visible authorised actor and recorded reason if policy mandates; exact scope remains TBD.

### S15 — Multi-outlet workspace

**Scope:** Phase 5, not MVP multitenancy. **Primary action:** Choose explicitly authorised outlet; inspect consolidated data only when permitted.

```text
Outlets                                      [Add outlet: future]
[All authorised outlets / Selected outlet] [Period]
Outlet | Status | Sales | Orders | Setup/payment state | Open
Consolidated report with scope label and drill-down
```

Outlet picker repeats current scope in header, POS and confirmations. “All outlets” is read/report scope, never a destination for checkout or stock mutation. Switching outlet with an uncommitted cart prompts checkout/discard; pending payments remain attached to original tenant/outlet and recoverable. Staff scope is explicit and server-enforced. Menu copy/sync proposals show source, target, preview and per-outlet publish; no accidental global overwrite. Merchant activation and cash sessions remain correctly scoped. Whether merchants/subscriptions are per outlet or shared in future, and pricing, are TBD. Do not retrofit cross-outlet claims into the separate-database-per-restaurant MVP architecture without a new design decision.

### S16 — Business settings, staff, merchant and devices

**Scope:** MVP essentials; advanced RBAC later. **Primary action:** Save one coherent validated setting section.

Settings left subnav: Business Profile; Tax & Service; Menu Permissions/Staff; Receipts & Printing; Merchant Setup; Security; Notifications; Audit. Billing is a separate owner destination. Mobile uses settings list → section page.

Business Profile contains name, primary outlet details, locale, timezone and contact/receipt information. Tax & Service has independent enabled switches, rates and dine-in/takeaway applicability; live sample bill only when calculation policy is approved. New settings affect future checkouts; existing transactions retain snapshots. Show unsaved changes and explicit Save/Cancel.

Staff table: name/email, fixed role, active state and plan-limit indicator only when caps defined. Invitations/disable require explicit membership checks; role escalation is audited. Advanced custom-role builder is Phase 4. Avoid locking out the last required owner; policy/ownership transfer details TBD.

Merchant page displays independently verified onboarding status and production QRIS channel status, timestamps and safe provider-supported correction/setup link. Rejected/pending does not remove cash takeaway. Do not collect raw secret keys or identity documents in browser storage. Exact hosted/embedded onboarding and verification mechanism is provider-dependent TBD.

Printer page: 58/80mm selection, sample preview, browser/OS test print, device compatibility notes; optional direct adapter only after verification. Payment success never depends on printer success. Notification setting controls KDS sound with gesture test, visual remains on. Audit view shows actor/action/resource/time/result according to permission, excluding secrets.

### S17 — Registration and onboarding

**Scope:** MVP. **Primary action:** Register safely, then reach usable cash takeaway without merchant blocking.

```text
Account + business identity
Choose [Free Rp0, permanent] [Professional] [Business]
Paid only: cycle, real price, 30-day trial start/end, first charge,
recurrence, cancellation/read-only explanation, explicit consent,
supported recurring mandate authorisation
→ Workspace provisioned → Setup checklist
[Profile] [Add menu] [Receipt/charge setup] [Open cash shift]
[Merchant verification: independent optional next task for paid]
[Open cash takeaway POS]
```

Free flow does not request recurring payment or merchant registration and has no trial countdown. Paid flow cannot claim successful mandate when gateway authorisation fails; preserve account/setup state, show exact outcome and supported retry or Free registration route without silently converting a paid subscription. Registration-based trial timestamps are server-issued, not restarted by re-login, tenant reload or merchant resubmission.

Setup checklist saves confirmed business/menu settings; merchant verification is not falsely represented as mandatory for cash takeaway. Dine-in and QRIS show separate prerequisites; verified merchant but inactive QRIS displays dine-in eligibility independently. Paid trial banner states absolute trial end and “Verifikasi merchant tidak memperpanjang masa uji coba.” Customer-facing trial/consent copy must use actual configured prices; if commercial values/provider missing, treat paid signup as unavailable/pre-release, not a Rp0 placeholder.

Tenant provisioning has Creating/Ready/Failed with safe retry; never route to another tenant on failure. Menu photo OCR onboarding is future; manual menu input remains the confirmed path.

### S18 — Billing, grace, cancellation and recovery

**Scope:** MVP lifecycle, supported billing integration required. **Users:** Owner/explicit billing permission.

```text
Subscription                         [Current state badge]
Plan / cycle / configured price / paid-through or trial end
Next charge amount + timestamp        Recurring consent/method status
Merchant status shown separately, not as subscription activation
[Payment method] [Change upcoming plan: policy-dependent]
Invoice/charge history: date, reference, amount, verified status
[Cancel next renewal]                [Billing recovery when needed]
```

Free shows Rp0 permanent with no next charge/mandate/trial, plus optional paid-plan information. Paid trial shows selected future tier and implemented trial entitlement, absolute end and first charge. On verified failure show 7-day grace end timestamp; selected-tier rights remain, gates unchanged. Recovery pending stays pending until server verifies; billing redirect alone does not restore writes.

Cancellation dialog names plan, last accessible date and effect: renewal disabled now; access until paid-through then read-only; historical recovery window; no automatic Free conversion. Require explicit confirmation, not double-negative buttons. Successful cancellation shows durable cancellation/paid-through status and no new recurring charge promise. Proration, refunds for subscription cancellation, trial cancellation effect and explicit paid-to-Free migration are TBD; avoid unsupported refund estimates or instant plan-switch buttons.

Read-only shell keeps history, allowed exports, account access and billing recovery; normal mutation buttons show reason. Staff see contact-owner guidance without billing credentials. Show 30-day recovery/access window with retention caveat; dates are server-calculated. Logs/history must never disappear merely because new QRIS or subscription access stops.

### S19 — Notifications, errors and access destinations

**Scope:** MVP cross-cutting. Notification center groups payment/fulfillment, approvals and billing by authorised role. Each item has order/reference, timestamp, read state and deep link that rechecks access. One-time arrival/decision alerts deduplicate by event ID. Timed approval reminders/escalations are excluded.

Dedicated pages cover 403/no role access; invalid/removed resource; tenant provisioning failure; system unavailable; session expired. Do not reveal whether a foreign-tenant order exists. Session-expired payment view explains that original attempt persists and can be recovered after reauthentication; no “start over and pay again” shortcut. Reconnect reconciles data and capability changes before enabling action.

### S20 — Platform plan administration

**Scope:** PRD platform administration; separate internal surface. **Primary action:** Maintain approved price/entitlement versions with audit.

Plan catalog lists Free, Professional, Business, monthly/annual IDR price versions, effective dates and approved feature assignments. Free price is fixed Rp0 and cannot be edited into a paid plan. Retired Starter is unavailable for new registration; retain historical references where required. Review changes before publishing; existing-subscriber notice/grandfathering/proration rules must be confirmed. Never grant a TBD feature via a guessed checkbox default. Privileged tenant support access is explicit, limited and audited; platform admin is not a café cashier by default.

## 10. End-to-end interaction flows

### F01 — Free cash takeaway

Register Free without mandate → provision tenant → add menu/manual availability → authorised cashier opens shift → build takeaway cart → review full total → confirm accepted cash → server records payment once → receipt → compatible preparation/readiness path → exact order-number match → manual handover → Completed. Full Free KDS allocation remains unresolved; minimum usable cash takeaway/fulfillment cannot be removed.

### F02 — Paid trial while merchant pending

Choose paid tier/cycle → disclose real renewal terms → explicit supported recurring consent → registration starts 30-day trial → business setup → cash takeaway available → cash confirmed → entitled trial KDS New → Start Preparing → mark Ready → pickup match/handover. Merchant onboarding continues separately. Dine-in/QRIS remain locked; trial countdown continues.

### F03 — Dine-in cash after merchant verification

Paid entitlement + verified merchant → choose table → build independent order → review → cash confirmed → one KDS job → kitchen Ready → waitstaff item Served / Mark All as Served → order Completed → table releases only if no associated active orders. QRIS need not be active for eligible dine-in cash. Another purchase starts a new independently numbered order, not a split bill.

### F04 — QRIS with interruption

All role/tier/merchant/channel gates pass → create persistent provider attempt → display exact QR/expiry → browser closes/disconnects → original reference remains in Pending Payments → reauthenticate/reconcile server status → verified Paid dispatches once OR terminal failure/expiry permits safe new attempt/cash fallback after server race protection. Unknown stays unresolved, does not auto-queue food or start another payment.

### F05 — Paid exception/replacement

Staff requests affected unserved items/reason → server places only those items On Hold → manager queue/one-time alert → authenticated manager/owner approves/rejects, including authenticated self-approval → rejected restores previous state; approved creates linked reversal/replacement/financial actions → higher-priced replacement waits for verified additional collection → approved refund remains pending until confirmed outcome → all staff reconcile decision. Originals remain unchanged; no automatic escalation.

### F06 — Failed renewal and cancellation

Verified renewal fails → server starts 7-day grace → current selected-tier rights/gates remain → verified recovery restores active OR grace expires into read-only → permitted history/export/billing recovery remain. Voluntary cancellation instead disables next renewal immediately, preserves paid-through access, then read-only. Neither route silently creates Free. Resolve treatment of in-flight food at cutoff before live release.

### F07 — Concurrent and stale operations

Actor opens latest record → another actor advances it → first actor submits expected version → server returns current state/conflict or idempotent success → UI updates without fake undo/duplicate transition. The same pattern applies to handover, readiness, cash close and approval. Payment attempt retries use original idempotency reference and reconciliation, not a new logical checkout.

## 11. Implementation guidance for Codex

### 11.1 Architecture to preserve

Recovered PRD Section 18 confirms Stage 2 A1–A8: React + Vite + TypeScript + Tailwind frontend; Hono on Cloudflare Workers; Drizzle + Neon PostgreSQL; separate restaurant Neon project/database and central platform identity/tenant/subscription project; Neon Managed Better Auth; Durable Objects WebSockets, PostgreSQL transactional outbox and Queues; transactional immutable financial records; MejaFlow Cron renewal scheduling with gateway-approved tokenised charges; browser/OS/PDF printing. Preserve those decisions rather than adopting the older Next.js/SQLite simulation or D1 proposal.

This document does not verify current provider APIs or installed package behavior. Before integration, inspect the actual repository and current official provider/library documentation. Pin compatible versions; do not infer provider support from UI mock data. No deployment or live-payment activation is authorised by the existence of a UI specification; PRD A8 production-readiness requirements still apply.

### 11.2 Suggested frontend structure

```text
src/
  app/                 router, providers, tenant context, error boundaries
  design-system/       tokens, primitives, focus, responsive utilities
  layouts/             ManagementShell, POSLayout, KDSLayout, ServiceLayout
  features/
    auth/ onboarding/ capabilities/ billing/ merchant/
    dashboard/ pos/ payments/ orders/ kitchen/ service/ pickup/
    menu/ shifts/ reports/ settings/ approvals/
    inventory/ ai/ promotions/ outlets/   # future, behind release flags
  domain/              typed money, order/payment/fulfillment projections
  services/            authenticated API, event client, reconciliation
  test-fixtures/       synthetic tenants, role/capability/state fixtures
```

Prefer existing project conventions when discovered. Avoid a single monolithic component for all roles. Share domain logic/state machines; use separate role-specific view projections. Style all components through tokens, not isolated hardcoded green values.

### 11.3 Contracts and state boundaries

- Effective capability response: plan, selected post-trial tier, subscription status/end dates, merchant verification, QRIS activation, permitted actions, reason codes and policy version. Flags come from server-authorised evidence.
- Order projection separates payment, preparation, fulfillment, exception and priority; never one overloaded “status”. Retain unique order number, tenant scope, timestamps and immutable line snapshots.
- Keep cart local and ephemeral. Initiated pending payment/order state is durable server data. Refresh may clear an uncommitted cart, but cannot destroy a pending payment.
- Server recalculates product prices, charges and available/sold-out state before commit. Monetary arithmetic is exact. Browser totals are previews until authoritative review/confirmation.
- Mutations include an idempotency key and expected version when applicable. A lost response produces status inquiry. Never automatically repeat an ambiguous charge with a new key.
- Financial/paid/approval/fulfillment transitions use acknowledged server results. Optimistic UI is limited to harmless local selection and cart interactions.
- Live events include tenant, resource, sequence/version and event ID. Ignore duplicates; detect gaps and fetch authoritative snapshot. Recheck permissions after merchant/subscription/membership changes.
- Use cache keys containing authenticated tenant and scope. Clear protected data on logout/tenant switch; background events cannot populate another workspace.
- Server enforces access on page APIs, mutations, downloads, WebSocket subscription and reconciliation. Frontend hidden controls are presentation only.
- Historical financial snapshots do not recompute from today's menu/tax settings. Payment/receipt generation and print execution are distinct side effects.

### 11.4 Build sequence and fixtures

First implement tokens/shells and the capability contract. Build complete vertical slices: manual menu → cash takeaway → receipt → preparation/pickup; then verified dine-in, QRIS recovery, exceptions and billing lifecycle. Integrate real services only where approved contracts exist. Keep simulated financial data visibly labelled in development.

Fixtures must cover Free; Professional trial pending merchant; Business trial pending; paid merchant verified/QRIS inactive; fully active; rejected/suspended merchant; grace; cancelled but paid-through; read-only; role denied; tenant mismatch; failed provisioning; slow/partial/offline data. Include long Indonesian names, ≥6-digit rupiah totals, duplicate events, missing costs, held items and pending refunds. Do not seed fake customers or synthetic sales into production.

### 11.5 Content and observability

Default UI copy proposal is Bahasa Indonesia with consistent terminology; technical specification remains English. Store strings for localization. Dates use tenant timezone and explicit billing timestamps; never assume every business is WIB. Do not format subscription dates using the cashier device clock alone.

Instrument permitted analytics such as setup step, checkout initiation, authoritative payment result, receipt failure, KDS dispatch/acceptance, pickup mismatch, approval decision, shift close and billing recovery. Do not capture PINs, raw financial credentials, identity documents, sensitive notes or QR payloads in general analytics. Numeric latency/availability budgets and analytics retention are TBD; measure a pilot baseline before promising performance.

## 12. Acceptance criteria and review checklist

These criteria supplement PRD IDs and do not replace them. All implementation verification is **pending**. Use synthetic data and approved test environments; this file's checks validate the specification, not a live app.

| ID | Scenario / action | Observable pass condition | Verification |
|---|---|---|---|
| UI-01 | Open at specified mobile/tablet/desktop targets | Shell changes as specified; no clipped total/order number/actions | Rendered viewport review |
| UI-02 | Keyboard through POS, modifier, payment and dialogs | Every action reachable; visible unobscured focus; logical focus return | Keyboard + assistive technology |
| UI-03 | Check normal, selected, error, warning and chart states | Accessible contrast; icons/labels supplement colors; chart table available | Automated contrast + manual review |
| UI-04 | Zoom/text enlargement and 320 CSS px reflow | Forms/actions usable; map/table alternatives accessible | Browser zoom/reflow review |
| UI-05 | Register Free | Rp0 permanent, no trial/mandate; cash takeaway succeeds | UI + API integration |
| UI-06 | Free calls dine-in/QRIS directly with active merchant flags | Both denied server-side with explicit reason | Capability/security tests |
| UI-07 | Register Professional/Business with consent | 30-day registration-based trial; actual future price/date disclosed; mandate verified | Billing test integration |
| UI-08 | Paid trial merchant pending/rejected | Cash takeaway and entitled KDS/pickup work; dine-in/QRIS locked | End-to-end journey |
| UI-09 | Merchant verified, QRIS inactive | Entitled dine-in cash works; QRIS remains locked | Gate matrix tests |
| UI-10 | Merchant + QRIS active, paid access valid | QRIS offered only to authorised role; verified payment dispatches once | Provider test + role tests |
| UI-11 | Onboarding lasts beyond trial boundary | Trial/end date unchanged; renewal/grace uses verified server lifecycle | Controlled server clock |
| UI-12 | Duplicate cash click or repeated QRIS notification | One logical payment/receipt record and one KDS dispatch | Concurrent/idempotency tests |
| UI-13 | Browser closes during pending QRIS | Original pending record recovered; no unpaid KDS job | Interruption/reconnect test |
| UI-14 | QRIS ambiguous or timer expires locally | No false Paid/terminal state or unsafe cash fallback; server reconciliation shown | Failure/late-callback tests |
| UI-15 | Sold Out/price change while cart open | Server rejects/returns changed review; no stale unauthorised sale | Two-client integration |
| UI-16 | Save/discard cart | No save unpaid draft/open bill; discard produces no ghost occupancy/job | Navigation/state test |
| UI-17 | Same table buys again | Separate order numbers, full checkouts and receipts; no split/mixed payment | End-to-end orders |
| UI-18 | New paid ticket arrives | New with explicit Start Preparing; visual alert; audio optional | KDS browser review |
| UI-19 | KDS priority change | Only kitchen/authorised manager/owner; same-priority FIFO by paid dispatch | API + two-client queue test |
| UI-20 | Mark Ready with held/unfinished items | Held items cannot progress; aggregate not falsely Ready | State-machine integration |
| UI-21 | All eligible items Ready | Leaves Active; appears in service/pickup; not auto-completed | KDS/service journey |
| UI-22 | Dine-in serving completion | Waitstaff item/all Served; table releases only after all active orders complete | Concurrent table test |
| UI-23 | Pickup missing/wrong order number | Handover blocked; no name-based substitute/override | Browser + direct API |
| UI-24 | Correct number, all items Ready, two handover attempts | Exactly one completion with actor/time; history retained | Concurrency tests |
| UI-25 | Paid order exception submitted | Only affected unserved items held; others continue | Exception integration |
| UI-26 | Manager/owner approval including self-approval | Personal reauthentication/audit; rejection restores prior state; no timed escalation | RBAC + workflow tests |
| UI-27 | Refund approval/provider failure or price-up replacement | Approval ≠ refund success; extra payment verified before replacement KDS | Provider tests/linked journal |
| UI-28 | Shift close nonzero discrepancy | Reason required; cashier may close without manager; QRIS excluded from drawer | Financial fixture + UI |
| UI-29 | Print fails | Paid order intact; reprint/PDF available without repayment/dispatch | Device/printer test |
| UI-30 | Grace/cancellation boundary | 7-day grace correct; read-only at cutoff; no automatic Free downgrade | Lifecycle/time tests |
| UI-31 | Read-only history/recovery | Allowed reads/exports/billing available; ordinary mutations denied | API + browser tests |
| UI-32 | Merchant/channel status revoked on another device | Gates update; new disallowed attempts blocked; historical reconciliation preserved | Live event + API test |
| UI-33 | Connection lost during operations | Stale banner and time; no offline sales or blind queued writes; reconnect snapshot | Network interruption |
| UI-34 | Foreign tenant ID/role/API/download/event subscription | No data leak or action; generic resource/access response | Security integration |
| UI-35 | Future feature or tier assignment unresolved | No production navigation/marketing promise invented; explicit preview/TBD only | Scope/content review |
| UI-36 | Report data partially unavailable or cost absent | Unknown not rendered as zero/profit; definitions and scope visible | Partial-data fixtures |
| UI-37 | Billing recovery redirect without verified callback | Access not restored prematurely; pending state remains | Billing race/reconciliation |
| UI-38 | 58/80mm receipt with long labels | Legible amounts/order number, no clipping; tested supported device only | Physical/PDF print review |

Release review must also resolve all release-critical TBDs, run the PRD acceptance suite, record rendered evidence for the design contract viewports and verify real device/printer behavior. A source-code review or passing mock screenshot alone cannot certify complete payment/entitlement behavior.

## 13. Phase priorities and dependencies

Preserve the original six phases and 16 modules. A priority below sequences implementation within those phases; it does not add an extra phase or grant a tier.

| Phase | Original modules | Priority and UI deliverables | Exit dependency |
|---|---|---|---|
| 0 — Foundation | 1 Business Settings; 2 Accounts/Security; 3 Data Foundation | P0 tokens/shells, auth, tenant provisioning, capabilities, settings; paid onboarding/billing essentials brought forward | Verified role/tenant policy; real prices/consent/provider contract for paid flow |
| 1 — Menu/POS | 4 Menu; 5 POS/Payments/Receipts; 6 Cash Sessions | P0 manual availability, customization, cash checkout, shifts; accelerated Dynamic QRIS and printing where verified | Exact charge calculation; idempotency/recovery; compatible printers |
| 2 — Tables/Orders | 7 Tables; 8 Orders/KDS; 9 Bill/Fulfillment Management | P0 independent orders, single shared paid-only KDS, item serving, strict pickup, controlled exceptions | Verified merchant gates; readiness/hold/payment integrity; no split bills |
| MVP accelerated subset | Existing modules retain their identity | Basic sales dashboard from Module 10; SaaS lifecycle, QRIS and supported receipts as expressly approved | Accounting definitions; plan entitlements; live-payment readiness |
| 3 — Monitoring/Inventory | 10 Dashboard/Analytics; 11 Inventory | P1 deeper reports and ledger/recipe workflows; HPP specifics proposed | Unit/valuation/cost policy, validated restaurant workflow |
| 4 — Customers/Employees | 12 Customer Management; 13 Advanced RBAC | P2 customer/loyalty and fine-grained permissions after confirmation | Privacy, loyalty rules, permission model; tier allocation TBD |
| 5 — Integration/Optimization | 14 Integrations; 15 Multi-Outlet; 16 Optimization | P2 multi-outlet, approved promotions/automation/integrations; AI/menu scanning proposed allocation | Explicit scope/provider approval and data boundaries |

Do not move inventory or AI into MVP merely because screenshots show them. Manual discount support is distinct from a promotion engine. Online-only remains the current baseline; future offline research does not authorise offline checkout. No customer self-ordering, kitchen printing or multi-station routing is assumed in MVP.

## 14. TBD register and handoff

### 14.1 Decisions that must remain explicit

| ID | Unresolved decision | Proposed decision owner | Blocks |
|---|---|---|---|
| D01 | Full feature-by-tier matrix, Free KDS, basic dashboard allocation | Product owner | Final navigation/plan marketing and Free fulfillment design |
| D02 | Professional/Business monthly/annual prices, employee caps, Free caps | Product/commercial | Paid signup/price cards and limit enforcement |
| D03 | Eligible SaaS recurring provider/instruments, mandate/retry flows | Payments/commercial | Real paid registration/renewals |
| D04 | Verified Midtrans onboarding/channel status mechanism and account eligibility | Payments/provider | Live dine-in/QRIS activation gates |
| D05 | QRIS expiry/refunds/settlement support, partial refunds and manual fallback evidence | Payments/provider | Live QRIS/exception behavior |
| D06 | Tax/service bases, compounding, inclusive/exclusive model, precision/rounding | Product/accounting | Authoritative totals and receipt preview |
| D07 | Gross/net/refund recognition, reporting timezone/cutoffs and exports | Accounting/product | Financial dashboards/reconciliation labels |
| D08 | Field-level readiness visibility, per-unit vs per-line quantity completion | Operations/product | Final KDS/service data projections |
| D09 | Read-only cutoff handling for already-paid active kitchen/service work | Product/operations | Safe subscription-boundary release behavior |
| D10 | Explicit paid-to-Free migration, trial-cancellation effect, proration, reactivation | Product/billing | Plan-change/cancel edge-case copy |
| D11 | Overlapping cashier sessions, drawer/device scope, authorised cash movements | Operations/accounting | Shift/device constraints |
| D12 | Delegated settings/menu/financial scopes, waitstaff cash authority | Product/security | Final fixed role controls |
| D13 | Table map editing/move behavior and failed/abandoned payment occupancy release details | Product/operations | Advanced table actions; checkout recovery consistency |
| D14 | Stock units/conversions, valuation, negative-stock policy, yield/overhead | Operations/accounting | Phase 3 inventory/HPP |
| D15 | Promotions/loyalty eligibility, stacking, discount permissions and accounting | Product/accounting | Promotion/loyalty engine |
| D16 | AI provider/privacy, source-data rules, quotas, schedule, tier allocation | Product/privacy | AI insights/menu-photo scanning |
| D17 | Multi-outlet merchant/subscription ownership and cross-outlet authorisation | Product/architecture | Phase 5 outlet operations |
| D18 | Numeric performance/recovery targets, supported browsers/printers, retention | Engineering/operations | Production readiness claims |
| D19 | Exact pickup number normalization; no fuzzy match or substitute | Product/operations | Final verification validation |

### 14.2 Codex handoff instructions

Implement only the approved phase and currently confirmed capabilities. Use this document's DESIGN values as the visual default. Keep FUTURE modules behind release flags and out of production entitlement promises. Resolve the relevant TBD before wiring money, role escalation, charge calculation or new fulfillment semantics.

For each shipped screen, provide the screen ID, capability fixture coverage, rendered viewport evidence, keyboard/state results and associated UI/PRD acceptance outcomes. Report untested integrations honestly. Preserve complete order/payment/audit history and enforce every restriction on the server. Never infer production merchant activation, recurring consent or successful payment from a client control.

**Specification completion status:** All requested surfaces have textual wireframe, state and interaction guidance. The five screenshot references were visually inspected; the local PRD v1.1 was used; the historical combined blueprint was unavailable. Future features and unresolved tier allocations remain explicitly labelled. Implementation, rendered UI validation and live-provider verification are separate pending work.
