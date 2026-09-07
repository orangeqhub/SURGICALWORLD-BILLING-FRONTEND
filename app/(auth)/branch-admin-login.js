import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import LinearGradient from '../../src/components/ui/LinearGradientShim';
import Select from '../../src/components/ui/Select';
import Input from '../../src/components/ui/Input';
import PasswordInput from '../../src/components/ui/PasswordInput';
import Checkbox from '../../src/components/ui/Checkbox';
import Button from '../../src/components/ui/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../src/theme';
import { BRANCHES } from '../../src/constants/branches';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotification } from '../../src/hooks/useNotification';
import { focusRingStyle } from '../../src/utils/a11y';

const LOGO = require('../../assets/logo.png');

export default function BranchAdminLoginScreen() {
  const router = useRouter();
  const { signInBranchAdmin } = useAuth();
  const { info } = useNotification();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('sw_branches_v1').then((raw) => {
      setBranches(raw ? JSON.parse(raw) : BRANCHES);
    }).catch(() => {
      setBranches(BRANCHES);
    });
  }, []);

  const handleLogin = async () => {
    if (loading) return;
    setError('');
    if (!branchId || !adminId.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signInBranchAdmin({ branchId, adminId: adminId.trim(), password, rememberDevice });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.replace('/(branch-admin)/dashboard');
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
          <Text style={styles.title}>Branch Admin Login</Text>
          <Text style={styles.subtitle}>Manage your branch operations</Text>

          <Select
            label="Branch ID"
            value={branchId}
            onChange={setBranchId}
            options={branches.map((b) => ({ label: `${b.code} - ${b.name}`, value: b.id }))}
            placeholder="Select your branch"
          />
          <Input
            label="Admin ID"
            value={adminId}
            onChangeText={(text) => setAdminId(text.toUpperCase())}
            placeholder="e.g. ADM-201"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            returnKeyType="next"
            onSubmitEditing={handleLogin}
          />
          <PasswordInput value={password} onChangeText={setPassword} error={error} returnKeyType="go" onSubmitEditing={handleLogin} />

          <View style={styles.rowBetween}>
            <Checkbox checked={rememberDevice} onChange={setRememberDevice} label="Remember Device" />
            <Pressable
              onPress={() => info('Please contact Head Office to reset your password.')}
              accessibilityRole="button"
              style={({ focused }) => [focusRingStyle(focused)]}
            >
              <Text style={styles.link}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Button title="Login" onPress={handleLogin} loading={loading} size="lg" style={{ marginTop: SPACING.md }} />

          <View style={styles.linksRow}>
            <Pressable
              onPress={() => router.push('/(auth)/employee-login')}
              accessibilityRole="button"
              style={({ focused }) => [focusRingStyle(focused)]}
            >
              <Text style={styles.link}>Employee Login</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/super-admin-login')}
              accessibilityRole="button"
              style={({ focused }) => [focusRingStyle(focused)]}
            >
              <Text style={styles.link}>Super Admin Login</Text>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg },
  link: { color: COLORS.brandRed, fontSize: 13, fontWeight: '700' },
});
