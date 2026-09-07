import apiClient, { isMockMode } from './apiClient';
import { listAllBatches, saveAllBatches, updateBatch, consumeBatchesAtomically } from '../mock/batchInventoryStore';
import { fetchProducts, fetchAllBranchStock } from './productApi';
import { computeBatchStatus } from '../../utils/inventoryHelpers';

/**
 * Frontend-only multi-batch inventory model layered on top of the existing
 * single-batch ProductRow + real branch_stock quantities (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 2). Synthetic batches are only
 * ever generated in mock mode and are clearly flagged (isSynthetic: true,
 * source: 'frontend-demo') - real API mode calls a real endpoint instead and
 * never fabricates batch data. Seeded quantities always sum exactly to the
 * source branch_stock.available they were split from, so total stock is
 * never altered. adjustBatchQuantity only ever mutates this mock store -
 * never branch_stock or stock_movements.
 */
async function seedIfNeeded() {
  const existing = await listAllBatches();
  if (existing.length > 0) return existing;

  const [products, stock] = await Promise.all([fetchProducts(), fetchAllBranchStock()]);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const seeded = [];

  stock.forEach((s) => {
    const product = productById[s.productId];
    if (!product || s.available <= 0) return;

    const primaryQty = Math.ceil(s.available * 0.7);
    const secondaryQty = s.available - primaryQty;

    seeded.push({
      id: `BATCH-${s.branchId}-${s.productId}-1`,
      productId: s.productId,
      productName: product.name,
      batchNumber: product.batch || `B-${s.productId.slice(-4)}-1`,
      mfgDate: product.mfgDate || null,
      expiryDate: product.expiryDate || null,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      branchId: s.branchId,
      available: primaryQty,
      reserved: 0,
      damaged: 0,
      expired: 0,
      status: 'ACTIVE',
      isSynthetic: true,
      source: 'frontend-demo',
    });

    if (secondaryQty > 0) {
      const laterExpiry = product.expiryDate
        ? new Date(new Date(product.expiryDate).getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null;
      seeded.push({
        id: `BATCH-${s.branchId}-${s.productId}-2`,
        productId: s.productId,
        productName: product.name,
        batchNumber: `B-${s.productId.slice(-4)}-2`,
        mfgDate: product.mfgDate || null,
        expiryDate: laterExpiry,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        branchId: s.branchId,
        available: secondaryQty,
        reserved: 0,
        damaged: 0,
        expired: 0,
        status: 'ACTIVE',
        isSynthetic: true,
        source: 'frontend-demo',
      });
    }
  });

  // Total per product/branch must exactly match the source stock it was split from.
  await saveAllBatches(seeded);
  return seeded;
}

export async function fetchBatches({ branchId, productId } = {}) {
  if (!isMockMode()) {
    const params = new URLSearchParams({ ...(branchId && { branchId }), ...(productId && { productId }) });
    return apiClient.get(`/batches?${params.toString()}`);
  }

  const batches = await seedIfNeeded();
  return batches
    .filter((b) => !branchId || b.branchId === branchId)
    .filter((b) => !productId || b.productId === productId)
    .map((b) => ({ ...b, status: computeBatchStatus(b) }));
}

export async function adjustBatchQuantity(batchId, delta) {
  if (!isMockMode()) {
    throw new Error('Batch adjustment is only available in mock/demo mode');
  }
  const batches = await listAllBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) return null;
  const nextAvailable = Math.max(0, (batch.available || 0) + delta);
  return updateBatch(batchId, { available: nextAvailable });
}

/**
 * Decrements mock/synthetic batch quantities after a Billing invoice save
 * succeeds (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3). Only ever
 * touches batchInventoryStore (AsyncStorage) - never branch_stock/
 * stock_movements, which the existing product-level stock decrease in
 * invoiceRepository.completeBill already handles authoritatively.
 * `referenceId` (the invoice localId) is the idempotency key, and the whole
 * operation (validate every line, compute new quantities, mark consumed) is
 * one atomic read-modify-write in batchInventoryStore.consumeBatchesAtomically
 * - never two separate AsyncStorage writes. In real API mode this is a no-op
 * (no batch mutation endpoint exists yet) so Billing never crashes.
 */
export async function consumeBatchesForInvoice(referenceId, lines) {
  if (!isMockMode() || !referenceId) return;
  const batchLines = (lines || []).filter((l) => l.batchId && l.quantity > 0);
  if (batchLines.length === 0) return;

  // Combine duplicate lines using the same batch before validating/applying.
  const deltasByBatchId = {};
  batchLines.forEach((l) => {
    deltasByBatchId[l.batchId] = (deltasByBatchId[l.batchId] || 0) + l.quantity;
  });

  const result = await consumeBatchesAtomically(referenceId, deltasByBatchId);
  if (!result.ok) {
    // Non-blocking diagnostic only - the invoice is already saved and must
    // not be rolled back because of a mock-data inconsistency.
    console.warn(`[batchInventoryApi] mock batch consumption skipped for invoice ${referenceId}: ${result.reason}`);
  }
}

export default { fetchBatches, adjustBatchQuantity, consumeBatchesForInvoice };
