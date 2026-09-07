import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SalesTargetManager from '../../src/components/targets/SalesTargetManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';

export default function SuperAdminSalesTargetsScreen() {
  const { user } = useAuth();
  const { selectedBranchId, isAllBranches } = useBranch();

  return (
    <ScreenContainer>
      <SalesTargetManager branchId={isAllBranches ? undefined : selectedBranchId} allowBranchPicker={isAllBranches} canManage user={user} />
    </ScreenContainer>
  );
}
