import apiClient, { isMockMode } from './apiClient';
import { listStockMovements, adjustStock } from '../../database/repositories/stockRepository';
import { getBranchStock } from '../../database/repositories/productRepository';

export async function fetchStockMovements(branchId) {
  if (isMockMode()) {
    return listStockMovements(branchId);
  }
  return apiClient.get(`/branches/${branchId}/stock-movements`);
}

export async function fetchInventory(branchId) {
  if (isMockMode()) {
    return getBranchStock(branchId);
  }
  return apiClient.get(`/branches/${branchId}/inventory`);
}

export async function adjustInventory(branchId, productId, delta, reason) {
  if (isMockMode()) {
    return adjustStock(branchId, productId, delta, reason);
  }
  return apiClient.post(`/branches/${branchId}/stock-adjust`, { productId, delta, reason });
}

export default { fetchStockMovements, fetchInventory, adjustInventory };
