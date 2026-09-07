import apiClient, { isMockMode } from './apiClient';
import { getTable } from '../../database/database.web';

export async function fetchSalesTrend(branchId, days = 7) {
  if (isMockMode()) {
    const invoices = await getTable('invoices');
    const totalsByDay = new Map();
    for (const inv of invoices) {
      if (inv.branchId !== branchId || inv.isHeld) continue;
      const day = String(inv.createdAt).slice(0, 10);
      totalsByDay.set(day, (totalsByDay.get(day) || 0) + (inv.grandTotal || 0));
    }
    const rows = [...totalsByDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, days);
    return rows.reverse().map(([day, total]) => ({ label: day.slice(5), value: total }));
  }
  return apiClient.get(`/reports/sales-trend?branchId=${branchId}&days=${days}`);
}

export async function fetchBranchSalesBreakdown() {
  if (isMockMode()) {
    const invoices = await getTable('invoices');
    const totalsByBranch = new Map();
    for (const inv of invoices) {
      if (inv.isHeld) continue;
      totalsByBranch.set(inv.branchId, (totalsByBranch.get(inv.branchId) || 0) + (inv.grandTotal || 0));
    }
    return [...totalsByBranch.entries()].map(([branchId, value]) => ({ branchId, value }));
  }
  return apiClient.get('/reports/branch-sales');
}

export async function fetchPaymentSplit(branchId) {
  if (isMockMode()) {
    const invoices = await getTable('invoices');
    const payments = await getTable('payments');
    const invoiceLocalIds = new Set(invoices.filter((i) => i.branchId === branchId).map((i) => i.localId));
    const totalsByMethod = new Map();
    for (const p of payments) {
      if (!invoiceLocalIds.has(p.invoiceLocalId)) continue;
      totalsByMethod.set(p.method, (totalsByMethod.get(p.method) || 0) + (p.amount || 0));
    }
    return [...totalsByMethod.entries()].map(([label, value]) => ({ label, value }));
  }
  return apiClient.get(`/reports/payment-split?branchId=${branchId}`);
}

export async function fetchProductSales(branchId, limit = 10) {
  if (isMockMode()) {
    const invoices = await getTable('invoices');
    const items = await getTable('invoice_items');
    const invoiceLocalIds = new Set(invoices.filter((i) => i.branchId === branchId).map((i) => i.localId));
    const byProduct = new Map();
    for (const item of items) {
      if (!invoiceLocalIds.has(item.invoiceLocalId)) continue;
      const existing = byProduct.get(item.productId) || { productId: item.productId, name: item.name, qty: 0, total: 0 };
      existing.qty += item.quantity;
      existing.total += item.lineTotal;
      byProduct.set(item.productId, existing);
    }
    return [...byProduct.values()].sort((a, b) => b.total - a.total).slice(0, limit);
  }
  return apiClient.get(`/reports/product-sales?branchId=${branchId}&limit=${limit}`);
}

/**
 * Customer-wise Sales, real invoices only (there is no demo/mock layer for
 * Sales, unlike Purchases/Transfers - see purchaseFrontendApi.js). branchId
 * is optional so Super Admin can pull a network-wide breakdown.
 */
export async function fetchCustomerSales(branchId, limit = 50) {
  if (isMockMode()) {
    const invoices = await getTable('invoices');
    const byCustomer = new Map();
    for (const inv of invoices) {
      if (inv.isHeld || !inv.customerId) continue;
      if (branchId && inv.branchId !== branchId) continue;
      const existing = byCustomer.get(inv.customerId) || { customerId: inv.customerId, bills: 0, total: 0 };
      existing.bills += 1;
      existing.total += inv.grandTotal || 0;
      byCustomer.set(inv.customerId, existing);
    }
    return [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, limit);
  }
  const params = new URLSearchParams({ ...(branchId && { branchId }), limit });
  return apiClient.get(`/reports/customer-sales?${params.toString()}`);
}

/**
 * Product-wise Purchases, real purchase line items only (never the
 * FRONTEND_DEMO purchase editor's AsyncStorage rows - see
 * purchaseFrontendApi.js/purchaseFrontendStore.js). branchId is optional
 * so Super Admin can pull a network-wide breakdown.
 */
export async function fetchPurchaseProductBreakdown(branchId, limit = 50) {
  if (isMockMode()) {
    const purchases = await getTable('purchases');
    const items = await getTable('purchase_items');
    const purchaseLocalIds = new Set(
      purchases.filter((p) => !branchId || p.branchId === branchId).map((p) => p.localId)
    );
    const byProduct = new Map();
    for (const item of items) {
      if (!purchaseLocalIds.has(item.purchaseLocalId)) continue;
      const existing = byProduct.get(item.productId) || { productId: item.productId, qty: 0, total: 0 };
      existing.qty += item.quantity;
      existing.total += item.lineTotal;
      byProduct.set(item.productId, existing);
    }
    return [...byProduct.values()].sort((a, b) => b.total - a.total).slice(0, limit);
  }
  const params = new URLSearchParams({ ...(branchId && { branchId }), limit });
  return apiClient.get(`/reports/purchase-product-breakdown?${params.toString()}`);
}

export default {
  fetchSalesTrend,
  fetchBranchSalesBreakdown,
  fetchPaymentSplit,
  fetchProductSales,
  fetchCustomerSales,
  fetchPurchaseProductBreakdown,
};
