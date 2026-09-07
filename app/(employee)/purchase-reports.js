import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import ReportExportBar from '../../src/components/reports/ReportExportBar';
import LoadingState from '../../src/components/ui/LoadingState';
import { useAuth } from '../../src/hooks/useAuth';
import { listPurchasesForBranch } from '../../src/services/api/purchaseFrontendApi';
import { listSuppliersWithProfile } from '../../src/services/api/supplierMasterApi';
import { fetchPurchaseProductBreakdown } from '../../src/services/api/reportApi';
import { fetchProducts } from '../../src/services/api/productApi';
import { splitRealAndDemo } from '../../src/utils/reportDedup';
import { formatCurrency } from '../../src/utils/formatters';
import { SPACING, TYPOGRAPHY } from '../../src/theme';

export default function EmployeePurchaseReportsScreen() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productBreakdown, setProductBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listPurchasesForBranch(user.branchId),
      listSuppliersWithProfile(user.branchId),
      fetchProducts(),
      fetchPurchaseProductBreakdown(user.branchId),
    ]).then(([p, s, prods, breakdown]) => {
      setPurchases(p);
      setSuppliers(s);
      setProducts(prods);
      setProductBreakdown(breakdown);
      setLoading(false);
    });
  }, [user.branchId]);

  const supplierById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers]);
  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // Aggregate totals must never count REAL + FRONTEND_DEMO together - `real`
  // is the only source for money sums; `deduped` (real + non-colliding
  // demo, each still tagged) is what the per-row listing shows for
  // reference. A demo row sharing a purchase/invoice number with a real one
  // is dropped entirely so it can't appear twice.
  const { real, deduped } = useMemo(() => splitRealAndDemo(purchases), [purchases]);

  const totalSpend = real.reduce((sum, p) => sum + (p.netAmount ?? p.totalAmount ?? 0), 0);
  const realCount = real.length;
  const demoCount = deduped.length - real.length;

  const supplierWise = useMemo(() => {
    const map = {};
    real.forEach((p) => {
      const key = p.supplierId;
      if (!map[key]) map[key] = { supplierId: key, name: supplierById[key]?.name || key, amount: 0, count: 0 };
      map[key].amount += p.netAmount ?? p.totalAmount ?? 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [real, supplierById]);

  const productWise = useMemo(
    () => productBreakdown.map((row) => ({ ...row, name: productById[row.productId]?.name || row.productId })),
    [productBreakdown, productById]
  );

  const columns = [
    { key: 'purchaseNumber', title: 'Purchase No.', render: (row) => <Text>{row.purchaseNumber || row.invoiceNumber}</Text> },
    { key: 'supplier', title: 'Supplier', render: (row) => <Text>{supplierById[row.supplierId]?.name || row.supplierId}</Text> },
    { key: 'amount', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.netAmount ?? row.totalAmount)}</Text> },
    { key: 'source', title: 'Source', render: (row) => <Badge label={row.source === 'REAL' ? 'Real' : 'Frontend Demo'} tone={row.source === 'REAL' ? 'success' : 'info'} /> },
  ];

  const supplierColumns = [
    { key: 'name', title: 'Supplier', flex: 1.4 },
    { key: 'count', title: 'Purchases' },
    { key: 'amount', title: 'Total Spend', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.amount)}</Text> },
  ];

  const productColumns = [
    { key: 'name', title: 'Product', flex: 1.6 },
    { key: 'qty', title: 'Qty Purchased' },
    { key: 'total', title: 'Total Spend', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.total)}</Text> },
  ];

  if (loading) {
    return (
      <ScreenContainer>
        <SectionHeader title="Purchase Reports" subtitle="Purchase Executive workspace" />
        <LoadingState label="Loading purchase reports..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader title="Purchase Reports" subtitle={`${user.branchName} - totals are Real purchases only; Frontend Demo rows are shown for reference and excluded from all sums`} />

      <View style={styles.metricsRow}>
        <MetricCard label="Total Purchase Spend (Real)" value={formatCurrency(totalSpend)} icon="cash-outline" tone="brandBlue" />
        <MetricCard label="Real Purchases" value={realCount} icon="checkmark-done-outline" tone="success" />
        <MetricCard label="Frontend Demo Purchases" value={demoCount} icon="flask-outline" tone="warning" />
      </View>

      <Text style={styles.sectionLabel}>Supplier-wise Purchase Spend (Real)</Text>
      <ReportExportBar
        title="Supplier-wise Purchase Spend"
        branchName={user.branchName}
        columns={[{ key: 'name', title: 'Supplier' }, { key: 'count', title: 'Purchases' }, { key: 'amount', title: 'Total Spend', numeric: true }]}
        rows={supplierWise}
        fileName="supplier_wise_purchases"
      />
      <DataTable columns={supplierColumns} data={supplierWise} keyExtractor={(item) => item.supplierId} />

      <Text style={styles.sectionLabel}>Product-wise Purchases (Real)</Text>
      <ReportExportBar
        title="Product-wise Purchases"
        branchName={user.branchName}
        columns={[{ key: 'name', title: 'Product' }, { key: 'qty', title: 'Qty Purchased' }, { key: 'total', title: 'Total Spend', numeric: true }]}
        rows={productWise}
        fileName="product_wise_purchases"
      />
      <DataTable columns={productColumns} data={productWise} keyExtractor={(item) => item.productId} />

      <Text style={styles.sectionLabel}>All Purchases</Text>
      <DataTable columns={columns} data={deduped} keyExtractor={(item) => item.id} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  sectionLabel: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm, marginTop: SPACING.md },
});
