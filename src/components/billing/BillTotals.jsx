import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

export default function BillTotals({ subtotal = 0, discount = 0, itemDiscountTotal = 0, gst = 0, grandTotal = 0 }) {
  return (
    <View style={styles.wrap}>
      <Row label="Subtotal" value={formatCurrency(subtotal)} />
      {itemDiscountTotal > 0 ? <Row label="Item Discounts" value={`- ${formatCurrency(itemDiscountTotal)}`} tone={COLORS.danger} /> : null}
      <Row label="Invoice Discount" value={`- ${formatCurrency(discount)}`} tone={COLORS.danger} />
      <Row label="GST" value={formatCurrency(gst)} />
      <View style={styles.divider} />
      <Row label="GRAND TOTAL" value={formatCurrency(grandTotal)} bold />
    </View>
  );
}

function Row({ label, value, bold, tone }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.labelBold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.valueBold, tone && { color: tone }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  labelBold: { ...TYPOGRAPHY.bodyStrong, fontSize: 15, color: COLORS.brandRed, fontWeight: '800' },
  value: { ...TYPOGRAPHY.bodyStrong },
  valueBold: { fontSize: 17, fontWeight: '800', color: COLORS.brandRed },
  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
});
