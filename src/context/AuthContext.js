import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginEmployee, loginBranchAdmin, loginSuperAdmin, rememberDevice } from '../services/api/authApi';

const SESSION_KEY = 'sw_session_user';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(SESSION_KEY)
      .then((raw) => {
        if (!cancelled && raw) {
          setUser(JSON.parse(raw));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (nextUser) => {
    if (nextUser) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextUser)).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    }
  }, []);

  const signInEmployee = useCallback(async ({ branchId, employeeId }) => {
    const result = await loginEmployee({ branchId, employeeId });
    if (result.success) {
      setUser(result.user);
      await persistSession(result.user);
    }
    return result;
  }, [persistSession]);

  const signInBranchAdmin = useCallback(async ({ branchId, adminId, password, rememberDevice: remember }) => {
    const result = await loginBranchAdmin({ branchId, adminId, password });
    if (result.success) {
      setUser(result.user);
      await persistSession(result.user);
      if (remember) {
        await rememberDevice(result.user.id, 'Branch Admin Device');
      }
    }
    return result;
  }, [persistSession]);

  const signInSuperAdmin = useCallback(async ({ adminId, password }) => {
    const result = await loginSuperAdmin({ adminId, password });
    if (result.success) {
      setUser(result.user);
      await persistSession(result.user);
    }
    return result;
  }, [persistSession]);

  const signOut = useCallback(async () => {
    setUser(null);
    await persistSession(null);
  }, [persistSession]);

  const value = useMemo(
    () => ({
      user,
      restoring,
      isAuthenticated: Boolean(user),
      signInEmployee,
      signInBranchAdmin,
      signInSuperAdmin,
      signOut,
    }),
    [user, restoring, signInEmployee, signInBranchAdmin, signInSuperAdmin, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
