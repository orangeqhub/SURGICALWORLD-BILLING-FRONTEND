import { listFrontendTransfers, getFrontendTransfer, saveFrontendTransfer } from '../mock/transferFrontendStore';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../constants/roles';

/**
 * Composition layer for the advanced (batch-level) Transfer Editor (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 4). Every record here is
 * source: 'FRONTEND_DEMO' / status-labeled NOT_POSTED where relevant, and
 * writes only ever go through transferFrontendStore (AsyncStorage) - never
 * branch_stock, stock_movements, or the real stock_transfers tables.
 */
export async function listTransfers(branchId) {
  const all = await listFrontendTransfers();
  if (!branchId) return all;
  return all.filter((t) => t.fromBranchId === branchId || t.toBranchId === branchId);
}

export async function getTransferById(id) {
  return getFrontendTransfer(id);
}

function assertPermission(user, permission, action) {
  if (!hasPermission(user, permission)) {
    throw new Error(`You do not have permission to ${action}.`);
  }
}

export async function saveDraftTransfer(user, transfer) {
  assertPermission(user, PERMISSIONS.TRANSFER_CREATE, 'create transfers');
  return saveFrontendTransfer({ ...transfer, status: transfer.status || 'DRAFT', source: 'FRONTEND_DEMO', createdBy: transfer.createdBy || user.name });
}

export async function submitForApproval(user, id) {
  assertPermission(user, PERMISSIONS.TRANSFER_CREATE, 'submit transfers');
  return saveFrontendTransfer({ id, status: 'PENDING_APPROVAL' });
}

export async function approveTransfer(user, id, approvedBy) {
  assertPermission(user, PERMISSIONS.TRANSFER_APPROVE, 'approve transfers');
  return saveFrontendTransfer({ id, status: 'APPROVED', approvedBy: approvedBy || user.name });
}

export async function rejectTransfer(user, id) {
  assertPermission(user, PERMISSIONS.TRANSFER_APPROVE, 'reject transfers');
  return saveFrontendTransfer({ id, status: 'REJECTED' });
}

export async function dispatchTransfer(user, id, dispatchDate) {
  assertPermission(user, PERMISSIONS.TRANSFER_DISPATCH, 'dispatch transfers');
  return saveFrontendTransfer({ id, status: 'DISPATCHED', dispatchDate: dispatchDate || new Date().toISOString().slice(0, 10) });
}

export async function receiveTransfer(user, id, { receivedDate, items, partial } = {}) {
  assertPermission(user, PERMISSIONS.TRANSFER_RECEIVE, 'receive transfers');
  return saveFrontendTransfer({
    id,
    status: partial ? 'PARTIALLY_RECEIVED' : 'RECEIVED',
    receivedDate: receivedDate || new Date().toISOString().slice(0, 10),
    items,
  });
}

export async function cancelTransfer(user, id) {
  assertPermission(user, PERMISSIONS.TRANSFER_CREATE, 'cancel transfers');
  return saveFrontendTransfer({ id, status: 'CANCELLED' });
}

export default {
  listTransfers,
  getTransferById,
  saveDraftTransfer,
  submitForApproval,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
};
