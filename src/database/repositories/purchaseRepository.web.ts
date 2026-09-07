import { getTable, commit, newId, nowIso } from '../database.web';
import type { PurchaseRow, PurchaseItemRow, SupplierRow, ExpenseRow, StockMovementRow, BranchStockRow } from '../databaseTypes';
import { SUPPLIERS } from '../../constants/suppliers';

export async function seedSuppliers(): Promise<void> {
  const rows = await getTable<SupplierRow>('suppliers');
  if (rows.length > 0) {
    return;
  }

  const timestamp = nowIso();
  for (const supplier of SUPPLIERS) {
    rows.push({
      id: supplier.id,
      name: supplier.name,
      mobile: supplier.phone,
      address: supplier.address,
      gst: supplier.gst,
      updatedAt: timestamp,
    });
  }

  await commit();
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  const rows = await getTable<SupplierRow>('suppliers');
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPurchase(input: {
  branchId: string;
  supplierId: string;
  invoiceNumber: string;
  items: { productId: string; quantity: number; purchasePrice: number }[];
}): Promise<PurchaseRow> {
  const rows = await getTable<PurchaseRow>('purchases');
  const localId = newId('PUR');
  const timestamp = nowIso();
  const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);

  const row: PurchaseRow = {
    id: localId,
    localId,
    supplierId: input.supplierId,
    invoiceNumber: input.invoiceNumber,
    totalAmount,
    status: 'RECEIVED',
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
  rows.push(row);

  const purchaseItems = await getTable<PurchaseItemRow>('purchase_items');
  const stockMovements = await getTable<StockMovementRow>('stock_movements');
  const branchStock = await getTable<BranchStockRow>('branch_stock');

  for (const item of input.items) {
    purchaseItems.push({
      id: newId('PURI'),
      purchaseLocalId: localId,
      productId: item.productId,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      lineTotal: item.quantity * item.purchasePrice,
    });

    stockMovements.push({
      id: newId('MOV'),
      branchId: input.branchId,
      productId: item.productId,
      quantity: item.quantity,
      type: 'PURCHASE',
      referenceId: localId,
      createdAt: timestamp,
    });

    const stockRow = branchStock.find((s) => s.branchId === input.branchId && s.productId === item.productId);
    if (stockRow) {
      const available = stockRow.available + item.quantity;
      stockRow.available = available;
      stockRow.updatedAt = timestamp;
      stockRow.status = available <= 0 ? 'OUT_OF_STOCK' : available <= stockRow.minStock ? 'LOW_STOCK' : 'IN_STOCK';
    }
  }

  await commit();
  return row;
}

export async function listPurchases(branchId: string): Promise<PurchaseRow[]> {
  const rows = await getTable<PurchaseRow>('purchases');
  return rows.filter((r) => r.branchId === branchId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getPurchaseItems(purchaseLocalId: string): Promise<PurchaseItemRow[]> {
  const rows = await getTable<PurchaseItemRow>('purchase_items');
  return rows.filter((r) => r.purchaseLocalId === purchaseLocalId);
}

export async function createExpense(input: {
  branchId: string;
  category: string;
  amount: number;
  note: string;
  spentAt: string;
}): Promise<ExpenseRow> {
  const rows = await getTable<ExpenseRow>('expenses');
  const localId = newId('EXP');
  const timestamp = nowIso();

  const row: ExpenseRow = {
    id: localId,
    localId,
    category: input.category,
    amount: input.amount,
    note: input.note,
    spentAt: input.spentAt,
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
  rows.push(row);

  await commit();
  return row;
}

export async function listExpenses(branchId: string): Promise<ExpenseRow[]> {
  const rows = await getTable<ExpenseRow>('expenses');
  return rows.filter((r) => r.branchId === branchId).sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1));
}
