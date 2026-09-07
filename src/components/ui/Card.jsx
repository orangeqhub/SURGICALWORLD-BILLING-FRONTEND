import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';

export default function Card({ children, style, padded = true, elevated = true }) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        elevated ? SHADOWS.card : SHADOWS.none,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  padded: { padding: SPACING.lg },
});
