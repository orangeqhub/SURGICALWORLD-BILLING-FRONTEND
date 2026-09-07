import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { hasPermission, canAccessBranch, isAdmin } from '../utils/permissions';

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      can: (permission) => hasPermission(user, permission),
      canAccessBranch: (branchId) => canAccessBranch(user, branchId),
      isAdmin: isAdmin(user),
      role: user?.role || null,
    }),
    [user]
  );
}

export default usePermissions;
