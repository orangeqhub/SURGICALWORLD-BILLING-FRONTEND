import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { runSync, getSyncCounts } from '../services/sync/syncService';
import { getConnectionStatus, CONNECTION_STATUS } from '../services/sync/networkService';
import { runRetentionCleanup } from '../services/cleanup/cleanupService';

export const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.OFFLINE);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const appState = useRef(AppState.currentState);

  const refreshCounts = useCallback(async () => {
    const counts = await getSyncCounts();
    setPending(counts.pending);
    setFailed(counts.failed);
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const status = await getConnectionStatus();
      setConnectionStatus(status);
      const result = await runSync();
      if (result.ran) {
        setLastSyncedAt(new Date().toISOString());
      }
      await refreshCounts();
      await runRetentionCleanup();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refreshCounts]);

  useEffect(() => {
    triggerSync();
    refreshCounts();

    const netUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        triggerSync();
      } else {
        setConnectionStatus(CONNECTION_STATUS.OFFLINE);
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        triggerSync();
      }
      appState.current = nextState;
    });

    return () => {
      netUnsubscribe();
      appStateSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      connectionStatus,
      pending,
      failed,
      lastSyncedAt,
      syncing,
      triggerSync,
      refreshCounts,
    }),
    [connectionStatus, pending, failed, lastSyncedAt, syncing, triggerSync, refreshCounts]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export default SyncContext;
