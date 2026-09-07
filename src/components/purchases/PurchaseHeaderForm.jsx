import React from 'react';
import { View, Text } from 'react-native';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { BRANCHES } from '../../constants/branches';
import { PAYMENT_TERMS_OPTIONS } from '../../constants/inventorySettings';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const TAX_TYPES = [
  { label: 'Intra-State (CGST + SGST)', value: 'INTRA' },
  { label: 'Inter-State (IGST)', value: 'INTER' },
];

const PURCHASE_TYPES = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Credit', value: 'CREDIT' },
];

/**
 * Header section of the frontend Purchase Editor (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part B). Purely
 * presentational - all state/validation lives in PurchaseEditor.
 */
export default function PurchaseHeaderForm({ header, onChange, suppliers, errors = {}, branchLocked }) {
  const set = (patch) => onChange({ ...header, ...patch });
  const supplier = suppliers.find((s) => s.id === header.supplierId);

  const handleSupplierChange = (supplierId) => {
    const s = suppliers.find((x) => x.id === supplierId);
    set({
      supplierId,
      supplierCode: s?.supplierCode || '',
      supplierGst: s?.gst || '',
      supplierAddress: s?.address || '',
      paymentTerms: s?.paymentTerms || header.paymentTerms,
      creditPeriod: s?.creditPeriod ?? header.creditPeriod,
    });
  };

  const handleCreditPeriodChange = (v) => {
    const days = Number(v) || 0;
    const base = header.purchaseDate ? new Date(header.purchaseDate) : new Date();
    const due = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    set({ creditPeriod: v, dueDate: due.toISOString().slice(0, 10) });
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Purchase Header</Text>
      <View style={styles.row}>
        <Input label="Purchase Number" value={header.purchaseNumber} onChangeText={(v) => set({ purchaseNumber: v })} editable={false} style={{ flex: 1 }} />
        <Input label="Purchase Date *" value={header.purchaseDate} onChangeText={(v) => set({ purchaseDate: v })} placeholder="YYYY-MM-DD" error={errors.purchaseDate} style={{ flex: 1 }} />
      </View>
      <View style={styles.row}>
        {branchLocked ? (
          <Input label="Branch *" value={BRANCHES.find((b) => b.id === header.branchId)?.name || ''} editable={false} style={{ flex: 1 }} />
        ) : (
          <Select
            label="Branch *"
            value={header.branchId}
            onChange={(v) => set({ branchId: v })}
            options={BRANCHES.map((b) => ({ label: b.name, value: b.id }))}
            placeholder="Select branch"
            style={{ flex: 1 }}
          />
        )}
        <Select
          label="Supplier *"
          value={header.supplierId}
          onChange={handleSupplierChange}
          options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
          placeholder="Select supplier"
          style={{ flex: 1 }}
        />
      </View>
      {errors.branchId ? <Text style={styles.fieldError}>{errors.branchId}</Text> : null}
      {errors.supplierId ? <Text style={styles.fieldError}>{errors.supplierId}</Text> : null}

      {supplier ? (
        <View style={styles.supplierInfoBox}>
          <Text style={styles.supplierInfoText}>Code: {supplier.supplierCode}  ·  GST: {supplier.gst || '-'}</Text>
          <Text style={styles.supplierInfoText}>{supplier.address || 'No address on file'}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Input label="Supplier Invoice Number *" value={header.supplierInvoiceNumber} onChangeText={(v) => set({ supplierInvoiceNumber: v })} error={errors.supplierInvoiceNumber} style={{ flex: 1 }} />
        <Input label="Supplier Invoice Date" value={header.supplierInvoiceDate} onChangeText={(v) => set({ supplierInvoiceDate: v })} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
      </View>
      <View style={styles.row}>
        <Select label="Purchase Type" value={header.purchaseType} onChange={(v) => set({ purchaseType: v })} options={PURCHASE_TYPES} style={{ flex: 1 }} />
        <Select label="Payment Terms" value={header.paymentTerms} onChange={(v) => set({ paymentTerms: v })} options={PAYMENT_TERMS_OPTIONS} style={{ flex: 1 }} />
      </View>
      <View style={styles.row}>
        <Input label="Credit Period (days)" value={String(header.creditPeriod ?? '')} onChangeText={handleCreditPeriodChange} keyboardType="number-pad" style={{ flex: 1 }} />
        <Input label="Due Date" value={header.dueDate} onChangeText={(v) => set({ dueDate: v })} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
      </View>
      <View style={styles.row}>
        <Select label="Tax Type" value={header.taxType} onChange={(v) => set({ taxType: v })} options={TAX_TYPES} style={{ flex: 1 }} />
        <Input label="Reference Number" value={header.referenceNumber} onChangeText={(v) => set({ referenceNumber: v })} style={{ flex: 1 }} />
      </View>
      <Input label="Remarks" value={header.remarks} onChangeText={(v) => set({ remarks: v })} />
    </View>
  );
}

const styles = {
  sectionTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  supplierInfoBox: { backgroundColor: COLORS.background, borderRadius: 8, padding: SPACING.sm, marginBottom: SPACING.sm },
  supplierInfoText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
};
