import apiClient, { isMockMode } from './apiClient';
import { getDatabase } from '../../database/database';

export async function fetchSalesTrend(branchId, days = 7) {
  if (isMockMode()) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT substr(createdAt, 1, 10) as day, SUM(grandTotal) as total
       FROM invoices WHERE branchId = ? AND isHeld = 0
       GROUP BY day ORDER BY day DESC LIMIT ?;`,
      [branchId, days]
    );
    return rows.reverse().map((r) => ({ label: r.day?.slice(5) || '', value: r.total || 0 }));
  }
  return apiClient.get(`/reports/sales-trend?branchId=${branchId}&days=${days}`);
}

export async function fetchBranchSalesBreakdown() {
  if (isMockMode()) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT branchId, SUM(grandTotal) as total FROM invoices WHERE isHeld = 0 GROUP BY branchId;`
    );
    return rows.map((r) => ({ branchId: r.branchId, value: r.total || 0 }));
  }
  return apiClient.get('/reports/branch-sales');
}

export async function fetchPaymentSplit(branchId) {
  if (isMockMode()) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT p.method as method, SUM(p.amount) as total
       FROM payments p JOIN invoices i ON i.localId = p.invoiceLocalId
       WHERE i.branchId = ? GROUP BY p.method;`,
      [branchId]
    );
    return rows.map((r) => ({ label: r.method, value: r.total || 0 }));
  }
  return apiClient.get(`/reports/payment-split?branchId=${branchId}`);
}

export async function fetchProductSales(branchId, limit = 10) {
  if (isMockMode()) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT ii.productId as productId, ii.name as name, SUM(ii.quantity) as qty, SUM(ii.lineTotal) as total
       FROM invoice_items ii JOIN invoices i ON i.localId = ii.invoiceLocalId
       WHERE i.branchId = ? GROUP BY ii.productId ORDER BY total DESC LIMIT ?;`,
      [branchId, limit]
    );
    return rows;
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
    const db = await getDatabase();
    const where = branchId ? 'AND i.branchId = ?' : '';
    const params = branchId ? [branchId, limit] : [limit];
    const rows = await db.getAllAsync(
      `SELECT i.customerId as customerId, COUNT(*) as bills, SUM(i.grandTotal) as total
       FROM invoices i WHERE i.isHeld = 0 AND i.customerId IS NOT NULL ${where}
       GROUP BY i.customerId ORDER BY total DESC LIMIT ?;`,
      params
    );
    return rows;
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
    const db = await getDatabase();
    const where = branchId ? 'AND p.branchId = ?' : '';
    const params = branchId ? [branchId, limit] : [limit];
    const rows = await db.getAllAsync(
      `SELECT pi.productId as productId, SUM(pi.quantity) as qty, SUM(pi.lineTotal) as total
       FROM purchase_items pi JOIN purchases p ON p.localId = pi.purchaseLocalId
       WHERE 1=1 ${where} GROUP BY pi.productId ORDER BY total DESC LIMIT ?;`,
      params
    );
    return rows;
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
