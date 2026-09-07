import {
  listPendingSync,
  markSyncItemStatus,
  removeSyncItem,
  applySyncSuccess,
  applySyncFailure,
  countPendingSync,
} from '../../database/repositories/syncRepository';
import { pushSyncItem } from '../api/syncApi';
import { getSetting } from '../api/settingsApi';
import { getConnectionStatus, CONNECTION_STATUS } from './networkService';

let syncInFlight = false;

export async function getSyncCounts() {
  return countPendingSync();
}

/**
 * Drains the sync_queue one item at a time. Each item's entityLocalId is the
 * idempotency key sent to the backend, so a retried push after a partial
 * failure never creates a duplicate record server-side. Only ONLINE (backend
 * reachable) triggers real pushes; LIMITED/OFFLINE leave the queue untouched.
 */
export async function runSync({ force = false } = {}) {
  if (syncInFlight && !force) {
    return { ran: false, reason: 'ALREADY_RUNNING' };
  }

  const status = await getConnectionStatus();
  if (status !== CONNECTION_STATUS.ONLINE) {
    return { ran: false, reason: 'NO_BACKEND', status };
  }

  syncInFlight = true;
  let succeeded = 0;
  let failed = 0;

  try {
    const items = await listPendingSync(50);
    const retentionSetting = await getSetting('invoiceRetentionDays');
    const retentionDays = retentionSetting === 'NEVER' ? null : Number(retentionSetting) || 30;

    for (const item of items) {
      await markSyncItemStatus(item.id, 'SYNCING');
      try {
        const payload = JSON.parse(item.payload);
        const result = await pushSyncItem(item.entityType, payload);
        await applySyncSuccess(item.entityType, item.entityLocalId, result.serverId, retentionDays);
        await removeSyncItem(item.id);
        succeeded += 1;
      } catch (error) {
        await markSyncItemStatus(item.id, 'FAILED', error.message);
        await applySyncFailure(item.entityType, item.entityLocalId, error.message);
        failed += 1;
      }
    }

    return { ran: true, succeeded, failed };
  } finally {
    syncInFlight = false;
  }
}

export default { getSyncCounts, runSync };
