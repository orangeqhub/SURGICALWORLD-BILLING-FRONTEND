import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTable, commit, newId, nowIso } from '../../database/database.web';
import { EMPLOYEES, BRANCH_ADMINS, SUPER_ADMINS, getSuperAdmin } from '../../constants/employees';
import { BRANCHES } from '../../constants/branches';
import { hashPassword, verifyPassword } from '../../utils/security';
import { ROLES } from '../../constants/roles';

const MOCK_ADMIN_PASSWORD = 'Welcome@123';

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function branchMatches(record, selectedBranch) {
  const selectedId = normalize(selectedBranch?.id);
  const selectedCode = normalize(selectedBranch?.code);
  const selectedName = normalize(selectedBranch?.name);

  const recordBranchId = normalize(record.branchId);
  const recordBranchCode = normalize(record.branchCode);
  const recordBranchName = normalize(record.branchName || record.branch);

  return (
    (selectedId && recordBranchId === selectedId) ||
    (selectedId && recordBranchCode === selectedId) ||
    (selectedCode && recordBranchCode === selectedCode) ||
    (selectedName && recordBranchName === selectedName)
  );
}

const seedEmployees = (branchId) => EMPLOYEES.filter((e) => e.branchId === branchId).map((e) => ({ ...e }));
const seedAdmins = () => BRANCH_ADMINS.map((a) => ({ ...a, status: a.status || 'Active' }));

export async function seedAuthData() {
  const rows = await getTable('verified_users');
  if (rows.length > 0) {
    return;
  }

  const timestamp = nowIso();
  const passwordHash = hashPassword(MOCK_ADMIN_PASSWORD);

  for (const employee of EMPLOYEES) {
    rows.push({
      id: employee.id,
      role: ROLES.EMPLOYEE,
      branchId: employee.branchId,
      loginId: employee.id,
      employeeId: employee.id,
      name: employee.name,
      passwordHash,
      permissions: JSON.stringify(employee.permissions || []),
      lastLoginAt: null,
      updatedAt: timestamp,
    });
  }

  for (const admin of BRANCH_ADMINS) {
    rows.push({
      id: admin.id,
      role: ROLES.BRANCH_ADMIN,
      branchId: admin.branchId,
      loginId: admin.id,
      employeeId: null,
      name: admin.name,
      passwordHash,
      permissions: '[]',
      lastLoginAt: null,
      updatedAt: timestamp,
    });
  }

  for (const admin of SUPER_ADMINS) {
    rows.push({
      id: admin.id,
      role: ROLES.SUPER_ADMIN,
      branchId: null,
      loginId: admin.id,
      employeeId: null,
      name: admin.name,
      passwordHash,
      permissions: '[]',
      lastLoginAt: null,
      updatedAt: timestamp,
    });
  }

  await commit();
}

async function touchLastLogin(userId) {
  const rows = await getTable('verified_users');
  const row = rows.find((r) => r.id === userId);
  if (row) {
    row.lastLoginAt = nowIso();
    await commit();
  }
}

export async function loginEmployee({ branchId, employeeId }) {
  const rawBranches = await AsyncStorage.getItem('sw_branches_v1');
  const branchesList = rawBranches ? JSON.parse(rawBranches) : BRANCHES;
  const selectedBranch = branchesList.find((b) => b.id === branchId || b.code === branchId);

  let allEmployees = [];
  for (const branch of branchesList) {
    const raw = await AsyncStorage.getItem(`sw_employees_${branch.id}_v1`);
    const list = raw ? JSON.parse(raw) : seedEmployees(branch.id);
    allEmployees = [...allEmployees, ...list];
  }

  const normalizedEmpId = normalize(employeeId);
  const employee = allEmployees.find((e) => normalize(e.id || e.employeeId) === normalizedEmpId);

  if (!employee) {
    return { success: false, error: 'Employee ID not found' };
  }

  if (!selectedBranch || !branchMatches(employee, selectedBranch)) {
    return { success: false, error: 'Employee does not belong to selected branch' };
  }

  if (normalize(employee.status) !== 'active') {
    return { success: false, error: 'Employee account is inactive' };
  }

  await touchLastLogin(employee.id);

  return {
    success: true,
    user: {
      id: employee.id,
      role: ROLES.EMPLOYEE,
      roleLabel: employee.role || 'Cashier',
      name: employee.name,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      permissions: employee.permissions || [],
    },
  };
}

export async function loginBranchAdmin({ branchId, adminId, password }) {
  const rawBranches = await AsyncStorage.getItem('sw_branches_v1');
  const branchesList = rawBranches ? JSON.parse(rawBranches) : BRANCHES;
  const selectedBranch = branchesList.find((b) => b.id === branchId || b.code === branchId);

  const rawAdmins = await AsyncStorage.getItem('sw_branch_admins_v1');
  const adminsList = rawAdmins ? JSON.parse(rawAdmins) : seedAdmins();

  const normalizedAdminId = normalize(adminId);
  const admin = adminsList.find((a) => normalize(a.id || a.adminId) === normalizedAdminId);

  if (!admin) {
    return { success: false, error: 'Admin ID not found' };
  }

  if (!selectedBranch || !branchMatches(admin, selectedBranch)) {
    return { success: false, error: 'Admin does not belong to selected branch' };
  }

  if (normalize(admin.status) !== 'active') {
    return { success: false, error: 'Admin account is inactive' };
  }

  let passwordValid = false;
  if (admin.password) {
    passwordValid = (password === admin.password);
  } else {
    const rows = await getTable('verified_users');
    const record = rows.find((r) => r.id === admin.id);
    if (record && verifyPassword(password, record.passwordHash)) {
      passwordValid = true;
    }
  }

  if (!passwordValid) {
    return { success: false, error: 'Invalid password' };
  }

  await touchLastLogin(admin.id);

  return {
    success: true,
    user: {
      id: admin.id,
      role: ROLES.BRANCH_ADMIN,
      roleLabel: 'Branch Admin',
      name: admin.name,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      permissions: [],
    },
  };
}

export async function loginSuperAdmin({ adminId, password }) {
  const admin = getSuperAdmin(adminId);
  if (!admin) {
    return { success: false, error: 'Super Admin ID not found' };
  }

  const rows = await getTable('verified_users');
  const record = rows.find((r) => r.id === admin.id);
  if (!record || !verifyPassword(password, record.passwordHash)) {
    return { success: false, error: 'Incorrect password' };
  }

  await touchLastLogin(admin.id);

  return {
    success: true,
    user: {
      id: admin.id,
      role: ROLES.SUPER_ADMIN,
      roleLabel: 'Super Admin',
      name: admin.name,
      branchId: null,
      branchName: 'All Branches',
      permissions: [],
    },
  };
}

export async function rememberDevice(userId, deviceLabel) {
  const rows = await getTable('verified_devices');
  const token = newId('DEV');
  const timestamp = nowIso();
  rows.push({
    id: newId('VD'),
    userId,
    deviceLabel,
    rememberToken: token,
    createdAt: timestamp,
    lastUsedAt: timestamp,
  });
  await commit();
  return token;
}

export async function isDeviceRemembered(userId) {
  const rows = await getTable('verified_devices');
  const matches = rows.filter((r) => r.userId === userId).sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));
  return Boolean(matches[0]);
}

export default { seedAuthData, loginEmployee, loginBranchAdmin, loginSuperAdmin, rememberDevice, isDeviceRemembered };
