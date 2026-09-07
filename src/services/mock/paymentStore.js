import mockStore from './mockStore';
import { createLedgerEntry } from './ledgerStore';

const KEY = 'sw_payments';

export async function listPayments(branchId) {
  const records = await mockStore.getAll(KEY);
  return records
    .filter((r) => !branchId || r.branchId === branchId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function createPayment(input) {
  const record = {
    id: `PMT-${Date.now()}`,
    date: new Date().toISOString(),
    status: 'RECORDED',
    ...input,
  };
  await mockStore.insert(KEY, record);
  await createLedgerEntry({
    branchId: record.branchId,
    partyType: 'SUPPLIER',
    partyId: record.supplierId,
    partyName: record.supplierName,
    type: 'CREDIT',
    amount: record.amount,
    referenceType: 'PAYMENT',
    referenceId: record.id,
    note: record.note || '',
    createdBy: record.createdBy || null,
  });
  return record;
}

export default { listPayments, createPayment };
