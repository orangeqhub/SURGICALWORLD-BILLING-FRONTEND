import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const LOGO = require('../../../assets/logo.png');

export default function InvoicePreview({ invoice, branch, customer, items = [] }) {
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{branch?.name} - Surgical World</Text>
          <Text style={styles.branchMeta}>{branch?.address}</Text>
          <Text style={styles.branchMeta}>Phone: {branch?.phone} - GSTIN: {branch?.gst}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View>
          <Text style={styles.label}>Invoice No</Text>
          <Text style={styles.value}>{invoice?.invoiceNumber}</Text>
        </View>
        <View>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDateTime(invoice?.createdAt)}</Text>
        </View>
        <View>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{customer?.name || 'Walk-in Customer'}</Text>
        </View>
        <View>
          <Text style={styles.label}>Contact</Text>
          <Text style={styles.value}>{customer?.mobile || '-'}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Item</Text>
          <Text style={styles.th}>Qty</Text>
          <Text style={styles.th}>Rate</Text>
          <Text style={styles.th}>Amount</Text>
        </View>
        {items.map((item) => (
          <View key={item.productId} style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]}>{item.name}</Text>
            <Text style={styles.td}>{item.quantity}</Text>
            <Text style={styles.td}>{formatCurrency(item.sellingPrice)}</Text>
            <Text style={styles.td}>{formatCurrency(item.quantity * item.sellingPrice)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalsBox}>
        <Row label="Subtotal" value={formatCurrency(invoice?.subtotal)} />
        <Row label="Discount" value={`- ${formatCurrency(invoice?.discount)}`} />
        <Row label="GST" value={formatCurrency(invoice?.gst)} />
        <Row label="Grand Total" value={formatCurrency(invoice?.grandTotal)} bold />
      </View>

      <Text style={styles.footer}>Thank you for choosing Surgical World - One Stop for all your Surgical & Medical Equipments</Text>
    </View>
  );
}

function Row({ label, value, bold }) {
  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.label, bold && styles.boldLabel]}>{label}</Text>
      <Text style={[styles.value, bold && styles.boldValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, borderBottomWidth: 2, borderBottomColor: COLORS.brandRed, paddingBottom: SPACING.sm },
  logo: { width: 56, height: 56 },
  branchName: { ...TYPOGRAPHY.h4 },
  branchMeta: { ...TYPOGRAPHY.small },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.small, textTransform: 'uppercase' },
  value: { ...TYPOGRAPHY.bodyStrong },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: SPACING.md },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.background, padding: SPACING.xs },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  td: { flex: 1, fontSize: 12, color: COLORS.textPrimary },
  totalsBox: { alignSelf: 'flex-end', width: 220, marginBottom: SPACING.md },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  boldLabel: { fontWeight: '800', color: COLORS.textPrimary },
  boldValue: { fontWeight: '800', color: COLORS.brandRed, fontSize: 16 },
  footer: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
