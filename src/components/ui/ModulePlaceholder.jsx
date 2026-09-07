import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Badge from './Badge';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

/**
 * Professional "not yet implemented" state for Phase 1 employee route
 * scaffolding (see docs/FRONTEND_PHASE_IMPLEMENTATION.md). Route access is
 * already permission-gated by the time this renders - this only communicates
 * that the module's workflow ships in a later phase.
 */
export default function ModulePlaceholder({ icon = 'construct-outline', title, description, highlights = [] }) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={COLORS.brandRed} />
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Badge label="Scheduled for a later phase" tone="info" />
      </View>
      <Text style={styles.description}>{description}</Text>
      {highlights.length > 0 ? (
        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item} style={styles.highlightRow}>
              <Ionicons name="ellipse" size={6} color={COLORS.textMuted} style={styles.dot} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 640, alignSelf: 'stretch' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: `${COLORS.brandRed}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.h3 },
  description: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.md },
  highlights: { gap: SPACING.xs },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dot: { marginTop: 1 },
  highlightText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});
