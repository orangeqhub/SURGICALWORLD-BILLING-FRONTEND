import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { timeAgo } from '../../utils/formatters';
import ConnectionBadge from '../ui/ConnectionBadge';

export default function SyncHealthCard({ connectionStatus = 'online', pending = 0, failed = 0, lastSyncedAt, style }) {
  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Health</Text>
        <ConnectionBadge status={connectionStatus} />
      </View>

      <View style={styles.statsRow}>
        <Stat label="Pending" value={pending} icon="hourglass-outline" color={COLORS.warning} />
        <Stat label="Failed" value={failed} icon="close-circle-outline" color={COLORS.danger} />
      </View>

      <Text style={styles.lastSync}>
        Last synced: {lastSyncedAt ? timeAgo(lastSyncedAt) : 'Never'}
      </Text>
    </View>
  );
}

function Stat({ label, value, icon, color }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h4 },
  statsRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xxs },
  statValue: { ...TYPOGRAPHY.bodyStrong },
  statLabel: { ...TYPOGRAPHY.caption },
  lastSync: { ...TYPOGRAPHY.small },
});
