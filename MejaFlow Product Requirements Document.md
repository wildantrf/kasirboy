# MejaFlow Product Requirements Document

Current local simulation and planned production product

| Status<br>Local simulation complete; production integration pending | Version<br>1.0 | Date<br>7 November 2026 |
| --- | --- | --- |
| Product<br>MejaFlow | Audience<br>Product owner, designers, engineers, payment partners | Market<br>Indonesian cafes |

## Purpose

MejaFlow is a browser-based SaaS product for cafes that lets customers order from a table QR link, pay the exact displayed total, and sends only verified paid orders to the cashier and kitchen. This document records the existing local simulation, the required user experience, and the boundaries for a production release.

## Product outcome

A cafe should be able to offer QR table ordering without losing the table, item, quantity, note, stock, or payment context. A customer sees a simple phone-first menu. Staff see the same paid order in the appropriate operational view. Each cafe remains isolated from every other cafe.

## Users and permissions

| User | Primary need | Allowed actions |
| --- | --- | --- |
| Customer | Order and pay from a table | Browse available menu items, add notes, pay the exact displayed total, and view overall order progress. |
| Kitchen | Prepare paid food in order | View paid active tickets, start preparing an order, mark individual order lines ready, and mark an order served. No payment totals or payment credentials. |
| Cashier | Manage paid orders and exceptions | View paid orders and totals, adjust stock, handle late-payment review, record agreed replacements, request refunds, and mark served. |
| Owner | Operate the cafe workspace | All cashier and kitchen permissions plus menu, staff, table, payment, subscription, and refund approval management. |
| MejaFlow operator | Operate the SaaS safely | Support the platform without accessing cafe data unless an approved support process allows it. Platform billing remains separate from diner payments. |

## Current application scope

The local simulation already demonstrates the main restaurant workflow using synthetic data. It contains two isolated cafes, seeded menus and tables, customer table ordering, simulated payment, inventory reservation, cashier and kitchen dashboards, local QR link generation, preparation status updates, late-payment review, and a basic owner refund simulation. It is not a production payment system and must not accept real money.

### Customer experience

- A customer opens a QR table link in a phone browser. The page identifies the cafe and table.

- The menu displays all-inclusive IDR prices. An unavailable item is labelled Out of stock and cannot enter the cart.

- The cart shows quantities, notes, and the exact amount to pay. The backend, not the browser, remains responsible for price and stock validation.

- After checkout starts, the system reserves available finished-item stock while payment is pending.

- The customer receives an order confirmation only after verified payment. The customer sees only overall order progress, never kitchen line-item preparation controls.

### Cashier experience

- Cashier sees paid orders with order number, table, items, quantities, notes, total, and payment status.

- Cashier can adjust finished-item inventory and pause an item, which changes customer menu availability.

- Late payments that arrive after stock was released go to cashier review. The cashier allocates remaining stock or records a customer-agreed replacement or refund path.

- Cashier can request a refund but cannot execute it without owner approval.

### Kitchen experience

- Kitchen shows only paid active tickets, sorted by original customer order time from oldest to newest.

- A new ticket has a red ticker and one Start preparing order action at the ticket bottom.

- Starting an order changes the ticket to Preparing with a yellow ticker. Each order line then has a neutral Ready checklist control.

- When every line is ready, the system derives the order as Ready and removes it from the Active kitchen queue. History contains served orders.

- Kitchen does not see prices, payment revenue, payment credentials, or customer refund controls.

### Owner experience

- Owner manages cafe information, staff roles, menu, inventory, tables, QR links, payment setup, subscription, and refund approval.

- The future Payments setup includes Not connected, KYC in review, Active, and Rejected states.

- Production payment onboarding must use an approved provider flow. Sensitive identity documents, bank credentials, and provider secret keys must never be stored in the browser.

## Order and payment lifecycle

| Stage | Required system behavior | Who sees it |
| --- | --- | --- |
| Cart | Customer chooses available items. Server validates price, quantity, table, and stock before order creation. | Customer |
| Awaiting payment | Create one order with a unique number and reserve stock. Do not show the order in staff fulfilment queues. | Customer and authorised staff exception tools only |
| Paid | Accept only authenticated provider confirmation that matches order, amount, currency, and cafe. Consume stock once and release the order once. | Customer, cashier, kitchen |
| Preparing | Kitchen starts the order and completes individual menu lines. Customers and cashiers see only the overall progress. | Kitchen; overall state elsewhere |
| Ready | All order lines are complete. Remove the ticket from the kitchen active queue. | Cashier and customer overall progress |
| Served | Authorised staff close the fulfilment workflow. Keep a durable history. | Authorised staff and customer overall progress |
| Needs review | A verified late payment arrived after reservation release. Cashier resolves fulfilment or an agreed replacement/refund without losing payment history. | Owner and cashier |

## Inventory rules

- Inventory tracks finished menu-item portions in the first release, such as portions of nasi goreng. It does not yet model ingredients or purchasing.

- Available-to-order quantity excludes units held by pending-payment reservations.

- Verified payment consumes a reservation exactly once. Confirmed expiry or terminal failure releases it exactly once.

- The application must prevent negative stock, overselling, duplicate stock deductions, and stock release caused only by a client-side timer.

- If a paid item cannot be served, staff offer a replacement only with customer agreement or issue an approved refund. The system must never substitute automatically.

## Payment and revenue model

The local app uses simulated payments. The intended production model is a Midtrans Partner arrangement, subject to Midtrans approval and legal review. Each cafe is onboarded as a registered merchant under the approved arrangement. The customer pays one exact total shown in MejaFlow. A proposed transaction split allocates 99 percent to the cafe and 1 percent to MejaFlow, with QRIS and provider fees allocated by the agreed rule. MejaFlow must not receive all cafe sales and manually forward the cafe share.

- Do not enable real payment acceptance before provider approval, merchant onboarding, webhook verification, refund rules, and settlement terms are complete.

- A cafe may complete provider-hosted or provider-approved KYC inside a MejaFlow onboarding flow, but Midtrans must approve the merchant and issue the merchant ID.

- Midtrans secrets and webhook verification must run server-side. The client receives only safe checkout information and payment status.

- If split payments are unavailable for the selected arrangement, the fallback commercial model is a separate monthly or usage-based SaaS invoice to the cafe.

## Multi tenant and security requirements

| Area | Requirement |
| --- | --- |
| Tenant isolation | Every menu item, table, order, stock record, staff membership, payment record, and subscription record belongs to exactly one cafe. Backend checks must reject cross-cafe reads and writes. |
| Role enforcement | Hidden controls are not sufficient. The backend enforces owner, cashier, kitchen, and customer permissions for every action. |
| Payment integrity | Payment webhooks are authenticated and idempotent. Order, amount, currency, merchant context, and terminal payment status are verified before fulfilment release. |
| Customer privacy | A reusable table QR link cannot provide access to earlier customers' orders. Customer order access uses a separate scoped session or equivalent safe mechanism. |
| Auditability | Record stock adjustments, payment reconciliation, refund requests and approvals, replacement consent, and material staff actions. |
| Reliability | Durable records must survive refreshes and service restarts. Production requires backups, recovery testing, background work for expiry/reconciliation, and error visibility. |

## Success measures

These measures are proposed for the pilot. Baselines and targets should be confirmed before production launch.

| Measure | Pilot definition |
| --- | --- |
| Order completion | Share of started customer checkouts that reach verified payment. |
| Correct routing | Share of verified paid orders that appear once, with matching table, items, quantities, and notes on cashier and kitchen screens. |
| Kitchen speed | Time from verified payment to kitchen visibility, and time from order creation to Ready. |
| Stock accuracy | Number of oversells, negative-stock events, duplicate deductions, and manual inventory corrections. |
| Payment reconciliation | Number of unmatched, duplicated, delayed, or manually resolved payment events. |
| Cafe adoption | Activated cafes, active staff users, and completed paid orders per active cafe. |

## Out of scope for the first production release

- Ingredient or recipe inventory, purchasing, supplier workflows, loyalty programs, delivery, split bills, and multi-branch operations.

- Native mobile applications. Customers and staff use responsive browser pages.

- Real payment acceptance, live QRIS, automatic subscription billing, real-time push, production sign-in, and production deployment until the required partner, security, and operational work is complete.

- Automatic replacement of unavailable paid items or cashier-controlled payment refunds without owner approval.

## Production release conditions

- A selected provider confirms the approved merchant, QRIS, settlement, transaction-split, refund, and onboarding model in writing.

- Sandbox tests cover success, failure, expiry, duplicate events, forged notifications, late payments, refunds, and interruption recovery.

- Two-cafe tests prove tenant isolation for all reading and writing paths.

- The application has real authentication, server-side role checks, backups, monitoring, recovery procedures, and a production incident process.

- Cafe commercial terms, customer terms, privacy notices, provider agreement, tax treatment, and data-retention decisions are reviewed by suitable Indonesian advisers.

## Open decisions

| Decision | Current position | Needed before |
| --- | --- | --- |
| Payment partner agreement | Midtrans is a researched candidate; no account or agreement is active. | Live payment build |
| QRIS split eligibility | Partner split is documented generally; QRIS eligibility, settlement, fee allocation, and KYC flow require written confirmation. | Commercial launch |
| SaaS pricing | One plan per cafe location is approved. Price, limits, trial, cancellation, and overdue policy are not final. | Paid subscriptions |
| Reservation timeout | Must match the selected provider's supported payment expiry and terminal-status behavior. | Live checkout |
| Refund details | Owner approval is required. Partial refunds, replacement pricing, and unsupported-channel fallback remain undefined. | Live refunds |
| Production platform | The current version is a local Next.js and SQLite simulation, not a hosted service. | Pilot |

## Delivery sequence

| Phase | Outcome |
| --- | --- |
| 1. Product hardening | Replace demo role selection with staff authentication, durable tenancy controls, audit history, and production data storage. |
| 2. Payment approval | Complete Midtrans Partner discussions, merchant onboarding design, sandbox credentials, and payment contract tests. |
| 3. Payment integration | Build provider checkout, authenticated webhooks, idempotent reconciliation, provider-aligned expiry, and exception handling. |
| 4. Operational readiness | Add real-time updates, jobs, monitoring, backups, recovery drills, security review, and staff support procedures. |
| 5. Controlled pilot | Onboard a small number of cafes, use production-like monitoring, measure the pilot metrics, and resolve issues before wider rollout. |

## Source note

This PRD consolidates the existing MejaFlow local simulation, the recorded product requirements through revision 9, and the payment model explored for a future Midtrans Partner implementation. It distinguishes implemented demo behavior from production requirements. Provider capability, commercial, legal, and regulatory decisions remain subject to direct confirmation with Midtrans and qualified Indonesian advisers.
