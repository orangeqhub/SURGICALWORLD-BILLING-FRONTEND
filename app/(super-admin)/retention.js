import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import { useRetentionCleanup } from '../../src/hooks/useRetentionCleanup';
import { useNotification } from '../../src/hooks/useNotification';
import { getLastCleanupRun } from '../../src/database/repositories/cleanupRepository';
import { formatDateTime } from '../../src/utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

export default function RetentionSettingsScreen() {
  const { running, lastResult, runCleanup } = useRetentionCleanup();
  const { success, error: notifyError } = useNotification();
  const [lastCleanup, setLastCleanup] = useState(null);

  useEffect(() => {
    getLastCleanupRun().then(setLastCleanup);
  }, [lastResult]);

  const handleRunCleanup = async () => {
    try {
      const result = await runCleanup({ force: true });
      success(`Cleanup complete - ${result.invoicesDeleted} invoices, ${result.filesDeleted} files, ${result.logsDeleted} logs removed`);
    } catch (err) {
      notifyError('Cleanup encountered an error. Billing is unaffected.');
    }
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Retention Settings" subtitle="Fixed retention policy - not user configurable" />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Retention Policy</Text>
        <PolicyRow label="Synced invoices / items / payments" value="30 days" />
        <PolicyRow label="Invoice PDFs" value="15 days" />
        <PolicyRow label="Successful sync logs" value="7 days" />
        <PolicyRow label="Product / current stock cache" value="Keep latest" />
        <PolicyRow label="Pending records" value="Never auto-delete" />
        <PolicyRow label="Failed records" value="Never auto-delete" />
        <PolicyRow label="Conflict records" value="Never auto-delete" />
        <PolicyRow label="Held bills" value="Never auto-delete" />
        <PolicyRow label="Incomplete payments" value="Never auto-delete" />
        <PolicyRow label="Unconfirmed records" value="Never auto-delete" />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Cleanup Status</Text>
        <Row label="Last Cleanup Run" value={lastCleanup ? formatDateTime(lastCleanup.ranAt) : 'Never run yet'} />
        <Row label="Invoices Cleaned" value={lastCleanup?.invoicesDeleted ?? 0} />
        <Row label="Files Cleaned" value={lastCleanup?.filesDeleted ?? 0} />
        <Row label="Logs Cleaned" value={lastCleanup?.logsDeleted ?? 0} />
        <Button title={running ? 'Running Cleanup...' : 'Run Cleanup Now'} onPress={handleRunCleanup} disabled={running} style={{ marginTop: SPACING.md, maxWidth: 220 }} />
      </Card>
    </ScreenContainer>
  );
}

function PolicyRow({ label, value }) {
  return (
    <View style={styles.policyRow}>
      <Text style={styles.policyLabel}>{label}</Text>
      <Text style={styles.policyValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.lg, maxWidth: 560 },
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  policyLabel: { ...TYPOGRAPHY.caption, flex: 1.6 },
  policyValue: { ...TYPOGRAPHY.bodyStrong, color: COLORS.brandRed },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowLabel: { ...TYPOGRAPHY.caption },
  rowValue: { ...TYPOGRAPHY.bodyStrong },
});
