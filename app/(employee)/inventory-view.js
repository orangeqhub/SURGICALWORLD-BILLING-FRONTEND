import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import DataTable from '../../src/components/ui/DataTable';
import ResponsiveList from '../../src/components/ui/ResponsiveList';
import ListCard from '../../src/components/ui/ListCard';
import Badge from '../../src/components/ui/Badge';
import StatusBadge from '../../src/components/ui/StatusBadge';
import MetricCard from '../../src/components/ui/MetricCard';
import Tabs from '../../src/components/ui/Tabs';
import LoadingState from '../../src/components/ui/LoadingState';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchProducts, fetchBranchStock } from '../../src/services/api/productApi';
import { fetchBatches } from '../../src/services/api/batchInventoryApi';
import { fetchMovements } from '../../src/services/api/stockMovementApi';
import { isNearExpiry, isExpired } from '../../src/utils/inventoryHelpers';
import { formatDate } from '../../src/utils/formatters';
import { SPACING, COLORS } from '../../src/theme';

/**
 * Read-only inventory view for Purchase Executive (INVENTORY_VIEW). No
 * adjustment action or Stock Adjustments tab exists on this screen at all -
 * STOCK_ADJUST is a separate permission this profile never holds, and the
 * route itself is already gated on INVENTORY_VIEW (see
 * src/constants/employeeNavigation.js).
 */
export default function EmployeeInventoryViewScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState('current');
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  const stockColumns = [
    { key: 'name', title: 'Product', flex: 1.4 },
    { key: 'code', title: 'Code' },
    { key: 'batch', title: 'Batch', render: (row) => <Text>{row.batch || '-'}</Text> },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.expiryDate ? formatDate(row.expiryDate) : '-'}</Text> },
    { key: 'available', title: 'Available', render: (row) => <Text>{row.stock?.available ?? 0} {row.unit}</Text> },
    { key: 'minStock', title: 'Min Level', render: (row) => <Text>{row.stock?.minStock ?? row.minStock}</Text> },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.stock?.status || 'IN_STOCK'} /> },
  ];

  const batchColumns = [
    { key: 'productName', title: 'Product', flex: 1.3 },
    { key: 'batchNumber', title: 'Batch No.', render: (row) => <Text>{row.batchNumber}{row.isSynthetic ? ' (Demo)' : ''}</Text> },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.expiryDate ? formatDate(row.expiryDate) : '-'}</Text> },
    { key: 'available', title: 'Available' },
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
  ];

  const tabs = [
    { key: 'current', label: 'Current Stock' },
    { key: 'batch', label: 'Batch-wise', badge: batches.length },
    { key: 'low', label: 'Low Stock', badge: lowStockRows.length },
    { key: 'nearExpiry', label: 'Near Expiry', badge: nearExpiryRows.length },
    { key: 'expired', label: 'Expired', badge: expiredRows.length },
    { key: 'movement', label: 'Stock Movement' },
  ];

  return (
    <ScreenContainer>
      <SectionHeader title="Inventory View" subtitle={`Read-only view - ${user.branchName}`} />

      <View style={styles.metricsRow}>
        <MetricCard label="Low Stock" value={lowStockRows.length} icon="alert-circle-outline" tone="warning" />
        <MetricCard label="Near Expiry" value={nearExpiryRows.length} icon="hourglass-outline" tone="warning" />
        <MetricCard label="Expired" value={expiredRows.length} icon="close-circle-outline" tone="danger" />
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
                columns={stockColumns}
                data={tab === 'current' ? rows : tab === 'low' ? lowStockRows : tab === 'nearExpiry' ? nearExpiryRows : expiredRows}
                renderCard={renderStockCard}
                keyExtractor={(item) => item.id}
                emptyLabel="No items in this view"
              />
            </>
          )}
          {tab === 'batch' && (
            <ResponsiveList columns={batchColumns} data={batches} renderCard={renderBatchCard} keyExtractor={(item) => item.id} emptyLabel="No batches recorded" />
          )}
          {tab === 'movement' && <DataTable columns={movementColumns} data={movements} keyExtractor={(item) => item.id} emptyLabel="No stock movements recorded" />}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
});
