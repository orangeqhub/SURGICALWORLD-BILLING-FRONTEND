import NetInfo from '@react-native-community/netinfo';
import { checkBackendHealth, isMockMode } from '../api/apiClient';

/**
 * Three distinct connection states drive the UI: ONLINE (internet + backend
 * reachable), LIMITED (internet is up but the backend didn't respond - stay
 * on local data, don't wipe anything), and OFFLINE (no internet at all).
 * In mock mode the backend never exists, so LIMITED effectively becomes the
 * resting state whenever the device has internet - this keeps status
 * indicators honest instead of claiming a fake ONLINE state.
 */
export const CONNECTION_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  LIMITED: 'limited',
};

export async function getConnectionStatus() {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return CONNECTION_STATUS.OFFLINE;
  }

  if (isMockMode()) {
    return CONNECTION_STATUS.LIMITED;
  }

  const health = await checkBackendHealth();
  return health.ok ? CONNECTION_STATUS.ONLINE : CONNECTION_STATUS.LIMITED;
}

export function subscribeToConnectionChanges(callback) {
  return NetInfo.addEventListener((state) => {
    callback(state.isConnected ? CONNECTION_STATUS.LIMITED : CONNECTION_STATUS.OFFLINE);
  });
}

export default { CONNECTION_STATUS, getConnectionStatus, subscribeToConnectionChanges };
