import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import MetricCard from '../../src/components/ui/MetricCard';
import ActivityTimeline from '../../src/components/dashboard/ActivityTimeline';
import EmptyState from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchDashboardSummary } from '../../src/services/api/dashboardApi';
import { ROLES } from '../../src/constants/roles';
import { formatCurrency } from '../../src/utils/formatters';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../src/theme';

export default function EmployeeDashboardScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  useEffect(() => {
    fetchDashboardSummary({
      role: ROLES.EMPLOYEE,
      branchId: user.branchId,
      permissions: user.permissions || [],
      isAllBranches: false,
    }).then(setSummary);
  }, [user.branchId, user.permissions]);

  const purchaseActivity = useMemo(
    () =>
      (summary?.recentPurchases || []).map((p) => ({
        id: p.localId || p.id,
        message: `Purchase ${p.invoiceNumber || p.id} - ${formatCurrency(p.totalAmount)}`,
        timestamp: p.createdAt,
        icon: 'bag-add-outline',
        color: COLORS.brandBlue,
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
        color: COLORS.warning,
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
        color: COLORS.success,
      })),
    [summary]
  );

  if (!summary) {
    return (
      <ScreenContainer>
        <SectionHeader title="Dashboard" subtitle={`${user.roleLabel} - ${user.branchName}`} />
      </ScreenContainer>
    );
  }

  const hasAnyMetric = [
    'todaysSales',
    'todaysPurchases',
    'stockValue',
    'lowStockCount',
    'nearExpiryCount',
    'expiredCount',
    'outstandingReceivables',
    'outstandingPayables',
  ].some((key) => summary[key] !== undefined);

  return (
    <ScreenContainer>
      <SectionHeader title="Dashboard" subtitle={`${user.roleLabel} - ${user.branchName}`} />

      {!hasAnyMetric ? (
        <EmptyState icon="grid-outline" title="No dashboard metrics available" message="Your current role has no summary cards assigned yet." />
      ) : (
        <View style={styles.metricsRow}>
          {summary.todaysSales !== undefined && (
            <MetricCard label="Today's Sales" value={formatCurrency(summary.todaysSales)} icon="cash-outline" tone="success" />
          )}
          {summary.todaysPurchases !== undefined && (
            <MetricCard label="Today's Purchases" value={formatCurrency(summary.todaysPurchases)} icon="bag-add-outline" tone="brandBlue" />
          )}
          {summary.stockValue !== undefined && (
            <MetricCard label="Stock Value" value={formatCurrency(summary.stockValue)} icon="cube-outline" tone="purple" />
          )}
          {summary.lowStockCount !== undefined && (
            <MetricCard label="Low Stock" value={summary.lowStockCount} icon="alert-circle-outline" tone="warning" />
          )}
          {summary.nearExpiryCount !== undefined && (
            <MetricCard label="Near Expiry" value={summary.nearExpiryCount} icon="hourglass-outline" tone="warning" />
          )}
          {summary.expiredCount !== undefined && (
            <MetricCard label="Expired" value={summary.expiredCount} icon="close-circle-outline" tone="danger" />
          )}
          {summary.outstandingReceivables !== undefined && (
            <MetricCard label="Receivables" value={formatCurrency(summary.outstandingReceivables)} icon="arrow-down-circle-outline" tone="success" />
          )}
          {summary.outstandingPayables !== undefined && (
            <MetricCard label="Payables" value={formatCurrency(summary.outstandingPayables)} icon="arrow-up-circle-outline" tone="danger" />
          )}
        </View>
      )}

      {summary.topSellingProducts?.length > 0 && (
        <View style={[styles.card, SHADOWS.card]}>
          <Text style={styles.cardTitle}>Top Selling Products</Text>
          {summary.topSellingProducts.map((p) => (
            <View key={p.productId} style={styles.productRow}>
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.productMeta}>{p.qty} sold - {formatCurrency(p.total)}</Text>
            </View>
          ))}
        </View>
      )}

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
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.lg },
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  productName: { ...TYPOGRAPHY.bodyStrong, flex: 1, marginRight: SPACING.sm },
  productMeta: { ...TYPOGRAPHY.small },
});
