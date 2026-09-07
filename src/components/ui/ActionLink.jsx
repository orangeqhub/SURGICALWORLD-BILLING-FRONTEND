import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

/**
 * Keyboard-accessible replacement for the `<Text onPress={...}>` table/list
 * row-action pattern. Plain RN Text with onPress renders as a non-focusable
 * span on web (no tabIndex, no role, no key handling) - this wraps the same
 * visual style in a Pressable so it's tabbable and Enter/Space-activatable.
 */
export default function ActionLink({ onPress, children, disabled = false, muted = false, style, textStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ focused }) => [styles.base, disabled && styles.disabled, focusRingStyle(focused), style]}
    >
      <Text style={[styles.text, muted && styles.textMuted, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 2 },
  text: { color: COLORS.brandRed, fontWeight: '700', fontSize: 12 },
  textMuted: { color: COLORS.textSecondary },
  disabled: { opacity: 0.5 },
});
