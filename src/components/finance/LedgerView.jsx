import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import MetricCard from '../ui/MetricCard';
import DataTable from '../ui/DataTable';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { listCustomersWithProfile } from '../../services/api/customerMasterApi';
import { listSuppliersWithProfile } from '../../services/api/supplierMasterApi';
import { fetchLedgerEntries } from '../../services/api/ledgerApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { SPACING } from '../../theme';

/**
 * Shared running-balance ledger view for Customer Ledger / Supplier Ledger
 * (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 4). Reads
 * ledgerApi.fetchLedgerEntries (Phase 0 mock adapter) only - purely
 * read-only, never writes.
 */
export default function LedgerView({ partyType, branchId }) {
  const isCustomer = partyType === 'CUSTOMER';
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [entries, setEntries] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (isCustomer ? listCustomersWithProfile(branchId) : listSuppliersWithProfile(branchId)).then((rows) => {
      setParties(rows);
      setLoading(false);
    });
  }, [branchId, isCustomer]);

  const loadEntries = useCallback(async () => {
    if (!partyId) {
      setEntries([]);
      return;
    }
    const rows = await fetchLedgerEntries({ branchId, partyType, partyId });
    setEntries(rows);
  }, [branchId, partyType, partyId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = entries
    .filter((e) => !dateFrom || new Date(e.date) >= new Date(dateFrom))
    .filter((e) => !dateTo || new Date(e.date) <= new Date(`${dateTo}T23:59:59`))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const rowsWithBalance = useMemo(() => {
    let balance = 0;
    return filteredEntries.map((e) => {
      balance += e.type === 'DEBIT' ? e.amount : -e.amount;
      return { ...e, runningBalance: balance };
    });
  }, [filteredEntries]);

  const closingBalance = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].runningBalance : 0;
  const totalDebit = filteredEntries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
  const totalCredit = filteredEntries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);

  const columns = [
    { key: 'date', title: 'Date', render: (row) => <Text>{formatDate(row.date)}</Text> },
    { key: 'referenceType', title: 'Type' },
    { key: 'note', title: 'Description', flex: 1.4 },
    { key: 'debit', title: 'Debit', render: (row) => <Text>{row.type === 'DEBIT' ? formatCurrency(row.amount) : '-'}</Text> },
    { key: 'credit', title: 'Credit', render: (row) => <Text>{row.type === 'CREDIT' ? formatCurrency(row.amount) : '-'}</Text> },
    { key: 'runningBalance', title: 'Running Balance', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.runningBalance)}</Text> },
  ];

  return (
    <View>
      <SectionHeader title={isCustomer ? 'Customer Ledger' : 'Supplier Ledger'} subtitle="Running balance from ledger entries" />
      <View style={styles.filterRow}>
        <Select
          value={partyId}
          onChange={setPartyId}
          options={parties.map((p) => ({ label: p.name, value: p.id }))}
          placeholder={`Select ${isCustomer ? 'customer' : 'supplier'}`}
          style={{ flex: 1, minWidth: 220, marginBottom: 0 }}
        />
        <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From (YYYY-MM-DD)" style={{ minWidth: 160, marginBottom: 0 }} />
        <Input value={dateTo} onChangeText={setDateTo} placeholder="To (YYYY-MM-DD)" style={{ minWidth: 160, marginBottom: 0 }} />
      </View>

      {loading ? (
        <LoadingState label="Loading..." />
      ) : !partyId ? (
        <EmptyState icon="book-outline" title={`Select a ${isCustomer ? 'customer' : 'supplier'} to view their ledger`} />
      ) : (
        <View>
          <View style={styles.metricsRow}>
            <MetricCard label="Total Debit" value={formatCurrency(totalDebit)} icon="arrow-up-circle-outline" tone="danger" />
            <MetricCard label="Total Credit" value={formatCurrency(totalCredit)} icon="arrow-down-circle-outline" tone="success" />
            <MetricCard label="Closing Balance" value={formatCurrency(closingBalance)} icon="wallet-outline" tone="purple" />
          </View>
          {rowsWithBalance.length === 0 ? (
            <EmptyState icon="book-outline" title="No ledger entries in this range" />
          ) : (
            <DataTable columns={columns} data={rowsWithBalance} keyExtractor={(item) => item.id} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
});
