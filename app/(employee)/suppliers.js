import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SupplierManager from '../../src/components/suppliers/SupplierManager';
import { useAuth } from '../../src/hooks/useAuth';
import { usePermissions } from '../../src/hooks/usePermissions';
import { PERMISSIONS } from '../../src/constants/roles';

export default function EmployeeSuppliersScreen() {
  const { user } = useAuth();
  const { can } = usePermissions();

  return (
    <ScreenContainer>
      <SupplierManager
        title={`Suppliers - ${user.branchName}`}
        branchId={user.branchId}
        allowBranchPicker={false}
        defaultCreateBranchId={user.branchId}
        allowEdit={can(PERMISSIONS.SUPPLIER_MANAGE)}
      />
    </ScreenContainer>
  );
}
