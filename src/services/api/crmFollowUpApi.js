import apiClient, { isMockMode } from './apiClient';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../constants/roles';
import {
  listFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  cancelFollowUp,
  rescheduleFollowUp,
  getFollowUpCounts,
} from '../mock/crmFollowUpStore';

function assertCanManage(user) {
  if (!hasPermission(user, PERMISSIONS.CRM_MANAGE)) {
    throw new Error('You do not have permission to manage CRM follow-ups.');
  }
}

export async function fetchFollowUps(filters) {
  if (isMockMode()) return listFollowUps(filters);
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v)));
  return apiClient.get(`/crm/follow-ups?${params.toString()}`);
}

export async function fetchFollowUpCounts(filters) {
  if (isMockMode()) return getFollowUpCounts(filters);
  return apiClient.get(`/crm/follow-ups/counts`);
}

export async function createFollowUpEntry(user, input) {
  assertCanManage(user);
  if (isMockMode()) return createFollowUp({ ...input, createdBy: user.name });
  return apiClient.post('/crm/follow-ups', input);
}

export async function editFollowUp(user, id, patch) {
  assertCanManage(user);
  if (isMockMode()) return updateFollowUp(id, patch);
  return apiClient.put(`/crm/follow-ups/${id}`, patch);
}

export async function markFollowUpComplete(user, id, note) {
  assertCanManage(user);
  if (isMockMode()) return completeFollowUp(id, note);
  return apiClient.put(`/crm/follow-ups/${id}/complete`, { note });
}

export async function markFollowUpCancelled(user, id, note) {
  assertCanManage(user);
  if (isMockMode()) return cancelFollowUp(id, note);
  return apiClient.put(`/crm/follow-ups/${id}/cancel`, { note });
}

export async function rescheduleFollowUpEntry(user, id, input) {
  assertCanManage(user);
  if (isMockMode()) return rescheduleFollowUp(id, input);
  return apiClient.put(`/crm/follow-ups/${id}/reschedule`, input);
}

export { getFollowUpById };

export default {
  fetchFollowUps,
  fetchFollowUpCounts,
  createFollowUpEntry,
  editFollowUp,
  markFollowUpComplete,
  markFollowUpCancelled,
  rescheduleFollowUpEntry,
  getFollowUpById,
};
