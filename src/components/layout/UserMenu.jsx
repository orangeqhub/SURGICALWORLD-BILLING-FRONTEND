import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

export default function UserMenu({ name = 'User', role = '', onLogout, compact = false }) {
  const [open, setOpen] = useState(false);
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View>
      <Pressable
        style={({ focused }) => [styles.trigger, focusRingStyle(focused)]}
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="User menu"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {!compact ? (
          <View style={styles.textWrap}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.role} numberOfLines={1}>{role}</Text>
          </View>
        ) : (
          role ? <Text style={styles.roleCompact} numberOfLines={1}>{role}</Text> : null
        )}
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, SHADOWS.raised]}>
            <Pressable
              style={({ focused }) => [styles.menuItem, focusRingStyle(focused)]}
              onPress={() => {
                setOpen(false);
                onLogout && onLogout();
              }}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
              <Text style={styles.menuItemText}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  textWrap: { maxWidth: 120 },
  name: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  role: { fontSize: 11, color: COLORS.textSecondary },
  roleCompact: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, maxWidth: 64 },
  backdrop: { flex: 1, backgroundColor: 'rgba(32,36,99,0.15)' },
  menu: {
    position: 'absolute',
    top: 70,
    right: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xxs,
    minWidth: 160,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  menuItemText: { fontSize: 14, fontWeight: '600', color: COLORS.danger },
});
