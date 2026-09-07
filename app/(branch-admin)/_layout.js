import React from 'react';
import { Slot, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useSync } from '../../src/hooks/useSync';
import { ROLES, ROLE_HOME_ROUTE } from '../../src/constants/roles';
import AppShell from '../../src/components/layout/AppShell';
import LoadingState from '../../src/components/ui/LoadingState';

const MENU_ITEMS = [
  { label: 'Dashboard', icon: 'grid-outline', route: '/(branch-admin)/dashboard' },
  { label: 'Billing Supervision', icon: 'cart-outline', route: '/(branch-admin)/billing' },
  { label: 'Employees', icon: 'people-outline', route: '/(branch-admin)/employees' },
  { label: 'Products', icon: 'pricetag-outline', route: '/(branch-admin)/products' },
  { label: 'Inventory', icon: 'cube-outline', route: '/(branch-admin)/inventory' },
  { label: 'Purchases', icon: 'bag-add-outline', route: '/(branch-admin)/purchases' },
  { label: 'Suppliers', icon: 'briefcase-outline', route: '/(branch-admin)/suppliers' },
  { label: 'Customers', icon: 'person-circle-outline', route: '/(branch-admin)/customers' },
  { label: 'Expenses', icon: 'wallet-outline', route: '/(branch-admin)/expenses' },
  { label: 'Stock Transfers', icon: 'swap-horizontal-outline', route: '/(branch-admin)/transfers' },
  { label: 'CRM Follow-ups', icon: 'call-outline', route: '/(branch-admin)/crm-followups' },
  { label: 'Sales Targets', icon: 'trophy-outline', route: '/(branch-admin)/sales-targets' },
  { label: 'Attendance', icon: 'calendar-outline', route: '/(branch-admin)/attendance' },
  { label: 'Payroll', icon: 'cash-outline', route: '/(branch-admin)/payroll' },
  { label: 'Reports', icon: 'bar-chart-outline', route: '/(branch-admin)/reports' },
  { label: 'Branch Settings', icon: 'settings-outline', route: '/(branch-admin)/settings' },
];

export default function BranchAdminLayout() {
  const { user, restoring, signOut } = useAuth();
  const { connectionStatus } = useSync();

  if (restoring) {
    return <LoadingState fullscreen label="Loading..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login-selection" />;
  }

  if (user.role !== ROLES.BRANCH_ADMIN) {
    return <Redirect href={ROLE_HOME_ROUTE[user.role]} />;
  }

  return (
    <AppShell
      menuItems={MENU_ITEMS}
      title="Branch Admin"
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
