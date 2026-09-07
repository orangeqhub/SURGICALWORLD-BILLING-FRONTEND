import { fetchCategories, fetchProducts } from './productApi';
import { getAllProductProfiles, upsertProductProfile } from '../mock/productProfileStore';

/**
 * Frontend Product Master composition layer. Reuses fetchCategories/
 * fetchProducts reads as-is. The products table has no
 * subcategory/manufacturer/maxStock/tracking-flag/status/remarks columns and
 * exposes no create function, so new products and all extended fields are
 * stored in productProfileStore (mock-only products flagged isMockOnly) -
 * the real products table/repository is never written to.
 */
function mergeProfile(product, profile) {
  return {
    ...product,
    sku: product.code,
    subcategory: profile?.subcategory || '',
    manufacturer: profile?.manufacturer || '',
    maxStock: profile?.maxStock ?? null,
    batchTrackingEnabled: profile?.batchTrackingEnabled ?? true,
    expiryTrackingEnabled: profile?.expiryTrackingEnabled ?? Boolean(product.expiryDate),
    remarks: profile?.remarks || '',
    status: profile?.status || 'Active',
  };
}

export async function listProductsWithProfile() {
  const [products, profiles] = await Promise.all([fetchProducts(), getAllProductProfiles()]);
  const profileByProductId = Object.fromEntries(profiles.map((p) => [p.productId, p]));

  const real = products.map((p) => mergeProfile(p, profileByProductId[p.id]));
  const mockOnly = profiles
    .filter((p) => p.isMockOnly && !products.some((prod) => prod.id === p.productId))
    .map((p) =>
      mergeProfile(
        {
          id: p.productId,
          name: p.name,
          code: p.code,
          barcode: p.barcode,
          categoryId: p.categoryId,
          mrp: p.mrp,
          sellingPrice: p.sellingPrice,
          purchasePrice: p.purchasePrice,
          gst: p.gst,
          unit: p.unit,
          minStock: p.minStock,
          hsn: p.hsn,
          brand: p.brand,
          expiryDate: p.expiryDate,
        },
        p
      )
    );

  return [...real, ...mockOnly];
}

export async function getProductById(productId) {
  const list = await listProductsWithProfile();
  return list.find((p) => p.id === productId) || null;
}

export async function createProductWithProfile(input) {
  const id = `PRD-${Date.now().toString().slice(-6)}`;
  await upsertProductProfile(id, {
    isMockOnly: true,
    name: input.name,
    code: input.code,
    barcode: input.barcode,
    categoryId: input.categoryId,
    mrp: input.mrp,
    sellingPrice: input.sellingPrice,
    purchasePrice: input.purchasePrice,
    gst: input.gst,
    unit: input.unit,
    minStock: input.minStock,
    hsn: input.hsn,
    brand: input.brand,
    subcategory: input.subcategory,
    manufacturer: input.manufacturer,
    maxStock: input.maxStock,
    batchTrackingEnabled: input.batchTrackingEnabled,
    expiryTrackingEnabled: input.expiryTrackingEnabled,
    remarks: input.remarks,
    status: 'Active',
  });
  return getProductById(id);
}

export async function updateProductProfile(productId, patch) {
  return upsertProductProfile(productId, patch);
}

export async function setProductStatus(productId, status) {
  return upsertProductProfile(productId, { status });
}

export { fetchCategories };

export default { listProductsWithProfile, getProductById, createProductWithProfile, updateProductProfile, setProductStatus, fetchCategories };
