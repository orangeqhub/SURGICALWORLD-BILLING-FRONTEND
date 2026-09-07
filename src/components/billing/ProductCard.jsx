import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import StatusBadge from '../ui/StatusBadge';
import { focusRingStyle } from '../../utils/a11y';

export default function ProductCard({ product, stock, onPress }) {
  const outOfStock = stock?.status === 'OUT_OF_STOCK' || (stock?.available ?? 0) <= 0;

  return (
    <Pressable
      style={({ pressed, focused }) => [
        styles.card,
        SHADOWS.card,
        outOfStock && styles.cardDisabled,
        pressed && !outOfStock && styles.cardPressed,
        focusRingStyle(focused),
      ]}
      onPress={() => !outOfStock && onPress && onPress(product)}
      disabled={outOfStock}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCurrency(product.sellingPrice)}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="cube-outline" size={22} color={COLORS.brandRed} />
      </View>
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.code}>{product.code}</Text>
      <View style={styles.footer}>
        <Text style={styles.price}>{formatCurrency(product.sellingPrice)}</Text>
        <StatusBadge status={stock?.status || 'IN_STOCK'} />
      </View>
      <Text style={styles.stockText}>
        {outOfStock ? 'Out of stock' : `${stock?.available ?? 0} ${product.unit} available`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: '100%',
    minWidth: 140,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  cardPressed: { opacity: 0.85 },
  cardDisabled: { opacity: 0.5 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  name: { ...TYPOGRAPHY.bodyStrong, marginBottom: 2, minHeight: 36 },
  code: { ...TYPOGRAPHY.small, marginBottom: SPACING.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xxs },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  stockText: { ...TYPOGRAPHY.small },
});
