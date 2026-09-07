import { PERMISSIONS } from './roles';

/**
 * Single source of truth for employee-side navigation AND route protection
 * (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 1). Each entry's
 * `permission` drives both whether the sidebar shows the item
 * (getEmployeeMenuItems) and whether a direct URL to that route is allowed
 * (src/utils/permissions.js canAccessEmployeeRoute), so the two can never
 * drift apart.
 */
export const EMPLOYEE_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: '/(employee)/dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
  { key: 'billing', label: 'Billing / POS', icon: 'cart-outline', route: '/(employee)/billing', permission: PERMISSIONS.BILLING },
  { key: 'invoices', label: 'Invoice History', icon: 'receipt-outline', route: '/(employee)/invoices', permission: PERMISSIONS.BILLING },
  { key: 'shift', label: 'My Shift', icon: 'time-outline', route: '/(employee)/shift', permission: PERMISSIONS.BILLING },
  { key: 'purchases', label: 'Purchases', icon: 'bag-add-outline', route: '/(employee)/purchases', permission: PERMISSIONS.PURCHASE_MANAGE },
  { key: 'suppliers', label: 'Suppliers', icon: 'briefcase-outline', route: '/(employee)/suppliers', permission: PERMISSIONS.SUPPLIER_MANAGE },
  { key: 'inventory-view', label: 'Inventory View', icon: 'cube-outline', route: '/(employee)/inventory-view', permission: PERMISSIONS.INVENTORY_VIEW },
  { key: 'purchase-reports', label: 'Purchase Reports', icon: 'bar-chart-outline', route: '/(employee)/purchase-reports', permission: PERMISSIONS.PURCHASE_MANAGE },
  { key: 'payments', label: 'Payments', icon: 'card-outline', route: '/(employee)/payments', permission: PERMISSIONS.PAYMENTS_MANAGE },
  { key: 'receipts', label: 'Receipts', icon: 'document-text-outline', route: '/(employee)/receipts', permission: PERMISSIONS.RECEIPTS_MANAGE },
  { key: 'customer-ledger', label: 'Customer Ledger', icon: 'people-outline', route: '/(employee)/customer-ledger', permission: PERMISSIONS.LEDGER_VIEW },
  { key: 'supplier-ledger', label: 'Supplier Ledger', icon: 'business-outline', route: '/(employee)/supplier-ledger', permission: PERMISSIONS.LEDGER_VIEW },
  { key: 'receivables-payables', label: 'Receivables & Payables', icon: 'swap-vertical-outline', route: '/(employee)/receivables-payables', permission: PERMISSIONS.LEDGER_VIEW },
  { key: 'financial-reports', label: 'Financial Reports', icon: 'stats-chart-outline', route: '/(employee)/financial-reports', permission: PERMISSIONS.REPORTS_VIEW },
  { key: 'crm-followups', label: 'CRM Follow-ups', icon: 'call-outline', route: '/(employee)/crm-followups', permission: PERMISSIONS.CRM_MANAGE },
  { key: 'sales-targets', label: 'Sales Targets', icon: 'trophy-outline', route: '/(employee)/sales-targets', permission: PERMISSIONS.DASHBOARD_VIEW },
  { key: 'attendance', label: 'Attendance', icon: 'calendar-outline', route: '/(employee)/attendance', permission: PERMISSIONS.ATTENDANCE_MANAGE },
  { key: 'payroll', label: 'Payroll / Payslip', icon: 'cash-outline', route: '/(employee)/payroll', permission: PERMISSIONS.PAYROLL_MANAGE },
];

export function findEmployeeNavItem(routeKey) {
  return EMPLOYEE_NAV_ITEMS.find((item) => item.key === routeKey);
}

/**
 * Derives the employee route key from a raw pathname, tolerant of the
 * expo-router group segment being present or stripped, trailing slashes,
 * query/hash suffixes, and nested sub-paths (the segment immediately after
 * "(employee)" is used, not the deepest segment, so a future nested route
 * still inherits its parent's permission requirement).
 */
export function resolveEmployeeRouteKey(pathname) {
  const clean = String(pathname || '').split('?')[0].split('#')[0];
  const segments = clean.split('/').filter(Boolean);
  const groupIndex = segments.indexOf('(employee)');
  if (groupIndex !== -1 && segments[groupIndex + 1]) {
    return segments[groupIndex + 1];
  }
  return segments[segments.length - 1] || 'billing';
}

export function getEmployeeMenuItems(user) {
  if (!user || !Array.isArray(user.permissions)) return [];
  return EMPLOYEE_NAV_ITEMS.filter((item) => user.permissions.includes(item.permission)).map(({ label, icon, route }) => ({
    label,
    icon,
    route,
  }));
}

export default EMPLOYEE_NAV_ITEMS;
