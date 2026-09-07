import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import Select from '../../src/components/ui/Select';
import DataTable from '../../src/components/ui/DataTable';
import ResponsiveList from '../../src/components/ui/ResponsiveList';
import ListCard from '../../src/components/ui/ListCard';
import StatusBadge from '../../src/components/ui/StatusBadge';
import Badge from '../../src/components/ui/Badge';
import MetricCard from '../../src/components/ui/MetricCard';
import Tabs from '../../src/components/ui/Tabs';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import LoadingState from '../../src/components/ui/LoadingState';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';
import { useNotification } from '../../src/hooks/useNotification';
import { usePermissions } from '../../src/hooks/usePermissions';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { fetchProducts, fetchBranchStock, fetchAllBranchStock } from '../../src/services/api/productApi';
import { listRecentAdjustments } from '../../src/database/repositories/stockRepository';
import { fetchBatches } from '../../src/services/api/batchInventoryApi';
import { fetchMovements } from '../../src/services/api/stockMovementApi';
import { fetchAdjustments, recordAdjustment } from '../../src/services/api/stockAdjustmentApi';
import { PERMISSIONS } from '../../src/constants/roles';
import { ADJUSTMENT_REASONS } from '../../src/constants/inventorySettings';
import { isNearExpiry, isExpired } from '../../src/utils/inventoryHelpers';
import { BRANCHES } from '../../src/constants/branches';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { SPACING, COLORS } from '../../src/theme';

const emptyAdjustForm = { branchId: '', productId: '', batchId: '', direction: 'INCREASE', quantity: '', reason: ADJUSTMENT_REASONS[0], notes: '' };

export default function InventoryOverviewScreen() {
  const { user } = useAuth();
  const { selectedBranchId, isAllBranches } = useBranch();
  const { can } = usePermissions();
  const { success, error: notifyError } = useNotification();

  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [realAdjustments, setRealAdjustments] = useState([]);
  const [mockAdjustments, setMockAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('current');
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const [adjustVisible, setAdjustVisible] = useState(false);
  const [adjustForm, setAdjustForm] = useState(emptyAdjustForm);
  const [adjustBranchStock, setAdjustBranchStock] = useState([]);
  const [adjustBatches, setAdjustBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  const allowAdjust = can(PERMISSIONS.STOCK_ADJUST);
  const effectiveBranch = isAllBranches ? branchFilter : selectedBranchId;

  const load = useCallback(async () => {
    setLoading(true);
    const [prods, stk, batchRows, moveRows, realAdj, mockAdj] = await Promise.all([
      fetchProducts(),
      effectiveBranch === 'ALL' ? fetchAllBranchStock() : fetchBranchStock(effectiveBranch),
      fetchBatches(effectiveBranch === 'ALL' ? {} : { branchId: effectiveBranch }),
      fetchMovements({ branchId: effectiveBranch === 'ALL' ? undefined : effectiveBranch, isAllBranches: effectiveBranch === 'ALL' }),
      listRecentAdjustments(30),
      fetchAdjustments(effectiveBranch === 'ALL' ? undefined : effectiveBranch),
    ]);
    setProducts(prods);
    setStock(stk);
    setBatches(batchRows);
    setMovements(moveRows);
    setRealAdjustments(realAdj);
    setMockAdjustments(mockAdj);
    setLoading(false);
  }, [effectiveBranch]);

  useEffect(() => {
    load();
  }, [load]);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const rows = useMemo(
    () =>
      stock
        .map((s) => ({ ...s, product: productById[s.productId] }))
        .filter((s) => s.product && (!query || s.product.name.toLowerCase().includes(query.toLowerCase()) || s.product.code.toLowerCase().includes(query.toLowerCase()))),
    [stock, productById, query]
  );

  const lowStockRows = useMemo(() => rows.filter((r) => r.status === 'LOW_STOCK' || r.status === 'OUT_OF_STOCK'), [rows]);
  const nearExpiryRows = useMemo(() => rows.filter((r) => isNearExpiry(r.product?.expiryDate)), [rows]);
  const expiredRows = useMemo(() => rows.filter((r) => isExpired(r.product?.expiryDate)), [rows]);
  const stockValue = rows.reduce((sum, r) => sum + r.available * (r.product?.sellingPrice || 0), 0);

  // --- Adjustment cascade: branch -> product (stocked in that branch only) -> batch ---
  useEffect(() => {
    if (!adjustForm.branchId) {
      setAdjustBranchStock([]);
      return;
    }
    fetchBranchStock(adjustForm.branchId).then(setAdjustBranchStock);
  }, [adjustForm.branchId]);

  useEffect(() => {
    if (!adjustForm.branchId || !adjustForm.productId) {
      setAdjustBatches([]);
      return;
    }
    fetchBatches({ branchId: adjustForm.branchId, productId: adjustForm.productId }).then(setAdjustBatches);
  }, [adjustForm.branchId, adjustForm.productId]);

  const selectedBatch = adjustBatches.find((b) => b.id === adjustForm.batchId) || null;
  const adjustQuantityNum = Number(adjustForm.quantity) || 0;
  const adjustPreview = useMemo(() => {
    const current = selectedBatch?.available ?? 0;
    const delta = adjustForm.direction === 'DECREASE' ? -Math.abs(adjustQuantityNum) : Math.abs(adjustQuantityNum);
    return { current, newQty: current + delta };
  }, [selectedBatch, adjustForm.direction, adjustQuantityNum]);

  const decreaseExceedsAvailable = adjustForm.direction === 'DECREASE' && adjustQuantityNum > adjustPreview.current;
  const notesMissingForOther = adjustForm.reason === 'Other' && !adjustForm.notes.trim();
  const canSubmitAdjustment =
    Boolean(adjustForm.branchId) &&
    Boolean(adjustForm.productId) &&
    Boolean(adjustForm.batchId) &&
    adjustQuantityNum > 0 &&
    !decreaseExceedsAvailable &&
    !notesMissingForOther;

  const openNewAdjustment = () => {
    setAdjustForm(emptyAdjustForm);
    setAdjustVisible(true);
  };

  useRegisterPrimaryAction(tab === 'adjustments' && allowAdjust ? openNewAdjustment : null, [tab, allowAdjust]);

  const handleCreateAdjustment = async () => {
    if (!canSubmitAdjustment) return;
    setSaving(true);
    try {
      await recordAdjustment(user, {
        branchId: adjustForm.branchId,
        productId: adjustForm.productId,
        productName: productById[adjustForm.productId]?.name,
        batchId: adjustForm.batchId,
        batchNumber: selectedBatch?.batchNumber,
        currentQuantity: adjustPreview.current,
        direction: adjustForm.direction,
        quantity: adjustQuantityNum,
        newQuantity: adjustPreview.newQty,
        reason: adjustForm.reason,
        notes: adjustForm.notes,
      });
      success('Mock stock adjustment recorded (demo only, real stock unaffected)');
      setAdjustVisible(false);
      setAdjustForm(emptyAdjustForm);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to record adjustment');
    } finally {
      setSaving(false);
    }
  };

  const stockColumns = [
    { key: 'name', title: 'Product', flex: 1.4, render: (row) => <Text>{row.product?.name}</Text> },
    { key: 'code', title: 'Code', render: (row) => <Text>{row.product?.code}</Text> },
    ...(effectiveBranch === 'ALL' ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name}</Text> }] : []),
    { key: 'available', title: 'Available', render: (row) => <Text>{row.available} {row.product?.unit}</Text> },
    { key: 'minStock', title: 'Min Level', render: (row) => <Text>{row.minStock}</Text> },
    { key: 'value', title: 'Stock Value', render: (row) => <Text>{formatCurrency(row.available * (row.product?.sellingPrice || 0))}</Text> },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.product?.expiryDate ? formatDate(row.product.expiryDate) : '-'}</Text> },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const renderStockCard = (row) => (
    <ListCard
      title={row.product?.name}
      subtitle={row.product?.code}
      badge={<StatusBadge status={row.status} />}
      lines={[
        ...(effectiveBranch === 'ALL' ? [{ label: 'Branch', value: BRANCHES.find((b) => b.id === row.branchId)?.name }] : []),
        { label: 'Available', value: `${row.available} ${row.product?.unit || ''}` },
        { label: 'Min Level', value: row.minStock },
        { label: 'Stock Value', value: formatCurrency(row.available * (row.product?.sellingPrice || 0)) },
        { label: 'Expiry', value: row.product?.expiryDate ? formatDate(row.product.expiryDate) : '-' },
      ]}
    />
  );

  const batchColumns = [
    { key: 'productName', title: 'Product', flex: 1.3 },
    { key: 'batchNumber', title: 'Batch No.', render: (row) => <Text>{row.batchNumber}{row.isSynthetic ? ' (Demo)' : ''}</Text> },
    { key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name}</Text> },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.expiryDate ? formatDate(row.expiryDate) : '-'}</Text> },
    { key: 'available', title: 'Available' },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const renderBatchCard = (row) => (
    <ListCard
      title={row.productName}
      subtitle={`Batch ${row.batchNumber}`}
      badge={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={row.status} />
          {row.isSynthetic ? <Badge label="Demo Batch" tone="info" /> : null}
        </View>
      }
      lines={[
        { label: 'Branch', value: BRANCHES.find((b) => b.id === row.branchId)?.name },
        { label: 'Available', value: row.available },
        { label: 'Expiry', value: row.expiryDate ? formatDate(row.expiryDate) : '-' },
      ]}
    />
  );

  const movementColumns = [
    { key: 'createdAt', title: 'Date', render: (row) => <Text>{formatDate(row.createdAt)}</Text> },
    { key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name}</Text> },
    { key: 'productId', title: 'Product', render: (row) => <Text>{productById[row.productId]?.name || row.productId}</Text> },
    { key: 'type', title: 'Type' },
    { key: 'quantity', title: 'Quantity', render: (row) => <Text style={{ fontWeight: '700', color: row.quantity >= 0 ? COLORS.success : COLORS.danger }}>{row.quantity > 0 ? `+${row.quantity}` : row.quantity}</Text> },
  ];

  const realAdjustmentColumns = [
    { key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name}</Text> },
    { key: 'productId', title: 'Product', render: (row) => <Text>{productById[row.productId]?.name || row.productId}</Text> },
    { key: 'quantity', title: 'Adjustment', render: (row) => <Text style={{ fontWeight: '700' }}>{row.quantity > 0 ? `+${row.quantity}` : row.quantity}</Text> },
    { key: 'referenceId', title: 'Reason' },
  ];

  const mockAdjustmentColumns = [
    { key: 'date', title: 'Date', render: (row) => <Text>{formatDate(row.date)}</Text> },
    { key: 'productName', title: 'Product' },
    { key: 'direction', title: 'Direction' },
    { key: 'quantity', title: 'Qty' },
    { key: 'newQuantity', title: 'New Qty' },
    { key: 'reason', title: 'Reason' },
    { key: 'createdBy', title: 'User' },
  ];

  const tabs = [
    { key: 'current', label: 'Current Stock' },
    { key: 'branch', label: 'Branch-wise', badge: BRANCHES.length },
    { key: 'batch', label: 'Batch-wise', badge: batches.length },
    { key: 'low', label: 'Low Stock', badge: lowStockRows.length },
    { key: 'nearExpiry', label: 'Near Expiry', badge: nearExpiryRows.length },
    { key: 'expired', label: 'Expired', badge: expiredRows.length },
    { key: 'movement', label: 'Stock Movement' },
    { key: 'adjustments', label: 'Stock Adjustments' },
  ];

  const adjustProductOptions = adjustBranchStock
    .map((s) => productById[s.productId])
    .filter(Boolean)
    .map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }));

  return (
    <ScreenContainer>
      <SectionHeader title="Inventory Overview" subtitle="Branch-wise stock, batches and expiry tracking" />

      <View style={styles.metricsRow}>
        <MetricCard label="Low Stock Alerts" value={lowStockRows.length} icon="alert-circle-outline" tone="warning" />
        <MetricCard label="Near Expiry" value={nearExpiryRows.length} icon="hourglass-outline" tone="warning" />
        <MetricCard label="Expired" value={expiredRows.length} icon="close-circle-outline" tone="danger" />
        <MetricCard label="Stock Value" value={formatCurrency(stockValue)} icon="cube-outline" tone="purple" />
      </View>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingState label="Loading inventory..." />
      ) : (
        <View>
          {(tab === 'current' || tab === 'branch' || tab === 'low' || tab === 'nearExpiry' || tab === 'expired') && (
            <>
              <View style={styles.filterRow}>
                <SearchInput value={query} onChangeText={setQuery} placeholder="Search product name or code" style={{ flex: 1, minWidth: 220, marginBottom: 0 }} />
                {isAllBranches ? (
                  <Select
                    value={branchFilter}
                    onChange={setBranchFilter}
                    options={[{ label: 'All Branches', value: 'ALL' }, ...BRANCHES.map((b) => ({ label: b.name, value: b.id }))]}
                    style={{ minWidth: 180, marginBottom: 0 }}
                  />
                ) : null}
              </View>
              <ResponsiveList
                columns={stockColumns}
                data={tab === 'current' || tab === 'branch' ? rows : tab === 'low' ? lowStockRows : tab === 'nearExpiry' ? nearExpiryRows : expiredRows}
                renderCard={renderStockCard}
                keyExtractor={(item, index) => `${item.branchId}-${item.productId}-${index}`}
                emptyLabel="No items in this view"
              />
            </>
          )}

          {tab === 'batch' && (
            <ResponsiveList columns={batchColumns} data={batches} renderCard={renderBatchCard} keyExtractor={(item) => item.id} emptyLabel="No batches recorded" />
          )}

          {tab === 'movement' && <DataTable columns={movementColumns} data={movements} keyExtractor={(item) => item.id} emptyLabel="No stock movements recorded" />}

          {tab === 'adjustments' && (
            <View style={{ gap: SPACING.lg }}>
              <View>
                <View style={styles.subHeaderRow}>
                  <Text style={styles.subHeader}>Production Adjustment Review (Branch Admin)</Text>
                </View>
                <DataTable columns={realAdjustmentColumns} data={realAdjustments} keyExtractor={(item) => item.id} emptyLabel="No manual stock adjustments recorded" />
              </View>
              <View>
                <View style={styles.subHeaderRow}>
                  <Text style={styles.subHeader}>Demo Stock Adjustments (Mock Only)</Text>
                  {allowAdjust ? <Button title="New Adjustment" size="sm" onPress={openNewAdjustment} /> : null}
                </View>
                <DataTable columns={mockAdjustmentColumns} data={mockAdjustments} keyExtractor={(item) => item.id} emptyLabel="No demo adjustments recorded" />
              </View>
            </View>
          )}
        </View>
      )}

      <Modal visible={adjustVisible} onClose={() => setAdjustVisible(false)} title="New Stock Adjustment (Demo)" width={460}>
        <Select
          label="Branch *"
          value={adjustForm.branchId}
          onChange={(v) => setAdjustForm({ ...emptyAdjustForm, branchId: v })}
          options={BRANCHES.map((b) => ({ label: b.name, value: b.id }))}
          placeholder="Select branch"
        />
        <Select
          label="Product *"
          value={adjustForm.productId}
          onChange={(v) => setAdjustForm((f) => ({ ...f, productId: v, batchId: '' }))}
          options={adjustProductOptions}
          placeholder={adjustForm.branchId ? 'Select product' : 'Select a branch first'}
        />
        <Select
          label="Batch *"
          value={adjustForm.batchId}
          onChange={(v) => setAdjustForm((f) => ({ ...f, batchId: v }))}
          options={adjustBatches.map((b) => ({ label: `${b.batchNumber} (${b.available} available)`, value: b.id }))}
          placeholder={adjustForm.productId ? 'Select batch' : 'Select a product first'}
        />
        {adjustForm.batchId ? <Text style={styles.currentQtyLabel}>Current Quantity: {adjustPreview.current}</Text> : null}
        <Select
          label="Adjustment Direction"
          value={adjustForm.direction}
          onChange={(v) => setAdjustForm((f) => ({ ...f, direction: v }))}
          options={[{ label: 'Increase', value: 'INCREASE' }, { label: 'Decrease', value: 'DECREASE' }]}
        />
        <Input
          label="Adjustment Quantity"
          value={adjustForm.quantity}
          onChangeText={(v) => setAdjustForm((f) => ({ ...f, quantity: v }))}
          keyboardType="number-pad"
          placeholder="e.g. 10"
          error={decreaseExceedsAvailable ? 'Decrease cannot exceed available quantity' : undefined}
        />
        {adjustForm.quantity && !decreaseExceedsAvailable ? <Text style={styles.previewText}>New Quantity Preview: {adjustPreview.newQty}</Text> : null}
        <Select label="Reason" value={adjustForm.reason} onChange={(v) => setAdjustForm((f) => ({ ...f, reason: v }))} options={ADJUSTMENT_REASONS.map((r) => ({ label: r, value: r }))} />
        <Input
          label={adjustForm.reason === 'Other' ? 'Notes (required)' : 'Notes'}
          value={adjustForm.notes}
          onChangeText={(v) => setAdjustForm((f) => ({ ...f, notes: v }))}
          placeholder="Additional details"
          error={notesMissingForOther ? 'Notes are required when reason is Other' : undefined}
        />
        <Text style={styles.userLabel}>Adjusted by: {user.name}</Text>
        <Button title="Apply Demo Adjustment" onPress={handleCreateAdjustment} loading={saving} disabled={!canSubmitAdjustment} />
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  subHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  subHeader: { fontWeight: '700', fontSize: 15, color: '#202463' },
  currentQtyLabel: { color: COLORS.textSecondary, marginBottom: SPACING.sm, fontSize: 13 },
  previewText: { color: COLORS.brandRed, fontWeight: '700', marginBottom: SPACING.sm, fontSize: 13 },
  userLabel: { color: COLORS.textSecondary, marginBottom: SPACING.md, fontSize: 12 },
});
