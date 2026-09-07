import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import Select from '../../src/components/ui/Select';
import DataTable from '../../src/components/ui/DataTable';
import ResponsiveList from '../../src/components/ui/ResponsiveList';
import ListCard from '../../src/components/ui/ListCard';
import Badge from '../../src/components/ui/Badge';
import StatusBadge from '../../src/components/ui/StatusBadge';
import MetricCard from '../../src/components/ui/MetricCard';
import Tabs from '../../src/components/ui/Tabs';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import LoadingState from '../../src/components/ui/LoadingState';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { usePermissions } from '../../src/hooks/usePermissions';
import { fetchProducts, fetchBranchStock } from '../../src/services/api/productApi';
import { adjustInventory } from '../../src/services/api/inventoryApi';
import { fetchBatches } from '../../src/services/api/batchInventoryApi';
import { fetchMovements } from '../../src/services/api/stockMovementApi';
import { PERMISSIONS } from '../../src/constants/roles';
import { ADJUSTMENT_REASONS } from '../../src/constants/inventorySettings';
import { isNearExpiry, isExpired } from '../../src/utils/inventoryHelpers';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { COLORS, SPACING } from '../../src/theme';

export default function InventoryScreen() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { success } = useNotification();
  const [tab, setTab] = useState('current');
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState(ADJUSTMENT_REASONS[0]);
  const [adjustNotes, setAdjustNotes] = useState('');

  const allowAdjust = can(PERMISSIONS.STOCK_ADJUST);

  const load = useCallback(async () => {
    setLoading(true);
    const [prods, stk, batchRows, moveRows] = await Promise.all([
      fetchProducts(),
      fetchBranchStock(user.branchId),
      fetchBatches({ branchId: user.branchId }),
      fetchMovements({ branchId: user.branchId }),
    ]);
    setProducts(prods);
    setStock(stk);
    setBatches(batchRows);
    setMovements(moveRows);
    setLoading(false);
  }, [user.branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const stockByProduct = Object.fromEntries(stock.map((s) => [s.productId, s]));
    return products
      .map((p) => ({ ...p, stock: stockByProduct[p.id] }))
      .filter((p) => p.stock)
      .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.code.toLowerCase().includes(query.toLowerCase()));
  }, [products, stock, query]);

  const lowStockRows = useMemo(() => rows.filter((r) => r.stock?.status === 'LOW_STOCK' || r.stock?.status === 'OUT_OF_STOCK'), [rows]);
  const nearExpiryRows = useMemo(() => rows.filter((r) => isNearExpiry(r.expiryDate)), [rows]);
  const expiredRows = useMemo(() => rows.filter((r) => isExpired(r.expiryDate)), [rows]);
  const adjustmentMovements = useMemo(() => movements.filter((m) => m.type === 'ADJUSTMENT'), [movements]);

  const stockValue = rows.reduce((sum, r) => sum + (r.stock?.available || 0) * (r.sellingPrice || 0), 0);

  const adjustQtyNum = Number(adjustQty) || 0;
  const adjustCurrentQty = adjustTarget?.stock?.available ?? 0;
  const decreaseExceedsAvailable = adjustQtyNum < 0 && Math.abs(adjustQtyNum) > adjustCurrentQty;
  const notesMissingForOther = adjustReason === 'Other' && !adjustNotes.trim();
  const canSubmitAdjust = Boolean(adjustTarget) && allowAdjust && adjustQtyNum !== 0 && !decreaseExceedsAvailable && !notesMissingForOther;

  const handleAdjust = async () => {
    if (!canSubmitAdjust) return;
    const reasonText = adjustNotes ? `${adjustReason}: ${adjustNotes}` : adjustReason;
    await adjustInventory(user.branchId, adjustTarget.id, adjustQtyNum, reasonText);
    setAdjustTarget(null);
    setAdjustQty('');
    setAdjustNotes('');
    success('Stock adjusted');
    load();
  };

  const stockColumns = [
    { key: 'name', title: 'Product', flex: 1.4 },
    { key: 'code', title: 'Code' },
    { key: 'batch', title: 'Batch', render: (row) => <Text>{row.batch || '-'}</Text> },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.expiryDate ? formatDate(row.expiryDate) : '-'}</Text> },
    { key: 'available', title: 'Available', render: (row) => <Text>{row.stock?.available ?? 0} {row.unit}</Text> },
    { key: 'reserved', title: 'Reserved', render: () => <Text>0</Text> },
    { key: 'minStock', title: 'Min Level', render: (row) => <Text>{row.stock?.minStock ?? row.minStock}</Text> },
    ...(can(PERMISSIONS.PRODUCT_MASTER) || can(PERMISSIONS.STOCK_ADJUST)
      ? [{ key: 'value', title: 'Stock Value', render: (row) => <Text>{formatCurrency((row.stock?.available || 0) * (row.sellingPrice || 0))}</Text> }]
      : []),
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.stock?.status || 'IN_STOCK'} /> },
  ];

  const batchColumns = [
    { key: 'productName', title: 'Product', flex: 1.3 },
    { key: 'batchNumber', title: 'Batch No.', render: (row) => <Text>{row.batchNumber}{row.isSynthetic ? ' (Demo)' : ''}</Text> },
    { key: 'mfgDate', title: 'Mfg Date', render: (row) => <Text>{row.mfgDate ? formatDate(row.mfgDate) : '-'}</Text> },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.expiryDate ? formatDate(row.expiryDate) : '-'}</Text> },
    { key: 'available', title: 'Available' },
    { key: 'reserved', title: 'Reserved' },
    { key: 'damaged', title: 'Damaged' },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const renderStockCard = (row) => (
    <ListCard
      title={row.name}
      subtitle={row.code}
      badge={<StatusBadge status={row.stock?.status || 'IN_STOCK'} />}
      lines={[
        { label: 'Batch', value: row.batch || '-' },
        { label: 'Available', value: `${row.stock?.available ?? 0} ${row.unit || ''}` },
        { label: 'Min Level', value: row.stock?.minStock ?? row.minStock },
        { label: 'Expiry', value: row.expiryDate ? formatDate(row.expiryDate) : '-' },
      ]}
      actions={
        allowAdjust ? (
          <Pressable onPress={() => setAdjustTarget(row)}>
            <Text style={{ color: COLORS.brandRed, fontWeight: '700', fontSize: 12 }}>Adjust</Text>
          </Pressable>
        ) : null
      }
    />
  );

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
        { label: 'Available', value: row.available },
        { label: 'Expiry', value: row.expiryDate ? formatDate(row.expiryDate) : '-' },
      ]}
    />
  );

  const movementColumns = [
    { key: 'createdAt', title: 'Date', render: (row) => <Text>{formatDate(row.createdAt)}</Text> },
    { key: 'productId', title: 'Product', render: (row) => <Text>{products.find((p) => p.id === row.productId)?.name || row.productId}</Text> },
    { key: 'type', title: 'Type' },
    { key: 'quantity', title: 'Quantity', render: (row) => <Text style={{ fontWeight: '700', color: row.quantity >= 0 ? COLORS.success : COLORS.danger }}>{row.quantity > 0 ? `+${row.quantity}` : row.quantity}</Text> },
    { key: 'referenceId', title: 'Reference / Reason' },
  ];

  const tabs = [
    { key: 'current', label: 'Current Stock' },
    { key: 'batch', label: 'Batch-wise', badge: batches.length },
    { key: 'low', label: 'Low Stock', badge: lowStockRows.length },
    { key: 'nearExpiry', label: 'Near Expiry', badge: nearExpiryRows.length },
    { key: 'expired', label: 'Expired', badge: expiredRows.length },
    { key: 'movement', label: 'Stock Movement' },
    ...(allowAdjust ? [{ key: 'adjustments', label: 'Stock Adjustments', badge: adjustmentMovements.length }] : []),
  ];

  return (
    <ScreenContainer>
      <SectionHeader title="Inventory" subtitle={`${products.length} products tracked at ${user.branchName}`} />

      <View style={styles.metricsRow}>
        <MetricCard label="Low Stock" value={lowStockRows.length} icon="alert-circle-outline" tone="warning" />
        <MetricCard label="Near Expiry" value={nearExpiryRows.length} icon="hourglass-outline" tone="warning" />
        <MetricCard label="Expired" value={expiredRows.length} icon="close-circle-outline" tone="danger" />
        <MetricCard label="Stock Value" value={formatCurrency(stockValue)} icon="cash-outline" tone="purple" />
      </View>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <LoadingState label="Loading inventory..." />
      ) : (
        <View>
          {(tab === 'current' || tab === 'low' || tab === 'nearExpiry' || tab === 'expired') && (
            <>
              <SearchInput value={query} onChangeText={setQuery} placeholder="Search product name or code" style={{ marginBottom: SPACING.md }} />
              <ResponsiveList
                columns={
                  allowAdjust
                    ? [
                        ...stockColumns,
                        {
                          key: 'actions',
                          title: 'Actions',
                          render: (row) => (
                            <Pressable onPress={() => setAdjustTarget(row)}>
                              <Text style={{ color: COLORS.brandRed, fontWeight: '700', fontSize: 12 }}>Adjust</Text>
                            </Pressable>
                          ),
                        },
                      ]
                    : stockColumns
                }
                data={tab === 'current' ? rows : tab === 'low' ? lowStockRows : tab === 'nearExpiry' ? nearExpiryRows : expiredRows}
                renderCard={renderStockCard}
                keyExtractor={(item) => item.id}
                emptyLabel={tab === 'current' ? 'No products tracked' : 'No items in this view'}
              />
            </>
          )}

          {tab === 'batch' && (
            <ResponsiveList columns={batchColumns} data={batches} renderCard={renderBatchCard} keyExtractor={(item) => item.id} emptyLabel="No batches recorded" />
          )}

          {tab === 'movement' && <DataTable columns={movementColumns} data={movements} keyExtractor={(item) => item.id} emptyLabel="No stock movements recorded" />}

          {tab === 'adjustments' && allowAdjust && (
            <DataTable columns={movementColumns} data={adjustmentMovements} keyExtractor={(item) => item.id} emptyLabel="No manual stock adjustments recorded" />
          )}
        </View>
      )}

      <Modal visible={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} title={`Adjust Stock - ${adjustTarget?.name || ''}`} width={420}>
        <Text style={styles.currentQtyLabel}>Current Quantity: {adjustTarget?.stock?.available ?? 0} {adjustTarget?.unit}</Text>
        <Input
          label="Adjustment Quantity (use negative to reduce)"
          value={adjustQty}
          onChangeText={setAdjustQty}
          placeholder="e.g. 10 or -5"
          keyboardType="numbers-and-punctuation"
          error={decreaseExceedsAvailable ? 'Decrease cannot exceed available quantity' : undefined}
        />
        {adjustQty && !decreaseExceedsAvailable ? (
          <Text style={styles.previewText}>
            New Quantity Preview: {(adjustCurrentQty + adjustQtyNum).toFixed(0)} {adjustTarget?.unit}
          </Text>
        ) : null}
        <Select label="Reason" value={adjustReason} onChange={setAdjustReason} options={ADJUSTMENT_REASONS.map((r) => ({ label: r, value: r }))} />
        <Input
          label={adjustReason === 'Other' ? 'Notes (required)' : 'Notes'}
          value={adjustNotes}
          onChangeText={setAdjustNotes}
          placeholder="Additional details"
          error={notesMissingForOther ? 'Notes are required when reason is Other' : undefined}
        />
        <Text style={styles.userLabel}>Adjusted by: {user.name}</Text>
        <Button title="Apply Adjustment" onPress={handleAdjust} disabled={!canSubmitAdjust} />
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  currentQtyLabel: { color: COLORS.textSecondary, marginBottom: SPACING.sm, fontSize: 13 },
  previewText: { color: COLORS.brandRed, fontWeight: '700', marginBottom: SPACING.sm, fontSize: 13 },
  userLabel: { color: COLORS.textSecondary, marginBottom: SPACING.md, fontSize: 12 },
});
