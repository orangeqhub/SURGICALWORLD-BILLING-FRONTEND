import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

export default function LoadingState({ label = 'Loading...', style, fullscreen = false }) {
  return (
    <View style={[styles.wrap, fullscreen && styles.fullscreen, style]}>
      <ActivityIndicator size="large" color={COLORS.brandRed} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxxl },
  fullscreen: { flex: 1, backgroundColor: COLORS.background },
  label: { ...TYPOGRAPHY.caption, marginTop: SPACING.sm },
});
