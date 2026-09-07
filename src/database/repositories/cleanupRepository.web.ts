import { getTable, commit, newId, nowIso } from '../database.web';
import type { CleanupHistoryRow, InvoiceRow, InvoiceItemRow, PaymentRow, SyncLogRow } from '../databaseTypes';

const DEFAULT_SYNC_LOG_RETENTION_DAYS = 7;

export async function purgeExpiredInvoices(): Promise<number> {
  const now = nowIso();
  const invoices = await getTable<InvoiceRow>('invoices');

  const eligible = invoices.filter(
    (i) =>
      i.syncStatus === 'SYNCED' &&
      i.serverConfirmed === 1 &&
      i.serverId != null &&
      i.syncedAt != null &&
      i.purgeAfter != null &&
      i.purgeAfter < now &&
      i.isHeld === 0 &&
      i.paymentStatus === 'PAID'
  );

  if (eligible.length === 0) {
    return 0;
  }

  const eligibleIds = new Set(eligible.map((i) => i.localId));
  const payments = await getTable<PaymentRow>('payments');
  const items = await getTable<InvoiceItemRow>('invoice_items');

  const remainingPayments = payments.filter((p) => !eligibleIds.has(p.invoiceLocalId));
  payments.length = 0;
  payments.push(...remainingPayments);

  const remainingItems = items.filter((i) => !eligibleIds.has(i.invoiceLocalId));
  items.length = 0;
  items.push(...remainingItems);

  const remainingInvoices = invoices.filter((i) => !eligibleIds.has(i.localId));
  invoices.length = 0;
  invoices.push(...remainingInvoices);

  await commit();
  return eligible.length;
}

export async function purgeOldSyncLogs(retentionDays: number = DEFAULT_SYNC_LOG_RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const logs = await getTable<SyncLogRow>('sync_logs');

  const eligible = logs.filter((l) => l.status === 'SUCCESS' && l.createdAt < cutoff);
  if (eligible.length === 0) {
    return 0;
  }

  const remaining = logs.filter((l) => !(l.status === 'SUCCESS' && l.createdAt < cutoff));
  logs.length = 0;
  logs.push(...remaining);

  await commit();
  return eligible.length;
}

export async function getLastCleanupRun(): Promise<CleanupHistoryRow | null> {
  const rows = await getTable<CleanupHistoryRow>('cleanup_history');
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => (a.ranAt < b.ranAt ? 1 : -1))[0];
}

export async function recordCleanupRun(invoicesDeleted: number, filesDeleted: number, logsDeleted: number): Promise<void> {
  const rows = await getTable<CleanupHistoryRow>('cleanup_history');
  rows.push({ id: newId('CLN'), ranAt: nowIso(), invoicesDeleted, filesDeleted, logsDeleted });
  await commit();
}

export async function shouldRunCleanupToday(): Promise<boolean> {
  const last = await getLastCleanupRun();
  if (!last) return true;
  const lastRunDate = new Date(last.ranAt).toDateString();
  const today = new Date().toDateString();
  return lastRunDate !== today;
}
