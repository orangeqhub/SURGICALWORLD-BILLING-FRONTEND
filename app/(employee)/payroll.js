import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import PayrollManager from '../../src/components/payroll/PayrollManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeePayrollScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <PayrollManager branchId={user.branchId} ownEmployeeId={user.id} canManage={false} user={user} />
    </ScreenContainer>
  );
}
