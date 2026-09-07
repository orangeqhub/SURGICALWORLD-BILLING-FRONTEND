import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import Card from '../../src/components/ui/Card';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchInvoices } from '../../src/services/api/billingApi';
import { formatCurrency, formatDateTime } from '../../src/utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

export default function ShiftScreen() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices(user.branchId).then(setInvoices);
  }, [user.branchId]);

  const todaysInvoices = useMemo(() => {
    const today = new Date().toDateString();
    return invoices.filter((inv) => inv.employeeId === user.id && new Date(inv.createdAt).toDateString() === today);
  }, [invoices, user.id]);

  const totalSales = todaysInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const billCount = todaysInvoices.length;
  const avgBill = billCount > 0 ? totalSales / billCount : 0;

  return (
    <ScreenContainer>
      <SectionHeader title="My Shift" subtitle={`${user.name} - ${user.branchName}`} />

      <View style={styles.metricsRow}>
        <MetricCard label="Bills Today" value={billCount} icon="receipt-outline" />
        <MetricCard label="Total Sales" value={formatCurrency(totalSales)} icon="cash-outline" tone="success" />
        <MetricCard label="Average Bill" value={formatCurrency(avgBill)} icon="bar-chart-outline" tone="brandBlue" />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Shift Details</Text>
        <Row label="Employee ID" value={user.id} />
        <Row label="Role" value={user.roleLabel} />
        <Row label="Branch" value={user.branchName} />
        <Row label="Shift Started" value={formatDateTime(new Date())} />
      </Card>
    </ScreenContainer>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowLabel: { ...TYPOGRAPHY.caption },
  rowValue: { ...TYPOGRAPHY.bodyStrong },
});
