import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import AttendanceManager from '../../src/components/attendance/AttendanceManager';
import { useAuth } from '../../src/hooks/useAuth';

export default function BranchAdminAttendanceScreen() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <AttendanceManager branchId={user.branchId} canManage user={user} />
    </ScreenContainer>
  );
}
