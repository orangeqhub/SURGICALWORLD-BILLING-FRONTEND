import { fetchInvoices, fetchAllInvoices } from './billingApi';
import { fetchBranchStock, fetchAllBranchStock, fetchProducts } from './productApi';
import { fetchPurchases } from './purchaseApi';
import { fetchLedgerEntries } from './ledgerApi';
import { fetchPayments } from './paymentApi';
import { fetchReceipts } from './receiptApi';
import { fetchProductSales, fetchBranchSalesBreakdown } from './reportApi';
import { BRANCHES } from '../../constants/branches';
import { ROLES, PERMISSIONS } from '../../constants/roles';

const DAY_MS = 24 * 60 * 60 * 1000;
const NEAR_EXPIRY_DAYS = 60;

function isToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

async function collectAllBranchPurchases() {
  const lists = await Promise.all(BRANCHES.map((b) => fetchPurchases(b.id)));
  return lists.flat();
}

/**
 * Central dashboard metric aggregator (see docs/FRONTEND_PHASE_IMPLEMENTATION.md,
 * Phase 1). Pulls from existing real repositories (invoices, stock, purchases,
 * reports) and the Phase 0 mock stores (ledger/payments/receipts). Screens
 * never compute metrics or decide card visibility themselves - every field on
 * the returned summary is only populated when the caller is permitted to see
 * it, so a screen can simply render whatever keys are present.
 */
export async function fetchDashboardSummary({ role, branchId, permissions = [], isAllBranches = false } = {}) {
  const isAdminRole = role === ROLES.SUPER_ADMIN || role === ROLES.BRANCH_ADMIN;
  const can = (permission) => isAdminRole || permissions.includes(permission);

  const wantsSales = can(PERMISSIONS.BILLING);
  const wantsPurchases = can(PERMISSIONS.PURCHASE_MANAGE);
  const wantsStock = isAdminRole || can(PERMISSIONS.INVENTORY_VIEW) || can(PERMISSIONS.STOCK_ADJUST);
  const showPayments = can(PERMISSIONS.PAYMENTS_MANAGE);
  const showReceipts = can(PERMISSIONS.RECEIPTS_MANAGE);
  const showLedger = can(PERMISSIONS.LEDGER_VIEW);

  const summary = {};

  const [invoices, stock, products] = await Promise.all([
    wantsSales ? (isAllBranches ? fetchAllInvoices() : fetchInvoices(branchId)) : Promise.resolve([]),
    wantsStock ? (isAllBranches ? fetchAllBranchStock() : fetchBranchStock(branchId)) : Promise.resolve([]),
    wantsStock || wantsSales ? fetchProducts() : Promise.resolve([]),
  ]);

  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  if (wantsSales) {
    summary.todaysSales = invoices.filter((i) => isToday(i.createdAt)).reduce((sum, i) => sum + i.grandTotal, 0);
    summary.topSellingProducts = isAllBranches ? [] : await fetchProductSales(branchId, 5);
  }

  if (wantsPurchases) {
    const purchases = isAllBranches ? await collectAllBranchPurchases() : await fetchPurchases(branchId);
    summary.todaysPurchases = purchases.filter((p) => isToday(p.createdAt)).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    summary.recentPurchases = purchases.slice(0, 5);
  }

  if (wantsStock) {
    summary.stockValue = stock.reduce((sum, s) => sum + s.available * (productById[s.productId]?.sellingPrice || 0), 0);
    summary.lowStockCount = stock.filter((s) => s.status === 'LOW_STOCK').length;
    summary.expiredCount = stock.filter((s) => {
      const p = productById[s.productId];
      return p?.expiryDate && s.available > 0 && new Date(p.expiryDate) < new Date();
    }).length;
    summary.nearExpiryCount = stock.filter((s) => {
      const p = productById[s.productId];
      if (!p?.expiryDate || s.available <= 0) return false;
      const daysLeft = (new Date(p.expiryDate) - new Date()) / DAY_MS;
      return daysLeft >= 0 && daysLeft <= NEAR_EXPIRY_DAYS;
    }).length;
  }

  if (showPayments || showReceipts) {
    const [payments, receipts] = await Promise.all([
      showPayments ? fetchPayments(isAllBranches ? undefined : branchId) : Promise.resolve([]),
      showReceipts ? fetchReceipts(isAllBranches ? undefined : branchId) : Promise.resolve([]),
    ]);
    if (showPayments) summary.recentPayments = payments.slice(0, 5);
    if (showReceipts) summary.recentReceipts = receipts.slice(0, 5);
  }

  if (showLedger) {
    const ledgerEntries = await fetchLedgerEntries({ branchId: isAllBranches ? undefined : branchId });
    const receivableByCustomer = {};
    const payableBySupplier = {};
    ledgerEntries.forEach((entry) => {
      const bucket = entry.partyType === 'CUSTOMER' ? receivableByCustomer : payableBySupplier;
      const delta = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
      bucket[entry.partyId] = (bucket[entry.partyId] || 0) + delta;
    });
    summary.outstandingReceivables = Object.values(receivableByCustomer).reduce((sum, v) => sum + Math.max(v, 0), 0);
    summary.outstandingPayables = Object.values(payableBySupplier).reduce((sum, v) => sum + Math.max(v, 0), 0);
  }

  if (isAllBranches && role === ROLES.SUPER_ADMIN) {
    const breakdown = await fetchBranchSalesBreakdown();
    summary.branchSalesSummary = breakdown.map((b) => ({
      branchId: b.branchId,
      branchName: BRANCHES.find((br) => br.id === b.branchId)?.name || b.branchId,
      value: b.value,
    }));
  }

  return summary;
}

export default { fetchDashboardSummary };
