import mockStore from './mockStore';

const KEY = 'sw_frontend_transfers';

/**
 * Frontend-only advanced (batch-level) branch transfers (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 4). Entirely separate from
 * the existing real transfer flow (stockRepository.createStockTransfer,
 * still used by the existing simple Request/Approval screens) - never
 * touches branch_stock or stock_transfers/stock_transfer_items.
 */
export async function listFrontendTransfers() {
  const list = await mockStore.getAll(KEY);
  return list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

export async function getFrontendTransfer(id) {
  const list = await mockStore.getAll(KEY);
  return list.find((t) => t.id === id) || null;
}

export async function saveFrontendTransfer(record) {
  const now = new Date().toISOString();
  if (record.id) {
    return mockStore.update(KEY, record.id, { ...record, updatedAt: now });
  }
  return mockStore.insert(KEY, { id: `DTRF-${Date.now()}`, createdAt: now, updatedAt: now, ...record });
}

export default { listFrontendTransfers, getFrontendTransfer, saveFrontendTransfer };
