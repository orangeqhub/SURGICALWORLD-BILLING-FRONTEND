import React from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SyncHealthCard from '../../src/components/dashboard/SyncHealthCard';
import Button from '../../src/components/ui/Button';
import { useSync } from '../../src/hooks/useSync';
import { SPACING } from '../../src/theme';

export default function SyncStatusScreen() {
  const { connectionStatus, pending, failed, lastSyncedAt, syncing, triggerSync } = useSync();

  return (
    <ScreenContainer>
      <SectionHeader title="Sync Status" subtitle="Offline bills are queued and pushed automatically when a server is reachable" />

      <View style={styles.wrap}>
        <SyncHealthCard connectionStatus={connectionStatus} pending={pending} failed={failed} lastSyncedAt={lastSyncedAt} />
        <Button title={syncing ? 'Syncing...' : 'Retry Sync Now'} onPress={triggerSync} disabled={syncing} style={{ marginTop: SPACING.md }} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: 460 },
});
