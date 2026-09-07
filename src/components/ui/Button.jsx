import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import LinearGradient from './LinearGradientShim';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

const VARIANT_GRADIENT = {
  primary: ['#ED1C2E', '#822160'],
  secondary: ['#822160', '#302785'],
  danger: ['#ED1C2E', '#D71D37'],
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  outline = false,
  disabled = false,
  loading = false,
  icon,
  style,
  size = 'md',
}) {
  const isFlat = outline || variant === 'ghost';
  const height = size === 'sm' ? 40 : size === 'lg' ? 56 : 48;

  const content = (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator color={isFlat ? COLORS.brandRed : COLORS.white} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, isFlat && { color: COLORS.brandRed }, icon && { marginLeft: 8 }]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (isFlat) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        style={({ pressed, focused }) => [
          styles.base,
          { height, borderWidth: 1.5, borderColor: COLORS.brandRed, backgroundColor: 'transparent' },
          pressed && { opacity: 0.7 },
          disabled && styles.disabled,
          focusRingStyle(focused),
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ focused }) => [{ height }, disabled && styles.disabled, focusRingStyle(focused), style]}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={VARIANT_GRADIENT[variant] || VARIANT_GRADIENT.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, { height, opacity: pressed ? 0.85 : 1 }]}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    minWidth: 44,
  },
  contentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
