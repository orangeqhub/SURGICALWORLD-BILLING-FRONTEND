import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from './Input';
import { COLORS } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';

export default function PasswordInput({ label = 'Password', value, onChangeText, error, style, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!visible}
      error={error}
      style={style}
      autoCapitalize="none"
      rightElement={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={({ focused }) => [focusRingStyle(focused)]}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
        </Pressable>
      }
      {...rest}
    />
  );
}
