import mockStore from './mockStore';
import { createLedgerEntry } from './ledgerStore';

const KEY = 'sw_receipts';

export async function listReceipts(branchId) {
  const records = await mockStore.getAll(KEY);
  return records
    .filter((r) => !branchId || r.branchId === branchId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function createReceipt(input) {
  const record = {
    id: `RCT-${Date.now()}`,
    date: new Date().toISOString(),
    status: 'RECORDED',
    ...input,
  };
  await mockStore.insert(KEY, record);
  await createLedgerEntry({
    branchId: record.branchId,
    partyType: 'CUSTOMER',
    partyId: record.customerId,
    partyName: record.customerName,
    type: 'CREDIT',
    amount: record.amount,
    referenceType: 'RECEIPT',
    referenceId: record.id,
    note: record.note || '',
    createdBy: record.createdBy || null,
  });
  return record;
}

export default { listReceipts, createReceipt };
