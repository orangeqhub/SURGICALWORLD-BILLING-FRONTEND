import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
import Tabs from '../ui/Tabs';
import DataTable from '../ui/DataTable';
import MetricCard from '../ui/MetricCard';
import LoadingState from '../ui/LoadingState';
import { listCustomersWithProfile } from '../../services/api/customerMasterApi';
import { listSuppliersWithProfile } from '../../services/api/supplierMasterApi';
import { fetchLedgerEntries } from '../../services/api/ledgerApi';
import { formatCurrency } from '../../utils/formatters';
import { SPACING } from '../../theme';

const BUCKETS = ['Current', '1-30 days', '31-60 days', '61-90 days', 'Above 90 days'];

function bucketFor(ageDays) {
  if (ageDays <= 0) return 'Current';
  if (ageDays <= 30) return '1-30 days';
  if (ageDays <= 60) return '31-60 days';
  if (ageDays <= 90) return '61-90 days';
  return 'Above 90 days';
}

/**
 * Ageing summary for outstanding DEBIT ledger entries (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 4). Each unsettled DEBIT
 * entry (invoice/purchase) is bucketed by its own age - a simplification
 * documented as a known limitation rather than full FIFO settlement
 * matching against later CREDIT entries.
 */
export default function ReceivablesPayablesView({ branchId }) {
  const [tab, setTab] = useState('RECEIVABLES');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const partyType = tab === 'RECEIVABLES' ? 'CUSTOMER' : 'SUPPLIER';
    setLoading(true);
    (async () => {
      const parties = await (partyType === 'CUSTOMER' ? listCustomersWithProfile(branchId) : listSuppliersWithProfile(branchId));
      const results = [];
      for (const party of parties) {
        const entries = await fetchLedgerEntries({ branchId, partyType, partyId: party.id });
        const credits = entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
        let remainingCredit = credits;
        entries
          .filter((e) => e.type === 'DEBIT')
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .forEach((debit) => {
            const settled = Math.min(remainingCredit, debit.amount);
            remainingCredit -= settled;
            const outstanding = debit.amount - settled;
            if (outstanding > 0) {
              const ageDays = Math.floor((Date.now() - new Date(debit.date).getTime()) / (24 * 60 * 60 * 1000));
              results.push({ id: debit.id, partyName: party.name, amount: outstanding, bucket: bucketFor(ageDays), ageDays });
            }
          });
      }
      setRows(results);
      setLoading(false);
    })();
  }, [tab, branchId]);

  const bucketTotals = useMemo(() => {
    const totals = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
    rows.forEach((r) => {
      totals[r.bucket] += r.amount;
    });
    return totals;
  }, [rows]);

  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

  const columns = [
    { key: 'partyName', title: tab === 'RECEIVABLES' ? 'Customer' : 'Supplier', flex: 1.4 },
    { key: 'amount', title: 'Outstanding', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.amount)}</Text> },
    { key: 'ageDays', title: 'Age (days)' },
    { key: 'bucket', title: 'Bucket' },
  ];

  return (
    <View>
      <SectionHeader title="Receivables & Payables" subtitle="Ageing summary of outstanding ledger balances" />
      <Tabs tabs={[{ key: 'RECEIVABLES', label: 'Receivables' }, { key: 'PAYABLES', label: 'Payables' }]} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingState label="Loading..." />
      ) : (
        <View>
          <View style={styles.metricsRow}>
            {BUCKETS.map((b) => (
              <MetricCard key={b} label={b} value={formatCurrency(bucketTotals[b])} icon="hourglass-outline" tone={b === 'Above 90 days' ? 'danger' : b === 'Current' ? 'success' : 'warning'} />
            ))}
            <MetricCard label="Total Outstanding" value={formatCurrency(grandTotal)} icon="wallet-outline" tone="purple" />
          </View>
          <DataTable columns={columns} data={rows} keyExtractor={(item) => item.id} emptyLabel="No outstanding balances" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
});
