import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import Button from '../../src/components/ui/Button';
import Modal from '../../src/components/ui/Modal';
import Select from '../../src/components/ui/Select';
import Input from '../../src/components/ui/Input';
import Tabs from '../../src/components/ui/Tabs';
import PurchaseManager from '../../src/components/purchases/PurchaseManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { fetchSuppliers, recordPurchase, fetchPurchases } from '../../src/services/api/purchaseApi';
import { fetchProducts } from '../../src/services/api/productApi';
import { formatCurrency, formatDateTime } from '../../src/utils/formatters';
import { SPACING } from '../../src/theme';

const TABS = [
  { key: 'editor', label: 'Purchase Editor (Full)' },
  { key: 'quick', label: 'Quick Record (Real)' },
];

export default function PurchasesScreen() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [tab, setTab] = useState('editor');
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useRegisterPrimaryAction(tab === 'quick' ? () => setModalVisible(true) : null, [tab]);

  const load = useCallback(async () => {
    const [purch, supp, prods] = await Promise.all([
      fetchPurchases(user.branchId),
      fetchSuppliers(),
      fetchProducts(),
    ]);
    setPurchases(purch);
    setSuppliers(supp);
    setProducts(prods);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRecord = async () => {
    if (!supplierId || !productId || !quantity || !purchasePrice) {
      notifyError('Please fill in all purchase fields');
      return;
    }

    await recordPurchase({
      branchId: user.branchId,
      supplierId,
      invoiceNumber: invoiceNumber || `PO-${Date.now().toString().slice(-6)}`,
      items: [{ productId, quantity: Number(quantity), purchasePrice: Number(purchasePrice) }],
    });

    setModalVisible(false);
    setSupplierId('');
    setProductId('');
    setQuantity('');
    setPurchasePrice('');
    setInvoiceNumber('');
    success('Purchase recorded and stock updated');
    load();
  };

  const columns = [
    { key: 'invoiceNumber', title: 'PO Number', flex: 1.2 },
    { key: 'supplierId', title: 'Supplier', render: (row) => <Text>{suppliers.find((s) => s.id === row.supplierId)?.name || row.supplierId}</Text> },
    { key: 'totalAmount', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.totalAmount)}</Text> },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', title: 'Date', render: (row) => <Text>{formatDateTime(row.createdAt)}</Text> },
  ];

  return (
    <ScreenContainer>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'editor' ? (
        <PurchaseManager user={user} branchId={user.branchId} branchLocked />
      ) : (
        <>
          <SectionHeader
            title="Quick Record Purchase (Real, writes stock immediately)"
            subtitle={`${purchases.length} purchase orders at ${user.branchName}`}
            action={<Button title="Record Purchase" size="sm" onPress={() => setModalVisible(true)} />}
          />
          <DataTable columns={columns} data={purchases} keyExtractor={(item) => item.localId} />
        </>
      )}

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Record Purchase" width={460}>
        <Select
          label="Supplier"
          value={supplierId}
          onChange={setSupplierId}
          options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
          placeholder="Select supplier"
        />
        <Select
          label="Product"
          value={productId}
          onChange={setProductId}
          options={products.map((p) => ({ label: p.name, value: p.id }))}
          placeholder="Select product"
        />
        <Input label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="e.g. 50" />
        <Input label="Purchase Price (per unit)" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" placeholder="e.g. 95" />
        <Input label="PO / Invoice Number" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Optional" />
        <Button title="Save Purchase" onPress={handleRecord} />
      </Modal>
    </ScreenContainer>
  );
}
