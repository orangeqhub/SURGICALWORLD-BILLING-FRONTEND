import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet, Dimensions, Platform } from 'react-native';
import { COLORS, SHADOWS } from '../../theme';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export default function ResponsiveDrawer({ visible, onClose, children, width = 260 }) {
  const translateX = useRef(new Animated.Value(-width)).current;
  const drawerRef = useRef(null);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -width,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible]);

  useFocusTrap(drawerRef, { active: visible, onClose });

  if (!visible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close navigation menu" />
      <Animated.View ref={drawerRef} style={[styles.drawer, SHADOWS.raised, { width, transform: [{ translateX }] }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32,36,99,0.35)' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, height: SCREEN_HEIGHT, backgroundColor: COLORS.surface },
});
