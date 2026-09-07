import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRANCHES, getBranchById } from '../constants/branches';
import { ROLES } from '../constants/roles';
import AuthContext from './AuthContext';

const SELECTED_BRANCH_KEY = 'sw_selected_branch';

export const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [branches, setBranches] = useState([]);

  const refreshBranches = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('sw_branches_v1');
      if (raw) {
        setBranches(JSON.parse(raw));
      } else {
        setBranches(BRANCHES);
        await AsyncStorage.setItem('sw_branches_v1', JSON.stringify(BRANCHES));
      }
    } catch (e) {
      setBranches(BRANCHES);
    }
  }, []);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  useEffect(() => {
    if (!user) return;

    if (user.role !== ROLES.SUPER_ADMIN) {
      setSelectedBranchId(user.branchId);
      return;
    }

    AsyncStorage.getItem(SELECTED_BRANCH_KEY).then((saved) => {
      setSelectedBranchId(saved || 'ALL');
    });
  }, [user]);

  const changeBranch = async (branchId) => {
    setSelectedBranchId(branchId);
    if (user?.role === ROLES.SUPER_ADMIN) {
      await AsyncStorage.setItem(SELECTED_BRANCH_KEY, branchId).catch(() => {});
    }
  };

  const getBranchByIdDyn = React.useCallback((id) => {
    const list = branches.length > 0 ? branches : BRANCHES;
    return list.find((b) => b.id === id) || null;
  }, [branches]);

  const value = useMemo(() => {
    const isAllBranches = selectedBranchId === 'ALL';
    return {
      branches: branches.length > 0 ? branches : BRANCHES,
      selectedBranchId,
      selectedBranch: isAllBranches ? null : getBranchByIdDyn(selectedBranchId),
      isAllBranches,
      canSelectAllBranches: user?.role === ROLES.SUPER_ADMIN,
      changeBranch,
      refreshBranches,
    };
  }, [selectedBranchId, user, branches, getBranchByIdDyn, refreshBranches]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export default BranchContext;
