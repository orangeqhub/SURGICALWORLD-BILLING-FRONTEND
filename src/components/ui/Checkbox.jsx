import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import { focusRingStyle, handleActivationKeyDown } from '../../utils/a11y';

export default function Checkbox({ checked, onChange, label, disabled = false, style }) {
  const toggle = () => onChange && onChange(!checked);
  return (
    <Pressable
      style={({ focused }) => [styles.row, focusRingStyle(focused), disabled && styles.disabled, style]}
      onPress={toggle}
      onKeyDown={handleActivationKeyDown(toggle)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={COLORS.white} /> : null}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  box: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm - 3,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  boxChecked: { backgroundColor: COLORS.brandRed, borderColor: COLORS.brandRed },
  label: { ...TYPOGRAPHY.body },
  disabled: { opacity: 0.5 },
});
