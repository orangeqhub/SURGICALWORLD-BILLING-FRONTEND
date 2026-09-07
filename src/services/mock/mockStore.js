import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic AsyncStorage-backed list CRUD for frontend-only entities that do not
 * have a SQLite table (Ledger, Payments, Receipts, CRM notes - see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md). Works identically on web
 * (localStorage) and native so records survive a refresh. This is the single
 * persistence primitive every mock/*Store.js module is built on, keeping the
 * frontend-only data path isolated from production SQLite repositories.
 */

async function getAll(key) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

async function saveAll(key, list) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
  return list;
}

async function insert(key, record) {
  const list = await getAll(key);
  const next = [...list, record];
  await saveAll(key, next);
  return record;
}

async function update(key, id, patch) {
  const list = await getAll(key);
  let updated = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  await saveAll(key, next);
  return updated;
}

async function remove(key, id) {
  const list = await getAll(key);
  const next = list.filter((item) => item.id !== id);
  await saveAll(key, next);
  return next;
}

export default { getAll, saveAll, insert, update, remove };
