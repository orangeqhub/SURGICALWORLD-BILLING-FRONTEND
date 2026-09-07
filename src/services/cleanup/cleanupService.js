import * as FileSystem from 'expo-file-system';
import { purgeExpiredInvoices, purgeOldSyncLogs, shouldRunCleanupToday, recordCleanupRun } from '../../database/repositories/cleanupRepository';
import { getSetting } from '../api/settingsApi';

const INVOICE_PDF_DIR = `${FileSystem.documentDirectory}invoices/`;

async function purgeExpiredInvoicePdfs() {
  const retentionSetting = await getSetting('invoicePdfRetentionDays');
  if (retentionSetting === 'NEVER') {
    return 0;
  }
  const retentionDays = Number(retentionSetting) || 15;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const dirInfo = await FileSystem.getInfoAsync(INVOICE_PDF_DIR);
  if (!dirInfo.exists) {
    return 0;
  }

  const files = await FileSystem.readDirectoryAsync(INVOICE_PDF_DIR);
  let deleted = 0;

  for (const file of files) {
    const path = `${INVOICE_PDF_DIR}${file}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && info.modificationTime && info.modificationTime * 1000 < cutoff) {
      await FileSystem.deleteAsync(path, { idempotent: true });
      deleted += 1;
    }
  }

  return deleted;
}

/**
 * Runs at most once per calendar day (per shouldRunCleanupToday). Any
 * individual step failing is swallowed - a cleanup problem must never block
 * billing, so this always resolves rather than throwing.
 */
export async function runRetentionCleanup({ force = false } = {}) {
  if (!force) {
    const shouldRun = await shouldRunCleanupToday();
    if (!shouldRun) {
      return { ran: false, reason: 'ALREADY_RUN_TODAY' };
    }
  }

  let invoicesDeleted = 0;
  let filesDeleted = 0;
  let logsDeleted = 0;

  try {
    invoicesDeleted = await purgeExpiredInvoices();
  } catch (error) {
    // Non-fatal: leave records intact and retry on next cleanup pass.
  }

  try {
    filesDeleted = await purgeExpiredInvoicePdfs();
  } catch (error) {
    // Non-fatal.
  }

  try {
    const logRetentionSetting = await getSetting('syncLogRetentionDays');
    if (logRetentionSetting !== 'NEVER') {
      logsDeleted = await purgeOldSyncLogs(Number(logRetentionSetting) || 7);
    }
  } catch (error) {
    // Non-fatal.
  }

  try {
    await recordCleanupRun(invoicesDeleted, filesDeleted, logsDeleted);
  } catch (error) {
    // Non-fatal.
  }

  return { ran: true, invoicesDeleted, filesDeleted, logsDeleted };
}

export { INVOICE_PDF_DIR };
export default { runRetentionCleanup, INVOICE_PDF_DIR };
