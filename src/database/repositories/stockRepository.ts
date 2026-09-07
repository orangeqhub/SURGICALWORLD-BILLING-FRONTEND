import { getDatabase, newId, nowIso } from '../database';
import type { StockMovementRow, StockTransferRow, StockTransferItemRow } from '../databaseTypes';

export async function listStockMovements(branchId: string, limit = 100): Promise<StockMovementRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<StockMovementRow>(
    'SELECT * FROM stock_movements WHERE branchId = ? ORDER BY createdAt DESC LIMIT ?;',
    [branchId, limit]
  );
}

export async function listRecentAdjustments(limit = 20): Promise<StockMovementRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<StockMovementRow>(
    `SELECT * FROM stock_movements WHERE type = 'ADJUSTMENT' ORDER BY createdAt DESC LIMIT ?;`,
    [limit]
  );
}

export async function adjustStock(branchId: string, productId: string, delta: number, reason: string): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO stock_movements (id, branchId, productId, quantity, type, referenceId, createdAt)
       VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?);`,
      [newId('MOV'), branchId, productId, delta, reason, timestamp]
    );

    await db.runAsync(
      `UPDATE branch_stock SET available = MAX(available + ?, 0), updatedAt = ?,
         status = CASE WHEN available + ? <= 0 THEN 'OUT_OF_STOCK'
                       WHEN available + ? <= minStock THEN 'LOW_STOCK'
                       ELSE 'IN_STOCK' END
       WHERE branchId = ? AND productId = ?;`,
      [delta, timestamp, delta, delta, branchId, productId]
    );
  });
}

export async function createStockTransfer(input: {
  fromBranchId: string;
  toBranchId: string;
  requestedBy: string;
  items: { productId: string; quantity: number }[];
}): Promise<StockTransferRow> {
  const db = await getDatabase();
  const localId = newId('TRF');
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO stock_transfers
        (id, localId, fromBranchId, toBranchId, status, requestedBy, serverId, branchId, createdAt, updatedAt, syncStatus, serverConfirmed, syncedAt, purgeAfter, retryCount, lastSyncError)
       VALUES (?, ?, ?, ?, 'PENDING', ?, NULL, ?, ?, ?, 'PENDING', 0, NULL, NULL, 0, NULL);`,
      [localId, localId, input.fromBranchId, input.toBranchId, input.requestedBy, input.fromBranchId, timestamp, timestamp]
    );

    for (const item of input.items) {
      await db.runAsync(
        `INSERT INTO stock_transfer_items (id, transferLocalId, productId, quantity) VALUES (?, ?, ?, ?);`,
        [newId('TRFI'), localId, item.productId, item.quantity]
      );
    }
  });

  const row = await db.getFirstAsync<StockTransferRow>('SELECT * FROM stock_transfers WHERE localId = ?;', [localId]);
  return row as StockTransferRow;
}

export async function listStockTransfers(branchId?: string): Promise<StockTransferRow[]> {
  const db = await getDatabase();
  if (branchId) {
    return db.getAllAsync<StockTransferRow>(
      'SELECT * FROM stock_transfers WHERE fromBranchId = ? OR toBranchId = ? ORDER BY createdAt DESC;',
      [branchId, branchId]
    );
  }
  return db.getAllAsync<StockTransferRow>('SELECT * FROM stock_transfers ORDER BY createdAt DESC;');
}

export async function getStockTransferItems(transferLocalId: string): Promise<StockTransferItemRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<StockTransferItemRow>('SELECT * FROM stock_transfer_items WHERE transferLocalId = ?;', [transferLocalId]);
}

export async function updateStockTransferStatus(localId: string, status: StockTransferRow['status']): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE stock_transfers SET status = ?, updatedAt = ? WHERE localId = ?;', [status, nowIso(), localId]);
}
