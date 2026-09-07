import apiClient, { isMockMode } from './apiClient';
import { listCustomers, searchCustomers, createCustomer } from '../../database/repositories/customerRepository';

export async function fetchCustomers(branchId) {
  if (isMockMode()) {
    return listCustomers(branchId);
  }
  return apiClient.get(branchId ? `/branches/${branchId}/customers` : '/customers');
}

export async function findCustomers(query) {
  if (isMockMode()) {
    return searchCustomers(query);
  }
  return apiClient.get(`/customers/search?q=${encodeURIComponent(query)}`);
}

export async function addCustomer(input) {
  if (isMockMode()) {
    return createCustomer(input);
  }
  return apiClient.post('/customers', input);
}

export default { fetchCustomers, findCustomers, addCustomer };
