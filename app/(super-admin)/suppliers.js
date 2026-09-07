import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SupplierManager from '../../src/components/suppliers/SupplierManager';
import { useBranch } from '../../src/hooks/useBranch';

export default function SuperAdminSuppliersScreen() {
  const { selectedBranchId, isAllBranches, selectedBranch } = useBranch();

  return (
    <ScreenContainer>
      <SupplierManager
        title={isAllBranches ? 'Suppliers - All Branches' : `Suppliers - ${selectedBranch?.name}`}
        branchId={isAllBranches ? undefined : selectedBranchId}
        allowBranchPicker={isAllBranches}
        defaultCreateBranchId={isAllBranches ? undefined : selectedBranchId}
        allowEdit
      />
    </ScreenContainer>
  );
}
