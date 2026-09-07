import { getDatabase, newId, nowIso } from '../database';
import type { CleanupHistoryRow } from '../databaseTypes';

const DEFAULT_SYNC_LOG_RETENTION_DAYS = 7;

/**
 * Deletes only invoices (and their items/payments) that are fully safe to
 * remove per the retention rules: SYNCED, serverConfirmed, have a serverId
 * and syncedAt, purgeAfter has expired, and the bill is not held/incomplete.
 * Pending, failed, conflicted or held records are never touched here.
 */
export async function purgeExpiredInvoices(): Promise<number> {
  const db = await getDatabase();
  const now = nowIso();

  const eligible = await db.getAllAsync<{ localId: string }>(
    `SELECT localId FROM invoices
     WHERE syncStatus = 'SYNCED' AND serverConfirmed = 1 AND serverId IS NOT NULL
       AND syncedAt IS NOT NULL AND purgeAfter IS NOT NULL AND purgeAfter < ?
       AND isHeld = 0 AND paymentStatus = 'PAID';`,
    [now]
  );

  if (eligible.length === 0) {
    return 0;
  }

  await db.withTransactionAsync(async () => {
    for (const row of eligible) {
      await db.runAsync('DELETE FROM payments WHERE invoiceLocalId = ?;', [row.localId]);
      await db.runAsync('DELETE FROM invoice_items WHERE invoiceLocalId = ?;', [row.localId]);
      await db.runAsync('DELETE FROM invoices WHERE localId = ?;', [row.localId]);
    }
  });

  return eligible.length;
}

export async function purgeOldSyncLogs(retentionDays: number = DEFAULT_SYNC_LOG_RETENTION_DAYS): Promise<number> {
  const db = await getDatabase();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const eligible = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_logs WHERE status = 'SUCCESS' AND createdAt < ?;`,
    [cutoff]
  );

  await db.runAsync(`DELETE FROM sync_logs WHERE status = 'SUCCESS' AND createdAt < ?;`, [cutoff]);
  return eligible?.count ?? 0;
}

export async function getLastCleanupRun(): Promise<CleanupHistoryRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CleanupHistoryRow>('SELECT * FROM cleanup_history ORDER BY ranAt DESC LIMIT 1;');
  return row ?? null;
}

export async function recordCleanupRun(invoicesDeleted: number, filesDeleted: number, logsDeleted: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO cleanup_history (id, ranAt, invoicesDeleted, filesDeleted, logsDeleted) VALUES (?, ?, ?, ?, ?);`,
    [newId('CLN'), nowIso(), invoicesDeleted, filesDeleted, logsDeleted]
  );
}

export async function shouldRunCleanupToday(): Promise<boolean> {
  const last = await getLastCleanupRun();
  if (!last) return true;
  const lastRunDate = new Date(last.ranAt).toDateString();
  const today = new Date().toDateString();
  return lastRunDate !== today;
}
