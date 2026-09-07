import apiClient, { isMockMode } from './apiClient';

/**
 * Simulates a backend acknowledgement in mock mode since there is no real
 * server available yet. Real mode posts the queued payload and expects
 * { serverId } back, which the sync service then persists via
 * applySyncSuccess (localId stays the idempotency key on both sides).
 */
export async function pushSyncItem(entityType, payload) {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { serverId: `SRV-${entityType.toUpperCase()}-${Date.now()}` };
  }
  return apiClient.post(`/sync/${entityType}`, payload);
}

export default { pushSyncItem };
