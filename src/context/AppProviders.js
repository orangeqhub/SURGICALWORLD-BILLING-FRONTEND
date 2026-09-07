import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from './AuthContext';
import { BranchProvider } from './BranchContext';
import { BillingProvider } from './BillingContext';
import { SyncProvider } from './SyncContext';
import { SettingsProvider } from './SettingsContext';
import { NotificationProvider } from './NotificationContext';
import { KeyboardShortcutsProvider } from './KeyboardShortcutsContext';
import { useSQLite } from '../hooks/useSQLite';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import { COLORS } from '../theme';

export function AppProviders({ children }) {
  const { ready, error } = useSQLite();

  if (error) {
    return (
      <View style={styles.center}>
        <ErrorState title="Failed to initialize local database" message={error.message} />
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <LoadingState label="Preparing Surgical World..." />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <AuthProvider>
        <BranchProvider>
          <SettingsProvider>
            <SyncProvider>
              <BillingProvider>
                <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
              </BillingProvider>
            </SyncProvider>
          </SettingsProvider>
        </BranchProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
});

export default AppProviders;
