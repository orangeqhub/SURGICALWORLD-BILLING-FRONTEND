import { getTable, commit, newId, nowIso } from '../database.web';
import type { HeldBillRow, InvoiceRow, InvoiceItemRow, PaymentRow, BranchStockRow, StockMovementRow, SyncQueueRow } from '../databaseTypes';

export interface CartLine {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  gst: number;
  unit: string;
}

export interface PaymentInput {
  method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  amount: number;
}

export interface CompleteBillInput {
  localId: string;
  branchId: string;
  employeeId: string;
  customerId: string | null;
  items: CartLine[];
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  payments: PaymentInput[];
  invoiceNumber: string;
}

/**
 * Mirrors invoiceRepository.ts#completeBill for the web (AsyncStorage) store.
 * localId is still the idempotency key: an existing invoice with the same
 * localId is returned unchanged instead of inserting a duplicate.
 */
export async function completeBill(input: CompleteBillInput): Promise<InvoiceRow> {
  const invoices = await getTable<InvoiceRow>('invoices');
  const existing = invoices.find((i) => i.localId === input.localId);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const hasCredit = input.payments.some((p) => p.method === 'CREDIT');
  const paidTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentStatus = hasCredit ? (paidTotal >= input.grandTotal ? 'PAID' : 'CREDIT') : paidTotal >= input.grandTotal ? 'PAID' : 'PARTIAL';

  const invoice: InvoiceRow = {
    id: input.localId,
    localId: input.localId,
    invoiceNumber: input.invoiceNumber,
    customerId: input.customerId,
    employeeId: input.employeeId,
    subtotal: input.subtotal,
    discount: input.discount,
    gst: input.gst,
    grandTotal: input.grandTotal,
    paymentStatus: paymentStatus as InvoiceRow['paymentStatus'],
    isHeld: 0,
    serverId: null,
    branchId: input.branchId,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'PENDING',
    serverConfirmed: 0,
    syncedAt: null,
    purgeAfter: null,
    retryCount: 0,
    lastSyncError: null,
  };
  invoices.push(invoice);

  const invoiceItems = await getTable<InvoiceItemRow>('invoice_items');
  const stockMovements = await getTable<StockMovementRow>('stock_movements');
  const branchStock = await getTable<BranchStockRow>('branch_stock');

  for (const item of input.items) {
    invoiceItems.push({
      id: newId('ITM'),
      invoiceLocalId: input.localId,
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      gst: item.gst,
      lineTotal: item.quantity * item.sellingPrice,
    });

    stockMovements.push({
      id: newId('MOV'),
      branchId: input.branchId,
      productId: item.productId,
      quantity: -item.quantity,
      type: 'SALE',
      referenceId: input.localId,
      createdAt: timestamp,
    });

    const stockRow = branchStock.find((s) => s.branchId === input.branchId && s.productId === item.productId);
    if (stockRow) {
      const available = Math.max(stockRow.available - item.quantity, 0);
      stockRow.available = available;
      stockRow.updatedAt = timestamp;
      stockRow.status = available <= 0 ? 'OUT_OF_STOCK' : available <= stockRow.minStock ? 'LOW_STOCK' : 'IN_STOCK';
    }
  }

  const payments = await getTable<PaymentRow>('payments');
  for (const payment of input.payments) {
    payments.push({
      id: newId('PAY'),
      invoiceLocalId: input.localId,
      method: payment.method,
      amount: payment.amount,
      createdAt: timestamp,
    });
  }

  const syncQueue = await getTable<SyncQueueRow>('sync_queue');
  syncQueue.push({
    id: newId('SQ'),
    entityType: 'invoice',
    entityLocalId: input.localId,
    operation: 'CREATE',
    payload: JSON.stringify({ localId: input.localId }),
    status: 'PENDING',
    retryCount: 0,
    lastAttemptAt: null,
    lastError: null,
    createdAt: timestamp,
  });

  await commit();
  return invoice;
}

export async function holdBill(input: {
  branchId: string;
  customerId: string | null;
  customerName: string | null;
  items: CartLine[];
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  heldBy: string;
}): Promise<HeldBillRow> {
  const rows = await getTable<HeldBillRow>('held_bills');
  const localId = newId('HLD');
  const timestamp = nowIso();

  const row: HeldBillRow = {
    localId,
    branchId: input.branchId,
    customerId: input.customerId,
    customerName: input.customerName,
    itemsJson: JSON.stringify(input.items),
    subtotal: input.subtotal,
    discount: input.discount,
    gst: input.gst,
    grandTotal: input.grandTotal,
    heldBy: input.heldBy,
    heldAt: timestamp,
  };

  rows.push(row);
  await commit();
  return row;
}

export async function listHeldBills(branchId: string): Promise<HeldBillRow[]> {
  const rows = await getTable<HeldBillRow>('held_bills');
  return rows
    .filter((r) => r.branchId === branchId)
    .sort((a, b) => (a.heldAt < b.heldAt ? 1 : -1));
}

export async function discardHeldBill(localId: string): Promise<void> {
  const rows = await getTable<HeldBillRow>('held_bills');
  const index = rows.findIndex((r) => r.localId === localId);
  if (index >= 0) {
    rows.splice(index, 1);
    await commit();
  }
}

export async function listInvoices(branchId: string, limit = 100): Promise<InvoiceRow[]> {
  const rows = await getTable<InvoiceRow>('invoices');
  return rows
    .filter((r) => r.branchId === branchId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function listAllInvoices(limit = 1000): Promise<InvoiceRow[]> {
  const rows = await getTable<InvoiceRow>('invoices');
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

export async function getInvoiceWithLines(localId: string): Promise<{
  invoice: InvoiceRow | null;
  items: InvoiceItemRow[];
  payments: PaymentRow[];
}> {
  const invoices = await getTable<InvoiceRow>('invoices');
  const items = await getTable<InvoiceItemRow>('invoice_items');
  const payments = await getTable<PaymentRow>('payments');

  return {
    invoice: invoices.find((i) => i.localId === localId) ?? null,
    items: items.filter((i) => i.invoiceLocalId === localId),
    payments: payments.filter((p) => p.invoiceLocalId === localId),
  };
}
