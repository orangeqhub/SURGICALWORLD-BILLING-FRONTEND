import mockStore from './mockStore';

const KEY = 'sw_crm_followups';

/**
 * Follow-up scheduling/workflow on top of the customer, distinct from the
 * simple notes feed in crmStore.js (kept as-is, still used by the customer
 * detail modal). Same AsyncStorage-backed persistence primitive as every
 * other frontend-only module (see mockStore.js).
 */
export async function listFollowUps({ branchId, employeeId, customerId, status, dateFrom, dateTo } = {}) {
  const rows = await mockStore.getAll(KEY);
  return rows
    .filter((r) => !branchId || r.branchId === branchId)
    .filter((r) => !employeeId || r.assignedTo === employeeId)
    .filter((r) => !customerId || r.customerId === customerId)
    .filter((r) => !status || status === 'ALL' || r.status === status)
    .filter((r) => !dateFrom || r.followUpDate >= dateFrom)
    .filter((r) => !dateTo || r.followUpDate <= dateTo)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
}

export async function getFollowUpById(id) {
  const rows = await mockStore.getAll(KEY);
  return rows.find((r) => r.id === id) || null;
}

export async function createFollowUp(input) {
  const timestamp = new Date().toISOString();
  const record = {
    id: `FU-${Date.now()}`,
    status: 'PENDING',
    history: [{ at: timestamp, action: 'CREATED', note: input.notes || '' }],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
  return mockStore.insert(KEY, record);
}

async function patchFollowUp(id, patch, historyEntry) {
  const existing = await getFollowUpById(id);
  const history = existing ? [...(existing.history || []), { at: new Date().toISOString(), ...historyEntry }] : [];
  return mockStore.update(KEY, id, { ...patch, history, updatedAt: new Date().toISOString() });
}

export async function updateFollowUp(id, patch) {
  return patchFollowUp(id, patch, { action: 'EDITED', note: patch.notes || '' });
}

export async function completeFollowUp(id, note) {
  return patchFollowUp(id, { status: 'COMPLETED' }, { action: 'COMPLETED', note: note || '' });
}

export async function cancelFollowUp(id, note) {
  return patchFollowUp(id, { status: 'CANCELLED' }, { action: 'CANCELLED', note: note || '' });
}

export async function rescheduleFollowUp(id, { followUpDate, followUpTime, notes }) {
  return patchFollowUp(
    id,
    { status: 'FOLLOWING', followUpDate, followUpTime, nextFollowUpDate: followUpDate },
    { action: 'RESCHEDULED', note: notes || `Rescheduled to ${followUpDate}` }
  );
}

export async function getFollowUpCounts({ branchId, employeeId } = {}) {
  const rows = await listFollowUps({ branchId, employeeId });
  const today = new Date().toISOString().slice(0, 10);
  const open = rows.filter((r) => r.status === 'PENDING' || r.status === 'FOLLOWING');
  return {
    today: open.filter((r) => r.followUpDate === today).length,
    overdue: open.filter((r) => r.followUpDate < today).length,
    upcoming: open.filter((r) => r.followUpDate > today).length,
  };
}

export default {
  listFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  cancelFollowUp,
  rescheduleFollowUp,
  getFollowUpCounts,
};
