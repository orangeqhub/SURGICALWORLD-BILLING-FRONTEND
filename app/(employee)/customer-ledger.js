import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import LedgerView from '../../src/components/finance/LedgerView';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeeCustomerLedgerScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <LedgerView partyType="CUSTOMER" branchId={user.branchId} />
    </ScreenContainer>
  );
}
