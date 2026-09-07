import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { focusRingStyle } from '../../utils/a11y';

export default function CartItem({ item, onIncrease, onDecrease, onRemove, canEditPrice = false, canEditDiscount = false, onPriceChange, onDiscountChange }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const [editing, setEditing] = useState(false);
  const lineTotal = item.quantity * item.sellingPrice - (item.discountAmount || 0);
  const canEditLine = canEditPrice || canEditDiscount;
  const priceChanged = item.originalPrice !== undefined && item.sellingPrice !== item.originalPrice;

  const editRow = editing ? (
    <View style={styles.editRow}>
      {canEditPrice ? (
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Price</Text>
          <TextInput
            style={styles.editInput}
            defaultValue={String(item.sellingPrice)}
            keyboardType="decimal-pad"
            onEndEditing={(e) => onPriceChange && onPriceChange(item, e.nativeEvent.text)}
          />
        </View>
      ) : null}
      {canEditDiscount ? (
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Discount ₹</Text>
          <TextInput
            style={styles.editInput}
            defaultValue={String(item.discountAmount || 0)}
            keyboardType="decimal-pad"
            onEndEditing={(e) => onDiscountChange && onDiscountChange(item, e.nativeEvent.text)}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  if (isMobile) {
    return (
      <View style={styles.rowMobile}>
        <View style={styles.mobileLine1}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameMobile} numberOfLines={2}>
              {item.name}
            </Text>
            {item.batchNumber ? <Text style={styles.batchTextMobile}>Batch {item.batchNumber}</Text> : null}
          </View>
          <Text style={styles.amountTextMobile}>{formatCurrency(lineTotal)}</Text>
        </View>
        <View style={styles.mobileLine2}>
          <View style={styles.mobileRateQty}>
            <Text style={styles.rateTextMobile}>
              {priceChanged ? <Text style={styles.strikeText}>{formatCurrency(item.originalPrice)} </Text> : null}
              {formatCurrency(item.sellingPrice)} x
            </Text>
            <View style={styles.qtyRowCompact}>
              <Pressable
                style={({ focused }) => [styles.qtyBtnCompact, focusRingStyle(focused)]}
                onPress={() => onDecrease && onDecrease(item)}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Ionicons name="remove" size={12} color={COLORS.brandRed} />
              </Pressable>
              <Text style={styles.qtyTextCompact}>{item.quantity}</Text>
              <Pressable
                style={({ focused }) => [styles.qtyBtnCompact, focusRingStyle(focused)]}
                onPress={() => onIncrease && onIncrease(item)}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Ionicons name="add" size={12} color={COLORS.brandRed} />
              </Pressable>
            </View>
            <Text style={styles.unitTextMobile}> {item.unit}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {canEditLine ? (
              <Pressable
                onPress={() => setEditing((e) => !e)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit price or discount"
                style={({ focused }) => [focusRingStyle(focused)]}
              >
                <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable
              style={({ focused }) => [styles.removeBtnMobile, focusRingStyle(focused)]}
              onPress={() => onRemove && onRemove(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove item"
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.brandRed} />
            </Pressable>
          </View>
        </View>
        {editRow}
      </View>
    );
  }

  return (
    <View style={styles.rowWrap}>
      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: SPACING.sm }}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {item.batchNumber ? <Text style={styles.batchText}>Batch {item.batchNumber}</Text> : null}
        </View>

        <View style={[styles.qtyCol, { width: 70 }]}>
          <View style={styles.qtyRowCompact}>
            <Pressable
              style={({ focused }) => [styles.qtyBtnCompact, focusRingStyle(focused)]}
              onPress={() => onDecrease && onDecrease(item)}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
            >
              <Ionicons name="remove" size={12} color={COLORS.brandRed} />
            </Pressable>
            <Text style={styles.qtyTextCompact}>{item.quantity}</Text>
            <Pressable
              style={({ focused }) => [styles.qtyBtnCompact, focusRingStyle(focused)]}
              onPress={() => onIncrease && onIncrease(item)}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
            >
              <Ionicons name="add" size={12} color={COLORS.brandRed} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.rateText, { width: 60 }]}>{formatCurrency(item.sellingPrice)}</Text>
        <Text style={[styles.amountText, { width: 70 }]}>{formatCurrency(lineTotal)}</Text>

        {canEditLine ? (
          <Pressable
            style={({ focused }) => [{ width: 22, alignItems: 'center' }, focusRingStyle(focused)]}
            onPress={() => setEditing((e) => !e)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit price or discount"
          >
            <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}

        <Pressable
          style={({ focused }) => [styles.removeBtn, { width: 25 }, focusRingStyle(focused)]}
          onPress={() => onRemove && onRemove(item)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove item"
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
        </Pressable>
      </View>
      {editRow}
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop Styles
  rowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  name: {
    ...TYPOGRAPHY.bodyStrong,
    color: COLORS.textPrimary,
  },
  batchText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  batchTextMobile: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  strikeText: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  editRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  editInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    width: 70,
    color: COLORS.textPrimary,
  },
  qtyCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    textAlign: 'right',
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  amountText: {
    textAlign: 'right',
    fontWeight: '800',
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  removeBtn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 4,
  },

  // Compact Qty controls (shared)
  qtyRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 2,
    backgroundColor: COLORS.surface,
  },
  qtyBtnCompact: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyTextCompact: {
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    minWidth: 16,
  },

  // Mobile Styles
  rowMobile: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  mobileLine1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  nameMobile: {
    ...TYPOGRAPHY.bodyStrong,
    color: COLORS.textPrimary,
    flex: 1,
  },
  amountTextMobile: {
    fontWeight: '800',
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  mobileLine2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileRateQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rateTextMobile: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  unitTextMobile: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  removeBtnMobile: {
    padding: 4,
  },
});
