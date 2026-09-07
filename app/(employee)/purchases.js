import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import PurchaseManager from '../../src/components/purchases/PurchaseManager';
import { useAuth } from '../../src/hooks/useAuth';

/**
 * Purchase Executive's full Purchase Editor - branch-locked to their
 * assigned branch. Shares PurchaseManager/PurchaseEditor with Branch Admin
 * (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3) rather than
 * duplicating the editor.
 */
export default function EmployeePurchasesScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <PurchaseManager user={user} branchId={user.branchId} branchLocked />
    </ScreenContainer>
  );
}
