import mockStore from './mockStore';

const KEY = 'sw_crm_notes';

export async function listCrmNotes(customerId) {
  const notes = await mockStore.getAll(KEY);
  return notes
    .filter((n) => !customerId || n.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createCrmNote(input) {
  const record = {
    id: `NOTE-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  return mockStore.insert(KEY, record);
}

export default { listCrmNotes, createCrmNote };
