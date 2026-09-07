import mockStore from './mockStore';

const KEY = 'sw_supplier_profiles';

/**
 * Extended supplier fields (contact person, banking, credit terms, branch,
 * status, remarks) that don't exist in the SQLite `suppliers` table. Keyed by
 * supplier id and merged onto the base SupplierRow at read time.
 */
export async function getSupplierProfile(supplierId) {
  const list = await mockStore.getAll(KEY);
  return list.find((p) => p.supplierId === supplierId) || null;
}

export async function getAllSupplierProfiles() {
  return mockStore.getAll(KEY);
}

export async function upsertSupplierProfile(supplierId, patch) {
  const list = await mockStore.getAll(KEY);
  const existing = list.find((p) => p.supplierId === supplierId);
  if (existing) {
    return mockStore.update(KEY, existing.id, patch);
  }
  return mockStore.insert(KEY, { id: `SUPP-${supplierId}`, supplierId, ...patch });
}

export default { getSupplierProfile, getAllSupplierProfiles, upsertSupplierProfile };
