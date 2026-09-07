import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import ReceivablesPayablesView from '../../src/components/finance/ReceivablesPayablesView';
import { useAuth } from '../../src/hooks/useAuth';

export default function EmployeeReceivablesPayablesScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <ReceivablesPayablesView branchId={user.branchId} />
    </ScreenContainer>
  );
}
