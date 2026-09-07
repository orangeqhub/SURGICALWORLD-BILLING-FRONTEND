import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sw_invoice_meta_v1';

/**
 * The invoices table has no customerName/printType columns (native SQLite
 * schema is left untouched), so the bit of extra context the new billing
 * flow captures - who printed this and which format they chose - is kept
 * here as a small AsyncStorage side-table keyed by invoice localId.
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

export async function saveInvoiceMeta(localId, meta) {
  const map = await loadMap();
  map[localId] = { ...map[localId], ...meta };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function getInvoiceMeta(localId) {
  const map = await loadMap();
  return map[localId] || null;
}

export async function savePrintType(localId, printType) {
  await saveInvoiceMeta(localId, { printType });
}

export async function getPrintType(localId) {
  const meta = await getInvoiceMeta(localId);
  return meta?.printType || null;
}

export default { saveInvoiceMeta, getInvoiceMeta, savePrintType, getPrintType };
