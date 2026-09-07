import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

export default function SearchInput({ value, onChangeText, placeholder = 'Search...', onClear, style, ...rest }) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        {...rest}
      />
      {value ? (
        <Pressable
          onPress={() => (onClear ? onClear() : onChangeText(''))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ focused }) => [focusRingStyle(focused)]}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 46,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.textPrimary, height: '100%' },
});
