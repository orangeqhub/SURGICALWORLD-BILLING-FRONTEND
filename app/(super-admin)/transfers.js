import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import StatusBadge from '../../src/components/ui/StatusBadge';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import ActionLink from '../../src/components/ui/ActionLink';
import Tabs from '../../src/components/ui/Tabs';
import TransferManager from '../../src/components/transfers/TransferManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { fetchStockTransfers, fetchTransferItems, setTransferStatus } from '../../src/services/api/transferApi';
import { fetchProducts } from '../../src/services/api/productApi';
import { BRANCHES } from '../../src/constants/branches';
import { formatDateTime } from '../../src/utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

const TABS = [
  { key: 'advanced', label: 'Transfer Editor (Full)' },
  { key: 'quick', label: 'Approval Queue (Real)' },
];

const NEXT_STATUS = {
  PENDING: [{ label: 'Approve', status: 'APPROVED' }, { label: 'Reject', status: 'REJECTED' }],
  APPROVED: [{ label: 'Mark Dispatched', status: 'IN_TRANSIT' }],
  IN_TRANSIT: [{ label: 'Mark Completed', status: 'COMPLETED' }],
};

export default function StockTransferApprovalScreen() {
  const { user } = useAuth();
  const { success } = useNotification();
  const [tab, setTab] = useState('advanced');
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [detailTransfer, setDetailTransfer] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    const [rows, prods] = await Promise.all([fetchStockTransfers(), fetchProducts()]);
    setTransfers(rows);
    setProducts(prods);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (transfer) => {
    setDetailTransfer(transfer);
    const items = await fetchTransferItems(transfer.localId);
    setDetailItems(items);
  };

  const handleAction = async (transfer, status) => {
    await setTransferStatus(transfer.localId, status);
    success(`Transfer marked as ${status.replace('_', ' ').toLowerCase()}`);
    setDetailTransfer(null);
    setComment('');
    load();
  };

  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  const columns = [
    { key: 'fromBranchId', title: 'From', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.fromBranchId)?.name}</Text> },
    { key: 'toBranchId', title: 'To', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.toBranchId)?.name}</Text> },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', title: 'Requested', render: (row) => <Text>{formatDateTime(row.createdAt)}</Text> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.4,
      render: (row) => <ActionLink onPress={() => openDetail(row)}>Review</ActionLink>,
    },
  ];

  return (
    <ScreenContainer>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'advanced' ? (
        <TransferManager user={user} allowBranchPicker />
      ) : (
        <>
          <SectionHeader title="Stock Transfer Approval (Real)" subtitle={`${transfers.length} inter-branch transfer requests`} />
          <DataTable columns={columns} data={transfers} keyExtractor={(item) => item.localId} />
        </>
      )}

      <Modal visible={Boolean(detailTransfer)} onClose={() => setDetailTransfer(null)} title="Transfer Details" width={520}>
        {detailTransfer ? (
          <View>
            <View style={{ marginBottom: SPACING.md }}>
              <Text style={styles.row}>From: <Text style={styles.rowValue}>{BRANCHES.find((b) => b.id === detailTransfer.fromBranchId)?.name}</Text></Text>
              <Text style={styles.row}>To: <Text style={styles.rowValue}>{BRANCHES.find((b) => b.id === detailTransfer.toBranchId)?.name}</Text></Text>
              <Text style={styles.row}>Status: <StatusBadge status={detailTransfer.status} /></Text>
            </View>

            <Text style={styles.sectionLabel}>Items</Text>
            {detailItems.map((item) => (
              <Text key={item.id} style={styles.itemRow}>
                {productById[item.productId]?.name || item.productId} - Qty {item.quantity}
              </Text>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>Activity Timeline</Text>
            <Text style={styles.itemRow}>Requested on {formatDateTime(detailTransfer.createdAt)}</Text>
            <Text style={styles.itemRow}>Last updated {formatDateTime(detailTransfer.updatedAt)}</Text>

            <Input label="Comments" value={comment} onChangeText={setComment} placeholder="Optional note for this decision" style={{ marginTop: SPACING.md }} />

            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
              {(NEXT_STATUS[detailTransfer.status] || []).map((action) => (
                <Button
                  key={action.status}
                  title={action.label}
                  variant={action.status === 'REJECTED' ? 'danger' : 'primary'}
                  onPress={() => handleAction(detailTransfer, action.status)}
                  style={{ flex: 1 }}
                />
              ))}
              {!NEXT_STATUS[detailTransfer.status] ? (
                <Text style={{ ...TYPOGRAPHY.caption }}>No further action needed - transfer is finalized.</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </Modal>
    </ScreenContainer>
  );
}

const styles = {
  row: { ...TYPOGRAPHY.body, marginBottom: 4 },
  rowValue: { fontWeight: '700', color: COLORS.textPrimary },
  sectionLabel: { ...TYPOGRAPHY.h4, marginBottom: SPACING.xs },
  itemRow: { ...TYPOGRAPHY.caption, marginBottom: 2 },
};
