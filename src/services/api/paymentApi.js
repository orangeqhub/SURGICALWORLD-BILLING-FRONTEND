import apiClient, { isMockMode } from './apiClient';
import { listPayments, createPayment } from '../mock/paymentStore';

export async function fetchPayments(branchId) {
  if (isMockMode()) {
    return listPayments(branchId);
  }
  return apiClient.get(`/branches/${branchId}/payments`);
}

export async function recordPayment(input) {
  if (isMockMode()) {
    return createPayment(input);
  }
  return apiClient.post('/payments', input);
}

export default { fetchPayments, recordPayment };
