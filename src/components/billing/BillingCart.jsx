import React from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { formatDateTime } from '../../utils/formatters';
import CartItem from './CartItem';
import BillTotals from './BillTotals';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

const LOGO = require('../../../assets/logo.png');
const QUOTE = 'Quality Surgical Products, Trusted Care';

export default function BillingCart({
  items = [],
  totals,
  branch,
  onIncrease,
  onDecrease,
  onRemove,
  onHold,
  onClear,
  onCheckout,
  disabled = false,
  canEditPrice = false,
  canEditDiscount = false,
  onPriceChange,
  onDiscountChange,
  onInvoiceDiscountChange,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const isSmallMobile = width < 400;

  return (
    <View style={[styles.wrap, SHADOWS.card, isMobile && styles.wrapMobile]}>
      <View style={styles.header}>
        <View style={styles.receiptHeader}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.branchName}>Surgical World{branch?.name ? ` - ${branch.name}` : ''}</Text>
          <Text style={styles.quote}>"{QUOTE}"</Text>
        </View>

        <View style={styles.dashedDivider} />

        <View style={styles.billMetaRow}>
          <Text style={styles.billTitle}>Current Bill ({items.length})</Text>
          <Text style={styles.billDate}>{formatDateTime()}</Text>
        </View>

        <View style={styles.dashedDivider} />
      </View>

      {items.length > 0 && !isMobile ? (
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, { flex: 1 }]}>ITEM</Text>
          <Text style={[styles.thText, { width: 70, textAlign: 'center' }]}>QTY</Text>
          <Text style={[styles.thText, { width: 60, textAlign: 'right' }]}>RATE</Text>
          <Text style={[styles.thText, { width: 70, textAlign: 'right' }]}>AMOUNT</Text>
          <View style={{ width: 25 }} />
        </View>
      ) : null}

      <View style={styles.itemsArea}>
        {items.length === 0 ? (
          <EmptyState icon="cart-outline" title="Cart is empty" message="Tap a product to add it to the bill" style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.cartKey || `${item.productId}::${item.batchId || 'nobatch'}`}
            style={styles.itemsList}
            scrollEnabled={!isMobile}
            renderItem={({ item }) => (
              <CartItem
                item={item}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                onRemove={onRemove}
                canEditPrice={canEditPrice}
                canEditDiscount={canEditDiscount}
                onPriceChange={onPriceChange}
                onDiscountChange={onDiscountChange}
              />
            )}
          />
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dashedDivider} />

        {canEditDiscount && items.length > 0 ? (
          <View style={styles.invoiceDiscountRow}>
            <Text style={styles.invoiceDiscountLabel}>Invoice Discount</Text>
            <TextInput
              key={items.length === 0 ? 'empty' : 'active'}
              style={styles.invoiceDiscountInput}
              defaultValue={String(totals?.discount ?? 0)}
              keyboardType="decimal-pad"
              onEndEditing={(e) => onInvoiceDiscountChange && onInvoiceDiscountChange(e.nativeEvent.text)}
            />
          </View>
        ) : null}

        <BillTotals {...totals} />

        <View style={[styles.actionsRow, isSmallMobile && styles.actionsRowStacked]}>
          <Button title="Hold Bill" variant="secondary" outline onPress={onHold} disabled={disabled || items.length === 0} style={{ flex: 1 }} />
          <Button title="Clear" variant="danger" outline onPress={onClear} disabled={disabled || items.length === 0} style={{ flex: 1 }} />
        </View>
        <Button title="Proceed to Payment" onPress={onCheckout} disabled={disabled || items.length === 0} style={styles.checkoutBtn} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  wrapMobile: {
    flex: 0,
    minHeight: 'auto',
  },
  header: { flexShrink: 0 },
  receiptHeader: { alignItems: 'center', marginBottom: SPACING.sm },
  logo: { width: 44, height: 44, marginBottom: 4 },
  branchName: { ...TYPOGRAPHY.bodyStrong, fontSize: 14, textAlign: 'center', color: '#202463' },
  quote: { ...TYPOGRAPHY.small, fontStyle: 'italic', color: COLORS.magenta, textAlign: 'center', marginTop: 2 },
  dashedDivider: { borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed', marginVertical: SPACING.sm },
  billMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billTitle: { ...TYPOGRAPHY.h4, color: '#202463' },
  billDate: { fontSize: 11, color: COLORS.textSecondary },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  thText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  itemsArea: { flex: 1, minHeight: 0 },
  itemsList: { flex: 1 },
  footer: { flexShrink: 0, backgroundColor: '#ffffff' },
  invoiceDiscountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  invoiceDiscountLabel: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  invoiceDiscountInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    width: 90,
    textAlign: 'right',
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionsRowStacked: { flexDirection: 'column' },
  checkoutBtn: { marginTop: SPACING.sm },
});
