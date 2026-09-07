import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { formatCurrencyCompact } from '../../utils/formatters';

export default function BranchSalesChart({ title = 'Sales by Branch', data = [], style }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {data.map((d) => (
        <View key={d.label} style={styles.row}>
          <Text style={styles.rowLabel} numberOfLines={1}>{d.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max((d.value / max) * 100, 3)}%` }]} />
          </View>
          <Text style={styles.rowValue}>{formatCurrencyCompact(d.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  rowLabel: { width: 90, ...TYPOGRAPHY.caption },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: COLORS.background, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: COLORS.brandRed },
  rowValue: { width: 70, textAlign: 'right', ...TYPOGRAPHY.bodyStrong, fontSize: 12 },
});
