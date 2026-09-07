import React from 'react';
import { Slot, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useSync } from '../../src/hooks/useSync';
import { useBranch } from '../../src/hooks/useBranch';
import { ROLES, ROLE_HOME_ROUTE } from '../../src/constants/roles';
import AppShell from '../../src/components/layout/AppShell';
import LoadingState from '../../src/components/ui/LoadingState';

const MENU_ITEMS = [
  { label: 'Global Dashboard', icon: 'grid-outline', route: '/(super-admin)/dashboard' },
  { label: 'Branch Management', icon: 'business-outline', route: '/(super-admin)/branches' },
  { label: 'Admin Management', icon: 'shield-checkmark-outline', route: '/(super-admin)/admins' },
  { label: 'Employee Oversight', icon: 'people-outline', route: '/(super-admin)/employees' },
  { label: 'Customers', icon: 'person-circle-outline', route: '/(super-admin)/customers' },
  { label: 'Suppliers', icon: 'briefcase-outline', route: '/(super-admin)/suppliers' },
  { label: 'Product Master', icon: 'cube-outline', route: '/(super-admin)/products' },
  { label: 'Inventory Overview', icon: 'file-tray-stacked-outline', route: '/(super-admin)/inventory' },
  { label: 'Stock Transfer Approval', icon: 'swap-horizontal-outline', route: '/(super-admin)/transfers' },
  { label: 'CRM Follow-ups', icon: 'call-outline', route: '/(super-admin)/crm-followups' },
  { label: 'Sales Targets', icon: 'trophy-outline', route: '/(super-admin)/sales-targets' },
  { label: 'Attendance', icon: 'calendar-outline', route: '/(super-admin)/attendance' },
  { label: 'Payroll', icon: 'cash-outline', route: '/(super-admin)/payroll' },
  { label: 'Global Reports', icon: 'bar-chart-outline', route: '/(super-admin)/reports' },
  { label: 'Global Settings', icon: 'settings-outline', route: '/(super-admin)/settings' },
];

export default function SuperAdminLayout() {
  const { user, restoring, signOut } = useAuth();
  const { connectionStatus } = useSync();
  const { selectedBranchId, changeBranch } = useBranch();

  if (restoring) {
    return <LoadingState fullscreen label="Loading..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login-selection" />;
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    return <Redirect href={ROLE_HOME_ROUTE[user.role]} />;
  }

  return (
    <AppShell
      menuItems={MENU_ITEMS}
      title="Super Admin"
      subtitle="Head Office - All Branches"
      connectionStatus={connectionStatus}
      showBranchSelector
      branchId={selectedBranchId}
      onBranchChange={changeBranch}
      allowAllBranches
      user={{ name: user.name, roleLabel: user.roleLabel, role: user.role }}
      onLogout={signOut}
      footerLabel="v1.0.0 - Head Office"
    >
      <Slot />
    </AppShell>
  );
}
