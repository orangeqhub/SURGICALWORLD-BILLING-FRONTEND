import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import SalesChart from '../../src/components/dashboard/SalesChart';
import BranchSalesChart from '../../src/components/dashboard/BranchSalesChart';
import PaymentChart from '../../src/components/dashboard/PaymentChart';
import ActivityTimeline from '../../src/components/dashboard/ActivityTimeline';
import SyncHealthCard from '../../src/components/dashboard/SyncHealthCard';
import { useBranch } from '../../src/hooks/useBranch';
import { useSync } from '../../src/hooks/useSync';
import { fetchInvoices, fetchAllInvoices } from '../../src/services/api/billingApi';
import { fetchBranchStock, fetchAllBranchStock, fetchProducts } from '../../src/services/api/productApi';
import { fetchSalesTrend, fetchPaymentSplit, fetchBranchSalesBreakdown } from '../../src/services/api/reportApi';
import { fetchDashboardSummary } from '../../src/services/api/dashboardApi';
import { ROLES } from '../../src/constants/roles';
import { BRANCHES } from '../../src/constants/branches';
import { formatCurrency } from '../../src/utils/formatters';
import { SPACING } from '../../src/theme';

export default function SuperAdminDashboard() {
  const { selectedBranchId, selectedBranch, isAllBranches } = useBranch();
  const { connectionStatus, pending, failed, lastSyncedAt } = useSync();

  const [invoices, setInvoices] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [paymentSplit, setPaymentSplit] = useState([]);
  const [branchBreakdown, setBranchBreakdown] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    (async () => {
      const [inv, stk, prods, breakdown] = await Promise.all([
        isAllBranches ? fetchAllInvoices() : fetchInvoices(selectedBranchId, 500),
        isAllBranches ? fetchAllBranchStock() : fetchBranchStock(selectedBranchId),
        fetchProducts(),
        fetchBranchSalesBreakdown(),
      ]);
      setInvoices(inv);
      setStock(stk);
      setProducts(prods);
      setBranchBreakdown(
        breakdown.map((b) => ({ label: BRANCHES.find((br) => br.id === b.branchId)?.name || b.branchId, value: b.value }))
      );

      if (!isAllBranches) {
        const [trend, split] = await Promise.all([
          fetchSalesTrend(selectedBranchId, 7),
          fetchPaymentSplit(selectedBranchId),
        ]);
        setSalesTrend(trend);
        setPaymentSplit(split);
      } else {
        setSalesTrend([]);
        setPaymentSplit([]);
      }
    })();
    fetchDashboardSummary({ role: ROLES.SUPER_ADMIN, branchId: selectedBranchId, isAllBranches }).then(setSummary);
  }, [selectedBranchId, isAllBranches]);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalBills = invoices.length;
  const paidTotal = invoices.filter((i) => i.paymentStatus === 'PAID').reduce((sum, i) => sum + i.grandTotal, 0);
  const creditTotal = invoices.filter((i) => i.paymentStatus === 'CREDIT').reduce((sum, i) => sum + i.grandTotal, 0);
  const lowStockCount = stock.filter((s) => s.status === 'LOW_STOCK').length;
  const outOfStockCount = stock.filter((s) => s.status === 'OUT_OF_STOCK').length;
  const inventoryValue = stock.reduce((sum, s) => sum + s.available * (productById[s.productId]?.sellingPrice || 0), 0);

  const branchRankings = useMemo(
    () => [...branchBreakdown].sort((a, b) => b.value - a.value),
    [branchBreakdown]
  );

  const recentActivity = useMemo(
    () =>
      invoices.slice(0, 6).map((inv) => ({
        id: inv.localId,
        message: `Invoice ${inv.invoiceNumber} - ${formatCurrency(inv.grandTotal)} (${BRANCHES.find((b) => b.id === inv.branchId)?.name || inv.branchId})`,
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
      <SectionHeader
        title="Global Dashboard"
        subtitle={isAllBranches ? 'All Branches - Head Office View' : selectedBranch?.name}
      />

      <View style={styles.metricsRow}>
        <MetricCard label="Total Sales" value={formatCurrency(totalSales)} icon="cash-outline" tone="success" />
        <MetricCard label="Total Bills" value={totalBills} icon="receipt-outline" />
        <MetricCard label="Paid" value={formatCurrency(paidTotal)} icon="checkmark-done-outline" tone="brandBlue" />
        <MetricCard label="Credit Outstanding" value={formatCurrency(creditTotal)} icon="time-outline" tone="warning" />
        <MetricCard label="Low Stock" value={lowStockCount} icon="alert-circle-outline" tone="warning" />
        <MetricCard label="Out of Stock" value={outOfStockCount} icon="close-circle-outline" tone="danger" />
        <MetricCard label="Inventory Value" value={formatCurrency(inventoryValue)} icon="cube-outline" tone="purple" />
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
        {isAllBranches ? (
          <BranchSalesChart title="Sales by Branch" data={branchBreakdown} style={isMobile ? { minHeight: 280 } : { flex: 2 }} />
        ) : (
          <SalesChart title="Sales Trend (7 Days)" data={salesTrend} style={isMobile ? { minHeight: 280 } : { flex: 2 }} />
        )}
        <PaymentChart title="Payment Split" data={paymentSplit.length ? paymentSplit : branchBreakdown} style={isMobile ? { minHeight: 280 } : { flex: 1 }} />
      </View>

      <View style={[styles.chartsRow, isMobile && styles.rowMobile]}>
        <BranchSalesChart title="Branch Rankings" data={branchRankings} style={isMobile ? { minHeight: 280 } : { flex: 1 }} />
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
