import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import Select from '../../src/components/ui/Select';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import MetricCard from '../../src/components/ui/MetricCard';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchInvoices } from '../../src/services/api/billingApi';
import { EMPLOYEES } from '../../src/constants/employees';
import { formatCurrency, formatDateTime } from '../../src/utils/formatters';
import { SPACING } from '../../src/theme';

export default function BillingSupervisionScreen() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const branchEmployees = EMPLOYEES.filter((e) => e.branchId === user.branchId);

  useEffect(() => {
    fetchInvoices(user.branchId).then(setInvoices);
  }, [user.branchId]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesEmployee = employeeFilter === 'ALL' || inv.employeeId === employeeFilter;
      const matchesQuery = !query || inv.invoiceNumber.toLowerCase().includes(query.toLowerCase());
      return matchesEmployee && matchesQuery;
    });
  }, [invoices, employeeFilter, query]);

  const totalSales = filtered.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const heldCount = invoices.filter((i) => i.isHeld).length;

  const columns = [
    { key: 'invoiceNumber', title: 'Invoice No', flex: 1.2 },
    { key: 'employeeId', title: 'Cashier', render: (row) => <Text>{EMPLOYEES.find((e) => e.id === row.employeeId)?.name || row.employeeId}</Text> },
    { key: 'createdAt', title: 'Date', render: (row) => <Text>{formatDateTime(row.createdAt)}</Text> },
    { key: 'grandTotal', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.grandTotal)}</Text> },
    { key: 'paymentStatus', title: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} /> },
  ];

  return (
    <ScreenContainer>
      <SectionHeader title="Billing Supervision" subtitle={`Live view of all billing activity - ${user.branchName}`} />

      <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' }}>
        <MetricCard label="Filtered Sales" value={formatCurrency(totalSales)} icon="cash-outline" tone="success" />
        <MetricCard label="Filtered Bills" value={filtered.length} icon="receipt-outline" />
        <MetricCard label="Held Bills" value={heldCount} icon="pause-circle-outline" tone="warning" />
      </View>

      <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md, flexWrap: 'wrap' }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search invoice number" style={{ flex: 1, minWidth: 240 }} />
        <Select
          value={employeeFilter}
          onChange={setEmployeeFilter}
          options={[{ label: 'All Cashiers', value: 'ALL' }, ...branchEmployees.map((e) => ({ label: e.name, value: e.id }))]}
          style={{ minWidth: 220, marginBottom: 0 }}
        />
      </View>

      <DataTable columns={columns} data={filtered} keyExtractor={(item) => item.localId} />
    </ScreenContainer>
  );
}
