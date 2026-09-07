import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import LinearGradient from '../../src/components/ui/LinearGradientShim';
import Input from '../../src/components/ui/Input';
import PasswordInput from '../../src/components/ui/PasswordInput';
import Button from '../../src/components/ui/Button';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../src/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { focusRingStyle } from '../../src/utils/a11y';

const LOGO = require('../../assets/logo.png');

export default function SuperAdminLoginScreen() {
  const router = useRouter();
  const { signInSuperAdmin } = useAuth();
  const { info } = useNotification();

  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setError('');
    if (!adminId.trim() || !password) {
      setError('Please enter your Super Admin ID and password');
      return;
    }

    setLoading(true);
    try {
      const result = await signInSuperAdmin({ adminId: adminId.trim(), password });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.replace('/(super-admin)/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={GRADIENTS.brand} style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={[styles.card, SHADOWS.raised]}>
          <Text style={styles.title}>Super Admin Login</Text>
          <Text style={styles.subtitle}>Head office access - all branches</Text>

          <Input
            label="Super Admin ID"
            value={adminId}
            onChangeText={(text) => setAdminId(text.toUpperCase())}
            placeholder="e.g. SA-001"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            returnKeyType="next"
            onSubmitEditing={handleLogin}
          />
          <PasswordInput value={password} onChangeText={setPassword} error={error} returnKeyType="go" onSubmitEditing={handleLogin} />

          <Pressable
            onPress={() => info('Please contact system owner to reset your password.')}
            style={({ focused }) => [styles.forgotRow, focusRingStyle(focused)]}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Forgot Password?</Text>
          </Pressable>

          <Button title="Login" onPress={handleLogin} loading={loading} size="lg" style={{ marginTop: SPACING.sm }} />

          <View style={styles.linksRow}>
            <Pressable
              onPress={() => router.push('/(auth)/employee-login')}
              accessibilityRole="button"
              style={({ focused }) => [focusRingStyle(focused)]}
            >
              <Text style={styles.link}>Employee Login</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/branch-admin-login')}
              accessibilityRole="button"
              style={({ focused }) => [focusRingStyle(focused)]}
            >
              <Text style={styles.link}>Branch Admin Login</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  logoWrap: {
    width: 200,
    height: 100,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  logo: { width: 160, height: 80 },
  card: { width: '100%', maxWidth: 420, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { ...TYPOGRAPHY.h2 },
  subtitle: { ...TYPOGRAPHY.caption, marginBottom: SPACING.lg },
  forgotRow: { alignItems: 'flex-end', marginBottom: SPACING.xs },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg },
  link: { color: COLORS.brandRed, fontSize: 13, fontWeight: '700' },
});
