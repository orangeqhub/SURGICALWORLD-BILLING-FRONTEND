import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '../ui/Input';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, strong && styles.labelStrong]}>{label}</Text>
      <Text style={[styles.value, strong && styles.valueStrong]}>{value}</Text>
    </View>
  );
}

/**
 * Read-only totals panel driven entirely by
 * src/utils/purchaseCalculations.js - no math happens in this component (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part D).
 */
export default function PurchaseTotals({ totals, invoiceDiscount, otherCharges, onInvoiceDiscountChange, onOtherChargesChange, paidAmount, onPaidAmountChange, balanceAmount }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Totals</Text>
      <Row label="Total Quantity" value={totals.totalQuantity} />
      <Row label="Total Free Quantity" value={totals.totalFreeQuantity} />
      <Row label="Gross Amount" value={formatCurrency(totals.grossAmount)} />
      <Row label="Product Discounts" value={formatCurrency(totals.productDiscounts)} />

      <Input
        label="Invoice Discount"
        value={String(invoiceDiscount ?? '')}
        onChangeText={onInvoiceDiscountChange}
        keyboardType="decimal-pad"
        style={styles.inlineInput}
      />
      <Input
        label="Other Charges (Non-taxable)"
        value={String(otherCharges ?? '')}
        onChangeText={onOtherChargesChange}
        keyboardType="decimal-pad"
        style={styles.inlineInput}
      />

      <Row label="Taxable Amount" value={formatCurrency(totals.taxableAmount)} />
      <Row label="CGST" value={formatCurrency(totals.cgst)} />
      <Row label="SGST" value={formatCurrency(totals.sgst)} />
      <Row label="IGST" value={formatCurrency(totals.igst)} />
      <Row label="Round Off" value={formatCurrency(totals.roundOff)} />
      <Row label="Net Purchase Amount" value={formatCurrency(totals.netAmount)} strong />

      <Input
        label="Paid Amount"
        value={String(paidAmount ?? '')}
        onChangeText={onPaidAmountChange}
        keyboardType="decimal-pad"
        style={styles.inlineInput}
      />
      <Row label="Balance Amount" value={formatCurrency(balanceAmount)} strong />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  labelStrong: { ...TYPOGRAPHY.bodyStrong, color: COLORS.textPrimary },
  value: { ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '600' },
  valueStrong: { ...TYPOGRAPHY.h4, color: COLORS.brandRed },
  inlineInput: { marginTop: SPACING.xs, marginBottom: SPACING.xs },
});
