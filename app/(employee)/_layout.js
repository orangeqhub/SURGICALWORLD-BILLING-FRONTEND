import React from 'react';
import { Slot, Redirect, usePathname } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useSync } from '../../src/hooks/useSync';
import { ROLES, ROLE_HOME_ROUTE } from '../../src/constants/roles';
import { getEmployeeMenuItems, resolveEmployeeRouteKey } from '../../src/constants/employeeNavigation';
import { canAccessEmployeeRoute, getDefaultRouteForUser } from '../../src/utils/permissions';
import AppShell from '../../src/components/layout/AppShell';
import LoadingState from '../../src/components/ui/LoadingState';

export default function EmployeeLayout() {
  const { user, restoring, signOut } = useAuth();
  const { connectionStatus } = useSync();
  const pathname = usePathname();

  if (restoring) {
    return <LoadingState fullscreen label="Loading..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login-selection" />;
  }

  if (user.role !== ROLES.EMPLOYEE) {
    return <Redirect href={ROLE_HOME_ROUTE[user.role]} />;
  }

  const routeKey = resolveEmployeeRouteKey(pathname);

  if (!canAccessEmployeeRoute(user, routeKey)) {
    const fallbackRoute = getDefaultRouteForUser(user);
    const fallbackKey = resolveEmployeeRouteKey(fallbackRoute);
    // If the computed fallback itself isn't permitted (e.g. an employee with
    // no recognized permissions at all), redirecting there would just bounce
    // straight back through this same guard. Send those to login instead of
    // looping.
    if (fallbackKey === routeKey || !canAccessEmployeeRoute(user, fallbackKey)) {
      return <Redirect href="/(auth)/login-selection" />;
    }
    return <Redirect href={fallbackRoute} />;
  }

  const menuItems = getEmployeeMenuItems(user);

  return (
    <AppShell
      menuItems={menuItems}
      title="Billing Suite"
      subtitle={user.branchName}
      connectionStatus={connectionStatus}
      user={{ name: user.name, roleLabel: user.roleLabel, role: user.role }}
      onLogout={signOut}
      footerLabel={`v1.0.0 - ${user.branchName}`}
    >
      <Slot />
    </AppShell>
  );
}
