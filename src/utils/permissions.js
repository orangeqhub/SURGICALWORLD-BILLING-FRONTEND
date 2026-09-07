import { ROLES, ROLE_HOME_ROUTE, PERMISSIONS } from '../constants/roles';
import { findEmployeeNavItem } from '../constants/employeeNavigation';

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.role === ROLES.BRANCH_ADMIN) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function canAccessBranch(user, branchId) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.branchId === branchId;
}

export function isAdmin(user) {
  return user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.BRANCH_ADMIN;
}

/**
 * Route-key based guard for the (employee) route group. Route keys are the
 * last URL segment (e.g. "purchases" for /(employee)/purchases) and are
 * looked up against the centralized src/constants/employeeNavigation.js
 * catalog, so navigation visibility and direct-URL access can never drift.
 */
export function canAccessEmployeeRoute(user, routeKey) {
  if (!user) return false;
  if (user.role !== ROLES.EMPLOYEE) return true;
  const navItem = findEmployeeNavItem(routeKey);
  if (!navItem) return true;
  return hasPermission(user, navItem.permission);
}

export function getDefaultRouteForUser(user) {
  if (!user) return '/(auth)/login-selection';
  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.BRANCH_ADMIN) {
    return ROLE_HOME_ROUTE[user.role];
  }
  if (hasPermission(user, PERMISSIONS.DASHBOARD_VIEW)) return '/(employee)/dashboard';
  if (hasPermission(user, PERMISSIONS.BILLING)) return '/(employee)/billing';
  if (hasPermission(user, PERMISSIONS.PURCHASE_MANAGE)) return '/(employee)/purchases';
  if (hasPermission(user, PERMISSIONS.PAYMENTS_MANAGE)) return '/(employee)/payments';
  return '/(employee)/billing';
}

export default { hasPermission, hasAnyPermission, canAccessBranch, isAdmin, canAccessEmployeeRoute, getDefaultRouteForUser };
