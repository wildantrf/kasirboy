# MejaFlow local simulation

A responsive Next.js + TypeScript website with two isolated sample cafes, customer table ordering, simulated payments, inventory reservations, cashier/kitchen screens, and backend role checks. No Supabase, payment or billing account is required.

## Open locally

With the local server running, open http://127.0.0.1:3100.

1. Choose Kopi Senja or Ruang Taman and Owner, Cashier or Kitchen.
2. Open Customer preview in another browser tab. It starts at Table 07.
3. Add items, enter notes, review the all-inclusive total, and continue to simulated payment.
4. Click Simulate successful payment. No money moves.
5. Return to the staff tab. The paid order appears with its table, quantities and notes. Kitchen preparation updates refresh on the customer's status page.

The cafe selector switches the demo staff session across staff tabs in the same browser. It is deliberately a local demo picker, not real staff authentication. Customer order access uses a separate HttpOnly session cookie. Staff polling and customer polling refresh every 2.5 seconds.

## Start or restart

Node.js 24.22 or newer is recommended for this simulation's built-in SQLite support. From this folder, run:

```text
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100
```

Alternatively, use Start-MejaFlow.ps1. Keep its terminal open; Ctrl+C stops the server. If port 3100 is already in use, the existing preview may still be running.

Dependencies are installed in this copy. To reinstall on a machine with npm:

```text
npm ci
```

The lockfile records the installed dependency versions. This app uses Next.js 16.4.5 in the initial local build. No hosted service or domain is configured.

## Sample screens

- `/`: staff workspace, cashier, kitchen, inventory, tables, demo roles, subscription preview.
- `/order/senja/7`: Kopi Senja customer menu for Table 07.
- `/order/taman/2`: Ruang Taman customer menu for Table 02.
- Tables 01-12 exist in each cafe. Tables & QR provides working local-link QR SVGs and downloads.

QR links point to localhost and work on this computer. They are not reachable from a customer's phone. This is an ordering link QR, not a QRIS payment code.

## Stock and payment simulation

- Quantities are finished menu items; paused or zero-available items cannot be purchased.
- Checkout atomically reserves the complete cart; an unchanged checkout retry reuses its order.
- Payment consumes stock and releases the order exactly once.
- The demo uses a five-minute reservation timeout, not a selected provider's payment expiry. Expiry sweep runs on API requests; simulated pending orders can also be expired explicitly.
- Expiry releases held stock. A subsequent late simulated payment is marked Paid / Needs review, excluded from kitchen until staff allocates available stock.
- Cashiers may request refunds; only owners approve and simulate their provider confirmation. Refunds remain pending until that confirmation. Refunds are full-order only and do not automatically restock items.

The live integration must replace demo expiry/payment controls with verified provider notifications, durable jobs and reconciliation. Do not deploy this demo publicly or use it to accept money.

## Persistence

SQLite records live in `data/simulation.sqlite` and survive server restarts. Only these synthetic cafes and orders are stored. There is no connection to any live business data. Back up this file with the server stopped if you want to preserve a demo scenario. Customer access also depends on the browser's cookie; clearing cookies ends access to its prior demo orders.

## Verification

```text
node --test tests/store.test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

With the local server running, `node tests/http-check.mjs` runs API integration checks, including concurrent last-unit purchases. It changes synthetic Ruang Taman inventory and creates sample orders. Use only against this local simulation.

## Boundaries of this first slice

Implemented: two cafes, seeded menus/tables, responsive screens, customer cart/notes, total validation, paid-only queues, preparation/served updates, stock editing and pause, retry-safe checkout/payment, tenant/customer/role checks, local QR downloads, late-payment review, basic simulated owner refund flow, durable local data, and error feedback.

Not implemented: Supabase/PostgreSQL, production sign-in, cafe signup/onboarding, real invitations, menu creation/price editing, customer-approved replacement execution, partial refunds, real QRIS, automatic subscription billing, real-time push, production background workers, deployment, backups or production security certification. Team supports an owner-managed staff roster with add, edit, active/inactive status and removal, persisted per café in SQLite. Staff records do not create login accounts or send invitations. Subscription remains a preview. These remain in the saved requirements/plan and have not been silently treated as completed.
