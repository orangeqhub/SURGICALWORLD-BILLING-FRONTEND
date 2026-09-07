import apiClient, { isMockMode } from './apiClient';
import { listReceipts, createReceipt } from '../mock/receiptStore';

export async function fetchReceipts(branchId) {
  if (isMockMode()) {
    return listReceipts(branchId);
  }
  return apiClient.get(`/branches/${branchId}/receipts`);
}

export async function recordReceipt(input) {
  if (isMockMode()) {
    return createReceipt(input);
  }
  return apiClient.post('/receipts', input);
}

export default { fetchReceipts, recordReceipt };
