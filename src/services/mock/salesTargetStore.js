import mockStore from './mockStore';

const KEY = 'sw_sales_targets';

export async function listTargets({ branchId, employeeId, periodType, status } = {}) {
  const rows = await mockStore.getAll(KEY);
  return rows
    .filter((r) => !branchId || r.branchId === branchId)
    .filter((r) => !employeeId || r.employeeId === employeeId)
    .filter((r) => !periodType || periodType === 'ALL' || r.periodType === periodType)
    .filter((r) => !status || status === 'ALL' || r.status === status)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
}

export async function getTargetById(id) {
  const rows = await mockStore.getAll(KEY);
  return rows.find((r) => r.id === id) || null;
}

export async function createTarget(input) {
  const timestamp = new Date().toISOString();
  const record = {
    id: `TGT-${Date.now()}`,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
  return mockStore.insert(KEY, record);
}

export async function updateTarget(id, patch) {
  return mockStore.update(KEY, id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function cancelTarget(id) {
  return mockStore.update(KEY, id, { status: 'CANCELLED', updatedAt: new Date().toISOString() });
}

export default { listTargets, getTargetById, createTarget, updateTarget, cancelTarget };
