import { getDatabase, newId, nowIso } from '../database';
import type { PurchaseRow, PurchaseItemRow, SupplierRow, ExpenseRow } from '../databaseTypes';
import { SUPPLIERS } from '../../constants/suppliers';

export async function seedSuppliers(): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM suppliers;');
  if (existing && existing.count > 0) {
    return;
  }

  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (const supplier of SUPPLIERS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO suppliers (id, name, mobile, address, gst, updatedAt) VALUES (?, ?, ?, ?, ?, ?);`,
        [supplier.id, supplier.name, supplier.phone, supplier.address, supplier.gst, timestamp]
      );
    }
  });
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SupplierRow>('SELECT * FROM suppliers ORDER BY name;');
}

export async function createPurchase(input: {
  branchId: string;
  supplierId: string;
  invoiceNumber: string;
  items: { productId: string; quantity: number; purchasePrice: number }[];
}): Promise<PurchaseRow> {
  const db = await getDatabase();
  const localId = newId('PUR');
  const timestamp = nowIso();
  const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO purchases
        (id, localId, supplierId, invoiceNumber, totalAmount, status, serverId, branchId, createdAt, updatedAt, syncStatus, serverConfirmed, syncedAt, purgeAfter, retryCount, lastSyncError)
       VALUES (?, ?, ?, ?, ?, 'RECEIVED', NULL, ?, ?, ?, 'PENDING', 0, NULL, NULL, 0, NULL);`,
      [localId, localId, input.supplierId, input.invoiceNumber, totalAmount, input.branchId, timestamp, timestamp]
    );

    for (const item of input.items) {
      await db.runAsync(
        `INSERT INTO purchase_items (id, purchaseLocalId, productId, quantity, purchasePrice, lineTotal) VALUES (?, ?, ?, ?, ?, ?);`,
        [newId('PURI'), localId, item.productId, item.quantity, item.purchasePrice, item.quantity * item.purchasePrice]
      );

      await db.runAsync(
        `INSERT INTO stock_movements (id, branchId, productId, quantity, type, referenceId, createdAt)
         VALUES (?, ?, ?, ?, 'PURCHASE', ?, ?);`,
        [newId('MOV'), input.branchId, item.productId, item.quantity, localId, timestamp]
      );

      await db.runAsync(
        `UPDATE branch_stock SET available = available + ?, updatedAt = ?,
           status = CASE WHEN available + ? <= 0 THEN 'OUT_OF_STOCK'
                         WHEN available + ? <= minStock THEN 'LOW_STOCK'
                         ELSE 'IN_STOCK' END
         WHERE branchId = ? AND productId = ?;`,
        [item.quantity, timestamp, item.quantity, item.quantity, input.branchId, item.productId]
      );
    }
  });

  const row = await db.getFirstAsync<PurchaseRow>('SELECT * FROM purchases WHERE localId = ?;', [localId]);
  return row as PurchaseRow;
}

export async function listPurchases(branchId: string): Promise<PurchaseRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<PurchaseRow>('SELECT * FROM purchases WHERE branchId = ? ORDER BY createdAt DESC;', [branchId]);
}

export async function getPurchaseItems(purchaseLocalId: string): Promise<PurchaseItemRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<PurchaseItemRow>('SELECT * FROM purchase_items WHERE purchaseLocalId = ?;', [purchaseLocalId]);
}

export async function createExpense(input: {
  branchId: string;
  category: string;
  amount: number;
  note: string;
  spentAt: string;
}): Promise<ExpenseRow> {
  const db = await getDatabase();
  const localId = newId('EXP');
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO expenses
      (id, localId, category, amount, note, spentAt, serverId, branchId, createdAt, updatedAt, syncStatus, serverConfirmed, syncedAt, purgeAfter, retryCount, lastSyncError)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'PENDING', 0, NULL, NULL, 0, NULL);`,
    [localId, localId, input.category, input.amount, input.note, input.spentAt, input.branchId, timestamp, timestamp]
  );

  const row = await db.getFirstAsync<ExpenseRow>('SELECT * FROM expenses WHERE localId = ?;', [localId]);
  return row as ExpenseRow;
}

export async function listExpenses(branchId: string): Promise<ExpenseRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ExpenseRow>('SELECT * FROM expenses WHERE branchId = ? ORDER BY spentAt DESC;', [branchId]);
}
