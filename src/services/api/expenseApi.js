import apiClient, { isMockMode } from './apiClient';
import { createExpense, listExpenses } from '../../database/repositories/purchaseRepository';

export async function fetchExpenses(branchId) {
  if (isMockMode()) {
    return listExpenses(branchId);
  }
  return apiClient.get(`/branches/${branchId}/expenses`);
}

export async function recordExpense(input) {
  if (isMockMode()) {
    return createExpense(input);
  }
  return apiClient.post('/expenses', input);
}

export default { fetchExpenses, recordExpense };
