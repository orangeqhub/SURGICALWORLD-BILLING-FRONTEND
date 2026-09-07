import { getTable, commit, newId, nowIso } from '../database.web';
import type { StockMovementRow, StockTransferRow, StockTransferItemRow, BranchStockRow } from '../databaseTypes';

export async function listStockMovements(branchId: string, limit = 100): Promise<StockMovementRow[]> {
  const rows = await getTable<StockMovementRow>('stock_movements');
  return rows
    .filter((r) => r.branchId === branchId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function listRecentAdjustments(limit = 20): Promise<StockMovementRow[]> {
  const rows = await getTable<StockMovementRow>('stock_movements');
  return rows
    .filter((r) => r.type === 'ADJUSTMENT')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function adjustStock(branchId: string, productId: string, delta: number, reason: string): Promise<void> {
  const timestamp = nowIso();

  const stockMovements = await getTable<StockMovementRow>('stock_movements');
  stockMovements.push({
    id: newId('MOV'),
    branchId,
    productId,
    quantity: delta,
    type: 'ADJUSTMENT',
    referenceId: reason,
    createdAt: timestamp,
  });

  const branchStock = await getTable<BranchStockRow>('branch_stock');
  const stockRow = branchStock.find((s) => s.branchId === branchId && s.productId === productId);
  if (stockRow) {
    const available = Math.max(stockRow.available + delta, 0);
    stockRow.available = available;
    stockRow.updatedAt = timestamp;
    stockRow.status = available <= 0 ? 'OUT_OF_STOCK' : available <= stockRow.minStock ? 'LOW_STOCK' : 'IN_STOCK';
  }

  await commit();
}

export async function createStockTransfer(input: {
  fromBranchId: string;
  toBranchId: string;
  requestedBy: string;
  items: { productId: string; quantity: number }[];
}): Promise<StockTransferRow> {
  const rows = await getTable<StockTransferRow>('stock_transfers');
  const localId = newId('TRF');
  const timestamp = nowIso();

  const row: StockTransferRow = {
    id: localId,
    localId,
    fromBranchId: input.fromBranchId,
    toBranchId: input.toBranchId,
    status: 'PENDING',
    requestedBy: input.requestedBy,
    serverId: null,
    branchId: input.fromBranchId,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'PENDING',
    serverConfirmed: 0,
    syncedAt: null,
    purgeAfter: null,
    retryCount: 0,
    lastSyncError: null,
  };
  rows.push(row);

  const items = await getTable<StockTransferItemRow>('stock_transfer_items');
  for (const item of input.items) {
    items.push({ id: newId('TRFI'), transferLocalId: localId, productId: item.productId, quantity: item.quantity });
  }

  await commit();
  return row;
}

export async function listStockTransfers(branchId?: string): Promise<StockTransferRow[]> {
  const rows = await getTable<StockTransferRow>('stock_transfers');
  const filtered = branchId ? rows.filter((r) => r.fromBranchId === branchId || r.toBranchId === branchId) : rows;
  return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getStockTransferItems(transferLocalId: string): Promise<StockTransferItemRow[]> {
  const rows = await getTable<StockTransferItemRow>('stock_transfer_items');
  return rows.filter((r) => r.transferLocalId === transferLocalId);
}

export async function updateStockTransferStatus(localId: string, status: StockTransferRow['status']): Promise<void> {
  const rows = await getTable<StockTransferRow>('stock_transfers');
  const row = rows.find((r) => r.localId === localId);
  if (row) {
    row.status = status;
    row.updatedAt = nowIso();
    await commit();
  }
}
