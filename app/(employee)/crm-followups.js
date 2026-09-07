import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import CrmFollowUpManager from '../../src/components/crm/CrmFollowUpManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeeCrmFollowUpsScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <CrmFollowUpManager branchId={user.branchId} ownEmployeeId={user.id} user={user} />
    </ScreenContainer>
  );
}
