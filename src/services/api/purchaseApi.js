import apiClient, { isMockMode } from './apiClient';
import { listSuppliers, createPurchase, listPurchases, getPurchaseItems } from '../../database/repositories/purchaseRepository';
import { addLedgerEntry, fetchLedgerEntries } from './ledgerApi';
import { getSupplierById } from './supplierMasterApi';

export async function fetchSuppliers() {
  if (isMockMode()) {
    return listSuppliers();
  }
  return apiClient.get('/suppliers');
}

/**
 * Real purchases must raise the supplier's payable balance so Receivables &
 * Payables (ledger-driven) reflects them - purchases themselves carry no
 * ledger row. Mirrors the Payment -> ledger pattern already used by
 * paymentStore.js. Never blocks the purchase itself, and is idempotent on
 * the purchase's localId so a retry can't double-count the payable.
 */
async function recordPurchaseLedgerEntry(input, purchase) {
  if (!purchase?.supplierId || !purchase?.totalAmount) return;
  try {
    const existing = await fetchLedgerEntries({ branchId: purchase.branchId, partyType: 'SUPPLIER', partyId: purchase.supplierId });
    if (existing.some((e) => e.referenceType === 'PURCHASE' && e.referenceId === purchase.localId)) return;
    const supplier = await getSupplierById(purchase.supplierId);
    await addLedgerEntry({
      branchId: purchase.branchId,
      partyType: 'SUPPLIER',
      partyId: purchase.supplierId,
      partyName: supplier?.name || purchase.supplierId,
      type: 'DEBIT',
      amount: purchase.totalAmount,
      referenceType: 'PURCHASE',
      referenceId: purchase.localId,
      note: `Purchase ${purchase.invoiceNumber || purchase.localId}`,
      createdBy: null,
    });
  } catch (e) {
    // Ledger entry is best-effort bookkeeping; never fail the purchase over it.
  }
}

export async function recordPurchase(input) {
  if (isMockMode()) {
    const purchase = await createPurchase(input);
    await recordPurchaseLedgerEntry(input, purchase);
    return purchase;
  }
  return apiClient.post('/purchases', input);
}

export async function fetchPurchases(branchId) {
  if (isMockMode()) {
    return listPurchases(branchId);
  }
  return apiClient.get(`/branches/${branchId}/purchases`);
}

export async function fetchPurchaseItems(purchaseLocalId) {
  if (isMockMode()) {
    return getPurchaseItems(purchaseLocalId);
  }
  return apiClient.get(`/purchases/${purchaseLocalId}/items`);
}

export default { fetchSuppliers, recordPurchase, fetchPurchases, fetchPurchaseItems };
