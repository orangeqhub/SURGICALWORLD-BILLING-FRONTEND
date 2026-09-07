import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import SyncHealthCard from '../../src/components/dashboard/SyncHealthCard';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import Button from '../../src/components/ui/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useSync } from '../../src/hooks/useSync';
import { listPendingSync, listRecentSyncLogs } from '../../src/database/repositories/syncRepository';
import { fetchInvoices } from '../../src/services/api/billingApi';
import { formatDateTime, timeAgo } from '../../src/utils/formatters';
import { SPACING, TYPOGRAPHY, COLORS } from '../../src/theme';

export default function BranchSyncCenterScreen() {
  const { user } = useAuth();
  const { connectionStatus, pending, failed, lastSyncedAt, syncing, triggerSync } = useSync();
  const [queueItems, setQueueItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [syncedCount, setSyncedCount] = useState(0);

  const load = useCallback(async () => {
    const [queue, recentLogs, invoices] = await Promise.all([
      listPendingSync(100),
      listRecentSyncLogs(30),
      fetchInvoices(user.branchId, 500),
    ]);
    setQueueItems(queue);
    setLogs(recentLogs);
    setSyncedCount(invoices.filter((i) => i.syncStatus === 'SYNCED').length);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = async () => {
    await triggerSync();
    load();
  };

  const queueColumns = [
    { key: 'entityType', title: 'Type' },
    { key: 'operation', title: 'Operation' },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'retryCount', title: 'Retries' },
    { key: 'lastError', title: 'Last Error', flex: 1.6, render: (row) => <Text numberOfLines={1} style={{ color: row.lastError ? COLORS.danger : COLORS.textSecondary }}>{row.lastError || '-'}</Text> },
  ];

  const logColumns = [
    { key: 'entityType', title: 'Type' },
    { key: 'status', title: 'Result', render: (row) => <StatusBadge status={row.status === 'SUCCESS' ? 'SYNCED' : 'FAILED'} /> },
    { key: 'message', title: 'Message', flex: 1.6, render: (row) => <Text numberOfLines={1}>{row.message || '-'}</Text> },
    { key: 'createdAt', title: 'Time', render: (row) => <Text>{formatDateTime(row.createdAt)}</Text> },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Sync Center"
        subtitle={`${user.branchName} - assigned branch data only`}
        action={<Button title={syncing ? 'Syncing...' : 'Retry Sync'} size="sm" onPress={handleRetry} disabled={syncing} />}
      />

      <View style={styles.metricsRow}>
        <MetricCard label="Pending" value={pending} icon="hourglass-outline" tone="warning" />
        <MetricCard label="Failed" value={failed} icon="close-circle-outline" tone="danger" />
        <MetricCard label="Synced Invoices" value={syncedCount} icon="checkmark-done-outline" tone="success" />
      </View>

      <SyncHealthCard
        connectionStatus={connectionStatus}
        pending={pending}
        failed={failed}
        lastSyncedAt={lastSyncedAt}
        style={{ marginBottom: SPACING.lg, maxWidth: 460 }}
      />

      <Text style={styles.sectionLabel}>Sync Queue</Text>
      <DataTable columns={queueColumns} data={queueItems} keyExtractor={(item) => item.id} />

      <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Recent Sync Logs</Text>
      <DataTable columns={logColumns} data={logs} keyExtractor={(item) => item.id} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  sectionLabel: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
});
