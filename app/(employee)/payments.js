import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import FinanceDocumentManager from '../../src/components/finance/FinanceDocumentManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeePaymentsScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <FinanceDocumentManager type="PAYMENT" user={user} branchId={user.branchId} />
    </ScreenContainer>
  );
}
