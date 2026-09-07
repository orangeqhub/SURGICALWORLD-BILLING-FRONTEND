import mockStore from './mockStore';

const KEY = 'sw_frontend_purchases';

/**
 * Frontend-only "demo" purchases created by the full Purchase Editor (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3). Entirely separate from the
 * real purchase flow (src/database/repositories/purchaseRepository.ts,
 * still used by the existing simple "Record Purchase" form) - these never
 * touch branch_stock, stock_movements, purchases, or purchase_items.
 */
export async function listFrontendPurchases(branchId) {
  const list = await mockStore.getAll(KEY);
  return list
    .filter((p) => !branchId || p.branchId === branchId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

export async function getFrontendPurchase(id) {
  const list = await mockStore.getAll(KEY);
  return list.find((p) => p.id === id) || null;
}

export async function saveFrontendPurchase(record) {
  const now = new Date().toISOString();
  if (record.id) {
    return mockStore.update(KEY, record.id, { ...record, updatedAt: now });
  }
  return mockStore.insert(KEY, { id: `DPUR-${Date.now()}`, createdAt: now, updatedAt: now, ...record });
}

export async function setFrontendPurchaseStatus(id, status) {
  return mockStore.update(KEY, id, { status, updatedAt: new Date().toISOString() });
}

export default { listFrontendPurchases, getFrontendPurchase, saveFrontendPurchase, setFrontendPurchaseStatus };
