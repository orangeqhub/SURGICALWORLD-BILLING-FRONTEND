import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getConnectionStatus, CONNECTION_STATUS } from '../services/sync/networkService';

export function useOnlineStatus() {
  const [status, setStatus] = useState(CONNECTION_STATUS.OFFLINE);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = await getConnectionStatus();
    setStatus(next);
    setChecking(false);
    return next;
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = NetInfo.addEventListener(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return { status, checking, refresh };
}

export default useOnlineStatus;
