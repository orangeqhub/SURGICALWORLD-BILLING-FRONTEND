import mockStore from './mockStore';

const KEY = 'sw_product_profiles';

/**
 * Extended Product Master fields not in the SQLite `products` table
 * (subcategory, manufacturer, max stock, batch/expiry tracking flags,
 * status, remarks). Keyed by product id and merged onto the base ProductRow
 * at read time.
 */
export async function getProductProfile(productId) {
  const list = await mockStore.getAll(KEY);
  return list.find((p) => p.productId === productId) || null;
}

export async function getAllProductProfiles() {
  return mockStore.getAll(KEY);
}

export async function upsertProductProfile(productId, patch) {
  const list = await mockStore.getAll(KEY);
  const existing = list.find((p) => p.productId === productId);
  if (existing) {
    return mockStore.update(KEY, existing.id, patch);
  }
  return mockStore.insert(KEY, { id: `PRDP-${productId}`, productId, ...patch });
}

export default { getProductProfile, getAllProductProfiles, upsertProductProfile };
