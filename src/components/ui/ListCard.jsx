import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

/**
 * Shared mobile card body used by ResponsiveList across Customers, Suppliers,
 * Products, and inventory tabs, so every module's phone layout looks
 * consistent instead of each screen inventing its own card markup.
 */
export default function ListCard({ title, subtitle, badge, lines = [], actions, style }) {
  return (
    <Card style={style}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {badge}
      </View>
      {lines.length > 0 ? (
        <View style={styles.linesWrap}>
          {lines.map((line) => (
            <View key={line.label} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{line.label}</Text>
              <Text style={styles.lineValue} numberOfLines={1}>{line.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {actions ? <View style={styles.actionsRow}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.xs },
  title: { ...TYPOGRAPHY.bodyStrong },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },
  linesWrap: { gap: 4, marginTop: SPACING.xxs },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  lineLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  lineValue: { ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
});
