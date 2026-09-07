import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';

export default function StockAlertCard({ title = 'Stock Alerts', items = [], style }) {
  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="All stock levels healthy" />
      ) : (
        items.map((item) => (
          <View key={item.productId} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>{item.available} {item.unit} left - min {item.minStock}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  name: { ...TYPOGRAPHY.bodyStrong },
  meta: { ...TYPOGRAPHY.small },
});
