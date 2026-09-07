import mockStore from './mockStore';

const KEY = 'sw_ledger_entries';

export async function listLedgerEntries({ branchId, partyType, partyId } = {}) {
  const entries = await mockStore.getAll(KEY);
  return entries
    .filter((e) => !branchId || e.branchId === branchId)
    .filter((e) => !partyType || e.partyType === partyType)
    .filter((e) => !partyId || e.partyId === partyId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function createLedgerEntry(entry) {
  const record = {
    id: `LDG-${Date.now()}`,
    date: new Date().toISOString(),
    ...entry,
  };
  return mockStore.insert(KEY, record);
}

export async function getPartyBalance(partyType, partyId) {
  const entries = await listLedgerEntries({ partyType, partyId });
  return entries.reduce((balance, e) => (e.type === 'DEBIT' ? balance + e.amount : balance - e.amount), 0);
}

export default { listLedgerEntries, createLedgerEntry, getPartyBalance };
