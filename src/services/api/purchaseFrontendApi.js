import { fetchPurchases as fetchRealPurchases, fetchSuppliers } from './purchaseApi';
import {
  listFrontendPurchases,
  getFrontendPurchase,
  saveFrontendPurchase,
  setFrontendPurchaseStatus,
} from '../mock/purchaseFrontendStore';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../constants/roles';

/**
 * Composition layer for the full Purchase Editor (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3). Reuses the real
 * purchaseApi read (fetchPurchases) for the existing simple/real purchases
 * and merges in frontend-only demo purchases, each tagged `source` so the UI
 * can never present one as the other. Writes only ever go through
 * purchaseFrontendStore (AsyncStorage) - real purchases/purchase_items/
 * branch_stock/stock_movements are never touched by this file.
 */
export async function listPurchasesForBranch(branchId) {
  const [real, demo] = await Promise.all([
    branchId ? fetchRealPurchases(branchId) : Promise.resolve([]),
    listFrontendPurchases(branchId),
  ]);
  return [
    ...real.map((p) => ({ ...p, id: p.localId, source: 'REAL', status: p.status || 'RECEIVED' })),
    ...demo.map((p) => ({ ...p, source: 'FRONTEND_DEMO' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getPurchaseById(id) {
  return getFrontendPurchase(id);
}

async function isPurchaseNumberTaken(purchaseNumber, branchId, excludeId) {
  const demo = await listFrontendPurchases();
  if (demo.some((p) => p.purchaseNumber === purchaseNumber && p.id !== excludeId)) return true;
  // Real purchases use invoiceNumber, not purchaseNumber, but both are shown
  // in the same "Purchase No." column, so they must not collide there either.
  if (branchId) {
    const real = await fetchRealPurchases(branchId).catch(() => []);
    if (real.some((p) => p.invoiceNumber === purchaseNumber)) return true;
  }
  return false;
}

async function nextPurchaseNumber(branchId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await listFrontendPurchases(branchId);
    const seq = existing.length + 1 + attempt;
    const candidate = `DPO-${branchId || 'ALL'}-${String(seq).padStart(4, '0')}-${Date.now().toString().slice(-4)}${attempt || ''}`;
    if (!(await isPurchaseNumberTaken(candidate, branchId, null))) {
      return candidate;
    }
  }
  throw new Error('Unable to generate a unique purchase number, please try again.');
}

export async function createDraftPurchase(user, header) {
  if (!hasPermission(user, PERMISSIONS.PURCHASE_MANAGE)) {
    throw new Error('You do not have permission to create purchases.');
  }
  let purchaseNumber = header.purchaseNumber;
  if (!purchaseNumber) {
    purchaseNumber = await nextPurchaseNumber(header.branchId);
  } else if (await isPurchaseNumberTaken(purchaseNumber, header.branchId, null)) {
    throw new Error(`Purchase number ${purchaseNumber} already exists.`);
  }
  return saveFrontendPurchase({
    ...header,
    purchaseNumber,
    status: header.status || 'DRAFT',
    items: header.items || [],
    createdBy: user.name,
  });
}

export async function savePurchase(user, purchase) {
  if (!hasPermission(user, PERMISSIONS.PURCHASE_MANAGE)) {
    throw new Error('You do not have permission to save purchases.');
  }
  if (purchase.purchaseNumber && (await isPurchaseNumberTaken(purchase.purchaseNumber, purchase.branchId, purchase.id))) {
    throw new Error(`Purchase number ${purchase.purchaseNumber} already exists.`);
  }
  return saveFrontendPurchase({ ...purchase, updatedBy: user.name });
}

export async function cancelPurchase(user, id) {
  if (!hasPermission(user, PERMISSIONS.PURCHASE_MANAGE)) {
    throw new Error('You do not have permission to cancel purchases.');
  }
  return setFrontendPurchaseStatus(id, 'CANCELLED');
}

export { fetchSuppliers };

export default { listPurchasesForBranch, getPurchaseById, createDraftPurchase, savePurchase, cancelPurchase, fetchSuppliers };
