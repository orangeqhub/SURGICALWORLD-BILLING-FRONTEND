import apiClient, { isMockMode } from './apiClient';
import { listLedgerEntries, createLedgerEntry, getPartyBalance } from '../mock/ledgerStore';

export async function fetchLedgerEntries({ branchId, partyType, partyId } = {}) {
  if (isMockMode()) {
    return listLedgerEntries({ branchId, partyType, partyId });
  }
  const params = new URLSearchParams({
    ...(branchId && { branchId }),
    ...(partyType && { partyType }),
    ...(partyId && { partyId }),
  });
  return apiClient.get(`/ledger?${params.toString()}`);
}

export async function addLedgerEntry(entry) {
  if (isMockMode()) {
    return createLedgerEntry(entry);
  }
  return apiClient.post('/ledger', entry);
}

export async function fetchPartyBalance(partyType, partyId) {
  if (isMockMode()) {
    return getPartyBalance(partyType, partyId);
  }
  return apiClient.get(`/ledger/balance?partyType=${partyType}&partyId=${partyId}`);
}

export default { fetchLedgerEntries, addLedgerEntry, fetchPartyBalance };
