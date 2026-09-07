import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import { fetchBatches } from '../../services/api/batchInventoryApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

const UNSELECTABLE = ['EXPIRED', 'BLOCKED', 'DEPLETED'];

/**
 * Batch selection for batch-tracked products in Billing (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part J). Batches are
 * read-only frontend/mock data - selecting one never mutates real or mock
 * stock; the existing product-level stock decrease at bill completion is
 * unchanged. If batch data can't be loaded (e.g. real API mode without a
 * /batches endpoint), this degrades gracefully with a non-blocking message
 * rather than crashing Billing.
 */
export default function BatchPickerModal({ visible, onClose, product, branchId, onSelect }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!visible || !product) return;
    setLoading(true);
    setLoadFailed(false);
    fetchBatches({ branchId, productId: product.id })
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });
        setBatches(sorted);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [visible, product, branchId]);

  if (!product) return null;

  return (
    <Modal visible={visible} onClose={onClose} title={`Select Batch - ${product.name}`} width={480}>
      {loading ? (
        <LoadingState label="Loading batches..." />
      ) : loadFailed ? (
        <View style={styles.fallbackBox}>
          <Text style={styles.fallbackText}>Batch details are unavailable right now.</Text>
          <Button title="Add Without Batch" size="sm" onPress={() => onSelect(null)} style={{ marginTop: SPACING.sm }} />
        </View>
      ) : batches.length === 0 ? (
        <View style={styles.fallbackBox}>
          <EmptyState icon="cube-outline" title="No batches available" message="This product has no batch stock at this branch." />
          <Button title="Add Without Batch" size="sm" onPress={() => onSelect(null)} style={{ marginTop: SPACING.sm }} />
        </View>
      ) : (
        <View>
          {batches.map((b) => {
            const disabled = UNSELECTABLE.includes(b.status) || b.available <= 0;
            return (
              <Pressable key={b.id} style={[styles.row, disabled && styles.rowDisabled]} onPress={() => !disabled && onSelect(b)} disabled={disabled}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchNumber}>
                    Batch {b.batchNumber} {b.isSynthetic ? <Text style={styles.demoTag}>(Demo Batch)</Text> : null}
                  </Text>
                  <Text style={styles.meta}>Expiry: {b.expiryDate ? formatDate(b.expiryDate) : '-'}  ·  Available: {b.available}</Text>
                  <Text style={styles.meta}>Selling {formatCurrency(b.sellingPrice)}  ·  MRP {formatCurrency(b.mrp)}</Text>
                </View>
                <StatusBadge status={b.status} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowDisabled: { opacity: 0.4 },
  batchNumber: { ...TYPOGRAPHY.bodyStrong },
  demoTag: { color: COLORS.info, fontSize: 11 },
  meta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  fallbackBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md },
  fallbackText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});
