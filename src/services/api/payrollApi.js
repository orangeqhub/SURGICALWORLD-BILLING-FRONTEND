import apiClient, { isMockMode } from './apiClient';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS, ROLES } from '../../constants/roles';
import {
  listPayroll,
  getPayrollRecord,
  upsertPayroll,
  updatePayrollFields,
  markPayrollPaid,
} from '../mock/payrollStore';
import { fetchMonthlySummary } from './attendanceApi';

function assertCanManage(user) {
  if (!hasPermission(user, PERMISSIONS.PAYROLL_MANAGE) || user.role === ROLES.EMPLOYEE) {
    throw new Error('You do not have permission to manage payroll.');
  }
}

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export async function fetchPayroll(filters) {
  if (isMockMode()) return listPayroll(filters);
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v)));
  return apiClient.get(`/payroll?${params.toString()}`);
}

export async function fetchPayrollRecord(employeeId, month) {
  if (isMockMode()) return getPayrollRecord(employeeId, month);
  return apiClient.get(`/payroll/${employeeId}/${month}`);
}

/**
 * Generate/regenerate payroll for one employee/month: pulls the attendance
 * summary for that month (never a second, hand-entered attendance total),
 * applies the Basic Salary / Working Days per-day deduction rule (no other
 * attendance-deduction rule exists in this codebase), and computes
 * Gross/Net. Calling again for the same employee/month recomputes the same
 * record in place (upsert) instead of creating a duplicate.
 */
export async function generatePayroll(user, { employeeId, employeeName, branchId, month, basicSalary, allowances = 0, bonus = 0, deductions = 0, advance = 0, remarks = '' }) {
  assertCanManage(user);
  const workingDays = daysInMonth(month);
  const attendance = await fetchMonthlySummary(employeeId, month);
  const perDayRate = workingDays > 0 ? Number(basicSalary) / workingDays : 0;
  const unpaidDays = attendance.absentDays + attendance.halfDays * 0.5;
  const attendanceDeduction = Math.round(perDayRate * unpaidDays * 100) / 100;
  const grossSalary = Number(basicSalary) + Number(allowances) + Number(bonus);
  const netSalary = Math.max(grossSalary - Number(deductions) - Number(advance) - attendanceDeduction, 0);

  const record = {
    employeeId,
    employeeName,
    branchId,
    month,
    basicSalary: Number(basicSalary),
    allowances: Number(allowances),
    bonus: Number(bonus),
    deductions: Number(deductions),
    advance: Number(advance),
    presentDays: attendance.presentDays,
    absentDays: attendance.absentDays,
    halfDays: attendance.halfDays,
    leaveDays: attendance.leaveDays,
    workingDays,
    perDayRate: Math.round(perDayRate * 100) / 100,
    attendanceDeduction,
    grossSalary,
    netSalary,
    remarks,
  };

  if (isMockMode()) return upsertPayroll(record);
  return apiClient.post('/payroll/generate', record);
}

export async function editPayroll(user, id, patch) {
  assertCanManage(user);
  if (isMockMode()) return updatePayrollFields(id, patch);
  return apiClient.put(`/payroll/${id}`, patch);
}

export async function markPaid(user, id) {
  assertCanManage(user);
  if (isMockMode()) return markPayrollPaid(id);
  return apiClient.put(`/payroll/${id}/mark-paid`, {});
}

export default { fetchPayroll, fetchPayrollRecord, generatePayroll, editPayroll, markPaid };
