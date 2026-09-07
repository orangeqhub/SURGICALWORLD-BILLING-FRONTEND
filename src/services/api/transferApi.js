import apiClient, { isMockMode } from './apiClient';
import {
  createStockTransfer,
  listStockTransfers,
  getStockTransferItems,
  updateStockTransferStatus,
} from '../../database/repositories/stockRepository';

export async function requestStockTransfer(input) {
  if (isMockMode()) {
    return createStockTransfer(input);
  }
  return apiClient.post('/stock-transfers', input);
}

export async function fetchStockTransfers(branchId) {
  if (isMockMode()) {
    return listStockTransfers(branchId);
  }
  return apiClient.get(branchId ? `/branches/${branchId}/stock-transfers` : '/stock-transfers');
}

export async function fetchTransferItems(transferLocalId) {
  if (isMockMode()) {
    return getStockTransferItems(transferLocalId);
  }
  return apiClient.get(`/stock-transfers/${transferLocalId}/items`);
}

export async function setTransferStatus(localId, status) {
  if (isMockMode()) {
    return updateStockTransferStatus(localId, status);
  }
  return apiClient.put(`/stock-transfers/${localId}/status`, { status });
}

export default { requestStockTransfer, fetchStockTransfers, fetchTransferItems, setTransferStatus };
