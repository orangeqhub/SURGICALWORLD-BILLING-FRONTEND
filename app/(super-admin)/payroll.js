import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import PayrollManager from '../../src/components/payroll/PayrollManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';

export default function SuperAdminPayrollScreen() {
  const { user } = useAuth();
  const { selectedBranchId, isAllBranches } = useBranch();

  return (
    <ScreenContainer>
      <PayrollManager branchId={isAllBranches ? undefined : selectedBranchId} allowBranchPicker={isAllBranches} canManage user={user} />
    </ScreenContainer>
  );
}
