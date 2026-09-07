import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import ConnectionBadge from '../../src/components/ui/ConnectionBadge';
import MetricCard from '../../src/components/ui/MetricCard';
import Button from '../../src/components/ui/Button';
import { useSync } from '../../src/hooks/useSync';
import { getSyncHealthByBranch } from '../../src/database/repositories/syncRepository';
import { BRANCHES } from '../../src/constants/branches';
import { formatDateTime } from '../../src/utils/formatters';
import { SPACING, COLORS } from '../../src/theme';

export default function SyncHealthScreen() {
  const { connectionStatus, pending, failed, syncing, triggerSync } = useSync();
  const [branchRows, setBranchRows] = useState([]);

  const load = useCallback(async () => {
    const rows = await Promise.all(
      BRANCHES.map(async (branch) => {
        const health = await getSyncHealthByBranch(branch.id);
        return { id: branch.id, name: branch.name, ...health };
      })
    );
    setBranchRows(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = async () => {
    await triggerSync();
    load();
  };

  const columns = [
    { key: 'name', title: 'Branch', flex: 1.1 },
    { key: 'device', title: 'Device / Status', render: (row) => <Text>POS Tablet - {row.failed > 0 ? 'Attention' : 'Online'}</Text> },
    { key: 'backend', title: 'Backend', render: () => <ConnectionBadge status={connectionStatus} /> },
    { key: 'pending', title: 'Pending', render: (row) => <StatusBadge status={row.pending > 0 ? 'PENDING' : 'SYNCED'} /> },
    { key: 'failed', title: 'Failed', render: (row) => <Text style={{ color: row.failed > 0 ? COLORS.danger : COLORS.textPrimary, fontWeight: '700' }}>{row.failed}</Text> },
    { key: 'lastSyncedAt', title: 'Last Sync', render: (row) => <Text>{row.lastSyncedAt ? formatDateTime(row.lastSyncedAt) : 'Never'}</Text> },
    { key: 'retries', title: 'Retry Count' },
    { key: 'lastError', title: 'Last Error', flex: 1.6, render: (row) => <Text numberOfLines={1} style={{ color: row.lastError ? COLORS.danger : COLORS.textSecondary }}>{row.lastError || '-'}</Text> },
    {
      key: 'actions',
      title: 'Actions',
      render: () => (
        <Button title="Retry" size="sm" onPress={handleRetry} disabled={syncing} />
      ),
    },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Sync Health"
        subtitle="Network-wide synchronization status"
        action={<Button title={syncing ? 'Syncing...' : 'Retry All'} size="sm" onPress={handleRetry} disabled={syncing} />}
      />

      <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap', alignItems: 'center' }}>
        <MetricCard label="Pending" value={pending} icon="hourglass-outline" tone="warning" />
        <MetricCard label="Failed" value={failed} icon="close-circle-outline" tone="danger" />
        <View style={{ justifyContent: 'center' }}>
          <ConnectionBadge status={connectionStatus} />
        </View>
      </View>

      <DataTable columns={columns} data={branchRows} keyExtractor={(item) => item.id} />
    </ScreenContainer>
  );
}
