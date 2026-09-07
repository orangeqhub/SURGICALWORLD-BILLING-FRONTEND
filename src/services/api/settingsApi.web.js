import apiClient, { isMockMode } from './apiClient';
import { getTable, commit, nowIso } from '../../database/database.web';

const DEFAULT_SETTINGS = {
  invoiceRetentionDays: '30',
  invoicePdfRetentionDays: '15',
  syncLogRetentionDays: '7',
};

export async function getSetting(key) {
  const rows = await getTable('app_settings');
  const row = rows.find((r) => r.key === key);
  if (row) return row.value;
  return DEFAULT_SETTINGS[key] ?? null;
}

export async function setSetting(key, value) {
  if (!isMockMode()) {
    await apiClient.put(`/settings/${key}`, { value });
  }
  const rows = await getTable('app_settings');
  const timestamp = nowIso();
  const row = rows.find((r) => r.key === key);
  if (row) {
    row.value = String(value);
    row.updatedAt = timestamp;
  } else {
    rows.push({ key, value: String(value), updatedAt: timestamp });
  }
  await commit();
}

export async function getAllSettings() {
  const rows = await getTable('app_settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export default { getSetting, setSetting, getAllSettings };
