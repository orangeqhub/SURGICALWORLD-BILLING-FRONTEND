import { getDatabase, newId, nowIso } from '../database';
import type { HeldBillRow, InvoiceRow, InvoiceItemRow, PaymentRow } from '../databaseTypes';

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
 * Saves invoice, items, payments, stock movements, stock reduction and a sync
 * queue entry in one transaction. localId is the idempotency key: if an
 * invoice with this localId already exists the function returns it unchanged
 * instead of inserting a duplicate, which protects against double-taps on Save.
 */
export async function completeBill(input: CompleteBillInput): Promise<InvoiceRow> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<InvoiceRow>('SELECT * FROM invoices WHERE localId = ?;', [input.localId]);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const hasCredit = input.payments.some((p) => p.method === 'CREDIT');
  const paidTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentStatus = hasCredit ? (paidTotal >= input.grandTotal ? 'PAID' : 'CREDIT') : paidTotal >= input.grandTotal ? 'PAID' : 'PARTIAL';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO invoices
        (id, localId, invoiceNumber, customerId, employeeId, subtotal, discount, gst, grandTotal, paymentStatus, isHeld,
         serverId, branchId, createdAt, updatedAt, syncStatus, serverConfirmed, syncedAt, purgeAfter, retryCount, lastSyncError)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, 'PENDING', 0, NULL, NULL, 0, NULL);`,
      [
        input.localId,
        input.localId,
        input.invoiceNumber,
        input.customerId,
        input.employeeId,
        input.subtotal,
        input.discount,
        input.gst,
        input.grandTotal,
        paymentStatus,
        input.branchId,
        timestamp,
        timestamp,
      ]
    );

    for (const item of input.items) {
      await db.runAsync(
        `INSERT INTO invoice_items (id, invoiceLocalId, productId, name, quantity, sellingPrice, gst, lineTotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [newId('ITM'), input.localId, item.productId, item.name, item.quantity, item.sellingPrice, item.gst, item.quantity * item.sellingPrice]
      );

      await db.runAsync(
        `INSERT INTO stock_movements (id, branchId, productId, quantity, type, referenceId, createdAt)
         VALUES (?, ?, ?, ?, 'SALE', ?, ?);`,
        [newId('MOV'), input.branchId, item.productId, -item.quantity, input.localId, timestamp]
      );

      await db.runAsync(
        `UPDATE branch_stock SET available = MAX(available - ?, 0), updatedAt = ?,
           status = CASE WHEN available - ? <= 0 THEN 'OUT_OF_STOCK'
                         WHEN available - ? <= minStock THEN 'LOW_STOCK'
                         ELSE 'IN_STOCK' END
         WHERE branchId = ? AND productId = ?;`,
        [item.quantity, timestamp, item.quantity, item.quantity, input.branchId, item.productId]
      );
    }

    for (const payment of input.payments) {
      await db.runAsync(
        `INSERT INTO payments (id, invoiceLocalId, method, amount, createdAt) VALUES (?, ?, ?, ?, ?);`,
        [newId('PAY'), input.localId, payment.method, payment.amount, timestamp]
      );
    }

    await db.runAsync(
      `INSERT INTO sync_queue (id, entityType, entityLocalId, operation, payload, status, retryCount, lastAttemptAt, lastError, createdAt)
       VALUES (?, 'invoice', ?, 'CREATE', ?, 'PENDING', 0, NULL, NULL, ?);`,
      [newId('SQ'), input.localId, JSON.stringify({ localId: input.localId }), timestamp]
    );
  });

  const row = await db.getFirstAsync<InvoiceRow>('SELECT * FROM invoices WHERE localId = ?;', [input.localId]);
  return row as InvoiceRow;
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
  const db = await getDatabase();
  const localId = newId('HLD');
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO held_bills (localId, branchId, customerId, customerName, itemsJson, subtotal, discount, gst, grandTotal, heldBy, heldAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      localId,
      input.branchId,
      input.customerId,
      input.customerName,
      JSON.stringify(input.items),
      input.subtotal,
      input.discount,
      input.gst,
      input.grandTotal,
      input.heldBy,
      timestamp,
    ]
  );

  const row = await db.getFirstAsync<HeldBillRow>('SELECT * FROM held_bills WHERE localId = ?;', [localId]);
  return row as HeldBillRow;
}

export async function listHeldBills(branchId: string): Promise<HeldBillRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<HeldBillRow>('SELECT * FROM held_bills WHERE branchId = ? ORDER BY heldAt DESC;', [branchId]);
}

export async function discardHeldBill(localId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM held_bills WHERE localId = ?;', [localId]);
}

export async function listInvoices(branchId: string, limit = 100): Promise<InvoiceRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<InvoiceRow>(
    'SELECT * FROM invoices WHERE branchId = ? ORDER BY createdAt DESC LIMIT ?;',
    [branchId, limit]
  );
}

export async function listAllInvoices(limit = 1000): Promise<InvoiceRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<InvoiceRow>('SELECT * FROM invoices ORDER BY createdAt DESC LIMIT ?;', [limit]);
}

export async function getInvoiceWithLines(localId: string): Promise<{
  invoice: InvoiceRow | null;
  items: InvoiceItemRow[];
  payments: PaymentRow[];
}> {
  const db = await getDatabase();
  const invoice = await db.getFirstAsync<InvoiceRow>('SELECT * FROM invoices WHERE localId = ?;', [localId]);
  const items = await db.getAllAsync<InvoiceItemRow>('SELECT * FROM invoice_items WHERE invoiceLocalId = ?;', [localId]);
  const payments = await db.getAllAsync<PaymentRow>('SELECT * FROM payments WHERE invoiceLocalId = ?;', [localId]);
  return { invoice: invoice ?? null, items, payments };
}
