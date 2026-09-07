import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', message, onRetry, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={32} color={COLORS.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? <Button title="Retry" onPress={onRetry} size="sm" style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.xxs },
  message: { ...TYPOGRAPHY.caption, textAlign: 'center', maxWidth: 320 },
  action: { marginTop: SPACING.lg },
});
