import mockStore from './mockStore';

const KEY = 'sw_mock_stock_adjustments';

/**
 * Explicitly mock/demo-only stock adjustment log (see docs/FRONTEND_PHASE_IMPLEMENTATION.md,
 * Phase 2). This is intentionally isolated from the real production
 * adjustment path (src/database/repositories/stockRepository.ts adjustStock,
 * used by the existing Branch Admin inventory screen) - it never writes to
 * branch_stock or stock_movements.
 */
export async function listAdjustments(branchId) {
  const list = await mockStore.getAll(KEY);
  return list
    .filter((a) => !branchId || a.branchId === branchId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function createAdjustment(record) {
  return mockStore.insert(KEY, {
    id: `ADJ-${Date.now()}`,
    date: new Date().toISOString(),
    ...record,
  });
}

export default { listAdjustments, createAdjustment };
