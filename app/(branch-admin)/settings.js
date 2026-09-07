import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../src/components/ui/Card';
import Checkbox from '../../src/components/ui/Checkbox';
import Button from '../../src/components/ui/Button';
import SectionHeader from '../../src/components/ui/SectionHeader';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettings } from '../../src/hooks/useSettings';
import { getBranchById } from '../../src/constants/branches';
import { getLastCleanupRun } from '../../src/database/repositories/cleanupRepository';
import { formatDateTime } from '../../src/utils/formatters';
import { checkForUpdatesManually } from '../../src/utils/updateHelper';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

export default function BranchSettingsScreen() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const branch = getBranchById(user.branchId);
  const [defaultA4, setDefaultA4] = useState(true);
  const [defaultThermal, setDefaultThermal] = useState(true);
  const [lastCleanup, setLastCleanup] = useState(null);

  useEffect(() => {
    getLastCleanupRun().then(setLastCleanup);
  }, []);

  return (
    <ScreenContainer>
      <SectionHeader title="Branch Settings" subtitle={branch?.name} />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Branch Details</Text>
        <Row label="Branch Name" value={branch?.name} />
        <Row label="Branch Code" value={branch?.code} />
        <Row label="Address" value={branch?.address} />
        <Row label="Phone" value={branch?.phone} />
        <Row label="GSTIN" value={branch?.gst} />
        <Row label="Manager" value={branch?.manager} />
        <Row label="Operating Hours" value={`${branch?.opening} - ${branch?.closing}`} />
        <Row label="Warehouse" value={branch?.warehouse} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Invoice & Printer Settings</Text>
        <Checkbox checked={defaultA4} onChange={setDefaultA4} label="Enable A4 GST Invoice Printing" style={{ marginBottom: SPACING.sm }} />
        <Checkbox checked={defaultThermal} onChange={setDefaultThermal} label="Enable Thermal Receipt Printing" />
      </Card>

      {/* Retention Policy and Local Cleanup Status sections removed */}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>App Updates</Text>
        <Button title="Check for Updates" variant="secondary" onPress={checkForUpdatesManually} style={{ maxWidth: 220 }} />
      </Card>
    </ScreenContainer>
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
  helperText: { ...TYPOGRAPHY.caption, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowLabel: { ...TYPOGRAPHY.caption },
  rowValue: { ...TYPOGRAPHY.bodyStrong, textAlign: 'right', flexShrink: 1, marginLeft: SPACING.md },
});
