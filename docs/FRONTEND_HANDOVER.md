# Frontend Handover - Surgical World Billing

Frontend-only extension (Phases 0-5) of the existing Billing/POS app into
CRM, Inventory, Purchasing, Branch Transfers, Payments, Receipts, Ledgers,
and Reports. No backend, database schema, native, or EAS/OTA files were
touched in any phase.

## 1. Completed modules by phase

| Phase | Commit | Modules |
|---|---|---|
| 0 | `ab3fa5b5` | Mock service foundation, Ledger/Payment/Receipt/CRM adapters |
| 1 | `832e6741504096ef22458456eb7ac8817f1da5c7` | Employee functional profiles, permission-driven nav, route guards, dashboards |
| 2 | `1454c93409d07325916fc2f2d5ca3b098fc7f754` | Customer CRM, Supplier Management, Product Master, Batch Inventory, tabbed Inventory |
| 3 | see final report | Full Purchase Editor, Billing customer-search/batch-selection/discounts |
| 4 | see final report | Advanced Transfers, Payments, Receipts, Ledgers, Receivables/Payables |
| 5 | see final report | Report export bar, Purchase/Financial reports, this handover doc |

## 2. Route map (new/upgraded routes)

**Branch Admin / Super Admin** (existing routes, upgraded): `customers`,
`suppliers`, `products` (Branch Admin only), `inventory` (tabbed:
current/branch/batch/low-stock/near-expiry/expired/movement/adjustments),
`purchases` (tab: Purchase Editor + existing Quick Record), `transfers`
(tab: Transfer Editor + existing Approval Queue), `reports` (+ export bar).
New: `(super-admin)/customers.js`, `(super-admin)/suppliers.js`,
`(branch-admin)/products.js`.

**Employee** (`app/(employee)/*`, all gated by `src/constants/employeeNavigation.js`):
`dashboard`, `billing` (upgraded), `invoices` (upgraded), `shift` - Cashier/
Sales Executive; `purchases`, `suppliers`, `inventory-view`,
`purchase-reports` - Purchase Executive; `payments`, `receipts`,
`customer-ledger`, `supplier-ledger`, `receivables-payables`,
`financial-reports` - Accountant.

## 3. Role-permission matrix (summary)

| Role | Key permissions | Access |
|---|---|---|
| Super Admin | all (bypass) | Everything, all branches |
| Branch Admin | all (bypass) | Everything, own branch |
| Sales Executive | `BILLING`, `HOLD_BILL`, `RETURNS`, `CREDIT_SALE`, `DASHBOARD_VIEW` | Billing, Invoice History, Shift, Dashboard |
| Purchase Executive | `PURCHASE_MANAGE`, `SUPPLIER_MANAGE`, `INVENTORY_VIEW`, `DASHBOARD_VIEW` | Purchases, Suppliers, Inventory View (read-only), Purchase Reports - **no** `STOCK_ADJUST`, **no** Billing |
| Accountant | `LEDGER_VIEW`, `PAYMENTS_MANAGE`, `RECEIPTS_MANAGE`, `EXPENSE_MANAGE`, `REPORTS_VIEW`, `DASHBOARD_VIEW` | Payments, Receipts, Ledgers, Financial Reports - **no** Billing, **no** Stock Adjustment |
| Cashier | `BILLING`, `HOLD_BILL` | Unchanged original Billing/Invoice History/Shift |

`PRICE_EDIT`/`DISCOUNT_EDIT`/`TRANSFER_CREATE`/`TRANSFER_VIEW`/
`TRANSFER_DISPATCH`/`TRANSFER_RECEIVE` exist as constants but are **not**
assigned to any employee profile by default - grant them in
`src/constants/employeeProfiles.js` when a real role needs them. Direct-URL
guards and menu visibility both read the same
`src/constants/employeeNavigation.js` catalog, so they can't drift apart.

## 4. Real-data vs frontend-demo boundaries

| Data | Source of truth | Notes |
|---|---|---|
| Billing invoices, stock decrease | Real SQLite (`invoiceRepository`) | Unchanged |
| Quick Record purchases | Real SQLite (`purchaseRepository`) | Unchanged, still writes real stock |
| Simple transfer request/approval | Real SQLite (`stockRepository`) | Unchanged |
| Full Purchase Editor | Mock (`purchaseFrontendStore`), tagged `source: FRONTEND_DEMO` | Never writes real stock |
| Advanced Transfer Editor | Mock (`transferFrontendStore`) | Never writes real stock |
| Batches | Mock (`batchInventoryStore`), synthetic batches tagged `isSynthetic`/`source: frontend-demo` | Seeded from real stock quantities; decremented only after a real invoice save, atomically + idempotently |
| Ledger/Payments/Receipts | Mock (Phase 0 adapters) | Not posted accounting |
| Customer/Supplier/Product extended fields | Mock profile stores merged onto real rows | Base rows (name/mobile/etc.) remain real where they exist |

Every list/report that mixes real and demo rows shows a **Source** badge
(`Real` / `Frontend Demo`) per row.

## 5. Mock service structure

`src/services/mock/*Store.js` (AsyncStorage) -> `src/services/api/*Api.js`
(branches on `isMockMode()`) -> screens/components. Screens never touch
AsyncStorage directly. Key stores: `mockStore.js` (generic list CRUD used by
most), `ledgerStore`, `paymentStore`, `receiptStore`, `crmStore`,
`customerProfileStore`, `supplierProfileStore`, `productProfileStore`,
`batchInventoryStore` (combined versioned state + consumption idempotency
log), `purchaseFrontendStore`, `transferFrontendStore`.

## 6. Backend API contracts required later

- `GET /batches?branchId&productId` - real multi-batch inventory (referenced
  by `batchInventoryApi.fetchBatches` in real-API mode; currently mock-only)
- `POST /purchases` (multi-line, GST/discount-aware) - to replace
  `purchaseFrontendApi`'s mock save with a real posting endpoint
- `POST /stock-transfers` (batch-level, approval workflow) - to replace
  `transferFrontendApi`
- `POST /payments`, `POST /receipts`, `GET /ledger` - already stubbed as
  real-mode branches in the Phase 0 adapters (`paymentApi`, `receiptApi`,
  `ledgerApi`), need real implementations
- Reports: no dedicated endpoints yet; current reports compute from real
  read APIs + mock adapters client-side. A backend aggregation endpoint
  would improve performance at scale.

## 7. Future database entities (backend team)

Batches (multi-batch per product/branch with mfg/expiry/qty), frontend
Purchase header+lines (with GST/discount breakdown), Transfer header+lines
(batch-level), Payment/Receipt allocations (invoice-level), Ledger entries.

## 8. Known limitations

- No live/manual UI click-through was performed in this session (no way to
  launch the app interactively) - all verification is code-level plus
  actual execution of the pure calculation functions.
- Receivables/Payables ageing buckets each outstanding DEBIT entry by its
  own age using FIFO credit settlement - a simplification, not full
  transaction-matched ageing.
- Report categories were consolidated into the existing Reports, Inventory,
  and Ledger screens with shared filters/export rather than building out
  all ~35 individually-named sub-reports as separate screens, given session
  time constraints.
- CSV export is used for spreadsheet export (no XLSX library was already
  installed; one was not added per instruction).
- Thermal/A4 invoice templates print item rows using price already
  discount-folded; the header "Discount" line is informational and does not
  double-subtract (verified in Phase 3 report) but a careful reader
  comparing item-row sums to the header Subtotal will see two valid,
  different (but reconciling) breakdowns.

## 9. Build & validation commands

```
npx tsc --noEmit
npm run build:web
```

No test framework is configured in this project; none was installed.
ESLint is not installed; none was installed.

## 10. APK / EAS note

No EAS or native configuration was touched in any phase. Existing
`eas.json`/`app.json` build profiles remain valid as-is; this frontend work
requires no new native permissions or dependencies (Print/FileSystem/Asset
were already project dependencies, reused as-is).

## 11. Recommended backend implementation order

1. `/batches` (unblocks real multi-batch Billing/Inventory/Purchase)
2. Purchase posting endpoint (multi-line, GST/discount)
3. Payments/Receipts/Ledger endpoints (accounting correctness first)
4. Transfer posting endpoint (batch-level, approval workflow)
5. Reports aggregation endpoints (performance optimization once data volume grows)
