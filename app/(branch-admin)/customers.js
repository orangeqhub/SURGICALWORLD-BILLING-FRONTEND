import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import CustomerManager from '../../src/components/customers/CustomerManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function BranchCustomersScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <CustomerManager title={`Customers - ${user.branchName}`} branchId={user.branchId} allowBranchPicker={false} defaultCreateBranchId={user.branchId} userName={user.name} />
    </ScreenContainer>
  );
}
