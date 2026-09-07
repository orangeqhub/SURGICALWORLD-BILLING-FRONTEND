import { getTable, commit, nowIso } from '../database.web';
import type { CategoryRow, ProductRow, BranchStockRow } from '../databaseTypes';
import { CATEGORIES, PRODUCTS } from '../../constants/products';
import { BRANCH_STOCK } from '../../constants/stock';

export async function seedProductCatalog(): Promise<void> {
  const products = await getTable<ProductRow>('products');
  if (products.length > 0) {
    return;
  }

  const timestamp = nowIso();
  const categories = await getTable<CategoryRow>('categories');
  const branchStock = await getTable<BranchStockRow>('branch_stock');

  for (const category of CATEGORIES) {
    categories.push({ id: category.id, name: category.name, updatedAt: timestamp });
  }

  for (const product of PRODUCTS) {
    products.push({
      id: product.id,
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      categoryId: product.category,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      purchasePrice: product.purchasePrice,
      gst: product.gst,
      unit: product.unit,
      minStock: product.minStock,
      batch: product.batch,
      hsn: product.hsn,
      mfgDate: product.mfgDate,
      expiryDate: product.expiryDate,
      brand: product.brand,
      supplier: product.supplier,
      updatedAt: timestamp,
    });
  }

  for (const stock of BRANCH_STOCK) {
    branchStock.push({
      branchId: stock.branchId,
      productId: stock.productId,
      available: stock.available,
      minStock: stock.minStock,
      status: stock.status as BranchStockRow['status'],
      updatedAt: timestamp,
    });
  }

  await commit();
}

export async function listCategories(): Promise<CategoryRow[]> {
  const rows = await getTable<CategoryRow>('categories');
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listProducts(): Promise<ProductRow[]> {
  const rows = await getTable<ProductRow>('products');
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchProducts(query: string): Promise<ProductRow[]> {
  const rows = await getTable<ProductRow>('products');
  const q = query.toLowerCase();
  return rows
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode || '') === query
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);
}

export async function getProductByBarcode(barcode: string): Promise<ProductRow | null> {
  const rows = await getTable<ProductRow>('products');
  return rows.find((p) => p.barcode === barcode) ?? null;
}

export async function getBranchStock(branchId: string): Promise<BranchStockRow[]> {
  const rows = await getTable<BranchStockRow>('branch_stock');
  return rows.filter((r) => r.branchId === branchId);
}

export async function getAllBranchStock(): Promise<BranchStockRow[]> {
  return getTable<BranchStockRow>('branch_stock');
}

export async function getStockFor(branchId: string, productId: string): Promise<BranchStockRow | null> {
  const rows = await getTable<BranchStockRow>('branch_stock');
  return rows.find((r) => r.branchId === branchId && r.productId === productId) ?? null;
}
