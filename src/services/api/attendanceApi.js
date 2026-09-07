import apiClient, { isMockMode } from './apiClient';
import { hasPermission } from '../../utils/permissions';
import { PERMISSIONS, ROLES } from '../../constants/roles';
import {
  listAttendance,
  getAttendanceRecord,
  checkIn,
  checkOut,
  setAttendance,
  getMonthlySummary,
} from '../mock/attendanceStore';

function assertCanManageOthers(user, employeeId) {
  const isSelf = user.role === ROLES.EMPLOYEE && user.id === employeeId;
  if (isSelf) return;
  if (!hasPermission(user, PERMISSIONS.ATTENDANCE_MANAGE)) {
    throw new Error('You do not have permission to manage attendance for other employees.');
  }
}

export async function fetchAttendance(filters) {
  if (isMockMode()) return listAttendance(filters);
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v)));
  return apiClient.get(`/attendance?${params.toString()}`);
}

export async function fetchTodayAttendance(employeeId) {
  if (isMockMode()) return getAttendanceRecord(employeeId, new Date().toISOString().slice(0, 10));
  return apiClient.get(`/attendance/today?employeeId=${employeeId}`);
}

export async function checkInEmployee({ employeeId, employeeName, branchId }) {
  if (isMockMode()) return checkIn({ employeeId, employeeName, branchId });
  return apiClient.post('/attendance/check-in', { employeeId, branchId });
}

export async function checkOutEmployee({ employeeId }) {
  if (isMockMode()) return checkOut({ employeeId });
  return apiClient.post('/attendance/check-out', { employeeId });
}

export async function recordManualAttendance(user, input) {
  assertCanManageOthers(user, input.employeeId);
  if (isMockMode()) return setAttendance(input);
  return apiClient.post('/attendance/manual', input);
}

export async function fetchMonthlySummary(employeeId, month) {
  if (isMockMode()) return getMonthlySummary(employeeId, month);
  return apiClient.get(`/attendance/summary?employeeId=${employeeId}&month=${month}`);
}

export default {
  fetchAttendance,
  fetchTodayAttendance,
  checkInEmployee,
  checkOutEmployee,
  recordManualAttendance,
  fetchMonthlySummary,
};
