import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, newId, nowIso } from '../../database/database';
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
  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT COUNT(*) as count FROM verified_users;');
  if (existing && existing.count > 0) {
    return;
  }

  const timestamp = nowIso();
  const passwordHash = hashPassword(MOCK_ADMIN_PASSWORD);

  await db.withTransactionAsync(async () => {
    for (const employee of EMPLOYEES) {
      await db.runAsync(
        `INSERT OR REPLACE INTO verified_users (id, role, branchId, loginId, employeeId, name, passwordHash, permissions, lastLoginAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?);`,
        [employee.id, ROLES.EMPLOYEE, employee.branchId, employee.id, employee.id, employee.name, passwordHash, JSON.stringify(employee.permissions || []), timestamp]
      );
    }

    for (const admin of BRANCH_ADMINS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO verified_users (id, role, branchId, loginId, employeeId, name, passwordHash, permissions, lastLoginAt, updatedAt)
         VALUES (?, ?, ?, ?, NULL, ?, ?, '[]', NULL, ?);`,
        [admin.id, ROLES.BRANCH_ADMIN, admin.branchId, admin.id, admin.name, passwordHash, timestamp]
      );
    }

    for (const admin of SUPER_ADMINS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO verified_users (id, role, branchId, loginId, employeeId, name, passwordHash, permissions, lastLoginAt, updatedAt)
         VALUES (?, ?, NULL, ?, NULL, ?, ?, '[]', NULL, ?);`,
        [admin.id, ROLES.SUPER_ADMIN, admin.id, admin.name, passwordHash, timestamp]
      );
    }
  });
}

async function touchLastLogin(userId) {
  const db = await getDatabase();
  await db.runAsync('UPDATE verified_users SET lastLoginAt = ? WHERE id = ?;', [nowIso(), userId]);
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
    const db = await getDatabase();
    const record = await db.getFirstAsync('SELECT * FROM verified_users WHERE id = ?;', [admin.id]);
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

  const db = await getDatabase();
  const record = await db.getFirstAsync('SELECT * FROM verified_users WHERE id = ?;', [admin.id]);
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
  const db = await getDatabase();
  const token = newId('DEV');
  const timestamp = nowIso();
  await db.runAsync(
    `INSERT INTO verified_devices (id, userId, deviceLabel, rememberToken, createdAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?);`,
    [newId('VD'), userId, deviceLabel, token, timestamp, timestamp]
  );
  return token;
}

export async function isDeviceRemembered(userId) {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM verified_devices WHERE userId = ? ORDER BY lastUsedAt DESC LIMIT 1;', [userId]);
  return Boolean(row);
}

export default { seedAuthData, loginEmployee, loginBranchAdmin, loginSuperAdmin, rememberDevice, isDeviceRemembered };
