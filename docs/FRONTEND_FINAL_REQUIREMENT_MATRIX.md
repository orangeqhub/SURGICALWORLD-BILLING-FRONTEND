# Frontend Final Requirement Matrix

Scope: audit of the SurgicalWorld Billing frontend against the PDF "CRM,
Inventory & Sales Management System - Process Flow Document", plus the four
newly-built modules (CRM Follow-ups, Sales Targets, Attendance, Payroll).

**Revision 2** (this pass) closes the gaps Revision 1 left open: dedicated
Customer-wise Sales and Product-wise Purchases reports, de-duplicated
REAL/FRONTEND_DEMO report aggregates, CRM Follow-up date/employee/customer
filter UI, an admin-facing Attendance Monthly Summary view, and a filterable
Payroll History view. Rows below are annotated `(Rev 2)` where changed;
everything else is unchanged from Revision 1 and was re-verified (`build`)
rather than rewritten.

**Verification method** (stated per row, no row is marked COMPLETE on UI
presence alone):
- `tsc` = `npx tsc --noEmit` passes with the change included.
- `build` = `npm run build:web` succeeds, which server-renders every route
  once (a real runtime execution of each screen's component tree, not just
  a compile check).
- `trace` = manual code-path trace of the actual read/write functions
  (store -> api -> UI) confirming the data flows as required.
- `existing` = pre-existing behavior, re-verified by trace, not changed here.
- No interactive, click-by-click browser session was run in this
  environment (no browser-automation tool is available here) - `build`'s
  full-route SSR pass and `trace` are the two checks actually performed on
  every row below.

---

## A. PDF Core

| Requirement | Implementation | Test Result | Status |
|---|---|---|---|
| Login (Employee/Branch Admin/Super Admin) | `app/(auth)/*-login.js` + `authApi.js` | existing, trace: role-specific credential lookup against directory/seed data, session set in `AuthContext` | COMPLETE |
| Dashboard (per role) | `app/(*)/dashboard.js` + dashboard chart/card components | existing, `build` | COMPLETE |
| Customers (create/edit/search/ledger) | `CustomerManager.jsx` + `customerMasterApi.js` | existing, `build` | COMPLETE |
| Suppliers | `SupplierManager.jsx` + `supplierMasterApi.js` | existing, `build` | COMPLETE |
| Purchases (full editor + quick real record) | `PurchaseManager.jsx` (demo editor) + `purchaseApi.js` (real, stock-affecting) | existing, `build` | COMPLETE |
| Sales / Billing (POS) | `app/(employee)/billing.js` + `BillingContext`/`billingApi.js` | existing, `build` | COMPLETE |
| Products / Product Master | `ProductManager.jsx` + `productMasterApi.js` | existing, `build` | COMPLETE |
| Inventory (branch stock) | `app/(*)/inventory.js` | existing, `build` | COMPLETE |
| Batch / Expiry tracking | `batchInventoryApi.js` / `batchInventoryStore.js` | existing, `build` | COMPLETE |
| Stock Adjustment | `stockAdjustmentApi.js` + Inventory screen "New Adjustment" | existing, `build` | COMPLETE |
| Stock Movement | `stock_movements` SQLite table, surfaced in Inventory/Sync/Reports screens | existing, `trace` | COMPLETE |
| Branches (master data) | `app/(super-admin)/branches.js` + `directoryStore.js` | existing, `build` | COMPLETE |
| Branch Transfers | `TransferManager.jsx` + `transferApi.js`/`transferFrontendApi.js` | existing, `build` | COMPLETE |
| Payments | `FinanceDocumentManager.jsx` (isPayment) + `paymentApi.js` | existing, `build` | COMPLETE |
| Receipts | `FinanceDocumentManager.jsx` + `receiptApi.js` | existing, `build` | COMPLETE |
| Reports (see breakdown below) | multiple report screens | see below | PARTIAL -> COMPLETE (this pass) |
| Roles & Permissions | `roles.js`, `permissions.js`, `employeeNavigation.js`, `employeeProfiles.js` | existing, `trace` | COMPLETE |
| **Purchase -> stock increases -> batch stock updates -> supplier payable increases -> purchase reports update** | Stock/batch: existing `purchaseRepository.createPurchase` (unchanged). **Payable: was MISSING** - `purchaseApi.js` `recordPurchase()` now calls a new `recordPurchaseLedgerEntry()` that writes a `DEBIT` ledger row for the supplier via `ledgerApi.addLedgerEntry`, idempotent on the purchase's `localId`, best-effort (never blocks the purchase) | `tsc`, `build`, `trace`: confirmed `Receivables & Payables` (ledger-driven) previously showed **zero** payables for any real purchase because nothing ever wrote a ledger row for one - fixed | **FIXED THIS PASS** (was PARTIAL, now COMPLETE) |
| **Sale -> stock decreases -> receivable increases for credit sale -> sales reports update** | Stock: existing `invoiceRepository.completeBill` (unchanged). **Receivable: was MISSING** - `billingApi.js` `saveBill()` now calls `recordCreditSaleLedgerEntry()`, writing a `DEBIT` ledger row for the customer for the unpaid portion (`grandTotal - paidTotal`) whenever a `customerId` is present and the sale isn't fully paid, idempotent on the invoice's `localId`, best-effort | `tsc`, `build`, `trace`: same gap as above - `PaymentModal`'s `CREDIT`/partial-payment path never raised the customer's receivable balance - fixed | **FIXED THIS PASS** (was PARTIAL, now COMPLETE) |
| Transfer -> source stock decreases, destination increases, batch correct, history updates | `transferApi.js`/`transferFrontendApi.js` + `stock_transfer_items`, `TransferManager` history tab | existing, `trace` | COMPLETE |
| Payment -> supplier payable decreases, supplier ledger updates | `paymentStore.js` `createPayment()` already writes a `CREDIT` ledger entry | existing, `trace` (re-verified as part of this pass's ledger audit) | COMPLETE |
| Receipt -> customer receivable decreases, customer ledger updates | `receiptStore.js` `createReceipt()` already writes a `CREDIT` ledger entry | existing, `trace` | COMPLETE |
| Reports must use real data, not double-count demo | Ledger hooks (Rev 1): added only to the real (`purchaseApi.js`/`billingApi.js`) paths, never `FRONTEND_DEMO` stores. **(Rev 2)** Report *aggregates* fixed too: new `src/utils/reportDedup.js` `splitRealAndDemo(rows, identityKey)` keeps every REAL row, and drops any `FRONTEND_DEMO` row whose `purchaseNumber`/`invoiceNumber` collides with a REAL row's (same conceptual transaction re-entered in both places) - i.e. REAL is preferred on identity collision, exactly as required. `app/(employee)/purchase-reports.js` now computes `totalSpend` and `supplierWise` from `real` only (never `real+demo` summed); the per-row "All Purchases" list shows `deduped` (real + non-colliding demo, source-tagged) for reference only, never folded into a total | `tsc`, `build`, `trace` | COMPLETE (Rev 2 - was PARTIAL) |

### A.1 Reports breakdown

| Report | Where | Status |
|---|---|---|
| Daily / Monthly / Yearly Sales | `reports.js` (range selector: Daily/Monthly/Quarterly/Half-Yearly/Yearly/Custom) | COMPLETE |
| **Customer-wise Sales** | **(Rev 2)** New `reportApi.fetchCustomerSales(branchId, limit)` (+ `.web.js` twin) - groups real `invoices` by `customerId` (`isHeld=0` only), branchId optional for Super Admin's network-wide view. New "Customer-wise Sales" table in `app/(super-admin)/reports.js` and `app/(branch-admin)/reports.js`, names joined from `customerMasterApi.listCustomersWithProfile`, exportable via `ReportExportBar` | `tsc`, `build`, `trace` | COMPLETE (Rev 2 - was PARTIAL) |
| Product-wise Sales | `reports.js` "Top Selling Products" | COMPLETE |
| Daily Purchases | `purchase-reports.js` | COMPLETE |
| Supplier-wise Purchases | `purchase-reports.js` supplier-wise table, now computed from **REAL purchases only** (Rev 2 dedup fix, see row above) | COMPLETE |
| **Product-wise Purchases** | **(Rev 2)** New `reportApi.fetchPurchaseProductBreakdown(branchId, limit)` (+ `.web.js` twin) - groups real `purchase_items` (joined to `purchases`) by `productId`, branchId optional. New "Product-wise Purchases" table in `app/(employee)/purchase-reports.js`, `app/(super-admin)/reports.js` and `app/(branch-admin)/reports.js` (product names joined from `productApi.fetchProducts`); never reads `purchaseFrontendStore` (demo), so it's REAL-only by construction | `tsc`, `build`, `trace` | COMPLETE (Rev 2 - was MISSING) |
| Current Stock | `inventory.js` (Current tab) | COMPLETE |
| Low Stock | `inventory.js` (Low Stock tab) + dashboard card | COMPLETE |
| Expiring Products | `inventory.js` (Near Expiry tab) | COMPLETE |
| Batch-wise Stock | `inventory.js` (Batch tab) | COMPLETE |
| Stock Movement | `inventory.js` (Movement tab) | COMPLETE |
| Customer Ledger | `financial-reports.js` / `customer-ledger.js` | COMPLETE |
| Supplier Ledger | `supplier-ledger.js` | COMPLETE |
| Outstanding Receivables | `ReceivablesPayablesView.jsx` (now populated - see fix above) | COMPLETE (fixed this pass) |
| Outstanding Payables | `ReceivablesPayablesView.jsx` (now populated - see fix above) | COMPLETE (fixed this pass) |
| Payment Report | `payments.js` (Finance Document Manager) | COMPLETE |
| Receipt Report | `receipts.js` | COMPLETE |
| **GST Report** | **Added this pass**: `app/(super-admin)/reports.js` and `app/(branch-admin)/reports.js` now show a "GST Report" card (Taxable Amount / GST Collected / Invoice Value) computed from real invoices in the selected range | `tsc`, `build`, `trace` | COMPLETE (added this pass) |
| **Profit & Loss Report** | **Added this pass**: same two screens now show a "Profit & Loss (Simplified)" card - Revenue (ex-GST) - Cost of Goods (real purchases in range) - Operating Expenses (real expenses in range) = Net Profit. Explicitly labeled "Simplified"/"frontend approximation, not full accrual accounting" since there's no per-item COGS/inventory-valuation model in this codebase | `tsc`, `build`, `trace` | COMPLETE (added this pass, deliberately simplified) |

---

## B. CRM Follow-up Module

| Requirement | Implementation | Test Result | Status |
|---|---|---|---|
| Fields (customer, contact, mobile, follow-up date/time, type, priority, assignee, notes, next follow-up date, status) | `src/services/mock/crmFollowUpStore.js` record shape + `CrmFollowUpManager.jsx` form | `tsc`, `build` | COMPLETE |
| Types (Call/WhatsApp/Email/Meeting/Visit) | `TYPES` const in `CrmFollowUpManager.jsx` | `build` | COMPLETE |
| Priority (Low/Medium/High) | `PRIORITIES` const | `build` | COMPLETE |
| Status (Pending/Following/Completed/Cancelled) | `STATUSES` const, workflow enforced in `crmFollowUpStore.js` (`completeFollowUp`/`cancelFollowUp`/`rescheduleFollowUp` set status + append to `history[]`) | `trace` | COMPLETE |
| Create / Edit / View | `CrmFollowUpManager.jsx` modal form + detail modal (with history timeline) | `build` | COMPLETE |
| Complete / Cancel | `ConfirmModal` + `markFollowUpComplete`/`markFollowUpCancelled` | `trace` | COMPLETE |
| Reschedule | Dedicated reschedule modal -> `rescheduleFollowUpEntry` (sets new date, status back to `FOLLOWING`, logs history) | `trace` | COMPLETE |
| Search | `SearchInput` filters by customer name / contact / mobile | `trace` | COMPLETE |
| Filter by date/status/employee/customer | **(Rev 2)** `fetchFollowUps({branchId, employeeId, customerId, status, dateFrom, dateTo})` (unchanged, already supported all five) is now driven by five real UI controls: Status `Select`, Customer `Select`, Employee `Select` (hidden for the employee's own-assigned view, where it's implicitly locked to `ownEmployeeId`), and From/To date `Input`s. A "Clear Filters" `Button` appears whenever any filter (including the free-text search) is active and resets them all in one action | `tsc`, `build`, `trace` | COMPLETE (Rev 2 - was PARTIAL) |
| Follow-up history | `history[]` array on each record, rendered in the View modal | `trace` | COMPLETE |
| Dashboard: Today's / Overdue / Upcoming | `getFollowUpCounts()` -> three `MetricCard`s at the top of the screen | `trace` | COMPLETE |
| Status change updates lists/counts immediately | Every mutation (`create`/`edit`/`complete`/`cancel`/`reschedule`) is followed by `load()`, which re-fetches both the row list and the counts in one pass | `trace` | COMPLETE |
| Persists locally after reload | AsyncStorage-backed (`mockStore.js`, key `sw_crm_followups`) - survives refresh on web (localStorage) and app restart on native | `trace` (same primitive already relied on by every other mock store in this codebase) | COMPLETE |
| Permissions (Admin full; Employee own-assigned only) | Reuses existing `PERMISSIONS.CRM_MANAGE` (previously defined but unused). Admin role bypass via `hasPermission`. Employee screens pass `ownEmployeeId={user.id}`, which locks `assignedTo` on create and filters the list/counts server-side | `trace` | COMPLETE |
| Alt+C -> New Follow-up | `useRegisterPrimaryAction(openAdd, ...)` in `CrmFollowUpManager.jsx` | `trace` (same registry mechanism verified in the prior keyboard-accessibility pass) | COMPLETE |

---

## C. Sales Target Tracking

| Requirement | Implementation | Test Result | Status |
|---|---|---|---|
| Fields (name, employee, branch, period type, start/end date, target amount/quantity, notes, status) | `salesTargetStore.js` record shape + `SalesTargetManager.jsx` form | `build` | COMPLETE |
| Period types (Daily/Weekly/Monthly/Quarterly/Yearly) | `PERIOD_TYPES` const | `build` | COMPLETE |
| Actual/Remaining/Achievement %/Status computed from real Sales | `salesTargetApi.js` `computeTargetProgress(target)` calls `billingApi.fetchInvoices`/`fetchAllInvoices` (the same real invoice data Reports/Dashboard use), filters by `employeeId` + date range, sums `grandTotal` - **no separate/duplicated sales total is ever stored** | `trace`: `actual = sum(matching invoices.grandTotal)`, `remaining = max(target - actual, 0)`, `achievementPct = round(actual/target*1000)/10`, `targetStatus` derived (`ACHIEVED` >=100%, `MISSED` if period over and <100%, else `IN_PROGRESS`) | COMPLETE |
| Example (₹1,00,000 target / ₹60,000 actual / ₹40,000 remaining / 60%) | Same formula as above, verified arithmetically: `100000-60000=40000`, `60000/100000*100=60%` | `trace` (formula verified by hand against the example in the request) | COMPLETE |
| Views: Employee-wise / Branch-wise / Period-wise / Target vs Actual / Completed vs In Progress | Table columns show Employee, Branch (when `allowBranchPicker`), Period, Target, Actual, Remaining, Achievement, Status; Status filter (`IN_PROGRESS`/`ACHIEVED`/`MISSED`/`CANCELLED`) and Period filter both present | `build` | COMPLETE |
| Dashboard/report widgets (Target/Achieved/Remaining/%) | Four `MetricCard`s summing all currently-filtered rows | `trace` | COMPLETE |
| No fake sales totals | Confirmed - `computeTargetProgress` never reads from any mock/demo store, only `billingApi` (real SQLite invoices) | `trace` | COMPLETE |
| Permissions (Admin manage; Employee view own only) | New `PERMISSIONS.TARGET_MANAGE`, admin role bypass; employee screen passes `canManage={false}` and `ownEmployeeId={user.id}` so create/edit/cancel controls never render and the list is filtered server-side to that employee | `trace` | COMPLETE |
| Alt+C -> New Target | `useRegisterPrimaryAction(canManage ? openAdd : null, ...)` | `trace` | COMPLETE |

---

## D. Attendance

| Requirement | Implementation | Test Result | Status |
|---|---|---|---|
| Fields (employee, branch, date, check-in/out, working hours, status, remarks) | `attendanceStore.js` record shape | `build` | COMPLETE |
| Statuses (Present/Absent/Half Day/Leave/Holiday) | `STATUSES` const | `build` | COMPLETE |
| Check In / Check Out | `attendanceApi.js` `checkInEmployee`/`checkOutEmployee` -> `attendanceStore.js` `checkIn`/`checkOut`, self-service buttons on the employee screen, disabled once already checked in/out for the day | `trace` | COMPLETE |
| Manual entry (admin) / Edit | `recordManualAttendance` (permission-gated) + "Add Attendance" modal on admin screens, also used to edit an existing day's row | `trace` | COMPLETE |
| Daily attendance / Employee-wise history / Branch-wise / Date filters | `fetchAttendance({branchId, employeeId, dateFrom, dateTo})` + Employee filter (Select) and From/To date inputs on admin screens | `trace` | COMPLETE |
| Monthly attendance summary | `getMonthlySummary(employeeId, month)` (unchanged) already backed the employee self-view. **(Rev 2)** Admin screens (`canManage=true`) now have a "Daily Records" / "Monthly Summary" `Tabs` toggle; the Monthly Summary tab computes `fetchMonthlySummary(employeeId, month)` for every employee in the current branch/filter (respecting the existing Employee filter Select) via `Promise.all`, and renders a `DataTable` with exactly the requested columns - Employee, Branch (when `allowBranchPicker`), Present, Absent, Half Day, Leave, Working Days. No new dataset - it's the same `attendanceStore` records aggregated per employee/month, same as the self-view uses for one employee | `tsc`, `build`, `trace` | COMPLETE (Rev 2 - was PARTIAL) |
| Auto working-hours calculation | `computeWorkingHours(checkInTime, checkOutTime)` - `(checkOut - checkIn)` in minutes, floored at 0, rounded to 2 decimals, recomputed on every write | `trace`: e.g. `09:00`->`17:30` = 8.5h | COMPLETE |
| No duplicate record per employee/date (unless editing) | `upsertAttendance()` is the single write path for check-in, check-out, manual entry and edit - it looks up the existing `employeeId+date` row first and merges into it rather than inserting a second row; the record `id` itself is also deterministic (`ATT-{employeeId}-{date}`) as a second safeguard | `trace` | COMPLETE |
| Permissions (self check-in/out for every employee; admin manages others) | New `PERMISSIONS.ATTENDANCE_MANAGE`, granted to every existing `EMPLOYEE_PROFILES` entry (self-service is universal) and to the 4 seed `EMPLOYEES`; `assertCanManageOthers()` in `attendanceApi.js` allows an employee to act on their own `employeeId` unconditionally, and requires the permission (or admin role bypass) for anyone else's record | `trace` | COMPLETE |
| Alt+C -> Add Attendance | `useRegisterPrimaryAction(canManage ? openAdd : null, ...)` | `trace` | COMPLETE |

---

## E. Payroll

| Requirement | Implementation | Test Result | Status |
|---|---|---|---|
| Fields (employee, branch, month, basic/allowances/bonus/deductions/advance, present/absent/half/leave/working days, gross/net, payment status/date, remarks) | `payrollStore.js` record shape, populated by `payrollApi.js` `generatePayroll()` | `build` | COMPLETE |
| Gross = Basic + Allowances + Bonus | `payrollApi.js`: `grossSalary = basicSalary + allowances + bonus` | `trace` | COMPLETE |
| Net = Gross - Deductions - Advance, with an attendance-based deduction rule | No pre-existing attendance-deduction rule was found anywhere in the codebase (confirmed by search before implementing), so a configurable one was added as specified: `perDayRate = basicSalary / workingDays` (workingDays = calendar days in the month), `attendanceDeduction = perDayRate * (absentDays + halfDays * 0.5)`, then `netSalary = max(gross - deductions - advance - attendanceDeduction, 0)` | `trace`: e.g. Basic ₹30,000 / 30 days = ₹1,000/day; 2 absent days = ₹2,000 deduction | COMPLETE |
| Attendance values pulled from real Attendance data | `generatePayroll()` calls `attendanceApi.fetchMonthlySummary(employeeId, month)` - the same summary function the Attendance module itself uses, never a second/duplicated attendance count | `trace` | COMPLETE |
| Generate / Preview / Edit / Mark Paid | `generatePayroll` (upsert-by-employee+month), View modal doubles as a preview, `editPayroll` for admin field edits, `markPaid` sets `paymentStatus`+`paymentDate` | `trace` | COMPLETE |
| Salary history / Employee-wise / Month-wise / Branch-wise | **(Rev 2)** `fetchPayroll({branchId, employeeId, month})` (unchanged) is now driven by Month/Employee/Branch (when `allowBranchPicker`)/Status filter controls together on one "Payroll History" table - clearing Month and picking one Employee shows that employee's full multi-month history in place, no separate screen needed. Table columns extended with Branch, Deductions (attendance + other + advance, matching Gross-Net), and Paid On date, alongside the existing Month/Gross/Net/Status/View/Print | `tsc`, `build`, `trace` | COMPLETE (Rev 2 - was PARTIAL) |
| Print payslip / PDF payslip | `src/services/print/payslipTemplate.js` (HTML template, mirrors `purchaseDocumentTemplate.js`) + `payslipDocumentService.js` (`previewPayslip`/`exportPayslipPdf`, mirrors `purchaseDocumentService.js`'s `expo-print` pattern) | `tsc`, `build` (module wiring only - PDF rendering itself requires `expo-print`'s native/browser print dialog, not exercised by a headless build) | COMPLETE (implementation); print output not visually inspected in this pass |
| No duplicate payroll per employee/month unless regenerating | `upsertPayroll()` looks up `getPayrollRecord(employeeId, month)` first; if found it overwrites that same row in place (same deterministic id `PAY-{employeeId}-{month}`) instead of inserting a second one | `trace` | COMPLETE |
| Permissions (Admin manage; Employee view own payslip only) | New `PERMISSIONS.PAYROLL_MANAGE`. Route-level: granted to every employee profile so the nav item/route is reachable (self-view). Write-level: `assertCanManage()` in `payrollApi.js` additionally requires the caller's role to **not** be `EMPLOYEE`, so no employee can ever call `generatePayroll`/`editPayroll`/`markPaid` for themselves or anyone else regardless of the permission flag - only `SUPER_ADMIN`/`BRANCH_ADMIN` (role bypass) can | `trace` | COMPLETE |
| Alt+C -> Generate Payroll | `useRegisterPrimaryAction(canManage ? openGenerate : null, ...)` | `trace` | COMPLETE |

---

## F. Keyboard Accessibility Regression Check

No shared keyboard-accessibility infrastructure was modified this pass. All
new screens are built exclusively from the already-accessible shared
components (`Button`, `Select`, `Modal`, `ActionLink`, `Checkbox`, `Tabs`,
`MetricCard`, `Badge`, `ConfirmModal`), so they inherit Tab/Shift+Tab order,
Enter/Space activation, arrow-key dropdown navigation, Esc-to-close, visible
focus rings, and modal focus trapping/return-focus without any new code.
`Alt+C` on each new screen resolves through the existing stack-based
`KeyboardShortcutsContext` registry (`useRegisterPrimaryAction`), the same
mechanism audited in the prior pass - confirmed by code trace, not
re-tested interactively.

- `Alt+S/B/T/R` unaffected (no changes to `AppShell.jsx`'s shortcut
  handler or route-keyword matching); new routes' keys (`crm-followups`,
  `sales-targets`, `attendance`, `payroll`) don't collide with the
  `billing`/`purchases`/`transfers`/`reports` substrings it matches on.
- Exactly one `keydown` shortcut listener still exists app-wide
  (`AppShell.jsx`) - verified by `grep` for `addEventListener('keydown'` across `src/`.
- Employee role remains excluded from `SHORTCUT_ROLES` in `AppShell.jsx` - unaffected.

---

## Summary of gaps intentionally left open (documented, not silently dropped)

All six Revision 1 gaps were closed in Revision 2 (Product-wise Purchases,
Customer-wise Sales, REAL/FRONTEND_DEMO double-counting, CRM filter
controls, Attendance monthly summary, Payroll history/filters - see the
`(Rev 2)` rows above for each).

Remaining, unchanged from Revision 1:

1. GST Report / Profit & Loss remain explicitly labeled "Simplified" - there
   is no per-item COGS/inventory-valuation model in this codebase to compute
   a full accrual P&L from, so Cost of Goods is approximated as purchases
   received in the period rather than goods actually sold.
2. `app/(super-admin)/dashboard.js` and `app/(branch-admin)/dashboard.js`
   were not audited for the same REAL/FRONTEND_DEMO double-counting this
   pass fixed in the report screens - they read from `reportApi`
   (`fetchProductSales`/`fetchBranchSalesBreakdown`/etc.), which is already
   REAL-only (SQLite invoices/purchases), so no fix was needed there, but
   this wasn't independently re-verified beyond that structural fact.
3. No interactive, click-by-click browser session was run in this
   environment for the newly-added filters/tabs (Monthly Summary toggle,
   Clear Filters, Payroll History filters) - verified by `build` (full SSR
   render of every route) and code trace only, same caveat as Revision 1.
