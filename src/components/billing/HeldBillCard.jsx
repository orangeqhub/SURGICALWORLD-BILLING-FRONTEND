import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { formatCurrency, timeAgo } from '../../utils/formatters';
import Button from '../ui/Button';

function draftNumber(localId = '') {
  const parts = String(localId).split('-');
  return parts[parts.length - 1]?.slice(-6) || localId;
}

export default function HeldBillCard({ bill, onResume, onDiscard, compact }) {
  const itemCount = bill.itemCount ?? (() => {
    try {
      return JSON.parse(bill.itemsJson || '[]').length;
    } catch (e) {
      return 0;
    }
  })();

  return (
    <View style={[styles.card, SHADOWS.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <Text style={styles.draftNo}>Draft #{draftNumber(bill.localId)}</Text>
        <Text style={styles.amount}>{formatCurrency(bill.grandTotal)}</Text>
      </View>
      <Text style={styles.customer} numberOfLines={1}>{bill.customerName || 'No customer'}</Text>
      {bill.customerMobile ? <Text style={styles.meta}>{bill.customerMobile}</Text> : null}
      <Text style={styles.meta}>{itemCount} items - held {timeAgo(bill.heldAt)}</Text>
      <View style={styles.actions}>
        <Button title="Resume" size="sm" onPress={() => onResume && onResume(bill)} style={{ flex: 1 }} />
        <Pressable style={styles.discardBtn} onPress={() => onDiscard && onDiscard(bill)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, width: 240 },
  cardCompact: { width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  draftNo: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  customer: { ...TYPOGRAPHY.bodyStrong },
  meta: { ...TYPOGRAPHY.small },
  amount: { fontSize: 16, fontWeight: '800', color: COLORS.brandRed },
  actions: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', marginTop: SPACING.sm },
  discardBtn: { width: 40, height: 40, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
});
