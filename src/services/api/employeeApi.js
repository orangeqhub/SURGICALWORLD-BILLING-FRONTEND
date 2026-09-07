import apiClient, { isMockMode } from './apiClient';
import { EMPLOYEES, BRANCH_ADMINS } from '../../constants/employees';

export async function fetchEmployees(branchId) {
  if (isMockMode()) {
    return branchId ? EMPLOYEES.filter((e) => e.branchId === branchId) : EMPLOYEES;
  }
  return apiClient.get(branchId ? `/branches/${branchId}/employees` : '/employees');
}

export async function fetchBranchAdmins() {
  if (isMockMode()) {
    return BRANCH_ADMINS;
  }
  return apiClient.get('/branch-admins');
}

export async function createEmployee(payload) {
  if (isMockMode()) {
    return { ...payload, id: `EMP-${Date.now()}`, status: 'Active', deviceAuthorized: false };
  }
  return apiClient.post('/employees', payload);
}

export async function updateEmployeeStatus(employeeId, status) {
  if (isMockMode()) {
    return { id: employeeId, status };
  }
  return apiClient.put(`/employees/${employeeId}/status`, { status });
}

export default { fetchEmployees, fetchBranchAdmins, createEmployee, updateEmployeeStatus };
