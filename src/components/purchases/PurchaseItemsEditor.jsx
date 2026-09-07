import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { calculateLine } from '../../utils/purchaseCalculations';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

function newLine(product) {
  return {
    lineId: `LN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: product?.id || '',
    productName: product?.name || '',
    sku: product?.sku || product?.code || '',
    hsn: product?.hsn || '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    quantity: '',
    freeQuantity: '',
    unit: product?.unit || 'Pcs',
    purchasePrice: product?.purchasePrice ? String(product.purchasePrice) : '',
    sellingPrice: product?.sellingPrice ? String(product.sellingPrice) : '',
    mrp: product?.mrp ? String(product.mrp) : '',
    discountPercent: '',
    gstPercent: product?.gst !== undefined ? String(product.gst) : '',
    remarks: '',
    batchTrackingEnabled: product?.batchTrackingEnabled ?? true,
    expiryTrackingEnabled: product?.expiryTrackingEnabled ?? true,
  };
}

export function validateLine(item) {
  const errors = {};
  if (!item.productId) errors.productId = 'Product is required';
  if (!(Number(item.quantity) > 0)) errors.quantity = 'Quantity must be greater than zero';
  if (Number(item.freeQuantity) < 0) errors.freeQuantity = 'Free quantity cannot be negative';
  if (Number(item.purchasePrice) < 0) errors.purchasePrice = 'Purchase price cannot be negative';
  if (item.sellingPrice !== '' && Number(item.sellingPrice) < 0) errors.sellingPrice = 'Selling price cannot be negative';
  if (item.mrp !== '' && Number(item.mrp) < 0) errors.mrp = 'MRP cannot be negative';
  const gst = Number(item.gstPercent);
  if (item.gstPercent !== '' && (Number.isNaN(gst) || gst < 0 || gst > 100)) errors.gstPercent = 'GST must be between 0 and 100';
  if (item.expiryTrackingEnabled && item.mfgDate && item.expiryDate && new Date(item.expiryDate) <= new Date(item.mfgDate)) {
    errors.expiryDate = 'Expiry date must be after manufacturing date';
  }
  return errors;
}

/**
 * Multi-line purchase item editor (see docs/FRONTEND_PHASE_IMPLEMENTATION.md,
 * Phase 3, Part C). Desktop renders a compact table-like row per item;
 * mobile renders an editable card per item - same state/handlers either way.
 */
export default function PurchaseItemsEditor({ items, onChange, products, isInterState }) {
  const { isPhone } = useResponsiveLayout();

  const productOptions = useMemo(() => products.map((p) => ({ label: `${p.name} (${p.sku || p.code})`, value: p.id })), [products]);

  const duplicateKeys = useMemo(() => {
    const seen = {};
    const dupes = new Set();
    items.forEach((it) => {
      const key = `${it.productId}::${it.batchNumber}`;
      if (!it.productId || !it.batchNumber) return;
      if (seen[key]) dupes.add(key);
      seen[key] = true;
    });
    return dupes;
  }, [items]);

  const addLine = () => onChange([...items, newLine()]);
  const removeLine = (lineId) => onChange(items.filter((i) => i.lineId !== lineId));
  const duplicateLine = (line) => onChange([...items, { ...line, lineId: `LN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);

  const updateLine = (lineId, patch) => {
    onChange(
      items.map((i) => {
        if (i.lineId !== lineId) return i;
        const next = { ...i, ...patch };
        if (patch.productId) {
          const product = products.find((p) => p.id === patch.productId);
          if (product) {
            Object.assign(next, {
              productName: product.name,
              sku: product.sku || product.code,
              hsn: product.hsn || '',
              unit: product.unit || 'Pcs',
              purchasePrice: next.purchasePrice || String(product.purchasePrice ?? ''),
              sellingPrice: next.sellingPrice || String(product.sellingPrice ?? ''),
              mrp: next.mrp || String(product.mrp ?? ''),
              gstPercent: next.gstPercent || String(product.gst ?? ''),
              batchTrackingEnabled: product.batchTrackingEnabled ?? true,
              expiryTrackingEnabled: product.expiryTrackingEnabled ?? true,
            });
          }
        }
        return next;
      })
    );
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Purchase Items</Text>
        <Button title="Add Line" size="sm" onPress={addLine} icon={<Ionicons name="add" size={16} color={COLORS.white} />} />
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>No items added yet. Tap "Add Line" to begin.</Text>
      ) : (
        items.map((item) => {
          const errors = validateLine(item);
          const computed = calculateLine({ ...item, isInterState });
          const isDuplicate = duplicateKeys.has(`${item.productId}::${item.batchNumber}`);

          return isPhone ? (
            <MobileLineCard
              key={item.lineId}
              item={item}
              errors={errors}
              computed={computed}
              isDuplicate={isDuplicate}
              productOptions={productOptions}
              onUpdate={(patch) => updateLine(item.lineId, patch)}
              onRemove={() => removeLine(item.lineId)}
              onDuplicate={() => duplicateLine(item)}
            />
          ) : (
            <DesktopLineRow
              key={item.lineId}
              item={item}
              errors={errors}
              computed={computed}
              isDuplicate={isDuplicate}
              productOptions={productOptions}
              onUpdate={(patch) => updateLine(item.lineId, patch)}
              onRemove={() => removeLine(item.lineId)}
              onDuplicate={() => duplicateLine(item)}
            />
          );
        })
      )}
    </View>
  );
}

function DesktopLineRow({ item, errors, computed, isDuplicate, productOptions, onUpdate, onRemove, onDuplicate }) {
  return (
    <Card style={styles.lineCard}>
      <View style={styles.lineRowTop}>
        <Select value={item.productId} onChange={(v) => onUpdate({ productId: v })} options={productOptions} placeholder="Select product" style={{ flex: 1.6, marginBottom: 0 }} />
        <Input value={item.hsn} onChangeText={(v) => onUpdate({ hsn: v })} placeholder="HSN" style={{ flex: 0.7, marginBottom: 0 }} />
        {item.batchTrackingEnabled ? <Input value={item.batchNumber} onChangeText={(v) => onUpdate({ batchNumber: v })} placeholder="Batch No." style={{ flex: 0.9, marginBottom: 0 }} /> : null}
        {item.expiryTrackingEnabled ? <Input value={item.expiryDate} onChangeText={(v) => onUpdate({ expiryDate: v })} placeholder="Expiry YYYY-MM-DD" error={errors.expiryDate} style={{ flex: 1, marginBottom: 0 }} /> : null}
        <Pressable onPress={onDuplicate} hitSlop={8}><Ionicons name="copy-outline" size={18} color={COLORS.textSecondary} /></Pressable>
        <Pressable onPress={onRemove} hitSlop={8}><Ionicons name="trash-outline" size={18} color={COLORS.danger} /></Pressable>
      </View>
      <View style={styles.lineRowBottom}>
        <Input value={item.quantity} onChangeText={(v) => onUpdate({ quantity: v })} placeholder="Qty" keyboardType="number-pad" error={errors.quantity} style={{ flex: 0.7, marginBottom: 0 }} />
        <Input value={item.freeQuantity} onChangeText={(v) => onUpdate({ freeQuantity: v })} placeholder="Free Qty" keyboardType="number-pad" error={errors.freeQuantity} style={{ flex: 0.7, marginBottom: 0 }} />
        <Input value={item.purchasePrice} onChangeText={(v) => onUpdate({ purchasePrice: v })} placeholder="Purchase Price" keyboardType="decimal-pad" error={errors.purchasePrice} style={{ flex: 0.9, marginBottom: 0 }} />
        <Input value={item.sellingPrice} onChangeText={(v) => onUpdate({ sellingPrice: v })} placeholder="Selling Price" keyboardType="decimal-pad" error={errors.sellingPrice} style={{ flex: 0.9, marginBottom: 0 }} />
        <Input value={item.mrp} onChangeText={(v) => onUpdate({ mrp: v })} placeholder="MRP" keyboardType="decimal-pad" error={errors.mrp} style={{ flex: 0.9, marginBottom: 0 }} />
        <Input value={item.discountPercent} onChangeText={(v) => onUpdate({ discountPercent: v })} placeholder="Disc %" keyboardType="decimal-pad" style={{ flex: 0.7, marginBottom: 0 }} />
        <Input value={item.gstPercent} onChangeText={(v) => onUpdate({ gstPercent: v })} placeholder="GST %" keyboardType="decimal-pad" error={errors.gstPercent} style={{ flex: 0.7, marginBottom: 0 }} />
        <Text style={styles.lineTotalText}>{formatCurrency(computed.lineTotal)}</Text>
      </View>
      {isDuplicate ? <Text style={styles.warningText}>Duplicate product + batch on another line</Text> : null}
      {errors.productId ? <Text style={styles.warningText}>{errors.productId}</Text> : null}
    </Card>
  );
}

function MobileLineCard({ item, errors, computed, isDuplicate, productOptions, onUpdate, onRemove, onDuplicate }) {
  return (
    <Card style={styles.lineCard}>
      <Select value={item.productId} onChange={(v) => onUpdate({ productId: v })} options={productOptions} placeholder="Select product" />
      <View style={styles.mobileRow}>
        <Input label="Qty *" value={item.quantity} onChangeText={(v) => onUpdate({ quantity: v })} keyboardType="number-pad" error={errors.quantity} style={{ flex: 1 }} />
        <Input label="Free Qty" value={item.freeQuantity} onChangeText={(v) => onUpdate({ freeQuantity: v })} keyboardType="number-pad" error={errors.freeQuantity} style={{ flex: 1 }} />
      </View>
      <View style={styles.mobileRow}>
        <Input label="Purchase Price" value={item.purchasePrice} onChangeText={(v) => onUpdate({ purchasePrice: v })} keyboardType="decimal-pad" error={errors.purchasePrice} style={{ flex: 1 }} />
        <Input label="GST %" value={item.gstPercent} onChangeText={(v) => onUpdate({ gstPercent: v })} keyboardType="decimal-pad" error={errors.gstPercent} style={{ flex: 1 }} />
      </View>
      <View style={styles.mobileRow}>
        <Input label="Selling Price" value={item.sellingPrice} onChangeText={(v) => onUpdate({ sellingPrice: v })} keyboardType="decimal-pad" error={errors.sellingPrice} style={{ flex: 1 }} />
        <Input label="MRP" value={item.mrp} onChangeText={(v) => onUpdate({ mrp: v })} keyboardType="decimal-pad" error={errors.mrp} style={{ flex: 1 }} />
      </View>
      <Input label="Discount %" value={item.discountPercent} onChangeText={(v) => onUpdate({ discountPercent: v })} keyboardType="decimal-pad" />
      {item.batchTrackingEnabled ? <Input label="Batch Number" value={item.batchNumber} onChangeText={(v) => onUpdate({ batchNumber: v })} /> : null}
      {item.expiryTrackingEnabled ? (
        <View style={styles.mobileRow}>
          <Input label="Mfg Date" value={item.mfgDate} onChangeText={(v) => onUpdate({ mfgDate: v })} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          <Input label="Expiry Date" value={item.expiryDate} onChangeText={(v) => onUpdate({ expiryDate: v })} placeholder="YYYY-MM-DD" error={errors.expiryDate} style={{ flex: 1 }} />
        </View>
      ) : null}
      {isDuplicate ? <Text style={styles.warningText}>Duplicate product + batch on another line</Text> : null}
      <View style={styles.mobileFooter}>
        <Text style={styles.lineTotalText}>{formatCurrency(computed.lineTotal)}</Text>
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <Pressable onPress={onDuplicate}><Ionicons name="copy-outline" size={20} color={COLORS.textSecondary} /></Pressable>
          <Pressable onPress={onRemove}><Ionicons name="trash-outline" size={20} color={COLORS.danger} /></Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { ...TYPOGRAPHY.h4 },
  emptyText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, paddingVertical: SPACING.lg, textAlign: 'center' },
  lineCard: { marginBottom: SPACING.sm, gap: SPACING.xs },
  lineRowTop: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', marginBottom: SPACING.xs },
  lineRowBottom: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  mobileRow: { flexDirection: 'row', gap: SPACING.sm },
  mobileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  lineTotalText: { fontWeight: '800', fontSize: 13, color: COLORS.textPrimary, minWidth: 80, textAlign: 'right' },
  warningText: { color: COLORS.warning, fontSize: 11, fontWeight: '600' },
});
