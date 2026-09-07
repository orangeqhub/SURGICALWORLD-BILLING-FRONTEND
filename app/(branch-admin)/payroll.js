import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import PayrollManager from '../../src/components/payroll/PayrollManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function BranchAdminPayrollScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <PayrollManager branchId={user.branchId} canManage user={user} />
    </ScreenContainer>
  );
}
