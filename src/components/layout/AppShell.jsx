import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../theme';
import { ROLES } from '../../constants/roles';
import { usePrimaryActionTrigger } from '../../context/KeyboardShortcutsContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import ResponsiveDrawer from './ResponsiveDrawer';

const TABLET_BREAKPOINT = 900;

const SHORTCUT_ROUTE_KEYWORDS = {
  s: 'billing',
  b: 'purchases',
  t: 'transfers',
  r: 'reports',
};

const SHORTCUT_ROLES = [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN];

export default function AppShell({
  menuItems,
  title,
  subtitle,
  connectionStatus,
  showBranchSelector,
  branchId,
  onBranchChange,
  allowAllBranches,
  user,
  onLogout,
  footerLabel,
  children,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const triggerPrimaryAction = usePrimaryActionTrigger();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    if (!user?.role || !SHORTCUT_ROLES.includes(user.role)) return undefined;

    const handleKeyDown = (event) => {
      // altKey + ctrlKey together is AltGr on many non-US keyboard layouts
      // (used to type characters like @ or €) - don't hijack that.
      if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const key = event.key?.toLowerCase();

      if (key === 'c') {
        event.preventDefault();
        triggerPrimaryAction();
        return;
      }

      const keyword = SHORTCUT_ROUTE_KEYWORDS[key];
      if (!keyword) return;
      const match = (menuItems || []).find((item) => item.route.toLowerCase().includes(keyword));
      if (match) {
        event.preventDefault();
        router.push(match.route);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user?.role, menuItems, router, triggerPrimaryAction]);

  return (
    <View style={styles.wrap}>
      {isTablet ? <AppSidebar menuItems={menuItems} footerLabel={footerLabel} /> : null}

      {!isTablet ? (
        <ResponsiveDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <AppSidebar menuItems={menuItems} footerLabel={footerLabel} />
        </ResponsiveDrawer>
      ) : null}

      <View style={styles.main}>
        <AppHeader
          title={title}
          subtitle={subtitle}
          connectionStatus={connectionStatus}
          showBranchSelector={showBranchSelector}
          branchId={branchId}
          onBranchChange={onBranchChange}
          allowAllBranches={allowAllBranches}
          user={user}
          onLogout={onLogout}
          onMenuPress={isTablet ? undefined : () => setDrawerOpen(true)}
        />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.background },
  main: { flex: 1 },
  content: { flex: 1 },
});
