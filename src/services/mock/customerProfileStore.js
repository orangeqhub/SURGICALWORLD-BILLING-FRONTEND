import mockStore from './mockStore';

const KEY = 'sw_customer_profiles';

/**
 * Extended CRM fields for customers that don't exist in the SQLite
 * `customers` table (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 2).
 * Keyed by customer id and merged onto the base CustomerRow at read time -
 * the base row/table is never modified.
 */
export async function getCustomerProfile(customerId) {
  const list = await mockStore.getAll(KEY);
  return list.find((p) => p.customerId === customerId) || null;
}

export async function getAllCustomerProfiles() {
  return mockStore.getAll(KEY);
}

export async function upsertCustomerProfile(customerId, patch) {
  const list = await mockStore.getAll(KEY);
  const existing = list.find((p) => p.customerId === customerId);
  if (existing) {
    return mockStore.update(KEY, existing.id, patch);
  }
  return mockStore.insert(KEY, { id: `CUSP-${customerId}`, customerId, ...patch });
}

export default { getCustomerProfile, getAllCustomerProfiles, upsertCustomerProfile };
