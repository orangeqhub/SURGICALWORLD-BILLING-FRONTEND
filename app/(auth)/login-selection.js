import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from '../../src/components/ui/LinearGradientShim';
import Button from '../../src/components/ui/Button';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../src/theme';

const LOGO = require('../../assets/logo.png');

const ROLES = [
  { key: 'employee', title: 'Employee Login', subtitle: 'Store ID + Employee ID', icon: 'person-outline', route: '/(auth)/employee-login' },
  { key: 'branch-admin', title: 'Branch Admin Login', subtitle: 'Branch admin credentials', icon: 'business-outline', route: '/(auth)/branch-admin-login' },
  { key: 'super-admin', title: 'Super Admin Login', subtitle: 'Head office access', icon: 'shield-checkmark-outline', route: '/(auth)/super-admin-login' },
];

export default function LoginSelectionScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={GRADIENTS.brand} style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Surgical World</Text>
        <Text style={styles.subtitle}>One Stop for all your Surgical & Medical Equipments</Text>

        <View style={styles.cardList}>
          {ROLES.map((role) => (
            <View key={role.key} style={[styles.card, SHADOWS.raised]}>
              <View style={styles.cardIcon}>
                <Ionicons name={role.icon} size={22} color={COLORS.brandRed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{role.title}</Text>
                <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
              </View>
              <Button title="Continue" size="sm" onPress={() => router.push(role.route)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.xs },
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
  title: { fontSize: 26, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: SPACING.xl, textAlign: 'center' },
  cardList: { width: '100%', maxWidth: 460, gap: SPACING.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...TYPOGRAPHY.h4 },
  cardSubtitle: { ...TYPOGRAPHY.caption },
});
