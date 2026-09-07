import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SalesTargetManager from '../../src/components/targets/SalesTargetManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function BranchAdminSalesTargetsScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <SalesTargetManager branchId={user.branchId} canManage user={user} />
    </ScreenContainer>
  );
}
