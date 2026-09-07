import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SupplierManager from '../../src/components/suppliers/SupplierManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function SuppliersScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <SupplierManager title={`Suppliers - ${user.branchName}`} branchId={user.branchId} allowBranchPicker={false} defaultCreateBranchId={user.branchId} allowEdit />
    </ScreenContainer>
  );
}
