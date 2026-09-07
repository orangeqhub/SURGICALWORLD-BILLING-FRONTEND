import { getDatabase, newId, nowIso } from '../database';
import type { SyncQueueRow, SyncLogRow, SyncStatus } from '../databaseTypes';

const SYNCABLE_TABLES: Record<string, string> = {
  invoice: 'invoices',
  customer: 'customers',
  purchase: 'purchases',
  expense: 'expenses',
  stock_transfer: 'stock_transfers',
};

export async function enqueueSync(entityType: string, entityLocalId: string, operation: SyncQueueRow['operation'], payload: unknown): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entityType, entityLocalId, operation, payload, status, retryCount, lastAttemptAt, lastError, createdAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 0, NULL, NULL, ?);`,
    [newId('SQ'), entityType, entityLocalId, operation, JSON.stringify(payload), nowIso()]
  );
}

export async function listPendingSync(limit = 50): Promise<SyncQueueRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC LIMIT ?;`,
    [limit]
  );
}

export async function countPendingSync(): Promise<{ pending: number; failed: number }> {
  const db = await getDatabase();
  const pending = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING';`
  );
  const failed = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'FAILED';`
  );
  return { pending: pending?.count ?? 0, failed: failed?.count ?? 0 };
}

export async function markSyncItemStatus(id: string, status: SyncStatus, error: string | null = null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = ?, lastAttemptAt = ?, lastError = ?, retryCount = retryCount + 1 WHERE id = ?;`,
    [status, nowIso(), error, id]
  );
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?;', [id]);
}

/**
 * Applies a confirmed server ack to the owning record: sets serverId,
 * serverConfirmed, syncStatus = SYNCED, syncedAt and purgeAfter (retention
 * window applied from the entity's synced date). retentionDays controls how
 * long the record is kept locally before cleanup can purge it.
 */
export async function applySyncSuccess(entityType: string, localId: string, serverId: string, retentionDays: number | null): Promise<void> {
  const table = SYNCABLE_TABLES[entityType];
  if (!table) return;

  const db = await getDatabase();
  const timestamp = nowIso();
  const purgeAfter = retentionDays === null ? null : new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  await db.runAsync(
    `UPDATE ${table} SET serverId = ?, serverConfirmed = 1, syncStatus = 'SYNCED', syncedAt = ?, purgeAfter = ?, lastSyncError = NULL WHERE localId = ?;`,
    [serverId, timestamp, purgeAfter, localId]
  );

  await db.runAsync(
    `INSERT INTO sync_logs (id, entityType, entityLocalId, status, message, createdAt) VALUES (?, ?, ?, 'SUCCESS', NULL, ?);`,
    [newId('SLOG'), entityType, localId, timestamp]
  );
}

export async function applySyncFailure(entityType: string, localId: string, message: string): Promise<void> {
  const table = SYNCABLE_TABLES[entityType];
  const db = await getDatabase();
  const timestamp = nowIso();

  if (table) {
    await db.runAsync(
      `UPDATE ${table} SET syncStatus = 'FAILED', lastSyncError = ?, retryCount = retryCount + 1 WHERE localId = ?;`,
      [message, localId]
    );
  }

  await db.runAsync(
    `INSERT INTO sync_logs (id, entityType, entityLocalId, status, message, createdAt) VALUES (?, ?, ?, 'FAILURE', ?, ?);`,
    [newId('SLOG'), entityType, localId, message, timestamp]
  );
}

export async function listRecentSyncLogs(limit = 50): Promise<SyncLogRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SyncLogRow>('SELECT * FROM sync_logs ORDER BY createdAt DESC LIMIT ?;', [limit]);
}

export interface BranchSyncHealth {
  branchId: string;
  pending: number;
  failed: number;
  retries: number;
  lastError: string | null;
  lastSyncedAt: string | null;
}

export async function getSyncHealthByBranch(branchId: string): Promise<BranchSyncHealth> {
  const db = await getDatabase();
  const pendingRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM invoices WHERE branchId = ? AND syncStatus = 'PENDING';`,
    [branchId]
  );
  const failedRow = await db.getFirstAsync<{ count: number; lastError: string | null; retries: number }>(
    `SELECT COUNT(*) as count, MAX(lastSyncError) as lastError, MAX(retryCount) as retries
     FROM invoices WHERE branchId = ? AND syncStatus = 'FAILED';`,
    [branchId]
  );
  const lastSynced = await db.getFirstAsync<{ syncedAt: string | null }>(
    `SELECT MAX(syncedAt) as syncedAt FROM invoices WHERE branchId = ? AND syncStatus = 'SYNCED';`,
    [branchId]
  );

  return {
    branchId,
    pending: pendingRow?.count || 0,
    failed: failedRow?.count || 0,
    retries: failedRow?.retries || 0,
    lastError: failedRow?.lastError || null,
    lastSyncedAt: lastSynced?.syncedAt || null,
  };
}
