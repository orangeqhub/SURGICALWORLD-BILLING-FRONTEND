import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';

export default function MetricCard({ label, value, icon = 'stats-chart-outline', tone = 'brandRed', delta, deltaPositive = true, style }) {
  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: `${COLORS[tone] || COLORS.brandRed}1A` }]}>
          <Ionicons name={icon} size={18} color={COLORS[tone] || COLORS.brandRed} />
        </View>
        {delta ? (
          <View style={styles.deltaRow}>
            <Ionicons
              name={deltaPositive ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={deltaPositive ? COLORS.success : COLORS.danger}
            />
            <Text style={[styles.delta, { color: deltaPositive ? COLORS.success : COLORS.danger }]}>{delta}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    minWidth: 160,
    flex: 1,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  delta: { fontSize: 12, fontWeight: '700' },
  value: { ...TYPOGRAPHY.h2, marginBottom: 2 },
  label: { ...TYPOGRAPHY.caption },
});
