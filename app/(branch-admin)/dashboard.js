import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import SalesChart from '../../src/components/dashboard/SalesChart';
import PaymentChart from '../../src/components/dashboard/PaymentChart';
import StockAlertCard from '../../src/components/dashboard/StockAlertCard';
import ActivityTimeline from '../../src/components/dashboard/ActivityTimeline';
import SyncHealthCard from '../../src/components/dashboard/SyncHealthCard';
import { useAuth } from '../../src/hooks/useAuth';
import { useSync } from '../../src/hooks/useSync';
import { fetchInvoices } from '../../src/services/api/billingApi';
import { fetchBranchStock, fetchProducts } from '../../src/services/api/productApi';
import { fetchSalesTrend, fetchPaymentSplit } from '../../src/services/api/reportApi';
import { fetchDashboardSummary } from '../../src/services/api/dashboardApi';
import { ROLES } from '../../src/constants/roles';
import { formatCurrency } from '../../src/utils/formatters';
import { SPACING } from '../../src/theme';

export default function BranchAdminDashboard() {
  const { user } = useAuth();
  const { connectionStatus, pending, failed, lastSyncedAt } = useSync();

  const [invoices, setInvoices] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [paymentSplit, setPaymentSplit] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    (async () => {
      const [inv, stk, prods, trend, split] = await Promise.all([
        fetchInvoices(user.branchId),
        fetchBranchStock(user.branchId),
        fetchProducts(),
        fetchSalesTrend(user.branchId, 7),
        fetchPaymentSplit(user.branchId),
      ]);
      setInvoices(inv);
      setStock(stk);
      setProducts(prods);
      setSalesTrend(trend);
      setPaymentSplit(split);
    })();
    fetchDashboardSummary({ role: ROLES.BRANCH_ADMIN, branchId: user.branchId, isAllBranches: false }).then(setSummary);
  }, [user.branchId]);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return invoices.filter((i) => new Date(i.createdAt).toDateString() === today).reduce((sum, i) => sum + i.grandTotal, 0);
  }, [invoices]);

  const lowStockItems = useMemo(
    () =>
      stock
        .filter((s) => s.status !== 'IN_STOCK')
        .map((s) => ({ ...s, name: productById[s.productId]?.name || s.productId, unit: productById[s.productId]?.unit }))
        .slice(0, 8),
    [stock, productById]
  );

  const recentActivity = useMemo(
    () =>
      invoices.slice(0, 6).map((inv) => ({
        id: inv.localId,
        message: `Invoice ${inv.invoiceNumber} - ${formatCurrency(inv.grandTotal)}`,
        timestamp: inv.createdAt,
        icon: 'receipt-outline',
      })),
    [invoices]
  );

  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  const purchaseActivity = useMemo(
    () =>
      (summary?.recentPurchases || []).map((p) => ({
        id: p.localId || p.id,
        message: `Purchase ${p.invoiceNumber || p.id} - ${formatCurrency(p.totalAmount)}`,
        timestamp: p.createdAt,
        icon: 'bag-add-outline',
      })),
    [summary]
  );

  const paymentActivity = useMemo(
    () =>
      (summary?.recentPayments || []).map((p) => ({
        id: p.id,
        message: `Paid ${formatCurrency(p.amount)} to ${p.supplierName} (${p.mode})`,
        timestamp: p.date,
        icon: 'card-outline',
      })),
    [summary]
  );

  const receiptActivity = useMemo(
    () =>
      (summary?.recentReceipts || []).map((r) => ({
        id: r.id,
        message: `Received ${formatCurrency(r.amount)} from ${r.customerName} (${r.mode})`,
        timestamp: r.date,
        icon: 'document-text-outline',
      })),
    [summary]
  );

  return (
    <ScreenContainer>
      <SectionHeader title="Branch Dashboard" subtitle={user.branchName} />

      <View style={styles.metricsRow}>
        <MetricCard label="Today's Sales" value={formatCurrency(todaySales)} icon="cash-outline" tone="success" />
        <MetricCard label="Total Invoices" value={invoices.length} icon="receipt-outline" />
        <MetricCard label="Low Stock Items" value={lowStockItems.length} icon="alert-circle-outline" tone="warning" />
        {summary?.todaysPurchases !== undefined && (
          <MetricCard label="Today's Purchases" value={formatCurrency(summary.todaysPurchases)} icon="bag-add-outline" tone="brandBlue" />
        )}
        {summary?.nearExpiryCount !== undefined && (
          <MetricCard label="Near Expiry" value={summary.nearExpiryCount} icon="hourglass-outline" tone="warning" />
        )}
        {summary?.expiredCount !== undefined && (
          <MetricCard label="Expired" value={summary.expiredCount} icon="close-circle-outline" tone="danger" />
        )}
        {summary?.outstandingReceivables !== undefined && (
          <MetricCard label="Receivables" value={formatCurrency(summary.outstandingReceivables)} icon="arrow-down-circle-outline" tone="success" />
        )}
        {summary?.outstandingPayables !== undefined && (
          <MetricCard label="Payables" value={formatCurrency(summary.outstandingPayables)} icon="arrow-up-circle-outline" tone="danger" />
        )}
      </View>

      <View style={[styles.chartsRow, isMobile && styles.rowMobile]}>
        <SalesChart title="Last 7 Days Sales" data={salesTrend} style={isMobile ? { minHeight: 280 } : { flex: 2 }} />
        <PaymentChart title="Payment Split" data={paymentSplit} style={isMobile ? { minHeight: 280 } : { flex: 1 }} />
      </View>

      <View style={[styles.chartsRow, isMobile && styles.rowMobile]}>
        <StockAlertCard items={lowStockItems} style={isMobile ? { minHeight: 280 } : { flex: 1 }} />
        <ActivityTimeline items={recentActivity} style={isMobile ? { minHeight: 280 } : { flex: 1 }} />
      </View>

      {(purchaseActivity.length > 0 || paymentActivity.length > 0 || receiptActivity.length > 0) && (
        <View style={[styles.chartsRow, isMobile && styles.rowMobile]}>
          {purchaseActivity.length > 0 && (
            <ActivityTimeline title="Recent Purchases" items={purchaseActivity} style={isMobile ? { minHeight: 220 } : { flex: 1 }} />
          )}
          {paymentActivity.length > 0 && (
            <ActivityTimeline title="Recent Payments" items={paymentActivity} style={isMobile ? { minHeight: 220 } : { flex: 1 }} />
          )}
          {receiptActivity.length > 0 && (
            <ActivityTimeline title="Recent Receipts" items={receiptActivity} style={isMobile ? { minHeight: 220 } : { flex: 1 }} />
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  chartsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  rowMobile: { flexDirection: 'column' },
});
