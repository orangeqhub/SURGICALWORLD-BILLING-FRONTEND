import React from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from '../ui/LinearGradientShim';
import { COLORS, GRADIENTS, SPACING, RADIUS } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

const LOGO = require('../../../assets/logo.png');

export default function AppSidebar({ menuItems = [], footerLabel, collapsed = false }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <LinearGradient colors={GRADIENTS.sidebar} style={[styles.wrap, collapsed && styles.wrapCollapsed]}>
      <View style={styles.brandRow}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>
        {!collapsed && (
          <View>
            <Text style={styles.brandTitle}>Surgical World</Text>
            <Text style={styles.brandSubtitle}>Billing Suite</Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => {
          const active = pathname === item.route || pathname?.startsWith(item.route + '/');
          return (
            <Pressable
              key={item.route}
              style={({ focused }) => [styles.menuItem, active && styles.menuItemActive, focusRingStyle(focused)]}
              onPress={() => router.push(item.route)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={item.icon} size={20} color={active ? COLORS.brandRed : COLORS.white} />
              {!collapsed && (
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {footerLabel && !collapsed ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerLabel}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 260, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md },
  wrapCollapsed: { width: 84, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xs, marginBottom: SPACING.xl },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 60, height: 60 },
  brandTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  brandSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  menuList: { gap: 4, paddingBottom: SPACING.xl },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  menuItemActive: { backgroundColor: COLORS.white },
  menuLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  menuLabelActive: { color: COLORS.brandRed },
  footer: { paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
});
