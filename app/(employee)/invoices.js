import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import Modal from '../../src/components/ui/Modal';
import EmptyState from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { fetchInvoices, fetchInvoiceDetail } from '../../src/services/api/billingApi';
import { getInvoiceMeta, saveInvoiceMeta } from '../../src/services/api/printTypeStore';
import { getBranchById } from '../../src/constants/branches';
import { reprintInvoice, DEFAULT_PRINT_FORMAT } from '../../src/services/print/printService';
import { formatCurrency, formatDateTime } from '../../src/utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

export default function InvoiceHistoryScreen() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);

  const load = useCallback(async () => {
    const rows = await fetchInvoices(user.branchId);
    const withMeta = await Promise.all(
      rows.map(async (row) => {
        const meta = await getInvoiceMeta(row.localId);
        return { ...row, customerName: meta?.customerName || 'Walk-in Customer', customerMobile: meta?.customerMobile || '-' };
      })
    );
    setInvoices(withMeta);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = invoices.filter((inv) => !query || inv.invoiceNumber.toLowerCase().includes(query.toLowerCase()));

  const handleViewDetail = async (invoiceRow) => {
    try {
      const [detail, meta] = await Promise.all([
        fetchInvoiceDetail(invoiceRow.localId),
        getInvoiceMeta(invoiceRow.localId),
      ]);
      setDetailTarget({ invoice: detail.invoice, items: detail.items, meta });
    } catch (err) {
      notifyError('Unable to load invoice details');
    }
  };

  const handleReprintPress = async (invoiceRow) => {
    try {
      const [detail, meta] = await Promise.all([
        fetchInvoiceDetail(invoiceRow.localId),
        getInvoiceMeta(invoiceRow.localId),
      ]);
      const branch = getBranchById(user.branchId);
      const customer = { name: meta?.customerName || 'Walk-in Customer', mobile: meta?.customerMobile || '-' };
      // Reprint always uses the BILL/receipt format - any previously saved
      // printType is ignored, matching the live billing flow.
      await reprintInvoice({ invoice: detail.invoice, branch, customer, items: detail.items, payments: detail.payments }, DEFAULT_PRINT_FORMAT);
      await saveInvoiceMeta(invoiceRow.localId, { printType: DEFAULT_PRINT_FORMAT }).catch(() => {});
      success('Reprint sent');
    } catch (err) {
      notifyError('Unable to reprint invoice');
    }
  };

  const columns = [
    { key: 'invoiceNumber', title: 'Invoice No', flex: 1.1 },
    {
      key: 'customer',
      title: 'Customer',
      flex: 1.2,
      render: (row) => (
        <View>
          <Text numberOfLines={1} style={{ fontWeight: '700' }}>{row.customerName}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.textSecondary }}>{row.customerMobile}</Text>
        </View>
      ),
    },
    { key: 'createdAt', title: 'Date', render: (row) => <Text>{formatDateTime(row.createdAt)}</Text> },
    { key: 'grandTotal', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.grandTotal)}</Text> },
    { key: 'paymentStatus', title: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} /> },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => (
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <Pressable onPress={() => handleViewDetail(row)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 }}>View</Text>
          </Pressable>
          <Pressable onPress={() => handleReprintPress(row)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="print-outline" size={16} color={COLORS.brandRed} />
            <Text style={{ color: COLORS.brandRed, fontWeight: '700', fontSize: 12 }}>Reprint</Text>
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScreenContainer>
      <SectionHeader title="Invoice History" subtitle={`${invoices.length} invoices for ${user.branchName}`} />
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search invoice number" style={{ marginBottom: SPACING.md }} />
      <DataTable columns={columns} data={filtered} keyExtractor={(item) => item.localId} />

      <Modal visible={Boolean(detailTarget)} onClose={() => setDetailTarget(null)} title={detailTarget?.invoice?.invoiceNumber || 'Invoice Detail'} width={520}>
        {detailTarget ? (
          <View>
            <Text style={styles.detailLine}>Customer: {detailTarget.meta?.customerName || 'Walk-in Customer'} ({detailTarget.meta?.customerCode || 'no master link'})</Text>
            {detailTarget.meta?.customerGst ? <Text style={styles.detailLine}>GST: {detailTarget.meta.customerGst}</Text> : null}
            <Text style={styles.detailLine}>Total: {formatCurrency(detailTarget.invoice.grandTotal)}  ·  {detailTarget.invoice.paymentStatus}</Text>
            {detailTarget.meta?.itemDiscountTotal > 0 || detailTarget.meta?.invoiceDiscount > 0 ? (
              <Text style={styles.detailLine}>
                Discounts applied: item {formatCurrency(detailTarget.meta?.itemDiscountTotal || 0)} + invoice {formatCurrency(detailTarget.meta?.invoiceDiscount || 0)}
              </Text>
            ) : null}
            <Text style={styles.sectionTitle}>Items</Text>
            {detailTarget.items.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No items" />
            ) : (
              detailTarget.items.map((item) => {
                const metaItem = detailTarget.meta?.items?.find((m) => m.productId === item.productId);
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name} {metaItem?.batchNumber ? `(Batch ${metaItem.batchNumber})` : ''}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} x {formatCurrency(item.sellingPrice)} = {formatCurrency(item.lineTotal)}
                      {metaItem?.discountAmount > 0 ? `  (item discount ${formatCurrency(metaItem.discountAmount)})` : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </Modal>
    </ScreenContainer>
  );
}

const styles = {
  detailLine: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 2 },
  sectionTitle: { ...TYPOGRAPHY.bodyStrong, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  itemRow: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemName: { ...TYPOGRAPHY.bodyStrong, fontSize: 13 },
  itemMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
};
