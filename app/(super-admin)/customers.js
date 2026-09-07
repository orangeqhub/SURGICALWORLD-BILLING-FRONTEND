import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import CustomerManager from '../../src/components/customers/CustomerManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';

export default function SuperAdminCustomersScreen() {
  const { user } = useAuth();
  const { selectedBranchId, isAllBranches, selectedBranch } = useBranch();

  return (
    <ScreenContainer>
      <CustomerManager
        title={isAllBranches ? 'Customers - All Branches' : `Customers - ${selectedBranch?.name}`}
        branchId={isAllBranches ? undefined : selectedBranchId}
        allowBranchPicker={isAllBranches}
        defaultCreateBranchId={isAllBranches ? undefined : selectedBranchId}
        userName={user.name}
      />
    </ScreenContainer>
  );
}
