import { PERMISSIONS } from './roles';

/**
 * Functional permission profiles for the EMPLOYEE role (see Phase 1 in
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md). These are job-function presets, not
 * separate login types - assigning one just sets an employee's `role` label
 * and `permissions` array (src/constants/employees.js shape), which already
 * flows through authApi.loginEmployee into the session unchanged.
 */
export const EMPLOYEE_PROFILES = [
  {
    key: 'CASHIER',
    label: 'Cashier',
    permissions: [PERMISSIONS.BILLING, PERMISSIONS.HOLD_BILL, PERMISSIONS.ATTENDANCE_MANAGE, PERMISSIONS.PAYROLL_MANAGE],
  },
  {
    key: 'SALES_EXECUTIVE',
    label: 'Sales Executive',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.BILLING,
      PERMISSIONS.HOLD_BILL,
      PERMISSIONS.RETURNS,
      PERMISSIONS.CREDIT_SALE,
      PERMISSIONS.CRM_MANAGE,
      PERMISSIONS.ATTENDANCE_MANAGE,
      PERMISSIONS.PAYROLL_MANAGE,
    ],
  },
  {
    key: 'PURCHASE_EXECUTIVE',
    label: 'Purchase Executive',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PURCHASE_MANAGE,
      PERMISSIONS.SUPPLIER_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.ATTENDANCE_MANAGE,
      PERMISSIONS.PAYROLL_MANAGE,
    ],
  },
  {
    key: 'ACCOUNTANT',
    label: 'Accountant',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.LEDGER_VIEW,
      PERMISSIONS.PAYMENTS_MANAGE,
      PERMISSIONS.RECEIPTS_MANAGE,
      PERMISSIONS.EXPENSE_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.ATTENDANCE_MANAGE,
      PERMISSIONS.PAYROLL_MANAGE,
    ],
  },
];

export const getEmployeeProfile = (key) => EMPLOYEE_PROFILES.find((p) => p.key === key);

export const getEmployeeProfileByLabel = (label) => EMPLOYEE_PROFILES.find((p) => p.label === label);

export default EMPLOYEE_PROFILES;
