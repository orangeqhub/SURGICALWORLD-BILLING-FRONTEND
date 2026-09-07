import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import QuickCustomerModal from '../../src/components/billing/QuickCustomerModal';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { fetchCustomers, addCustomer, findCustomers } from '../../src/services/api/customerApi';
import { SPACING } from '../../src/theme';

export default function CustomersScreen() {
  const { user } = useAuth();
  const { success } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    const rows = await fetchCustomers(user.branchId);
    setCustomers(rows);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!query) {
      load();
      return;
    }
    const timer = setTimeout(async () => {
      const rows = await findCustomers(query);
      setCustomers(rows);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, load]);

  const handleAdd = async (input) => {
    await addCustomer({ ...input, branchId: user.branchId });
    setModalVisible(false);
    success('Customer added');
    load();
  };

  const columns = [
    { key: 'name', title: 'Name', flex: 1.4 },
    { key: 'mobile', title: 'Mobile' },
    { key: 'type', title: 'Type', render: (row) => <Badge label={row.type?.replace('_', ' ')} tone="info" /> },
    { key: 'doctor', title: 'Doctor' },
    { key: 'address', title: 'Address', flex: 1.6, render: (row) => <Text numberOfLines={1}>{row.address}</Text> },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        action={<Button title="Add Customer" size="sm" onPress={() => setModalVisible(true)} />}
      />
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search by name or mobile" style={{ marginBottom: SPACING.md }} />
      <DataTable columns={columns} data={customers} keyExtractor={(item) => item.id} />

      <QuickCustomerModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleAdd} />
    </ScreenContainer>
  );
}
