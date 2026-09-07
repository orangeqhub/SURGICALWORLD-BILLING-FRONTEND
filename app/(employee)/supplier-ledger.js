import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import LedgerView from '../../src/components/finance/LedgerView';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeeSupplierLedgerScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <LedgerView partyType="SUPPLIER" branchId={user.branchId} />
    </ScreenContainer>
  );
}
