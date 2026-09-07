import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import CrmFollowUpManager from '../../src/components/crm/CrmFollowUpManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';

export default function SuperAdminCrmFollowUpsScreen() {
  const { user } = useAuth();
  const { selectedBranchId, isAllBranches } = useBranch();

  return (
    <ScreenContainer>
      <CrmFollowUpManager branchId={isAllBranches ? undefined : selectedBranchId} allowBranchPicker={isAllBranches} user={user} />
    </ScreenContainer>
  );
}
