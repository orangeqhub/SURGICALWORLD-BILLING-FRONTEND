import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

const TONES = {
  neutral: { bg: COLORS.background, fg: COLORS.textSecondary },
  success: { bg: COLORS.successSoft, fg: COLORS.success },
  warning: { bg: COLORS.warningSoft, fg: COLORS.warning },
  danger: { bg: COLORS.dangerSoft, fg: COLORS.danger },
  info: { bg: COLORS.infoSoft, fg: COLORS.info },
};

export default function Badge({ label, tone = 'neutral', style, onPress }) {
  const colors = TONES[tone] || TONES.neutral;
  const Container = onPress ? Pressable : View;
  const extraProps = onPress ? { accessibilityRole: 'button' } : {};
  return (
    <Container
      style={onPress ? ({ focused }) => [styles.badge, { backgroundColor: colors.bg }, focusRingStyle(focused), style] : [styles.badge, { backgroundColor: colors.bg }, style]}
      onPress={onPress}
      {...extraProps}
    >
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});
