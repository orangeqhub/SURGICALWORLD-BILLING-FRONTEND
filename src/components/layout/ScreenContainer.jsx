import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../theme';

export default function ScreenContainer({ children, scrollable = true, style, contentStyle }) {
  if (!scrollable) {
    return <View style={[styles.wrap, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.wrap, style]}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
});
