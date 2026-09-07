import React from 'react';
import { View } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

/**
 * Thin wrapper around expo-linear-gradient so the rest of the app depends on
 * one local module instead of the package directly. expo-linear-gradient
 * ships native implementations for iOS/Android and a CSS-gradient based
 * implementation for web via react-native-web, so no platform branching is
 * required here - this indirection just gives us one place to swap the
 * implementation later if needed.
 */
export default function LinearGradientShim({ colors, style, children, ...rest }) {
  const gradientColors = Array.isArray(colors) && colors.length >= 2 ? colors : ['#ED1C2E', '#822160'];

  return (
    <ExpoLinearGradient colors={gradientColors} style={style} {...rest}>
      {children}
    </ExpoLinearGradient>
  );
}

export function GradientFallback({ color, style, children }) {
  return <View style={[{ backgroundColor: color || '#ED1C2E' }, style]}>{children}</View>;
}
