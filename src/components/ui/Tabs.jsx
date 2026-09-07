import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import { focusRingStyle, handleActivationKeyDown } from '../../utils/a11y';

export default function Tabs({ tabs = [], active, onChange, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const select = () => onChange(tab.key);
          return (
            <Pressable
              key={tab.key}
              style={({ focused }) => [styles.tab, isActive && styles.tabActive, focusRingStyle(focused)]}
              onPress={select}
              onKeyDown={handleActivationKeyDown(select)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
              {tab.badge !== undefined && tab.badge !== null ? (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{tab.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: SPACING.md },
  row: { gap: SPACING.xs, paddingBottom: SPACING.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  tabActive: { backgroundColor: COLORS.dangerSoft },
  label: { ...TYPOGRAPHY.bodyStrong, color: COLORS.textSecondary },
  labelActive: { color: COLORS.brandRed },
  badge: { backgroundColor: COLORS.background, borderRadius: RADIUS.pill, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  badgeActive: { backgroundColor: COLORS.white },
  badgeText: { ...TYPOGRAPHY.small, fontWeight: '700' },
  badgeTextActive: { color: COLORS.brandRed },
});
