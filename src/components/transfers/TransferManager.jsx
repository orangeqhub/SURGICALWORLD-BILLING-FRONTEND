import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionHeader from '../ui/SectionHeader';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import ActionLink from '../ui/ActionLink';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import ResponsiveList from '../ui/ResponsiveList';
import ListCard from '../ui/ListCard';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { useNotification } from '../../hooks/useNotification';
import { usePermissions } from '../../hooks/usePermissions';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import {
  listTransfers,
  saveDraftTransfer,
  submitForApproval,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
} from '../../services/api/transferFrontendApi';
import { listProductsWithProfile } from '../../services/api/productMasterApi';
import { fetchBatches } from '../../services/api/batchInventoryApi';
import { BRANCHES } from '../../constants/branches';
import { PERMISSIONS } from '../../constants/roles';
import { formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

function emptyHeader(fromBranchId) {
  return {
    transferNumber: '',
    transferDate: new Date().toISOString().slice(0, 10),
    fromBranchId: fromBranchId || '',
    toBranchId: '',
    requestedBy: '',
    approvedBy: '',
    dispatchDate: '',
    receivedDate: '',
    remarks: '',
  };
}

function newLine() {
  return { lineId: `TL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, productId: '', batchId: '', batchNumber: '', expiryDate: '', availableQty: 0, transferQty: '', receivedQty: '', damagedQty: '', remarks: '' };
}

const STATUS_ACTIONS = {
  DRAFT: [{ key: 'submit', label: 'Submit for Approval' }],
  PENDING_APPROVAL: [{ key: 'approve', label: 'Approve' }, { key: 'reject', label: 'Reject' }],
  APPROVED: [{ key: 'dispatch', label: 'Mark Dispatched' }],
  DISPATCHED: [{ key: 'receive', label: 'Mark Received' }],
};

/**
 * Shared advanced (batch-level) Transfer Manager/Editor, reused by Super
 * Admin (all-branch) and Branch Admin (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 4). Every record is a
 * FRONTEND_DEMO transfer, entirely separate from the existing real simple
 * Request/Approval screens.
 */
export default function TransferManager({ user, branchId, allowBranchPicker }) {
  const { can } = usePermissions();
  const { success, error: notifyError } = useNotification();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [editorVisible, setEditorVisible] = useState(false);
  const [header, setHeader] = useState(emptyHeader(branchId));
  const [items, setItems] = useState([]);
  const [detail, setDetail] = useState(null);

  const canCreate = can(PERMISSIONS.TRANSFER_CREATE);

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, prods] = await Promise.all([listTransfers(branchId), listProductsWithProfile()]);
    setTransfers(rows);
    setProducts(prods);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      transfers
        .filter((t) => !query || t.transferNumber?.toLowerCase().includes(query.toLowerCase()))
        .filter((t) => statusFilter === 'ALL' || t.status === statusFilter),
    [transfers, query, statusFilter]
  );

  const openCreate = () => {
    setHeader({ ...emptyHeader(branchId), requestedBy: user.name, transferNumber: `DTRF-${Date.now().toString().slice(-6)}` });
    setItems([]);
    setEditorVisible(true);
  };

  useRegisterPrimaryAction(canCreate ? openCreate : null, [canCreate, branchId, user.name]);

  const addLine = () => setItems((prev) => [...prev, newLine()]);
  const removeLine = (lineId) => setItems((prev) => prev.filter((l) => l.lineId !== lineId));

  const updateLine = async (lineId, patch) => {
    setItems((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)));
    if (patch.productId) {
      const product = products.find((p) => p.id === patch.productId);
      setItems((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, productName: product?.name, batchId: '', batchNumber: '', availableQty: 0 } : l)));
    }
    if (patch.batchId && header.fromBranchId) {
      const line = items.find((l) => l.lineId === lineId);
      const batches = await fetchBatches({ branchId: header.fromBranchId, productId: line?.productId }).catch(() => []);
      const batch = batches.find((b) => b.id === patch.batchId);
      setItems((prev) =>
        prev.map((l) => (l.lineId === lineId ? { ...l, batchNumber: batch?.batchNumber, expiryDate: batch?.expiryDate, availableQty: batch?.available ?? 0 } : l))
      );
    }
  };

  const handleSaveDraft = async () => {
    if (!header.fromBranchId || !header.toBranchId) {
      notifyError('From and To branch are required');
      return;
    }
    if (header.fromBranchId === header.toBranchId) {
      notifyError('From and To branch must be different');
      return;
    }
    if (items.length === 0) {
      notifyError('Add at least one item');
      return;
    }
    const invalid = items.some((l) => !l.productId || !(Number(l.transferQty) > 0) || Number(l.transferQty) > (l.availableQty || 0));
    if (invalid) {
      notifyError('Every line needs a product and a transfer quantity within the available source quantity');
      return;
    }
    try {
      await saveDraftTransfer(user, { ...header, items });
      success(`Transfer ${header.transferNumber} saved as draft`);
      setEditorVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save transfer');
    }
  };

  const runAction = async (transfer, actionKey) => {
    try {
      if (actionKey === 'submit') await submitForApproval(user, transfer.id);
      else if (actionKey === 'approve') await approveTransfer(user, transfer.id);
      else if (actionKey === 'reject') await rejectTransfer(user, transfer.id);
      else if (actionKey === 'dispatch') await dispatchTransfer(user, transfer.id);
      else if (actionKey === 'receive') await receiveTransfer(user, transfer.id, {});
      else if (actionKey === 'cancel') await cancelTransfer(user, transfer.id);
      success('Transfer updated');
      setDetail(null);
      load();
    } catch (e) {
      notifyError(e.message || 'Action failed');
    }
  };

  const branchName = (id) => BRANCHES.find((b) => b.id === id)?.name || id;

  const columns = [
    { key: 'transferNumber', title: 'Transfer No.' },
    { key: 'from', title: 'From', render: (row) => <Text>{branchName(row.fromBranchId)}</Text> },
    { key: 'to', title: 'To', render: (row) => <Text>{branchName(row.toBranchId)}</Text> },
    { key: 'items', title: 'Items', render: (row) => <Text>{row.items?.length ?? '-'}</Text> },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'source', title: 'Source', render: () => <Badge label="Frontend Demo" tone="info" /> },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => <ActionLink onPress={() => setDetail(row)}>View</ActionLink>,
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={row.transferNumber}
      subtitle={`${branchName(row.fromBranchId)} -> ${branchName(row.toBranchId)}`}
      badge={<StatusBadge status={row.status} />}
      lines={[{ label: 'Items', value: row.items?.length ?? '-' }]}
      actions={<ActionLink onPress={() => setDetail(row)}>View</ActionLink>}
    />
  );

  return (
    <View>
      <SectionHeader
        title="Branch Transfers"
        subtitle={`${transfers.length} frontend-demo transfer${transfers.length === 1 ? '' : 's'}`}
        action={canCreate ? <Button title="Create Transfer" size="sm" onPress={openCreate} /> : null}
      />

      <View style={styles.filterRow}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search transfer number" style={{ flex: 1, minWidth: 220, marginBottom: 0 }} />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'All Status', value: 'ALL' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Dispatched', value: 'DISPATCHED' },
            { label: 'Partially Received', value: 'PARTIALLY_RECEIVED' },
            { label: 'Received', value: 'RECEIVED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ]}
          style={{ minWidth: 180, marginBottom: 0 }}
        />
      </View>

      {loading ? (
        <LoadingState label="Loading transfers..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="swap-horizontal-outline" title="No transfers found" />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No transfers found" />
      )}

      <Modal visible={editorVisible} onClose={() => setEditorVisible(false)} title="New Branch Transfer (Demo)" width={720}>
        <Text style={styles.sectionTitle}>Header</Text>
        <View style={styles.row}>
          <Input label="Transfer Number" value={header.transferNumber} editable={false} style={{ flex: 1 }} />
          <Input label="Transfer Date" value={header.transferDate} onChangeText={(v) => setHeader((h) => ({ ...h, transferDate: v }))} style={{ flex: 1 }} />
        </View>
        <View style={styles.row}>
          <Select label="From Branch *" value={header.fromBranchId} onChange={(v) => setHeader((h) => ({ ...h, fromBranchId: v }))} options={BRANCHES.map((b) => ({ label: b.name, value: b.id }))} style={{ flex: 1 }} />
          <Select label="To Branch *" value={header.toBranchId} onChange={(v) => setHeader((h) => ({ ...h, toBranchId: v }))} options={BRANCHES.filter((b) => b.id !== header.fromBranchId).map((b) => ({ label: b.name, value: b.id }))} style={{ flex: 1 }} />
        </View>
        <Input label="Requested By" value={header.requestedBy} onChangeText={(v) => setHeader((h) => ({ ...h, requestedBy: v }))} />
        <Input label="Remarks" value={header.remarks} onChangeText={(v) => setHeader((h) => ({ ...h, remarks: v }))} />

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Button title="Add Line" size="sm" onPress={addLine} />
        </View>
        {items.map((line) => (
          <Card key={line.lineId} style={{ marginBottom: SPACING.sm, gap: SPACING.xs }}>
            <View style={styles.row}>
              <Select
                value={line.productId}
                onChange={(v) => updateLine(line.lineId, { productId: v })}
                options={products.map((p) => ({ label: p.name, value: p.id }))}
                placeholder="Select product"
                style={{ flex: 1.5, marginBottom: 0 }}
              />
              <Pressable
                onPress={() => removeLine(line.lineId)}
                accessibilityRole="button"
                accessibilityLabel="Remove line"
                style={({ focused }) => [focusRingStyle(focused)]}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </Pressable>
            </View>
            <BatchLineSelect line={line} branchId={header.fromBranchId} onSelect={(batch) => updateLine(line.lineId, { batchId: batch.id })} />
            <View style={styles.row}>
              <Text style={styles.metaText}>Available: {line.availableQty}</Text>
              <Input value={line.transferQty} onChangeText={(v) => updateLine(line.lineId, { transferQty: v })} placeholder="Transfer Qty" keyboardType="number-pad" style={{ flex: 1, marginBottom: 0 }} />
            </View>
          </Card>
        ))}

        <Button title="Save Draft" onPress={handleSaveDraft} style={{ marginTop: SPACING.md }} />
      </Modal>

      <Modal visible={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.transferNumber || 'Transfer Detail'} width={560}>
        {detail ? (
          <View>
            <Text style={styles.metaText}>{branchName(detail.fromBranchId)} -&gt; {branchName(detail.toBranchId)}</Text>
            <Text style={styles.metaText}>Requested By: {detail.requestedBy || '-'}  Approved By: {detail.approvedBy || '-'}</Text>
            <Text style={styles.metaText}>Dispatch: {detail.dispatchDate ? formatDate(detail.dispatchDate) : '-'}  Received: {detail.receivedDate ? formatDate(detail.receivedDate) : '-'}</Text>
            <Text style={styles.sectionTitle}>Items</Text>
            {(detail.items || []).map((l) => (
              <Text key={l.lineId} style={styles.metaText}>{l.productName || l.productId} - Batch {l.batchNumber || '-'} - Qty {l.transferQty}</Text>
            ))}
            <View style={styles.actionsRow}>
              {(STATUS_ACTIONS[detail.status] || []).map((a) => (
                <Button key={a.key} title={a.label} size="sm" onPress={() => runAction(detail, a.key)} style={{ flex: 1 }} />
              ))}
              {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(detail.status) ? (
                <Button title="Cancel" size="sm" variant="danger" outline onPress={() => runAction(detail, 'cancel')} style={{ flex: 1 }} />
              ) : null}
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function BatchLineSelect({ line, branchId, onSelect }) {
  const [batches, setBatches] = useState([]);
  useEffect(() => {
    if (!branchId || !line.productId) {
      setBatches([]);
      return;
    }
    fetchBatches({ branchId, productId: line.productId }).then(setBatches).catch(() => setBatches([]));
  }, [branchId, line.productId]);

  if (!line.productId) return null;

  return (
    <Select
      label="Batch"
      value={line.batchId}
      onChange={(id) => onSelect(batches.find((b) => b.id === id))}
      options={batches.map((b) => ({ label: `${b.batchNumber} (${b.available} avail, exp ${b.expiryDate ? formatDate(b.expiryDate) : '-'})`, value: b.id }))}
      placeholder={batches.length ? 'Select batch' : 'No batches at this branch'}
    />
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.sm },
  sectionTitle: { ...TYPOGRAPHY.h4, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  metaText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 2 },
  link: { color: COLORS.brandRed, fontWeight: '700', fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
