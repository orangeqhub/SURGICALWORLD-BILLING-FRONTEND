import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import LinearGradient from '../../src/components/ui/LinearGradientShim';
import Select from '../../src/components/ui/Select';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../src/theme';
import { BRANCHES } from '../../src/constants/branches';
import { useAuth } from '../../src/hooks/useAuth';
import { focusRingStyle } from '../../src/utils/a11y';

const LOGO = require('../../assets/logo.png');

export default function EmployeeLoginScreen() {
  const router = useRouter();
  const { signInEmployee } = useAuth();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
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
    if (!branchId) {
      setError('Please select your Branch / Store ID');
      return;
    }
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }

    setLoading(true);
    try {
      const result = await signInEmployee({ branchId, employeeId: employeeId.trim() });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.replace('/(employee)/billing');
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
          <Text style={styles.title}>Employee Login</Text>
          <Text style={styles.subtitle}>Select your branch and enter your Employee ID to start billing</Text>

          <Select
            label="Branch / Store ID"
            value={branchId}
            onChange={setBranchId}
            options={branches.map((b) => ({ label: `${b.code} - ${b.name}`, value: b.id }))}
            placeholder="Select your branch"
          />
          <Input
            label="Employee ID"
            value={employeeId}
            onChangeText={(text) => setEmployeeId(text.toUpperCase())}
            placeholder="e.g. EMP-101"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            error={error}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <Button title="Login" onPress={handleLogin} loading={loading} size="lg" style={{ marginTop: SPACING.sm }} />

          <View style={styles.linksRow}>
            <Pressable
              onPress={() => router.push('/(auth)/branch-admin-login')}
              accessibilityRole="button"
              style={({ focused }) => [focusRingStyle(focused)]}
            >
              <Text style={styles.link}>Branch Admin Login</Text>
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
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg },
  link: { color: COLORS.brandRed, fontSize: 13, fontWeight: '700' },
});
