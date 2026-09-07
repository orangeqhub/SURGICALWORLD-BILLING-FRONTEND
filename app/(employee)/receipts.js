import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import FinanceDocumentManager from '../../src/components/finance/FinanceDocumentManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeeReceiptsScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <FinanceDocumentManager type="RECEIPT" user={user} branchId={user.branchId} />
    </ScreenContainer>
  );
}
