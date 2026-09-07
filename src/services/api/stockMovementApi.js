import { fetchStockMovements } from './inventoryApi';
import { BRANCHES } from '../../constants/branches';

/**
 * Read-only composition over the existing real stock_movements data
 * (src/database/repositories/stockRepository.ts, exposed via inventoryApi.js).
 * No new movement data source is introduced - this only adds an all-branch
 * aggregation for Super Admin, matching the pattern already used for
 * purchases/invoices in dashboardApi.js.
 */
export async function fetchMovements({ branchId, isAllBranches = false } = {}) {
  if (isAllBranches) {
    const lists = await Promise.all(BRANCHES.map((b) => fetchStockMovements(b.id)));
    return lists.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return fetchStockMovements(branchId);
}

export default { fetchMovements };
