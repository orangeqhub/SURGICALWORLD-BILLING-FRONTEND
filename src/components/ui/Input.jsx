import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

const WEB_NO_OUTLINE = Platform.OS === 'web' ? { outlineStyle: 'none', boxShadow: 'none' } : null;

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  icon,
  rightElement,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  style,
  ...rest
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          error && styles.inputRowError,
          !editable && styles.inputRowDisabled,
        ]}
      >
        {icon}
        <TextInput
          style={[styles.input, WEB_NO_OUTLINE]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightElement}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.xxs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    height: 50,
    gap: SPACING.xs,
  },
  inputRowFocused: {
    borderColor: COLORS.brandRed,
    ...(Platform.OS === 'web' ? { boxShadow: `0 0 0 2px ${COLORS.dangerSoft}` } : {}),
  },
  inputRowError: { borderColor: COLORS.danger },
  inputRowDisabled: { backgroundColor: COLORS.background, opacity: 0.7 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary, height: '100%' },
  errorText: { ...TYPOGRAPHY.caption, color: COLORS.danger, marginTop: SPACING.xxs },
  helperText: { ...TYPOGRAPHY.caption, marginTop: SPACING.xxs },
});
