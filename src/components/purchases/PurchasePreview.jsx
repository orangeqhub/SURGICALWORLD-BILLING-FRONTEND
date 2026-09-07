import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useNotification } from '../../hooks/useNotification';
import { previewPurchaseDocument, exportPurchasePdf } from '../../services/print/purchaseDocumentService';
import { getBranchById } from '../../constants/branches';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

/**
 * Professional purchase document preview (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part G). Purely a viewer -
 * printing/PDF export goes through purchaseDocumentService.js, never
 * printService.js or Bluetooth thermal printing.
 */
export default function PurchasePreview({ visible, onClose, purchase, supplier, totals }) {
  const { error: notifyError } = useNotification();
  const [busy, setBusy] = useState(false);
  const isDemo = !purchase || purchase.source === 'FRONTEND_DEMO' || !purchase.source;
  const branch = purchase ? getBranchById(purchase.branchId) : null;

  const handlePrint = async () => {
    setBusy(true);
    try {
      await previewPurchaseDocument({ purchase, branch, supplier, totals });
    } catch (e) {
      notifyError('Unable to open print preview');
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async () => {
    setBusy(true);
    try {
      await exportPurchasePdf({ purchase, branch, supplier, totals });
    } catch (e) {
      notifyError('Unable to export PDF');
    } finally {
      setBusy(false);
    }
  };

  if (!purchase) return null;

  return (
    <Modal visible={visible} onClose={onClose} title="Purchase Preview" width={640}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.purchaseNumber}>{purchase.purchaseNumber}</Text>
          <Text style={styles.meta}>{formatDate(purchase.purchaseDate)} - {branch?.name}</Text>
        </View>
        <Badge label={isDemo ? 'Frontend Demo - Not Posted to Inventory' : 'Real Purchase'} tone={isDemo ? 'warning' : 'success'} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supplier</Text>
        <Text style={styles.line}>{supplier?.name} ({supplier?.supplierCode})</Text>
        <Text style={styles.line}>{supplier?.address}</Text>
        <Text style={styles.line}>GSTIN: {supplier?.gst || '-'}</Text>
        <Text style={styles.line}>Supplier Invoice: {purchase.supplierInvoiceNumber || '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items ({totals.lines?.length || 0})</Text>
        {(totals.lines || []).map((l) => (
          <View key={l.lineId} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{l.productName} {l.batchNumber ? `(${l.batchNumber})` : ''}</Text>
            <Text style={styles.itemMeta}>{l.quantity} x {formatCurrency(l.purchasePrice)} = {formatCurrency(l.lineTotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Totals</Text>
        <Text style={styles.line}>Taxable: {formatCurrency(totals.taxableAmount)}  ·  GST: {formatCurrency(totals.cgst + totals.sgst + totals.igst)}</Text>
        <Text style={styles.netLine}>Net Amount: {formatCurrency(totals.netAmount)}</Text>
        <Text style={styles.line}>Paid: {formatCurrency(purchase.paidAmount)}  ·  Balance: {formatCurrency(purchase.balanceAmount)}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Button title="Print Preview" variant="secondary" outline onPress={handlePrint} loading={busy} style={{ flex: 1 }} />
        <Button title="Export PDF" onPress={handlePdf} loading={busy} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md, flexWrap: 'wrap', gap: SPACING.sm },
  purchaseNumber: { ...TYPOGRAPHY.h3 },
  meta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  section: { marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { ...TYPOGRAPHY.bodyStrong, marginBottom: SPACING.xs },
  line: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  netLine: { ...TYPOGRAPHY.h4, color: COLORS.brandRed, marginVertical: 4 },
  itemRow: { paddingVertical: 4 },
  itemName: { ...TYPOGRAPHY.bodyStrong, fontSize: 13 },
  itemMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
});
