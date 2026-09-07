import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import AttendanceManager from '../../src/components/attendance/AttendanceManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';

export default function SuperAdminAttendanceScreen() {
  const { user } = useAuth();
  const { selectedBranchId, isAllBranches } = useBranch();

  return (
    <ScreenContainer>
      <AttendanceManager branchId={isAllBranches ? undefined : selectedBranchId} allowBranchPicker={isAllBranches} canManage user={user} />
    </ScreenContainer>
  );
}
