import { getTable, commit, newId, nowIso } from '../database.web';
import type { SyncQueueRow, SyncLogRow, SyncStatus } from '../databaseTypes';

const SYNCABLE_TABLES: Record<string, string> = {
  invoice: 'invoices',
  customer: 'customers',
  purchase: 'purchases',
  expense: 'expenses',
  stock_transfer: 'stock_transfers',
};

export async function enqueueSync(entityType: string, entityLocalId: string, operation: SyncQueueRow['operation'], payload: unknown): Promise<void> {
  const rows = await getTable<SyncQueueRow>('sync_queue');
  rows.push({
    id: newId('SQ'),
    entityType,
    entityLocalId,
    operation,
    payload: JSON.stringify(payload),
    status: 'PENDING',
    retryCount: 0,
    lastAttemptAt: null,
    lastError: null,
    createdAt: nowIso(),
  });
  await commit();
}

export async function listPendingSync(limit = 50): Promise<SyncQueueRow[]> {
  const rows = await getTable<SyncQueueRow>('sync_queue');
  return rows
    .filter((r) => r.status === 'PENDING' || r.status === 'FAILED')
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function countPendingSync(): Promise<{ pending: number; failed: number }> {
  const rows = await getTable<SyncQueueRow>('sync_queue');
  return {
    pending: rows.filter((r) => r.status === 'PENDING').length,
    failed: rows.filter((r) => r.status === 'FAILED').length,
  };
}

export async function markSyncItemStatus(id: string, status: SyncStatus, error: string | null = null): Promise<void> {
  const rows = await getTable<SyncQueueRow>('sync_queue');
  const row = rows.find((r) => r.id === id);
  if (row) {
    row.status = status;
    row.lastAttemptAt = nowIso();
    row.lastError = error;
    row.retryCount += 1;
    await commit();
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  const rows = await getTable<SyncQueueRow>('sync_queue');
  const index = rows.findIndex((r) => r.id === id);
  if (index >= 0) {
    rows.splice(index, 1);
    await commit();
  }
}

export async function applySyncSuccess(entityType: string, localId: string, serverId: string, retentionDays: number | null): Promise<void> {
  const table = SYNCABLE_TABLES[entityType];
  if (!table) return;

  const timestamp = nowIso();
  const purgeAfter = retentionDays === null ? null : new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const rows = await getTable<any>(table);
  const row = rows.find((r) => r.localId === localId);
  if (row) {
    row.serverId = serverId;
    row.serverConfirmed = 1;
    row.syncStatus = 'SYNCED';
    row.syncedAt = timestamp;
    row.purgeAfter = purgeAfter;
    row.lastSyncError = null;
  }

  const logs = await getTable<SyncLogRow>('sync_logs');
  logs.push({ id: newId('SLOG'), entityType, entityLocalId: localId, status: 'SUCCESS', message: null, createdAt: timestamp });

  await commit();
}

export async function applySyncFailure(entityType: string, localId: string, message: string): Promise<void> {
  const table = SYNCABLE_TABLES[entityType];
  const timestamp = nowIso();

  if (table) {
    const rows = await getTable<any>(table);
    const row = rows.find((r) => r.localId === localId);
    if (row) {
      row.syncStatus = 'FAILED';
      row.lastSyncError = message;
      row.retryCount += 1;
    }
  }

  const logs = await getTable<SyncLogRow>('sync_logs');
  logs.push({ id: newId('SLOG'), entityType, entityLocalId: localId, status: 'FAILURE', message, createdAt: timestamp });

  await commit();
}

export async function listRecentSyncLogs(limit = 50): Promise<SyncLogRow[]> {
  const rows = await getTable<SyncLogRow>('sync_logs');
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
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
  const invoices = await getTable<any>('invoices');
  const branchInvoices = invoices.filter((i) => i.branchId === branchId);

  const pending = branchInvoices.filter((i) => i.syncStatus === 'PENDING').length;
  const failedInvoices = branchInvoices.filter((i) => i.syncStatus === 'FAILED');
  const syncedInvoices = branchInvoices.filter((i) => i.syncStatus === 'SYNCED' && i.syncedAt);

  const retries = failedInvoices.reduce((max, i) => Math.max(max, i.retryCount || 0), 0);
  const lastError = failedInvoices.length
    ? failedInvoices.reduce((latest, i) => (!latest || (i.lastSyncError && i.updatedAt > latest.updatedAt) ? i : latest), null)?.lastSyncError || null
    : null;
  const lastSyncedAt = syncedInvoices.length
    ? syncedInvoices.reduce((max, i) => (i.syncedAt > max ? i.syncedAt : max), syncedInvoices[0].syncedAt)
    : null;

  return {
    branchId,
    pending,
    failed: failedInvoices.length,
    retries,
    lastError,
    lastSyncedAt,
  };
}
