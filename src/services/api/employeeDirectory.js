import { loadDirectoryList } from './directoryStore';
import { EMPLOYEES } from '../../constants/employees';
import { BRANCHES } from '../../constants/branches';

/**
 * Shared read-only view of the employee roster used by CRM/Targets/
 * Attendance/Payroll assignment pickers. Employee Management
 * (app/(branch-admin)/employees.js) persists each branch's roster under
 * `sw_employees_${branchId}_v1` via directoryStore, seeded from the static
 * EMPLOYEES constant - this mirrors that exact key/seed convention so
 * these modules always see any employees added/edited there, instead of a
 * second, stale copy of the roster.
 */
function storeKey(branchId) {
  return `sw_employees_${branchId}_v1`;
}

function seedEmployees(branchId) {
  return EMPLOYEES.filter((e) => e.branchId === branchId).map((e) => ({ ...e }));
}

export async function listEmployeesForBranch(branchId) {
  if (!branchId) return [];
  return loadDirectoryList(storeKey(branchId), seedEmployees(branchId));
}

export async function listAllEmployees() {
  const lists = await Promise.all(BRANCHES.map((b) => listEmployeesForBranch(b.id)));
  return lists.flat();
}

export async function getEmployeeById(branchId, employeeId) {
  const list = branchId ? await listEmployeesForBranch(branchId) : await listAllEmployees();
  return list.find((e) => e.id === employeeId) || null;
}

export default { listEmployeesForBranch, listAllEmployees, getEmployeeById };
