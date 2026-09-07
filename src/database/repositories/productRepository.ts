import { getDatabase, nowIso } from '../database';
import type { CategoryRow, ProductRow, BranchStockRow } from '../databaseTypes';
import { CATEGORIES, PRODUCTS } from '../../constants/products';
import { BRANCH_STOCK } from '../../constants/stock';

export async function seedProductCatalog(): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products;');
  if (existing && existing.count > 0) {
    return;
  }

  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    for (const category of CATEGORIES) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, name, updatedAt) VALUES (?, ?, ?);`,
        [category.id, category.name, timestamp]
      );
    }

    for (const product of PRODUCTS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO products
          (id, name, code, barcode, categoryId, mrp, sellingPrice, purchasePrice, gst, unit, minStock, batch, hsn, mfgDate, expiryDate, brand, supplier, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          product.id,
          product.name,
          product.code,
          product.barcode,
          product.category,
          product.mrp,
          product.sellingPrice,
          product.purchasePrice,
          product.gst,
          product.unit,
          product.minStock,
          product.batch,
          product.hsn,
          product.mfgDate,
          product.expiryDate,
          product.brand,
          product.supplier,
          timestamp,
        ]
      );
    }

    for (const stock of BRANCH_STOCK) {
      await db.runAsync(
        `INSERT OR REPLACE INTO branch_stock (branchId, productId, available, minStock, status, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [stock.branchId, stock.productId, stock.available, stock.minStock, stock.status, timestamp]
      );
    }
  });
}

export async function listCategories(): Promise<CategoryRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY name;');
}

export async function listProducts(): Promise<ProductRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY name;');
}

export async function searchProducts(query: string): Promise<ProductRow[]> {
  const db = await getDatabase();
  const like = `%${query}%`;
  return db.getAllAsync<ProductRow>(
    `SELECT * FROM products WHERE name LIKE ? OR code LIKE ? OR barcode LIKE ? ORDER BY name LIMIT 100;`,
    [like, like, query]
  );
}

export async function getProductByBarcode(barcode: string): Promise<ProductRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE barcode = ?;', [barcode]);
  return row ?? null;
}

export async function getBranchStock(branchId: string): Promise<BranchStockRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<BranchStockRow>('SELECT * FROM branch_stock WHERE branchId = ?;', [branchId]);
}

export async function getAllBranchStock(): Promise<BranchStockRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<BranchStockRow>('SELECT * FROM branch_stock;');
}

export async function getStockFor(branchId: string, productId: string): Promise<BranchStockRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<BranchStockRow>(
    'SELECT * FROM branch_stock WHERE branchId = ? AND productId = ?;',
    [branchId, productId]
  );
  return row ?? null;
}
