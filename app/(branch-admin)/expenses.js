import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import MetricCard from '../../src/components/ui/MetricCard';
import Button from '../../src/components/ui/Button';
import Modal from '../../src/components/ui/Modal';
import Select from '../../src/components/ui/Select';
import Input from '../../src/components/ui/Input';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { fetchExpenses, recordExpense } from '../../src/services/api/expenseApi';
import { EXPENSE_CATEGORIES } from '../../src/constants/suppliers';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { SPACING } from '../../src/theme';

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useRegisterPrimaryAction(() => setModalVisible(true));

  const load = useCallback(async () => {
    const rows = await fetchExpenses(user.branchId);
    setExpenses(rows);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = async () => {
    if (!category || !amount) {
      notifyError('Please select a category and enter an amount');
      return;
    }
    await recordExpense({
      branchId: user.branchId,
      category,
      amount: Number(amount),
      note,
      spentAt: new Date().toISOString(),
    });
    setModalVisible(false);
    setCategory('');
    setAmount('');
    setNote('');
    success('Expense recorded');
    load();
  };

  const columns = [
    { key: 'category', title: 'Category', flex: 1.2 },
    { key: 'amount', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.amount)}</Text> },
    { key: 'note', title: 'Note', flex: 1.6, render: (row) => <Text numberOfLines={1}>{row.note}</Text> },
    { key: 'spentAt', title: 'Date', render: (row) => <Text>{formatDate(row.spentAt)}</Text> },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Expenses"
        subtitle={`${expenses.length} expense entries at ${user.branchName}`}
        action={<Button title="Add Expense" size="sm" onPress={() => setModalVisible(true)} />}
      />

      <View style={{ marginBottom: SPACING.lg, maxWidth: 220 }}>
        <MetricCard label="Total Expenses" value={formatCurrency(total)} icon="wallet-outline" tone="danger" />
      </View>

      <DataTable columns={columns} data={expenses} keyExtractor={(item) => item.localId} />

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Add Expense" width={420}>
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }))}
          placeholder="Select category"
        />
        <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 1500" />
        <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional note" />
        <Button title="Save Expense" onPress={handleAdd} />
      </Modal>
    </ScreenContainer>
  );
}
