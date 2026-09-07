import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';
import BranchSelector from './BranchSelector';
import UserMenu from './UserMenu';
import BluetoothPrinterPanel from '../billing/BluetoothPrinterPanel';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { focusRingStyle } from '../../utils/a11y';

export default function AppHeader({
  title,
  subtitle,
  showBranchSelector = false,
  branchId,
  onBranchChange,
  allowAllBranches = true,
  user,
  onLogout,
  onMenuPress,
}) {
  const [btPanelVisible, setBtPanelVisible] = useState(false);
  const { isPhone } = useResponsiveLayout();
  const isEmployee = user?.role === 'EMPLOYEE';

  const btButton = isEmployee ? (
    <Pressable
      onPress={() => setBtPanelVisible(true)}
      style={({ focused }) => [styles.iconBtn, focusRingStyle(focused)]}
      accessibilityRole="button"
      accessibilityLabel="Bluetooth printer settings"
    >
      <Ionicons name="print-outline" size={20} color={COLORS.brandRed} />
    </Pressable>
  ) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.left}>
          {onMenuPress ? (
            <Pressable
              onPress={onMenuPress}
              style={({ focused }) => [styles.menuBtn, focusRingStyle(focused)]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
            >
              <Ionicons name="menu-outline" size={24} color={COLORS.textPrimary} />
            </Pressable>
          ) : null}
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        {!isPhone ? (
          <View style={styles.right}>
            {showBranchSelector ? (
              <BranchSelector value={branchId} onChange={onBranchChange} allowAll={allowAllBranches} />
            ) : null}
            {btButton}
            {user ? <UserMenu name={user.name} role={user.roleLabel} onLogout={onLogout} /> : null}
          </View>
        ) : null}
      </View>

      {isPhone ? (
        <View style={styles.mobileRow}>
          {showBranchSelector ? (
            <BranchSelector
              value={branchId}
              onChange={onBranchChange}
              allowAll={allowAllBranches}
              style={styles.mobileBranchSelector}
            />
          ) : (
            <View style={styles.spacer} />
          )}
          <View style={styles.mobileRight}>
            {btButton}
            {user ? <UserMenu name={user.name} role={user.roleLabel} onLogout={onLogout} compact /> : null}
          </View>
        </View>
      ) : null}

      {isEmployee && (
        <BluetoothPrinterPanel visible={btPanelVisible} onClose={() => setBtPanelVisible(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1, minWidth: 0 },
  titleWrap: { flexShrink: 1, minWidth: 0 },
  menuBtn: { padding: 4 },
  title: { ...TYPOGRAPHY.h3 },
  subtitle: { ...TYPOGRAPHY.caption },
  right: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  mobileBranchSelector: { flex: 1, maxWidth: 260, minWidth: 0 },
  spacer: { flex: 1 },
  mobileRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 0 },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
