import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import Card from '../../src/components/ui/Card';
import Checkbox from '../../src/components/ui/Checkbox';
import Badge from '../../src/components/ui/Badge';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import { useNotification } from '../../src/hooks/useNotification';
import { isMockMode } from '../../src/services/api/apiClient';
import { checkForUpdatesManually } from '../../src/utils/updateHelper';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

export default function GlobalSettingsScreen() {
  const { success } = useNotification();
  const [defaultGst, setDefaultGst] = useState('12');
  const [companyName, setCompanyName] = useState('Surgical World');
  const [website, setWebsite] = useState('www.surgicalworld.org');
  const [enforceA4, setEnforceA4] = useState(true);
  const [enforceThermal, setEnforceThermal] = useState(true);
  const [autoSyncOnBoot, setAutoSyncOnBoot] = useState(true);

  return (
    <ScreenContainer>
      <SectionHeader title="Global Settings" subtitle="Company profile and network-wide defaults" />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Company Profile</Text>
        <Input label="Company Name" value={companyName} onChangeText={setCompanyName} />
        <Input label="Website" value={website} onChangeText={setWebsite} />
        <Text style={styles.helperText}>Established 2000 - One Stop for all your Surgical & Medical Equipments</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Billing Defaults</Text>
        <Input label="Default GST Rate (%)" value={defaultGst} onChangeText={setDefaultGst} keyboardType="decimal-pad" />
        <Checkbox checked={enforceA4} onChange={setEnforceA4} label="Enable A4 GST Invoice network-wide" style={{ marginBottom: SPACING.sm }} />
        <Checkbox checked={enforceThermal} onChange={setEnforceThermal} label="Enable Thermal Receipt network-wide" style={{ marginBottom: SPACING.sm }} />
        <Checkbox checked={autoSyncOnBoot} onChange={setAutoSyncOnBoot} label="Auto-sync on app startup for all branches" />
      </Card>

      {/* Backend Connectivity status card removed */}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>App Updates</Text>
        <Button title="Check for Updates" variant="secondary" onPress={checkForUpdatesManually} style={{ maxWidth: 220 }} />
      </Card>

      <Button title="Save Settings" onPress={() => success('Global settings saved')} style={{ maxWidth: 220 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.lg, maxWidth: 560 },
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  helperText: { ...TYPOGRAPHY.caption },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  rowLabel: { ...TYPOGRAPHY.bodyStrong },
});
