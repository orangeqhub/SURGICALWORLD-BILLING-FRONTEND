import apiClient, { isMockMode } from './apiClient';
import { getDatabase, nowIso } from '../../database/database';

const DEFAULT_SETTINGS = {
  invoiceRetentionDays: '30',
  invoicePdfRetentionDays: '15',
  syncLogRetentionDays: '7',
};

export async function getSetting(key) {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM app_settings WHERE key = ?;', [key]);
  if (row) return row.value;
  return DEFAULT_SETTINGS[key] ?? null;
}

export async function setSetting(key, value) {
  if (!isMockMode()) {
    await apiClient.put(`/settings/${key}`, { value });
  }
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;`,
    [key, String(value), nowIso()]
  );
}

export async function getAllSettings() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM app_settings;');
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export default { getSetting, setSetting, getAllSettings };
