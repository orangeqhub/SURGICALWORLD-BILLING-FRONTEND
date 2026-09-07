import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';

const ICONS = {
  success: { name: 'checkmark-circle', color: COLORS.success },
  error: { name: 'close-circle', color: COLORS.danger },
  warning: { name: 'warning', color: COLORS.warning },
  info: { name: 'information-circle', color: COLORS.info },
};

export default function Toast({ visible, message, type = 'info', onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      const useNativeDriver = Platform.OS !== 'web';
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver }).start(() => {
          onHide && onHide();
        });
      }, 2800);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const icon = ICONS[type] || ICONS.info;

  return (
    <Animated.View style={[styles.wrap, SHADOWS.raised, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={icon.name} size={20} color={icon.color} />
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onHide} hitSlop={8}>
        <Ionicons name="close" size={16} color={COLORS.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: SPACING.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    maxWidth: 420,
    zIndex: 999,
  },
  text: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
});
