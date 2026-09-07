import apiClient, { isMockMode } from './apiClient';
import { listCrmNotes, createCrmNote } from '../mock/crmStore';

export async function fetchCrmNotes(customerId) {
  if (isMockMode()) {
    return listCrmNotes(customerId);
  }
  return apiClient.get(`/customers/${customerId}/notes`);
}

export async function addCrmNote(input) {
  if (isMockMode()) {
    return createCrmNote(input);
  }
  return apiClient.post(`/customers/${input.customerId}/notes`, input);
}

export default { fetchCrmNotes, addCrmNote };
