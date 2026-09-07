import { listAdjustments, createAdjustment } from '../mock/stockAdjustmentStore';
import { adjustBatchQuantity } from './batchInventoryApi';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../constants/roles';

/**
 * Mock-only stock adjustment path (see docs/FRONTEND_PHASE_IMPLEMENTATION.md,
 * Phase 2) - intentionally separate from the real Branch Admin adjustment
 * flow (inventoryApi.adjustInventory). Permission is enforced here in logic,
 * not just in the calling screen's UI, so this can never be invoked by a
 * user without STOCK_ADJUST even if a future caller forgets the UI check.
 */
export async function fetchAdjustments(branchId) {
  return listAdjustments(branchId);
}

export async function recordAdjustment(user, payload) {
  if (!hasPermission(user, PERMISSIONS.STOCK_ADJUST)) {
    throw new Error('You do not have permission to adjust stock.');
  }

  const record = await createAdjustment({
    branchId: payload.branchId,
    productId: payload.productId,
    productName: payload.productName,
    batchId: payload.batchId || null,
    batchNumber: payload.batchNumber || null,
    currentQuantity: payload.currentQuantity,
    direction: payload.direction,
    quantity: payload.quantity,
    newQuantity: payload.newQuantity,
    reason: payload.reason,
    notes: payload.notes || '',
    createdBy: user.name,
  });

  if (payload.batchId) {
    const delta = payload.direction === 'DECREASE' ? -Math.abs(payload.quantity) : Math.abs(payload.quantity);
    await adjustBatchQuantity(payload.batchId, delta);
  }

  return record;
}

export default { fetchAdjustments, recordAdjustment };
