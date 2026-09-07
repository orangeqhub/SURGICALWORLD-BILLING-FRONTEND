import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

/**
 * Compact Invoice Review shown immediately before Payment (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part N). A single screen,
 * not a wizard - one "Proceed to Payment" action, "Back" returns to the
 * customer step so the bill can still be edited. PaymentModal itself is
 * untouched; this is a step before it, not inside it.
 */
export default function BillReviewModal({ visible, onClose, onBack, onConfirm, customer, items, totals }) {
  return (
    <Modal visible={visible} onClose={onClose} title="Review Bill" width={480}>
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.customerLine}>
          {customer?.name || 'Walk-in Customer'}{customer?.customerCode ? ` (${customer.customerCode})` : ''}
          {customer?.mobile && customer.mobile !== '-' ? ` - ${customer.mobile}` : ''}
        </Text>

        {items.map((item) => {
          const priceChanged = item.originalPrice !== undefined && item.sellingPrice !== item.originalPrice;
          const lineTotal = item.quantity * item.sellingPrice - (item.discountAmount || 0);
          return (
            <View key={item.cartKey || `${item.productId}-${item.batchId || 'x'}`} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}{item.batchNumber ? ` (Batch ${item.batchNumber})` : ''}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {priceChanged ? `${formatCurrency(item.originalPrice)} -> ` : ''}{formatCurrency(item.sellingPrice)}
                  {item.discountAmount > 0 ? `  - discount ${formatCurrency(item.discountAmount)}` : ''}
                  {'  '}GST {item.gst}%
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(lineTotal)}</Text>
            </View>
          );
        })}

        <View style={styles.totalsBox}>
          <Row label="Subtotal (after item discounts)" value={formatCurrency(totals.subtotal)} />
          {totals.itemDiscountTotal > 0 ? <Row label="Item Discounts" value={`- ${formatCurrency(totals.itemDiscountTotal)}`} /> : null}
          <Row label="Invoice Discount" value={`- ${formatCurrency(totals.discount)}`} />
          <Row label="GST" value={formatCurrency(totals.gst)} />
          <Row label="Payable Amount" value={formatCurrency(totals.grandTotal)} strong />
        </View>
      </ScrollView>

      <View style={styles.actionsRow}>
        <Button title="Back / Edit" variant="secondary" outline onPress={onBack} style={{ flex: 1 }} />
        <Button title="Proceed to Payment" onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowLabelStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  customerLine: { ...TYPOGRAPHY.bodyStrong, marginBottom: SPACING.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemName: { ...TYPOGRAPHY.bodyStrong, fontSize: 13 },
  itemMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  itemTotal: { ...TYPOGRAPHY.bodyStrong, fontSize: 13 },
  totalsBox: { marginTop: SPACING.sm, paddingTop: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  rowLabelStrong: { ...TYPOGRAPHY.bodyStrong },
  rowValue: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  rowValueStrong: { ...TYPOGRAPHY.h4, color: COLORS.brandRed },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
