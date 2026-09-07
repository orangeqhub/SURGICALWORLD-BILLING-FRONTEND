import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import ReportExportBar from '../../src/components/reports/ReportExportBar';
import LoadingState from '../../src/components/ui/LoadingState';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchPayments } from '../../src/services/api/paymentApi';
import { fetchReceipts } from '../../src/services/api/receiptApi';
import { fetchLedgerEntries } from '../../src/services/api/ledgerApi';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { SPACING, TYPOGRAPHY } from '../../src/theme';

/**
 * All figures here are frontend/mock (Phase 0 ledgerApi/paymentApi/receiptApi)
 * - explicitly not posted/real accounting. See docs/FRONTEND_HANDOVER.md.
 */
export default function EmployeeFinancialReportsScreen() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPayments(user.branchId),
      fetchReceipts(user.branchId),
      fetchLedgerEntries({ branchId: user.branchId }),
    ]).then(([p, r, l]) => {
      setPayments(p);
      setReceipts(r);
      setLedgerEntries(l);
      setLoading(false);
    });
  }, [user.branchId]);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalReceived = receipts.reduce((s, r) => s + r.amount, 0);
  const totalDebit = ledgerEntries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
  const totalCredit = ledgerEntries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);

  const ledgerColumns = [
    { key: 'date', title: 'Date', render: (row) => <Text>{formatDate(row.date)}</Text> },
    { key: 'partyName', title: 'Party' },
    { key: 'partyType', title: 'Type', render: (row) => <Badge label={row.partyType} tone="info" /> },
    { key: 'referenceType', title: 'Reference' },
    { key: 'amount', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700', color: row.type === 'DEBIT' ? '#ED1C2E' : '#0F9D58' }}>{row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}</Text> },
  ];

  if (loading) {
    return (
      <ScreenContainer>
        <SectionHeader title="Financial Reports" subtitle="Accountant workspace" />
        <LoadingState label="Loading financial reports..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader title="Financial Reports" subtitle={`${user.branchName} - frontend demo data, not posted accounting`} />

      <View style={styles.metricsRow}>
        <MetricCard label="Total Payments Made" value={formatCurrency(totalPaid)} icon="card-outline" tone="danger" />
        <MetricCard label="Total Receipts Collected" value={formatCurrency(totalReceived)} icon="document-text-outline" tone="success" />
        <MetricCard label="Ledger Debits" value={formatCurrency(totalDebit)} icon="arrow-up-circle-outline" tone="warning" />
        <MetricCard label="Ledger Credits" value={formatCurrency(totalCredit)} icon="arrow-down-circle-outline" tone="brandBlue" />
      </View>

      <Text style={styles.sectionLabel}>Ledger Activity</Text>
      <ReportExportBar
        title="Ledger Activity"
        branchName={user.branchName}
        columns={[
          { key: 'date', title: 'Date' },
          { key: 'partyName', title: 'Party' },
          { key: 'partyType', title: 'Type' },
          { key: 'referenceType', title: 'Reference' },
          { key: 'amount', title: 'Amount', numeric: true },
        ]}
        rows={ledgerEntries}
        fileName="ledger_activity"
      />
      <DataTable columns={ledgerColumns} data={ledgerEntries} keyExtractor={(item) => item.id} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  sectionLabel: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm, marginTop: SPACING.md },
});
