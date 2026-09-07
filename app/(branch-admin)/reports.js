import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import Badge from '../../src/components/ui/Badge';
import MetricCard from '../../src/components/ui/MetricCard';
import SalesChart from '../../src/components/dashboard/SalesChart';
import PaymentChart from '../../src/components/dashboard/PaymentChart';
import DataTable from '../../src/components/ui/DataTable';
import Card from '../../src/components/ui/Card';
import ReportExportBar from '../../src/components/reports/ReportExportBar';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchInvoices } from '../../src/services/api/billingApi';
import { fetchExpenses } from '../../src/services/api/expenseApi';
import { fetchPurchases } from '../../src/services/api/purchaseApi';
import { fetchBranchStock, fetchProducts } from '../../src/services/api/productApi';
import { fetchSalesTrend, fetchPaymentSplit, fetchProductSales, fetchCustomerSales, fetchPurchaseProductBreakdown } from '../../src/services/api/reportApi';
import { listCustomersWithProfile } from '../../src/services/api/customerMasterApi';
import { EMPLOYEES } from '../../src/constants/employees';
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

export default function BranchReportsScreen() {
  const { user } = useAuth();
  const [range, setRange] = useState('MONTHLY');
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [paymentSplit, setPaymentSplit] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customerSales, setCustomerSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [purchaseProductBreakdown, setPurchaseProductBreakdown] = useState([]);

  const load = useCallback(async () => {
    const [inv, exp, stk, prods, trend, split, prodSales, purch, custSales, custs, purchProdBreakdown] = await Promise.all([
      fetchInvoices(user.branchId, 500),
      fetchExpenses(user.branchId),
      fetchBranchStock(user.branchId),
      fetchProducts(),
      fetchSalesTrend(user.branchId, 14),
      fetchPaymentSplit(user.branchId),
      fetchProductSales(user.branchId),
      fetchPurchases(user.branchId),
      fetchCustomerSales(user.branchId),
      listCustomersWithProfile(user.branchId),
      fetchPurchaseProductBreakdown(user.branchId),
    ]);
    setInvoices(inv);
    setExpenses(exp);
    setStock(stk);
    setProducts(prods);
    setSalesTrend(trend);
    setPaymentSplit(split);
    setProductSales(prodSales);
    setPurchases(purch);
    setCustomerSales(custSales);
    setCustomers(custs);
    setPurchaseProductBreakdown(purchProdBreakdown);
  }, [user.branchId]);

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
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const onlineCreated = rangedInvoices.filter((i) => i.syncStatus === 'SYNCED').length;
  const offlineCreated = rangedInvoices.length - onlineCreated;

  const employeePerformance = useMemo(() => {
    const branchEmployees = EMPLOYEES.filter((e) => e.branchId === user.branchId);
    return branchEmployees.map((emp) => {
      const empInvoices = rangedInvoices.filter((inv) => inv.employeeId === emp.id);
      return {
        id: emp.id,
        name: emp.name,
        bills: empInvoices.length,
        sales: empInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      };
    });
  }, [rangedInvoices, user.branchId]);

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

  const lowStockCount = stock.filter((s) => s.status === 'LOW_STOCK').length;
  const outOfStockCount = stock.filter((s) => s.status === 'OUT_OF_STOCK').length;

  const rangedPurchases = useMemo(() => {
    if (!activeRange?.days) return purchases;
    const cutoff = Date.now() - activeRange.days * 24 * 60 * 60 * 1000;
    return purchases.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }, [purchases, activeRange]);

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

  const employeeColumns = [
    { key: 'name', title: 'Employee', flex: 1.4 },
    { key: 'bills', title: 'Bills' },
    { key: 'sales', title: 'Sales', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.sales)}</Text> },
  ];

  const expenseColumns = [
    { key: 'category', title: 'Category', flex: 1.2 },
    { key: 'amount', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.amount)}</Text> },
    { key: 'note', title: 'Note', flex: 1.6, render: (row) => <Text numberOfLines={1}>{row.note}</Text> },
  ];

  const productSalesColumns = [
    { key: 'name', title: 'Product', flex: 1.6 },
    { key: 'qty', title: 'Qty Sold' },
    { key: 'total', title: 'Revenue', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.total)}</Text> },
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
      <SectionHeader title="Reports" subtitle={`${user.branchName} - assigned branch data only`} />

      <View style={styles.filterRow}>
        {RANGES.map((r) => (
          <Badge key={r.key} label={r.label} tone={range === r.key ? 'danger' : 'neutral'} onPress={() => setRange(r.key)} style={{ paddingHorizontal: SPACING.sm }} />
        ))}
      </View>

      <View style={styles.metricsRow}>
        <MetricCard label="Sales" value={formatCurrency(totalSales)} icon="cash-outline" tone="success" />
        <MetricCard label="Bills" value={rangedInvoices.length} icon="receipt-outline" />
        <MetricCard label="Expenses" value={formatCurrency(totalExpenses)} icon="wallet-outline" tone="danger" />
        <MetricCard label="Online Bills" value={onlineCreated} icon="cloud-done-outline" tone="brandBlue" />
        <MetricCard label="Offline Bills" value={offlineCreated} icon="cloud-offline-outline" tone="warning" />
      </View>

      <View style={styles.chartsRow}>
        <SalesChart title="Sales Trend" data={salesTrend} style={{ flex: 2 }} />
        <PaymentChart title="Payment Summary" data={paymentSplit} style={{ flex: 1 }} />
      </View>

      <Card style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.cardTitle}>Inventory Summary</Text>
        <View style={styles.inventoryRow}>
          <Text style={styles.inventoryStat}>Low Stock: <Text style={styles.inventoryValue}>{lowStockCount}</Text></Text>
          <Text style={styles.inventoryStat}>Out of Stock: <Text style={styles.inventoryValue}>{outOfStockCount}</Text></Text>
          <Text style={styles.inventoryStat}>Total Products: <Text style={styles.inventoryValue}>{products.length}</Text></Text>
        </View>
      </Card>

      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Top Selling Products</Text>
        <ReportExportBar
          title="Top Selling Products"
          branchName={user.branchName}
          filtersSummary={activeRange?.label}
          columns={[{ key: 'name', title: 'Product' }, { key: 'qty', title: 'Qty Sold' }, { key: 'total', title: 'Revenue', numeric: true }]}
          rows={productSales}
          fileName="top_selling_products"
        />
        <DataTable columns={productSalesColumns} data={productSales} keyExtractor={(item) => item.productId} />
      </View>

      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Customer-wise Sales</Text>
        <ReportExportBar
          title="Customer-wise Sales"
          branchName={user.branchName}
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
          branchName={user.branchName}
          columns={[{ key: 'name', title: 'Product' }, { key: 'qty', title: 'Qty Purchased' }, { key: 'total', title: 'Total Spend', numeric: true }]}
          rows={purchaseProductTable}
          fileName="product_wise_purchases"
        />
        <DataTable columns={purchaseProductColumns} data={purchaseProductTable} keyExtractor={(item) => item.productId} />
      </View>

      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Employee Performance</Text>
        <DataTable columns={employeeColumns} data={employeePerformance} keyExtractor={(item) => item.id} />
      </View>

      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Expenses</Text>
        <DataTable columns={expenseColumns} data={expenses} keyExtractor={(item) => item.localId} />
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
        <Text style={styles.helperText}>Revenue less purchases and expenses for the selected period - a frontend approximation, not full accrual accounting.</Text>
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
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  helperText: { ...TYPOGRAPHY.caption, marginBottom: SPACING.sm },
  inventoryRow: { flexDirection: 'row', gap: SPACING.lg, flexWrap: 'wrap' },
  inventoryStat: { ...TYPOGRAPHY.caption },
  inventoryValue: { color: COLORS.textPrimary, fontWeight: '800' },
  sectionLabel: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xxs, borderTopWidth: 1, borderTopColor: COLORS.border },
  plLabel: { ...TYPOGRAPHY.caption },
  plValue: { ...TYPOGRAPHY.bodyStrong },
  plValueStrong: { color: COLORS.brandRed, fontSize: 16 },
});
