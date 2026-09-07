import mockStore from './mockStore';

const KEY = 'sw_payroll';

export async function listPayroll({ branchId, employeeId, month } = {}) {
  const rows = await mockStore.getAll(KEY);
  return rows
    .filter((r) => !branchId || r.branchId === branchId)
    .filter((r) => !employeeId || r.employeeId === employeeId)
    .filter((r) => !month || r.month === month)
    .sort((a, b) => (b.month > a.month ? 1 : -1));
}

export async function getPayrollRecord(employeeId, month) {
  const rows = await mockStore.getAll(KEY);
  return rows.find((r) => r.employeeId === employeeId && r.month === month) || null;
}

/**
 * One record per employee/month, upserted - "generate" for a month that
 * already has a record recomputes and overwrites it in place rather than
 * creating a duplicate, matching the "no duplicate payroll unless
 * explicitly regenerating" requirement.
 */
export async function upsertPayroll(record) {
  const existing = await getPayrollRecord(record.employeeId, record.month);
  const timestamp = new Date().toISOString();
  if (existing) {
    return mockStore.update(KEY, existing.id, { ...existing, ...record, paymentStatus: existing.paymentStatus, updatedAt: timestamp });
  }
  return mockStore.insert(KEY, {
    id: `PAY-${record.employeeId}-${record.month}`,
    paymentStatus: 'PENDING',
    paymentDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...record,
  });
}

export async function updatePayrollFields(id, patch) {
  return mockStore.update(KEY, id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function markPayrollPaid(id) {
  return mockStore.update(KEY, id, { paymentStatus: 'PAID', paymentDate: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

export default { listPayroll, getPayrollRecord, upsertPayroll, updatePayrollFields, markPayrollPaid };
