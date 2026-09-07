import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import Badge from '../../src/components/ui/Badge';
import MetricCard from '../../src/components/ui/MetricCard';
import BranchSalesChart from '../../src/components/dashboard/BranchSalesChart';
import PaymentChart from '../../src/components/dashboard/PaymentChart';
import DataTable from '../../src/components/ui/DataTable';
import ReportExportBar from '../../src/components/reports/ReportExportBar';
import Card from '../../src/components/ui/Card';
import { fetchAllInvoices } from '../../src/services/api/billingApi';
import { fetchAllBranchStock, fetchProducts } from '../../src/services/api/productApi';
import { fetchBranchSalesBreakdown, fetchCustomerSales, fetchPurchaseProductBreakdown } from '../../src/services/api/reportApi';
import { fetchPurchases } from '../../src/services/api/purchaseApi';
import { fetchExpenses } from '../../src/services/api/expenseApi';
import { listCustomersWithProfile } from '../../src/services/api/customerMasterApi';
import { BRANCHES } from '../../src/constants/branches';
import { formatCurrency } from '../../src/utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

const RANGES = [
  { key: 'DAILY', label: 'Daily', days: 1 },
  { key: 'MONTHLY', label: 'Monthly', days: 30 },
  { key: 'QUARTERLY', label: 'Quarterly', days: 90 },
  { key: 'HALF_YEARLY', label: 'Half-Yearly', days: 182 },
  { key: 'YEARLY', label: 'Yearly', days: 365 },
  { key: 'CUSTOM', label: 'Custom Range', days: null },
];

export default function GlobalReportsScreen() {
  const [range, setRange] = useState('MONTHLY');
  const [invoices, setInvoices] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchBreakdown, setBranchBreakdown] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customerSales, setCustomerSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [purchaseProductBreakdown, setPurchaseProductBreakdown] = useState([]);

  const load = useCallback(async () => {
    const [inv, stk, prods, breakdown, purchasesByBranch, expensesByBranch, custSales, custs, purchProdBreakdown] = await Promise.all([
      fetchAllInvoices(),
      fetchAllBranchStock(),
      fetchProducts(),
      fetchBranchSalesBreakdown(),
      Promise.all(BRANCHES.map((b) => fetchPurchases(b.id))),
      Promise.all(BRANCHES.map((b) => fetchExpenses(b.id))),
      fetchCustomerSales(),
      listCustomersWithProfile(),
      fetchPurchaseProductBreakdown(),
    ]);
    setInvoices(inv);
    setStock(stk);
    setProducts(prods);
    setBranchBreakdown(breakdown.map((b) => ({ label: BRANCHES.find((br) => br.id === b.branchId)?.name || b.branchId, value: b.value })));
    setPurchases(purchasesByBranch.flat());
    setExpenses(expensesByBranch.flat());
    setCustomerSales(custSales);
    setCustomers(custs);
    setPurchaseProductBreakdown(purchProdBreakdown);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeRange = RANGES.find((r) => r.key === range);

  const rangedInvoices = useMemo(() => {
    if (!activeRange?.days) return invoices;
    const cutoff = Date.now() - activeRange.days * 24 * 60 * 60 * 1000;
    return invoices.filter((inv) => new Date(inv.createdAt).getTime() >= cutoff);
  }, [invoices, activeRange]);

  const totalSales = rangedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const onlineCreated = rangedInvoices.filter((i) => i.syncStatus === 'SYNCED').length;
  const offlineCreated = rangedInvoices.length - onlineCreated;
  const lowStockCount = stock.filter((s) => s.status === 'LOW_STOCK').length;
  const outOfStockCount = stock.filter((s) => s.status === 'OUT_OF_STOCK').length;

  const rangedPurchases = useMemo(() => {
    if (!activeRange?.days) return purchases;
    const cutoff = Date.now() - activeRange.days * 24 * 60 * 60 * 1000;
    return purchases.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }, [purchases, activeRange]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const gst = useMemo(() => {
    const totalGst = rangedInvoices.reduce((sum, inv) => sum + inv.gst, 0);
    const taxableAmount = rangedInvoices.reduce((sum, inv) => sum + (inv.subtotal - inv.discount), 0);
    return { totalGst, taxableAmount, invoiceValue: totalSales };
  }, [rangedInvoices, totalSales]);

  const profitAndLoss = useMemo(() => {
    const revenue = rangedInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.gst), 0);
    const costOfGoods = rangedPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const grossProfit = revenue - costOfGoods;
    const netProfit = grossProfit - totalExpenses;
    return { revenue, costOfGoods, grossProfit, operatingExpenses: totalExpenses, netProfit };
  }, [rangedInvoices, rangedPurchases, totalExpenses]);

  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const customerSalesTable = useMemo(
    () => customerSales.map((row) => ({ ...row, name: customerById[row.customerId]?.name || row.customerId })),
    [customerSales, customerById]
  );

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const purchaseProductTable = useMemo(
    () => purchaseProductBreakdown.map((row) => ({ ...row, name: productById[row.productId]?.name || row.productId })),
    [purchaseProductBreakdown, productById]
  );

  const branchTable = useMemo(() => {
    return BRANCHES.map((branch) => {
      const branchInvoices = rangedInvoices.filter((inv) => inv.branchId === branch.id);
      return {
        id: branch.id,
        name: branch.name,
        bills: branchInvoices.length,
        sales: branchInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      };
    });
  }, [rangedInvoices]);

  const branchColumns = [
    { key: 'name', title: 'Branch', flex: 1.3 },
    { key: 'bills', title: 'Bills' },
    { key: 'sales', title: 'Sales', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.sales)}</Text> },
  ];

  const customerSalesColumns = [
    { key: 'name', title: 'Customer', flex: 1.6 },
    { key: 'bills', title: 'Bills' },
    { key: 'total', title: 'Sales', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.total)}</Text> },
  ];

  const purchaseProductColumns = [
    { key: 'name', title: 'Product', flex: 1.6 },
    { key: 'qty', title: 'Qty Purchased' },
    { key: 'total', title: 'Total Spend', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.total)}</Text> },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Global Reports"
        subtitle="Consolidated and branch-wise reporting across the network"
      />

      <View style={styles.filterRow}>
        {RANGES.map((r) => (
          <Badge key={r.key} label={r.label} tone={range === r.key ? 'danger' : 'neutral'} onPress={() => setRange(r.key)} style={{ paddingHorizontal: SPACING.sm }} />
        ))}
      </View>

      <View style={styles.metricsRow}>
        <MetricCard label="Consolidated Sales" value={formatCurrency(totalSales)} icon="cash-outline" tone="success" />
        <MetricCard label="Total Bills" value={rangedInvoices.length} icon="receipt-outline" />
        <MetricCard label="Online Bills" value={onlineCreated} icon="cloud-done-outline" tone="brandBlue" />
        <MetricCard label="Offline Bills" value={offlineCreated} icon="cloud-offline-outline" tone="warning" />
        <MetricCard label="Low Stock (Network)" value={lowStockCount} icon="alert-circle-outline" tone="warning" />
        <MetricCard label="Out of Stock (Network)" value={outOfStockCount} icon="close-circle-outline" tone="danger" />
      </View>

      <View style={styles.chartsRow}>
        <BranchSalesChart title="Sales by Branch" data={branchBreakdown} style={{ flex: 2 }} />
        <PaymentChart title="Network Payment Split" data={branchBreakdown} style={{ flex: 1 }} />
      </View>

      <Text style={styles.sectionLabel}>Branch-wise Report</Text>
      <ReportExportBar
        title="Branch-wise Sales Report"
        branchName="All Branches"
        filtersSummary={activeRange?.label}
        columns={[{ key: 'name', title: 'Branch' }, { key: 'bills', title: 'Bills' }, { key: 'sales', title: 'Sales', numeric: true }]}
        rows={branchTable}
        fileName="branch_wise_sales"
      />
      <DataTable columns={branchColumns} data={branchTable} keyExtractor={(item) => item.id} />

      <View style={{ marginTop: SPACING.lg, marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Customer-wise Sales</Text>
        <ReportExportBar
          title="Customer-wise Sales"
          branchName="All Branches"
          columns={[{ key: 'name', title: 'Customer' }, { key: 'bills', title: 'Bills' }, { key: 'total', title: 'Sales', numeric: true }]}
          rows={customerSalesTable}
          fileName="customer_wise_sales"
        />
        <DataTable columns={customerSalesColumns} data={customerSalesTable} keyExtractor={(item) => item.customerId} />
      </View>

      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Product-wise Purchases</Text>
        <ReportExportBar
          title="Product-wise Purchases"
          branchName="All Branches"
          columns={[{ key: 'name', title: 'Product' }, { key: 'qty', title: 'Qty Purchased' }, { key: 'total', title: 'Total Spend', numeric: true }]}
          rows={purchaseProductTable}
          fileName="product_wise_purchases"
        />
        <DataTable columns={purchaseProductColumns} data={purchaseProductTable} keyExtractor={(item) => item.productId} />
      </View>

      <Card style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.cardTitle}>GST Report</Text>
        <View style={styles.inventoryRow}>
          <Text style={styles.inventoryStat}>Taxable Amount: <Text style={styles.inventoryValue}>{formatCurrency(gst.taxableAmount)}</Text></Text>
          <Text style={styles.inventoryStat}>GST Collected: <Text style={styles.inventoryValue}>{formatCurrency(gst.totalGst)}</Text></Text>
          <Text style={styles.inventoryStat}>Invoice Value: <Text style={styles.inventoryValue}>{formatCurrency(gst.invoiceValue)}</Text></Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Profit &amp; Loss (Simplified)</Text>
        <Text style={styles.helperText}>Revenue less purchases and expenses for the selected period, across all branches - a frontend approximation, not full accrual accounting.</Text>
        <Row label="Revenue (Sales, ex-GST)" value={formatCurrency(profitAndLoss.revenue)} />
        <Row label="Cost of Goods (Purchases)" value={formatCurrency(profitAndLoss.costOfGoods)} />
        <Row label="Gross Profit" value={formatCurrency(profitAndLoss.grossProfit)} />
        <Row label="Operating Expenses" value={formatCurrency(profitAndLoss.operatingExpenses)} />
        <Row label="Net Profit" value={formatCurrency(profitAndLoss.netProfit)} strong />
      </Card>
    </ScreenContainer>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.plRow}>
      <Text style={styles.plLabel}>{label}</Text>
      <Text style={[styles.plValue, strong && styles.plValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.lg },
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  chartsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  sectionLabel: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  helperText: { ...TYPOGRAPHY.caption, marginBottom: SPACING.sm },
  inventoryRow: { flexDirection: 'row', gap: SPACING.lg, flexWrap: 'wrap' },
  inventoryStat: { ...TYPOGRAPHY.caption },
  inventoryValue: { color: COLORS.textPrimary, fontWeight: '800' },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xxs, borderTopWidth: 1, borderTopColor: COLORS.border },
  plLabel: { ...TYPOGRAPHY.caption },
  plValue: { ...TYPOGRAPHY.bodyStrong },
  plValueStrong: { color: COLORS.brandRed, fontSize: 16 },
});
