import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sw_draft_meta_v1';

/**
 * Held-bill (draft) supplemental metadata - mirrors the existing
 * printTypeStore.js pattern (AsyncStorage side-table keyed by localId) for
 * data the held_bills table doesn't have: selected customer master info,
 * batch selections, per-item/invoice discounts (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part K). The held bill
 * record itself remains authoritative; this is additive only, and a missing
 * or unreadable entry must never break resuming an old draft.
 */
async function loadMap() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export async function saveDraftMeta(localId, meta) {
  const map = await loadMap();
  map[localId] = { ...map[localId], ...meta };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function getDraftMeta(localId) {
  try {
    const map = await loadMap();
    return map[localId] || null;
  } catch (e) {
    return null;
  }
}

export async function removeDraftMeta(localId) {
  const map = await loadMap();
  delete map[localId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export default { saveDraftMeta, getDraftMeta, removeDraftMeta };
