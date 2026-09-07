import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { isMockMode } from './apiClient';
import { BRANCHES } from '../../constants/branches';

export async function fetchBranches() {
  if (isMockMode()) {
    try {
      const raw = await AsyncStorage.getItem('sw_branches_v1');
      return raw ? JSON.parse(raw) : BRANCHES;
    } catch (e) {
      return BRANCHES;
    }
  }
  return apiClient.get('/branches');
}

export async function fetchBranch(branchId) {
  if (isMockMode()) {
    const list = await fetchBranches();
    return list.find((b) => b.id === branchId) || null;
  }
  return apiClient.get(`/branches/${branchId}`);
}

export default { fetchBranches, fetchBranch };
