import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import Button from '../../src/components/ui/Button';
import Modal from '../../src/components/ui/Modal';
import Select from '../../src/components/ui/Select';
import Input from '../../src/components/ui/Input';
import Tabs from '../../src/components/ui/Tabs';
import TransferManager from '../../src/components/transfers/TransferManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { requestStockTransfer, fetchStockTransfers } from '../../src/services/api/transferApi';
import { fetchProducts } from '../../src/services/api/productApi';
import { BRANCHES } from '../../src/constants/branches';
import { formatDateTime } from '../../src/utils/formatters';

const TABS = [
  { key: 'advanced', label: 'Transfer Editor (Full)' },
  { key: 'quick', label: 'Quick Request (Real)' },
];

export default function StockTransfersScreen() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [tab, setTab] = useState('advanced');
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [toBranchId, setToBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  useRegisterPrimaryAction(tab === 'quick' ? () => setModalVisible(true) : null, [tab]);

  const load = useCallback(async () => {
    const [rows, prods] = await Promise.all([fetchStockTransfers(user.branchId), fetchProducts()]);
    setTransfers(rows);
    setProducts(prods);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequest = async () => {
    if (!toBranchId || !productId || !quantity) {
      notifyError('Please fill in all transfer fields');
      return;
    }
    await requestStockTransfer({
      fromBranchId: user.branchId,
      toBranchId,
      requestedBy: user.id,
      items: [{ productId, quantity: Number(quantity) }],
    });
    setModalVisible(false);
    setToBranchId('');
    setProductId('');
    setQuantity('');
    success('Stock transfer request sent');
    load();
  };

  const columns = [
    { key: 'fromBranchId', title: 'From', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.fromBranchId)?.name}</Text> },
    { key: 'toBranchId', title: 'To', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.toBranchId)?.name}</Text> },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', title: 'Requested', render: (row) => <Text>{formatDateTime(row.createdAt)}</Text> },
  ];

  return (
    <ScreenContainer>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'advanced' ? (
        <TransferManager user={user} branchId={user.branchId} />
      ) : (
        <>
          <SectionHeader
            title="Quick Stock Transfer Request (Real)"
            subtitle={`${transfers.length} transfer requests involving ${user.branchName}`}
            action={<Button title="Request Transfer" size="sm" onPress={() => setModalVisible(true)} />}
          />
          <DataTable columns={columns} data={transfers} keyExtractor={(item) => item.localId} />
        </>
      )}

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Request Stock Transfer" width={440}>
        <Select
          label="Transfer To Branch"
          value={toBranchId}
          onChange={setToBranchId}
          options={BRANCHES.filter((b) => b.id !== user.branchId).map((b) => ({ label: b.name, value: b.id }))}
          placeholder="Select destination branch"
        />
        <Select
          label="Product"
          value={productId}
          onChange={setProductId}
          options={products.map((p) => ({ label: p.name, value: p.id }))}
          placeholder="Select product"
        />
        <Input label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="e.g. 20" />
        <Button title="Send Request" onPress={handleRequest} />
      </Modal>
    </ScreenContainer>
  );
}
