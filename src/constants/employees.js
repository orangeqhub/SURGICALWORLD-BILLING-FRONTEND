export const EMPLOYEES = [
  { id: 'EMP-101', name: 'Ramesh Kumar', branchId: 'BR-GNT', phone: '9848012345', role: 'Cashier', status: 'Active', deviceAuthorized: true, permissions: ['BILLING', 'HOLD_BILL', 'RETURNS', 'CRM_MANAGE', 'ATTENDANCE_MANAGE', 'PAYROLL_MANAGE'] },
  { id: 'EMP-102', name: 'Suneetha Devi', branchId: 'BR-GNT', phone: '9848012346', role: 'Cashier', status: 'Active', deviceAuthorized: true, permissions: ['BILLING', 'HOLD_BILL', 'ATTENDANCE_MANAGE', 'PAYROLL_MANAGE'] },
  { id: 'EMP-105', name: 'Kiran Babu', branchId: 'BR-ONG', phone: '9848012347', role: 'Cashier', status: 'Active', deviceAuthorized: true, permissions: ['BILLING', 'HOLD_BILL', 'CREDIT_SALE', 'DASHBOARD_VIEW', 'CRM_MANAGE', 'ATTENDANCE_MANAGE', 'PAYROLL_MANAGE'] },
  { id: 'EMP-108', name: 'Naga Malleswari', branchId: 'BR-VJA', phone: '9848012348', role: 'Cashier', status: 'Active', deviceAuthorized: true, permissions: ['BILLING', 'HOLD_BILL', 'RETURNS', 'ATTENDANCE_MANAGE', 'PAYROLL_MANAGE'] },
  { id: 'EMP-110', name: 'Praveen Chowdary', branchId: 'BR-TPT', phone: '9848012349', role: 'Cashier', status: 'Inactive', deviceAuthorized: false, permissions: ['BILLING'] },
];

export const BRANCH_ADMINS = [
  { id: 'ADM-201', name: 'K. Ramesh Kumar', branchId: 'BR-GNT', phone: '9848098765', status: 'Active' },
  { id: 'ADM-202', name: 'D. Naga Raju', branchId: 'BR-VJA', phone: '9848098766', status: 'Active' },
  { id: 'ADM-203', name: 'P. Venkata Rao', branchId: 'BR-ONG', phone: '9848098767', status: 'Active' },
];

export const SUPER_ADMINS = [
  { id: 'SA-001', name: 'Head Office Administrator', phone: '9848000001', status: 'Active' },
];

export const getEmployee = (branchId, employeeId) =>
  EMPLOYEES.find(
    (e) => e.branchId === branchId && e.id.toLowerCase() === String(employeeId).toLowerCase()
  );

export const getBranchAdmin = (branchId, adminId) =>
  BRANCH_ADMINS.find(
    (a) => a.branchId === branchId && a.id.toLowerCase() === String(adminId).toLowerCase()
  );

export const getSuperAdmin = (adminId) =>
  SUPER_ADMINS.find((a) => a.id.toLowerCase() === String(adminId).toLowerCase());

export default EMPLOYEES;
