import apiClient, { isMockMode } from './apiClient';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../constants/roles';
import { listTargets, getTargetById, createTarget, updateTarget, cancelTarget } from '../mock/salesTargetStore';
import { fetchInvoices, fetchAllInvoices } from './billingApi';

function assertCanManage(user) {
  if (!hasPermission(user, PERMISSIONS.TARGET_MANAGE)) {
    throw new Error('You do not have permission to manage sales targets.');
  }
}

export async function fetchTargets(filters) {
  if (isMockMode()) return listTargets(filters);
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v)));
  return apiClient.get(`/sales-targets?${params.toString()}`);
}

export async function createTargetEntry(user, input) {
  assertCanManage(user);
  if (isMockMode()) return createTarget({ ...input, createdBy: user.name });
  return apiClient.post('/sales-targets', input);
}

export async function editTarget(user, id, patch) {
  assertCanManage(user);
  if (isMockMode()) return updateTarget(id, patch);
  return apiClient.put(`/sales-targets/${id}`, patch);
}

export async function cancelTargetEntry(user, id) {
  assertCanManage(user);
  if (isMockMode()) return cancelTarget(id);
  return apiClient.put(`/sales-targets/${id}/cancel`, {});
}

export { getTargetById };

/**
 * Actual sales are always derived live from real invoices (never a second,
 * hand-maintained sales total) so a target's progress can never drift from
 * what Reports/Dashboard show for the same period.
 */
export async function computeTargetProgress(target) {
  const invoices = target.branchId ? await fetchInvoices(target.branchId, 5000) : await fetchAllInvoices(5000);
  const start = new Date(target.startDate).getTime();
  const end = new Date(`${target.endDate}T23:59:59`).getTime();
  const matched = invoices.filter((inv) => {
    if (target.employeeId && inv.employeeId !== target.employeeId) return false;
    const createdAt = new Date(inv.createdAt).getTime();
    return createdAt >= start && createdAt <= end;
  });
  const actual = matched.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const actualQuantity = matched.length;
  const targetAmount = Number(target.targetAmount) || 0;
  const remaining = Math.max(targetAmount - actual, 0);
  const achievementPct = targetAmount > 0 ? Math.round((actual / targetAmount) * 1000) / 10 : 0;
  const isPeriodOver = Date.now() > end;
  let targetStatus = 'IN_PROGRESS';
  if (achievementPct >= 100) targetStatus = 'ACHIEVED';
  else if (isPeriodOver) targetStatus = 'MISSED';
  return { actual, actualQuantity, remaining, achievementPct, targetStatus };
}

export default {
  fetchTargets,
  createTargetEntry,
  editTarget,
  cancelTargetEntry,
  getTargetById,
  computeTargetProgress,
};
