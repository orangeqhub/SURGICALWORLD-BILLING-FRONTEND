# Frontend Extension - Phase Implementation Log

Tracks the phased, frontend-only extension of the billing app into CRM,
Inventory, Purchase, Sales, Branch Transfer, Payments, Receipts, Ledger and
Reports.

See `docs/FRONTEND_HANDOVER.md` for the full completion summary, route map,
permission matrix, and backend requirements. This file is a short log of
what shipped in each phase and its commit.

## Architecture decisions

- New transactional-ish entities that have no SQLite table (Ledger, Payments,
  Receipts, CRM notes, Batches, frontend-demo Purchases/Transfers) are
  persisted via AsyncStorage under `src/services/mock/`.
- `src/services/api/*Api.js` wrap those mock stores behind the same
  `isMockMode()` / `apiClient` branch used by every existing `*Api.js` file,
  so a later real backend swap requires no UI changes.
- No SQLite tables, migrations, or repository files were added or modified
  in any phase.
- Existing real flows (billing stock decrease, Quick Record purchase, simple
  transfer request/approval) were preserved untouched; new advanced
  workflows are additive tabs/screens clearly tagged `FRONTEND_DEMO`.

## Phase 0 - Foundation
Commit: `ab3fa5b5`. Mock service foundation, Ledger/Payment/Receipt/CRM
adapters, shared types, permission constants.

## Phase 1 - Employee profiles, navigation, dashboards
Commit: `832e6741504096ef22458456eb7ac8817f1da5c7`. Functional employee
profiles (Sales/Purchase Executive, Accountant), permission-driven
navigation and direct-route guards, role dashboards.

## Phase 2 - CRM, Suppliers, Product Master, Inventory, Batches
Commit: `1454c93409d07325916fc2f2d5ca3b098fc7f754`. Customer/Supplier/Product
managers (shared across roles), batch inventory model, tabbed Inventory
screens, mobile responsive lists.

## Phase 3 - Purchase Editor & Billing upgrades
Commit: see `docs/FRONTEND_HANDOVER.md` (Phase 3 commit hash). Full frontend
Purchase Editor, existing-customer search and batch selection in Billing,
price/discount permissions with correct pre-tax invoice-discount allocation,
atomic idempotent mock batch consumption.

## Phase 4 - Transfers, Payments, Receipts, Ledgers
Commit: see `docs/FRONTEND_HANDOVER.md`. Advanced batch-level Transfer
editor, Supplier Payments / Customer Receipts management, Customer/Supplier
ledgers with receivables/payables ageing.

## Phase 5 - Reports, Exports, Handover
Commit: see `docs/FRONTEND_HANDOVER.md`. Report export bar (Print/CSV)
wired into existing and new report screens, Purchase Executive/Accountant
report screens, final handover documentation.
